import algoliasearch from 'algoliasearch';
import type { SearchIndex } from 'algoliasearch';
import type { DocumentType } from '../agent/document.service';

/**
 * Interface representing a document stored in Algolia
 * Defines the structure of documents indexed for text search
 */
interface AlgoliaDocument {
  /** Unique identifier for the Algolia object (same as document UUID) */
  objectID: string;
  /** UUID of the source document */
  document_uuid: string;
  /** UUID of the document source */
  source_uuid: string;
  /** Source type or origin of the document */
  source: string;
  /** Main text content of the document */
  text: string;
  /** Optional name or title of the document */
  name?: string;
  /** Optional description of the document */
  description?: string;
  /** Type classification of the document */
  type: string;
  /** Content type classification (e.g., 'chunk', 'full', 'memory') */
  content_type: string;
  /** Optional category classification */
  category?: string;
  /** Optional subcategory classification */
  subcategory?: string;
  /** ISO timestamp when the document was created */
  created_at: string;
  /** ISO timestamp when the document was last updated */
  updated_at: string;
  /** Additional metadata fields */
  metadata: Record<string, unknown>;
}

/** The name of the Algolia index used for document storage */
const DOCUMENTS_INDEX = process.env.ALGOLIA_INDEX!;

let client: ReturnType<typeof algoliasearch> | null = null;
let index: any = null;

try {
  client = algoliasearch(
    process.env.ALGOLIA_APP_ID!,
    process.env.ALGOLIA_API_KEY!
  );
  index = client.initIndex(DOCUMENTS_INDEX);
} catch (error) {
  console.error('Failed to initialize Algolia client. Check ALGOLIA_APP_ID and ALGOLIA_API_KEY in .env. Algolia is required for indexing.');
}

/**
 * Default search parameters optimized for document retrieval
 * Configured for typo tolerance, highlighting, and relevance scoring
 */
const DEFAULT_SEARCH_PARAMS = {
  hitsPerPage: 15,
  page: 0,
  attributesToRetrieve: ['*'],
  typoTolerance: true,
  ignorePlurals: true,
  removeStopWords: true,
  attributesToHighlight: ['*'],
  highlightPreTag: '<em>',
  highlightPostTag: '</em>',
  analytics: true,
  clickAnalytics: true,
  enablePersonalization: false,
  distinct: 1,
  facets: ['*'],
  minWordSizefor1Typo: 3,
  minWordSizefor2Typos: 7,
  advancedSyntax: true,
};

/**
 * Algolia Search Service
 * 
 * Provides text-based search capabilities using Algolia's search engine.
 * This service handles document indexing, updating, deletion, and text search operations.
 * It works in conjunction with the vector service to provide hybrid search capabilities.
 * 
 * Key features:
 * - Full-text search with typo tolerance
 * - Document indexing and management
 * - Advanced search filtering and ranking
 * - Highlighting and analytics support
 * 
 * @example
 * ```typescript
 * // Index a document
 * await algoliaService.indexDocument({
 *   uuid: 'doc-123',
 *   text: 'Sample document content',
 *   metadata: { source: 'upload', category: 'article' }
 * });
 * 
 * // Search documents
 * const results = await algoliaService.search('search query', {
 *   filters: 'source:upload',
 *   hitsPerPage: 10
 * });
 * ```
 * 
 * @cspell:ignore algoliasearch reindexing Sizefor
 */
