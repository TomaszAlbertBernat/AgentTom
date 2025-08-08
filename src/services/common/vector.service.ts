import { QdrantClient } from '@qdrant/js-client-rest';
import { z } from 'zod';
import { logger } from './logger.service';

const vectorLogger = logger.child('VECTOR_SERVICE');

/**
 * Validation schema for search filters applied to vector searches
 * Defines the structure for filtering vector search results
 */
const SearchFiltersSchema = z.object({
  source_uuid: z.string().uuid().optional(),
  source: z.string().optional(),
  content_type: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional()
});

/**
 * Validation schema for point payloads stored in the vector database
 * Ensures consistent data structure for all vector points
 */
const PointPayloadSchema = z.object({
  document_uuid: z.string().uuid(),
  source_uuid: z.string(),
  source: z.string(),
  text: z.string(),
  metadata: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string()
});

/**
 * Type definition for search filters used in vector operations
 * All fields are optional to allow flexible filtering
 */
type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * Type definition for point payload data structure
 * Represents the metadata and content associated with each vector point
 */
type PointPayload = z.infer<typeof PointPayloadSchema>;

/**
 * Interface representing a vector search result
 * Contains the point ID, similarity score, and associated payload data
 */
interface VectorSearchResult {
  /** Unique identifier for the vector point */
  id: string;
  /** Similarity score between 0 and 1, where 1 is most similar */
  score: number;
  /** Associated metadata and content for the vector point */
  payload: PointPayload;
}

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

/** The name of the Qdrant collection used for vector storage */
const COLLECTION_NAME = process.env.QDRANT_INDEX || 'alice';

/** The dimensionality of vectors stored in the collection (OpenAI ada-002 embedding size) */
const VECTOR_SIZE = 3072;

/**
 * Formats search filters into Qdrant-compatible filter structure
 * Converts user-friendly filter objects into the format expected by Qdrant
 * 
 * @param filters - The search filters to format
 * @returns Qdrant-compatible filter object or undefined if no filters
 * 
 * @example
 * ```typescript
 * const filters = { source: 'document', content_type: 'chunk' };
 * const qdrantFilter = formatSearchFilters(filters);
 * // Returns: { must: [{ key: 'source', match: { value: 'document' } }, ...] }
 * ```
 */
const formatSearchFilters = (filters: SearchFilters) => {
  if (!filters) return undefined;
  
  const must = [];

  if (filters.source_uuid) {
    must.push({ key: 'source_uuid', match: { value: filters.source_uuid } });
  }
  if (filters.source) {
    must.push({ key: 'source', match: { value: filters.source } });
  }
  if (filters.content_type) {
    must.push({ key: 'content_type', match: { value: filters.content_type } });
  }
  if (filters.category) {
    must.push({ key: 'category', match: { value: filters.category } });
  }
  if (filters.subcategory) {
    must.push({ key: 'subcategory', match: { value: filters.subcategory } });
  }

  vectorLogger.debug('Formatted Qdrant filters', { filters: { must } });
  return must.length > 0 ? { must } : undefined;
};

/**
 * Vector Database Service
 * 
 * Provides high-level operations for managing and searching vector embeddings in Qdrant.
 * This service handles document embeddings for semantic search, content similarity,
 * and vector-based retrieval operations.
 * 
 * Key features:
 * - Vector similarity search with filtering
 * - Point management (create, update, delete)
 * - Collection initialization and indexing
 * - Payload updates and batch operations
 * 
 * @example
 * ```typescript
 * // Initialize collection
 * await vectorService.initializeCollection();
 * 
 * // Store a vector
 * await vectorService.upsertPoint(embedding, {
 *   document_uuid: 'doc-123',
 *   source_uuid: 'source-456',
 *   source: 'document',
 *   text: 'Sample content',
 *   metadata: { type: 'article' },
 *   created_at: new Date().toISOString(),
 *   updated_at: new Date().toISOString()
 * });
 * 
 * // Search similar vectors
 * const results = await vectorService.searchSimilar(queryEmbedding, {
 *   source: 'document',
 *   content_type: 'chunk'
 * }, 10);
 * ```
 */
