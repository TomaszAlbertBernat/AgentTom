import { z } from 'zod';
import { documentService, type DocumentType } from '../agent/document.service';
import { memoryService } from '../agent/memory.service';
import { vectorService } from './vector.service';
import { algoliaService } from './algolia.service';
import { embedding } from './llm.service';
import type { Memory } from '../../schema/memory';
import { logger } from './logger.service';

const searchLogger = logger.child('SEARCH_SERVICE');

/**
 * Represents a vector search result from the vector database
 */
interface VectorSearchResult {
  payload: {
    document_uuid: string;
    [key: string]: any;
  };
  score: number;
}

/**
 * Validation schema for search filters
 */
const SearchFiltersSchema = z.object({
  source_uuid: z.string().uuid().optional(),
  source: z.string().optional(),
  content_type: z.enum(['chunk', 'full', 'memory']).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional()
});

/**
 * Type definition for search filters
 */
type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * Represents a combined search result with document, score, and optional memory
 */
interface SearchResult {
  document: DocumentType;
  score: number;
  memory?: Memory;
}

/**
 * Calculates Reciprocal Rank Fusion (RRF) score for combining vector and text search results
 * @param vectorRank - Rank from vector search (1-based)
 * @param algoliaRank - Rank from Algolia text search (1-based)
 * @returns Combined RRF score
 */
const calculateRRFScore = (vectorRank?: number, algoliaRank?: number): number => {
  const k = 60;
  const vector_score = vectorRank ? 1 / (k + vectorRank) : 0;
  const algolia_score = algoliaRank ? 1 / (k + algoliaRank) : 0;
  return vector_score + algolia_score;
};

/**
 * Search query parameters for both vector and text search
 */
interface SearchQueries {
  vector_query: string;
  text_query: string;
  filters?: SearchFilters;
}

/**
 * Hybrid search service that combines vector similarity search with text-based search
 * Uses Reciprocal Rank Fusion (RRF) to merge results from both search methods
 */
export const searchService = {
  /**
   * Performs a hybrid search combining vector similarity and text search
   * @param queries - Search queries for both vector and text search
   * @param filters - Optional filters to apply to search results
   * @param limit - Maximum number of results to return (default: 15)
   * @returns Array of search results sorted by relevance score
   */
  async search(
    queries: SearchQueries,
    filters?: SearchFilters,
    limit?: number
  ): Promise<SearchResult[]> {
    try {
      const normalized_limit = typeof limit === 'number' ? limit : 15;
      const validated_filters = filters ? SearchFiltersSchema.parse(filters) : {};
      
      const search_filters = {
        ...validated_filters,
        ...(filters?.content_type ? { content_type: filters.content_type } : {})
      };
      
      const query_embedding = await embedding(queries.vector_query);

      const [vector_results, algolia_response] = await Promise.all([
        vectorService.searchSimilar(
          query_embedding, 
          search_filters,
          normalized_limit
        ),
        algoliaService.search(queries.text_query, {
          filters: buildAlgoliaFilters(search_filters),
          hitsPerPage: normalized_limit
        })
      ]);

      // Log the results for debugging
      searchLogger.debug('Search results before filtering', {
        vector_count: vector_results.length,
        algolia_count: algolia_response?.results?.[0]?.hits?.length || 0,
        query: queries.vector_query
      });

      // Filter results manually if needed
      const scored_documents = new Map<string, { score: number; document_uuid: string }>();

      // Process vector results
      vector_results.forEach((result: VectorSearchResult, index: number) => {
        if (matchesFilters(result.payload, search_filters)) {
          scored_documents.set(result.payload.document_uuid, {
            score: result.score,
            document_uuid: result.payload.document_uuid
          });
        } else {
          console.log(`Vector result excluded: document_uuid='${result.payload.document_uuid}'`);
        }
      });

      // Process Algolia hits
      const hits = algolia_response?.results?.[0]?.hits || [];

      hits.forEach((hit: any, index: number) => {
        if (matchesFilters(hit, search_filters)) {
          const existing = scored_documents.get(hit.document_uuid);
          if (existing) {
            existing.score = calculateRRFScore(index + 1, index + 1);
          } else {
            scored_documents.set(hit.document_uuid, {
              score: calculateRRFScore(undefined, index + 1),
              document_uuid: hit.document_uuid
            });
          }
        } else {
          console.log(`Algolia hit excluded: document_uuid='${hit.document_uuid}'`);
        }
      });

      // Enhance the final results processing
      const final_results: SearchResult[] = [];
      
      for (const [document_uuid, score_data] of scored_documents.entries()) {
        const [document, memory] = await Promise.all([
          documentService.getDocumentByUuid(document_uuid),
          memoryService.getMemoryByDocumentUuid(document_uuid)
        ]);
        
        if (document) {
          // Only include results that have both document and memory when content_type is 'memory'
          if (filters?.content_type === 'memory') {
            if (!memory) {
              console.log(`Memory not found for document_uuid='${document_uuid}'`);
              continue;
            }
            console.log(`Including memory: uuid='${memory.uuid}', name='${memory.name}'`);
          }

          final_results.push({
            document,
            score: score_data.score,
            memory
          });
        } else {
          console.log(`Document not found: document_uuid='${document_uuid}'`);
        }
      }

      // Sort results by score in descending order
      return final_results.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Failed to search:', error);
      throw error;
    }
  }
};

/**
 * Builds Algolia filter string from search filters object
 * @param filters - Search filters to convert to Algolia format
 * @returns Algolia-compatible filter string
 */
function buildAlgoliaFilters(filters: SearchFilters): string {
  const conditions: string[] = [];
  
  if (filters.source_uuid) {
    conditions.push(`source_uuid:'${filters.source_uuid}'`);
  }
  if (filters.source) {
    conditions.push(`source:'${filters.source}'`);
  }
  if (filters.content_type) {
    conditions.push(`content_type:'${filters.content_type}'`);
  }
  if (filters.category) {
    conditions.push(`category:'${filters.category}'`);
  }
  if (filters.subcategory) {
    conditions.push(`subcategory:'${filters.subcategory}'`);
  }

  return conditions.join(' AND ');
}

/**
 * Checks if a document matches the specified filters
 * @param doc - Document to check against filters
 * @param filters - Filters to apply
 * @returns True if document matches all filters, false otherwise
 */
function matchesFilters(doc: any, filters: SearchFilters): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue; // Skip undefined/null filters
    
    const actual_value = doc[key];
    
    if (actual_value !== value) {
      console.log(`Filter mismatch: key='${key}', filter_value='${value}', doc_value='${actual_value}'`);
      return false;
    }
  }
  return true;
}