export const algoliaService = {
  /**
   * Indexes a document in Algolia for text search
   * Converts document format to Algolia-compatible structure and stores it
   * 
   * @param document - The document to index
   * @throws {Error} When indexing operation fails
   * 
   * @example
   * ```typescript
   * await algoliaService.indexDocument({
   *   uuid: 'doc-123',
   *   source_uuid: 'source-456',
   *   text: 'Document content to be indexed',
   *   metadata: {
   *     source: 'upload',
   *     category: 'article',
   *     should_index: true
   *   },
   *   created_at: new Date().toISOString(),
   *   updated_at: new Date().toISOString()
   * });
   * ```
   */
  async indexDocument(document: DocumentType): Promise<void> {
    try {
      if (!index) {
        console.warn('Algolia client not initialized, skipping document indexing');
        return;
      }

      const metadata = document.metadata || {};
      
      if (metadata.should_index === false) {
        return;
      }

      const algolia_document: AlgoliaDocument = {
        objectID: document.uuid,
        document_uuid: document.uuid,
        source_uuid: document.source_uuid,
        source: metadata.source || '',
        text: document.text,
        name: metadata.name,
        description: metadata.description,
        type: metadata.type || 'document',
        content_type: metadata.content_type || 'full',
        category: metadata.category,
        subcategory: metadata.subcategory,
        created_at: document.created_at || '',
        updated_at: document.updated_at || '',
        metadata: metadata as unknown as Record<string, unknown>
      };

      console.log('Indexing document to Algolia:', algolia_document);

      await index.saveObject(algolia_document);
    } catch (error) {
      console.error('Failed to index document in Algolia:', error);
      throw error;
    }
  },

  /**
   * Updates an existing document in the Algolia index
   * Performs partial update to modify specific fields without reindexing the entire document
   * 
   * @param document - The document with updated content
   * @throws {Error} When update operation fails
   * 
   * @example
   * ```typescript
   * await algoliaService.updateDocument({
   *   uuid: 'doc-123',
   *   text: 'Updated document content',
   *   metadata: {
   *     source: 'upload',
   *     category: 'updated-article',
   *     should_index: true
   *   },
   *   updated_at: new Date().toISOString()
   * });
   * ```
   */
  async updateDocument(document: DocumentType): Promise<void> {
    try {
      if (!index) {
        console.warn('Algolia client not initialized, skipping document update');
        return;
      }

      const metadata = document.metadata || {};
      
      if (metadata.should_index === false) {
        await this.deleteDocument(document.uuid);
        return;
      }

      await index.partialUpdateObject({
        objectID: document.uuid,
        text: document.text,
        source: metadata.source,
        name: metadata.name,
        description: metadata.description,
        updated_at: document.updated_at,
        ...metadata
      });
    } catch (error) {
      console.error('Failed to update document in Algolia:', error);
      throw error;
    }
  },

  /**
   * Deletes a document from the Algolia index
   * 
   * @param uuid - The UUID of the document to delete
   * @throws {Error} When deletion operation fails
   * 
   * @example
   * ```typescript
   * await algoliaService.deleteDocument('doc-123');
   * ```
   */
  async deleteDocument(uuid: string): Promise<void> {
    try {
      if (!index) {
        console.warn('Algolia client not initialized, skipping document deletion');
        return;
      }
      await index.deleteObject(uuid);
    } catch (error) {
      console.error('Failed to delete document from Algolia:', error);
      throw error;
    }
  },

  /**
   * Searches documents in Algolia using text queries
   * Provides full-text search with advanced filtering, highlighting, and ranking
   * 
   * @param query - The search query string
   * @param options - Optional search configuration
   * @param options.filters - Algolia filter string for result filtering
   * @param options.page - Page number for pagination (0-based)
   * @param options.hitsPerPage - Number of results per page
   * @param options.headers - Additional HTTP headers for the request
   * @returns Search response containing matching documents with metadata
   * @throws {Error} When search operation fails
   * 
   * @example
   * ```typescript
   * // Basic search
   * const results = await algoliaService.search('machine learning');
   * 
   * // Advanced search with filtering
   * const filteredResults = await algoliaService.search('AI research', {
   *   filters: 'source:academic AND category:paper',
   *   hitsPerPage: 20,
   *   page: 0
   * });
   * 
   * // Process results
   * filteredResults.hits.forEach(hit => {
   *   console.log(`Title: ${hit.name}, Score: ${hit._score}`);
   *   console.log(`Highlighted: ${hit._highlightResult?.text?.value}`);
   * });
   * ```
   */
  async search(query: string, options?: {
    filters?: string;
    page?: number;
    hitsPerPage?: number;
    headers?: Record<string, string>;
  }): Promise<any> {
    try {
      if (!index) {
        console.warn('Algolia client not initialized, returning empty search results');
        return { hits: [], nbHits: 0, page: 0, nbPages: 0 };
      }

      const searchOptions = {
        ...DEFAULT_SEARCH_PARAMS,
        ...options,
        optionalWords: query.split(' '),
      };

      return index.search(query, searchOptions);
    } catch (error) {
      console.error('Failed to search documents in Algolia:', error);
      throw error;
    }
  }
};