export const vectorService = {
  /**
   * Initializes the Qdrant collection with proper configuration
   * Creates the collection if it doesn't exist and sets up necessary indexes
   * 
   * @throws {Error} When collection initialization fails
   * 
   * @example
   * ```typescript
   * await vectorService.initializeCollection();
   * ```
   */
  async initializeCollection(): Promise<void> {
    try {
      const collections = await qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

      if (!exists) {
        await qdrant.createCollection(COLLECTION_NAME, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine'
          },
          optimizers_config: {
            default_segment_number: 2
          },
          replication_factor: 1
        });

        // Create payload indexes for faster filtering
        await qdrant.createPayloadIndex(COLLECTION_NAME, {
          field_name: 'source_uuid',
          field_schema: 'keyword',
          wait: true
        });

        await qdrant.createPayloadIndex(COLLECTION_NAME, {
          field_name: 'source',
          field_schema: 'keyword',
          wait: true
        });
      }
    } catch (error) {
      vectorLogger.error('Failed to initialize Qdrant collection', error as Error);
      throw error;
    }
  },

  /**
   * Inserts or updates a vector point in the collection
   * 
   * @param vector - The embedding vector (must be exactly VECTOR_SIZE dimensions)
   * @param payload - The metadata and content associated with the vector
   * @throws {Error} When vector size is incorrect or upsert operation fails
   * 
   * @example
   * ```typescript
   * const embedding = await getEmbedding('Some text content');
   * await vectorService.upsertPoint(embedding, {
   *   document_uuid: 'doc-123',
   *   source_uuid: 'source-456',
   *   source: 'document',
   *   text: 'Some text content',
   *   metadata: { category: 'article' },
   *   created_at: new Date().toISOString(),
   *   updated_at: new Date().toISOString()
   * });
   * ```
   */
  async upsertPoint(
    vector: number[],
    payload: PointPayload
  ): Promise<void> {
    try {
      if (vector.length !== VECTOR_SIZE) {
        throw new Error(`Vector must be of size ${VECTOR_SIZE}, got ${vector.length}`);
      }

      const validated_payload = PointPayloadSchema.parse(payload);

      await qdrant.upsert(COLLECTION_NAME, {
        wait: true,
        points: [{
          id: validated_payload.document_uuid,
          vector,
          payload: {
            ...validated_payload,
            metadata: undefined,
            ...validated_payload.metadata
          }
        }]
      });
    } catch (error) {
      vectorLogger.error('Failed to upsert point', error as Error);
      throw error;
    }
  },

  /**
   * Deletes vector points from the collection
   * 
   * @param document_uuids - Array of document UUIDs to delete
   * @throws {Error} When deletion operation fails
   * 
   * @example
   * ```typescript
   * await vectorService.deletePoints(['doc-123', 'doc-456']);
   * ```
   */
  async deletePoints(document_uuids: string[]): Promise<void> {
    try {
      await qdrant.delete(COLLECTION_NAME, {
        wait: true,
        points: document_uuids
      });
    } catch (error) {
      vectorLogger.error('Failed to delete points', error as Error);
      throw error;
    }
  },

  /**
   * Searches for similar vectors in the collection
   * Performs cosine similarity search with optional filtering and score thresholding
   * 
   * @param vector - The query vector to search for (must be exactly VECTOR_SIZE dimensions)
   * @param filters - Optional filters to apply to the search results
   * @param limit - Maximum number of results to return (default: 10)
   * @returns Array of search results sorted by similarity score (highest first)
   * @throws {Error} When search operation fails
   * 
   * @example
   * ```typescript
   * const queryEmbedding = await getEmbedding('search query');
   * const results = await vectorService.searchSimilar(queryEmbedding, {
   *   source: 'document',
   *   content_type: 'chunk'
   * }, 5);
   * 
   * results.forEach(result => {
   *   console.log(`Score: ${result.score}, Text: ${result.payload.text}`);
   * });
   * ```
   */
  async searchSimilar(
    vector: number[],
    filters?: SearchFilters,
    limit = 10
  ): Promise<VectorSearchResult[]> {
    try {
      vectorLogger.debug('Vector service received filters', { filters });
      const filter = filters ? formatSearchFilters(filters) : undefined;

      const results = await qdrant.search(COLLECTION_NAME, {
        vector,
        filter,
        limit,
        with_payload: true
      });

      // Debug log the first result's full payload structure
      if (results.length > 0) {
        vectorLogger.trace('First result payload structure', { 
          payload: results[0].payload,
          resultCount: results.length 
        });
      }

      const average_score = results.reduce((acc, r) => acc + r.score, 0) / results.length;
      const threshold = average_score * 0.5;

      return results
        .filter(result => result.score >= threshold)
        .map(result => ({
          id: result.id as string,
          score: result.score,
          payload: result.payload as PointPayload
        }));
    } catch (error) {
      vectorLogger.error('Failed to search vectors', error as Error);
      throw error;
    }
  },

  /**
   * Retrieves all points associated with a specific source UUID
   * 
   * @param source_uuid - The source UUID to filter by
   * @param limit - Maximum number of points to return (default: 100)
   * @returns Array of vector points from the specified source
   * @throws {Error} When retrieval operation fails
   * 
   * @example
   * ```typescript
   * const sourcePoints = await vectorService.getPointsBySource('source-123', 50);
   * ```
   */
  async getPointsBySource(
    source_uuid: string,
    limit = 100
  ): Promise<VectorSearchResult[]> {
    try {
      const results = await qdrant.scroll(COLLECTION_NAME, {
        filter: {
          must: [
            { key: 'source_uuid', match: { value: source_uuid } }
          ]
        },
        limit,
        with_payload: true
      });

      return results.points.map(point => ({
        id: point.id as string,
        score: 1.0,
        payload: point.payload as PointPayload
      }));
    } catch (error) {
      vectorLogger.error('Failed to get points by source', error as Error);
      throw error;
    }
  },

  /**
   * Updates the payload of an existing vector point without changing the vector
   * 
   * @param document_uuid - The UUID of the document to update
   * @param payload_update - Partial payload data to update
   * @throws {Error} When payload update operation fails
   * 
   * @example
   * ```typescript
   * await vectorService.updatePointPayload('doc-123', {
   *   metadata: { updated: true, category: 'updated-article' },
   *   updated_at: new Date().toISOString()
   * });
   * ```
   */
  async updatePointPayload(
    document_uuid: string,
    payload_update: Partial<PointPayload>
  ): Promise<void> {
    try {
      await qdrant.setPayload(COLLECTION_NAME, {
        points: [document_uuid],
        payload: payload_update,
        wait: true
      });
    } catch (error) {
      vectorLogger.error('Failed to update point payload', error as Error);
      throw error;
    }
  },

  /**
   * Updates both the vector and payload of an existing point
   * Completely replaces the existing point with new data
   * 
   * @param document_uuid - The UUID of the document to update
   * @param vector - The new embedding vector (must be exactly VECTOR_SIZE dimensions)
   * @param payload - The new payload data
   * @throws {Error} When vector size is incorrect or update operation fails
   * 
   * @example
   * ```typescript
   * const newEmbedding = await getEmbedding('Updated content');
   * await vectorService.updatePoint('doc-123', newEmbedding, {
   *   document_uuid: 'doc-123',
   *   source_uuid: 'source-456',
   *   source: 'document',
   *   text: 'Updated content',
   *   metadata: { version: 2 },
   *   created_at: originalCreatedAt,
   *   updated_at: new Date().toISOString()
   * });
   * ```
   */
  async updatePoint(
    document_uuid: string,
    vector: number[],
    payload: PointPayload
  ): Promise<void> {
    try {
      if (vector.length !== VECTOR_SIZE) {
        throw new Error(`Vector must be of size ${VECTOR_SIZE}, got ${vector.length}`);
      }

      const validated_payload = PointPayloadSchema.parse(payload);

      await qdrant.upsert(COLLECTION_NAME, {
        wait: true,
        points: [{
          id: document_uuid,
          vector,
          payload: validated_payload
        }]
      });
    } catch (error) {
      vectorLogger.error('Failed to update point', error as Error);
      throw error;
    }
  }
};
