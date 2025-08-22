/**
 * Memory management service for storing, retrieving, and managing agent memories.
 * Provides functionality for creating, updating, searching, and recalling memories with semantic search.
 * Supports categorized memory storage and intelligent memory retrieval for conversations.
 * @module memory.service
 */

import { z } from 'zod';
import { db } from '../../database';
import { memories, type Memory, type NewMemory } from '../../schema/memory';
import { conversationMemories } from '../../schema/conversationMemories';
import { eq, and, lt } from 'drizzle-orm';
import { documentService, type DocumentType } from './document.service';
import { v4 as uuidv4 } from 'uuid';
import { categoryService } from './category.service';
import { searchService } from '../common/search.service';
import { completion } from '../common/llm.service';
import { stateManager } from './state.service';
import { memoryRecallPrompt } from '../../prompts/tools/memory.recall';
import { memory_categories } from '../../config/memory.config';
import { LangfuseSpanClient } from 'langfuse';
import NodeCache from 'node-cache';
import { createLogger } from '../common/logger.service';

// cSpell:ignore checkperiod

/**
 * Interface for search filters used in memory operations
 */
interface SearchFilters {
  /** UUID of the source document */
  source_uuid?: string;
  /** Source identifier */
  source?: string;
  /** Type of content */
  content_type?: 'chunk' | 'full' | 'memory';
  /** Memory category */
  category?: string;
  /** Memory subcategory */
  subcategory?: string;
}

/**
 * Interface for memory with associated document data
 */
interface MemoryWithDocument extends Memory {
  /** Associated document data */
  document?: DocumentType;
}

/**
 * Interface for structured memory query with categorized search terms
 */
interface MemoryQuery {
  /** Internal reasoning about the query */
  _thinking: string;
  /** Array of categorized search queries */
  queries: Array<{
    /** Memory category to search in */
    category: string;
    /** Memory subcategory to search in */
    subcategory: string;
    /** Natural language question */
    question: string;
    /** Search query string */
    query: string;
  }>;
}

// Cache configuration
const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Store references instead of cloning
});

// Cache keys
const CACHE_KEYS = {
  MEMORY: (uuid: string) => `memory:${uuid}`,
  CONVERSATION_MEMORIES: (uuid: string) => `conversation_memories:${uuid}`,
  SEARCH_RESULTS: (query: string, filters: string) => `search:${query}:${filters}`
};

/**
 * Validation schemas for memory actions using discriminated unions
 * @constant {z.ZodSchema}
 */
const MemoryActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('recall'),
    payload: z.object({
      query: z.string(),
      filters: z.object({
        source_uuid: z.string().uuid().optional(),
        source: z.string().optional(),
        content_type: z.enum(['chunk', 'full', 'memory']).optional(),
        category: z.string().optional(),
        subcategory: z.string().optional()
      }).optional(),
      limit: z.number().int().min(1).max(100).default(15),
      conversation_uuid: z.string().optional().default('default')
    })
  }),
  z.object({
    action: z.literal('remember'),
    payload: z.object({
      name: z.string(),
      text: z.string(),
      category: z.string(),
      subcategory: z.string(),
      conversation_uuid: z.string().optional().default('default')
    })
  }),
  z.object({
    action: z.literal('forget'),
    payload: z.object({
      memory_uuid: z.string(),
      conversation_uuid: z.string().optional().default('default')
    })
  }),
  z.object({
    action: z.literal('update'),
    payload: z.object({
      memory_uuid: z.string(),
      name: z.string().optional(),
      category_uuid: z.string().optional(),
      text: z.string().optional(),
      conversation_uuid: z.string().optional().default('default')
    })
  })
]);

/**
 * Memory service for managing agent memories and recall operations
 * @namespace memoryService
 */
export const memoryService = {
  log: createLogger('MemoryService'),
  /**
   * Creates a new memory record in the database
   * @param {NewMemory} data - Memory data to create
   * @returns {Promise<Memory>} The created memory object
   */
  async createMemory(data: NewMemory): Promise<Memory> {
    const [memory] = await db.insert(memories).values(data).returning();
    return memory;
  },

  /**
   * Retrieves a memory by its UUID with caching
   * @param {string} uuid - UUID of the memory to retrieve
   * @returns {Promise<Memory|undefined>} The memory object or undefined if not found
   */
  async getMemoryByUuid(uuid: string): Promise<Memory | undefined> {
    const cacheKey = CACHE_KEYS.MEMORY(uuid);
    const cachedMemory = memoryCache.get<Memory>(cacheKey);
    
    if (cachedMemory) {
      return cachedMemory;
    }

    const [memory] = await db.select().from(memories).where(eq(memories.uuid, uuid));
    
    if (memory) {
      memoryCache.set(cacheKey, memory);
    }
    
    return memory;
  },

  /**
   * Updates an existing memory with new data
   * @param {string} uuid - UUID of the memory to update
   * @param {Partial<NewMemory>} data - Partial memory data to update
   * @returns {Promise<Memory>} The updated memory object
   */
  async updateMemory(uuid: string, data: Partial<NewMemory>): Promise<Memory> {
    const [memory] = await db
      .update(memories)
      .set({ ...data, updated_at: new Date().toISOString() })
      .where(eq(memories.uuid, uuid))
      .returning();
    return memory;
  },

  /**
   * Deletes a memory from the database
   * @param {string} uuid - UUID of the memory to delete
   * @returns {Promise<void>}
   */
  async deleteMemory(uuid: string): Promise<void> {
    await db.delete(memories).where(eq(memories.uuid, uuid));
  },

  /**
   * Finds all memories associated with a specific conversation with caching
   * @param {string} conversation_uuid - UUID of the conversation
   * @returns {Promise<Memory[]>} Array of memories associated with the conversation
   */
  async findByConversationId(conversation_uuid: string): Promise<Memory[]> {
    const cacheKey = CACHE_KEYS.CONVERSATION_MEMORIES(conversation_uuid);
    const cachedMemories = memoryCache.get<Memory[]>(cacheKey);
    
    if (cachedMemories) {
      return cachedMemories;
    }

    const result = await db
      .select({
        memories: memories,
        conversation_memories: conversationMemories
      })
      .from(memories)
      .innerJoin(
        conversationMemories,
        eq(conversationMemories.memory_uuid, memories.uuid)
      )
      .where(eq(conversationMemories.conversation_uuid, conversation_uuid));

    const memoriesList = result.map(row => row.memories);
    memoryCache.set(cacheKey, memoriesList);
    
    return memoriesList;
  },

  /**
   * Searches memories using semantic and text search with caching and optimized vector search
   * @param {string} query - Search query string
   * @param {SearchFilters} [filters] - Optional search filters
   * @param {number} [limit=5] - Maximum number of results to return
   * @returns {Promise<MemoryWithDocument[]>} Array of memories with associated documents
   */
  async searchMemories(query: string, filters?: SearchFilters, limit = 5): Promise<MemoryWithDocument[]> {
    try {
      const cacheKey = CACHE_KEYS.SEARCH_RESULTS(query, JSON.stringify(filters));
      const cachedResults = memoryCache.get<MemoryWithDocument[]>(cacheKey);
      
      if (cachedResults) {
        return cachedResults.slice(0, limit);
      }

      // Optimize vector search by using a more efficient query
      const search_results = await searchService.search(
        {
          vector_query: query,
          text_query: query
        },
        { 
          ...filters, 
          content_type: 'memory' as const 
        },
        limit * 2
      );

      // Batch process document retrieval
      const documentUuids = search_results
        .filter(result => result.memory)
        .map(result => result.memory!.document_uuid);

      const documents = await Promise.all(
        documentUuids.map(uuid => documentService.getDocumentByUuid(uuid))
      );

      const memories_with_documents = search_results
        .filter(result => result.memory)
        .map((result, index) => ({
          ...result.memory!,
          document: documents[index] || undefined
        }))
        .filter(memory => memory.document); // Filter out memories without documents

      memoryCache.set(cacheKey, memories_with_documents);
      
      return memories_with_documents.slice(0, limit);
    } catch (error) {
      memoryService.log.error('Memory search failed', error as Error);
      return [];
    }
  },

  /**
   * Recalls relevant memories using intelligent query decomposition and semantic search
   * @param {string} query - The recall query
   * @param {number} limit - Maximum number of memories to recall
   * @param {string} conversation_uuid - UUID of the conversation context
   * @param {SearchFilters} [filters] - Optional search filters
   * @returns {Promise<DocumentType>} Document containing recalled memories
   * @throws {Error} When memory recall fails
   */
  async recallMemories(query: string, limit: number, conversation_uuid: string, filters?: SearchFilters): Promise<DocumentType> {
    try {
      const queries = await this.selfQuery(query);
      const search_promises = queries.queries.map(async query_item => {
        const combined_filters = {
          ...filters,
          category: query_item.category,
          subcategory: query_item.subcategory
        };

        return searchService.search(
          {
            vector_query: query_item.question,
            text_query: query_item.query
          },
          combined_filters,
          Math.ceil(limit / queries.queries.length)
        );
      });

      const all_results = await Promise.all(search_promises);

      memoryService.log.debug('Recall search results aggregated', { batches: all_results.length });
      
      // Deduplicate results by memory_uuid
      const unique_memories = new Map<string, MemoryWithDocument>();
      all_results.flat().forEach(result => {
        if (result.memory && !unique_memories.has(result.memory.uuid)) {
          unique_memories.set(result.memory.uuid, {
            ...result.memory,
            document: result.document
          });
        }
      });

      const final_memories = Array.from(unique_memories.values())
        .slice(0, limit);

      const response_text = final_memories.length > 0
        ? `Found ${final_memories.length} relevant memories:\n\n${
            final_memories.map(memory => 
              `<memory name="${memory.name}" memory-uuid="${memory.uuid}">${memory.document?.text || 'No content available'}</memory>`
            ).join('\n')
          }`
        : 'No relevant memories found.';

      return documentService.createDocument({
        conversation_uuid,
        source_uuid: 'memory_service',
        text: response_text,
        metadata_override: {
          type: 'text',
          content_type: 'full',
          source: 'memory_service'
        }
      });
    } catch (error) {
      memoryService.log.error('Memory recall failed', error as Error);
      throw error;
    }
  },

  /**
   * Creates a new memory with associated document and category
   * @param {string} name - Name of the memory
   * @param {string} text - Content of the memory
   * @param {string} category - Memory category
   * @param {string} subcategory - Memory subcategory
   * @param {string} conversation_uuid - UUID of the conversation context
   * @returns {Promise<DocumentType>} Document containing the created memory
   * @throws {Error} When category is not found
   */
  async createNewMemory(name: string, text: string, category: string, subcategory: string, conversation_uuid: string): Promise<DocumentType> {
    const document_uuid = uuidv4();
    const memory_uuid = uuidv4();
    
    const document = await documentService.createDocument({
      uuid: document_uuid,
      conversation_uuid,
      source_uuid: 'memory_service',
      text,
      name,
      should_index: true,
      content_type: 'memory',
      category,
      subcategory,
      metadata_override: {
        type: 'text',
        content_type: 'memory',
        source: 'memory',
        name,
        description: `Memory: ${name}`,
        category,
        subcategory
      }
    });

    const category_record = await categoryService.findByNameAndSubcategory(category, subcategory);
    if (!category_record) {
      throw new Error(`Category ${category}/${subcategory} not found`);
    }

    const memory = await memoryService.createMemory({
      uuid: memory_uuid,
      name,
      category_uuid: category_record.uuid,
      document_uuid: document.uuid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await db.insert(conversationMemories).values({
      conversation_uuid,
      memory_uuid: memory.uuid,
      created_at: new Date().toISOString()
    });

    return documentService.createDocument({
      conversation_uuid,
      source_uuid: 'memory_service',
      text: `<memory name="${memory.name}" memory-uuid="${memory.uuid}">${document.text}</memory>`,
      metadata_override: {
        type: 'text',
        content_type: 'full',
        source: 'memory_service'
      }
    });
  },

  /**
   * Updates an existing memory with new information
   * @param {string} memory_uuid - UUID of the memory to update
   * @param {string} [name] - New name for the memory
   * @param {string} [category_uuid] - New category UUID
   * @param {string} [text] - New text content
   * @param {string} conversation_uuid - UUID of the conversation context
   * @returns {Promise<DocumentType>} Document confirming the update
   * @throws {Error} When memory or category is not found
   */
  async updateExistingMemory(memory_uuid: string, name: string | undefined, category_uuid: string | undefined, text: string | undefined, conversation_uuid: string): Promise<DocumentType> {
    const memory = await memoryService.getMemoryByUuid(memory_uuid);
    if (!memory) {
      throw new Error(`Memory with UUID ${memory_uuid} not found`);
    }

    const current_time = new Date().toISOString();
    let category_details;
    
    if (category_uuid) {
      category_details = await categoryService.findByUuid(category_uuid);
      if (!category_details) {
        throw new Error(`Category with UUID ${category_uuid} not found`);
      }
    }

    if (text) {
      await documentService.updateDocument(memory.document_uuid, {
        text,
        metadata_override: {
          name: name || undefined,
          should_index: true,
          updated_at: current_time,
          ...(category_details && {
            category: category_details.name,
            subcategory: category_details.subcategory || undefined
          })
        },
        updated_at: current_time
      });
    }

    const updated_memory = await memoryService.updateMemory(memory_uuid, {
      name: name || memory.name,
      category_uuid: category_uuid || memory.category_uuid,
      updated_at: current_time
    });

    return documentService.createDocument({
      conversation_uuid,
      source_uuid: 'memory_service',
      text: `Successfully updated memory: ${updated_memory.name}`,
      metadata_override: {
        type: 'text',
        content_type: 'full',
        source: 'memory_service'
      }
    });
  },

  /**
   * Deletes an existing memory and its associated document
   * @param {string} memory_uuid - UUID of the memory to delete
   * @param {string} conversation_uuid - UUID of the conversation context
   * @returns {Promise<DocumentType>} Document confirming the deletion
   * @throws {Error} When memory is not found
   */
  async deleteExistingMemory(memory_uuid: string, conversation_uuid: string): Promise<DocumentType> {
    const memory = await memoryService.getMemoryByUuid(memory_uuid);
    if (!memory) {
      throw new Error(`Memory with UUID ${memory_uuid} not found`);
    }

    await Promise.all([
      memoryService.deleteMemory(memory_uuid),
      documentService.deleteDocument(memory.document_uuid)
    ]);

    return documentService.createDocument({
      conversation_uuid,
      source_uuid: 'memory_service',
      text: `Successfully deleted memory: ${memory.name}`,
      metadata_override: {
        type: 'text',
        content_type: 'full',
        source: 'memory_service'
      }
    });
  },

  /**
   * Generates structured queries for memory recall using LLM
   * @param {string} query - The original query to decompose
   * @returns {Promise<MemoryQuery>} Structured query with categorized search terms
   */
  async selfQuery(query: string): Promise<MemoryQuery> {
    const state = stateManager.getState();
    
    const queries = await completion.object<MemoryQuery>({
      // NOTE: Never use 'gemini-2.0-flash'.
      model: state.config.model ?? 'gemini-2.5-flash',
      messages: [
        {role: 'system', content: memoryRecallPrompt()},
        {role: 'user', content: query}
      ],
      temperature: 0,
      user: {
        uuid: state.config.user_uuid ?? '',
        name: state.profile.user_name
      }
    });

    return queries;
  },

  /**
   * Executes memory actions based on action type and payload
   * @param {string} action - The action to execute (recall, remember, update, forget)
   * @param {unknown} payload - Action-specific payload data
   * @returns {Promise<DocumentType>} Result document from the executed action
   * @throws {Error} When action validation fails or execution errors occur
   */
  async execute(action: string, payload: unknown): Promise<DocumentType> {
    const parsed = MemoryActionSchema.parse({ action, payload });
    const conversation_uuid = parsed.payload.conversation_uuid || 'default';

    memoryService.log.debug('Execute memory action parsed', { action: parsed.action });
    switch (parsed.action) {
      case 'recall': {
        const { query, filters, limit, conversation_uuid } = parsed.payload;
        return this.recallMemories(query, limit, conversation_uuid, filters);
      }
      case 'remember':
        return memoryService.createNewMemory(
          parsed.payload.name,
          parsed.payload.text,
          parsed.payload.category,
          parsed.payload.subcategory,
          parsed.payload.conversation_uuid
        );
      case 'update':
        return memoryService.updateExistingMemory(
          parsed.payload.memory_uuid,
          parsed.payload.name,
          parsed.payload.category_uuid,
          parsed.payload.text,
          parsed.payload.conversation_uuid
        );
      case 'forget':
        return memoryService.deleteExistingMemory(parsed.payload.memory_uuid, parsed.payload.conversation_uuid);
      default:
        return documentService.createErrorDocument({
          error: new Error(`Unknown memory action: ${action}`),
          conversation_uuid,
          context: 'Memory service execution',
          source_uuid: 'memory_service'
        });
    }
  },

  async getMemoryByDocumentUuid(document_uuid: string): Promise<Memory | undefined> {
    memoryService.log.debug('Fetching memory by document UUID', { document_uuid });
    
    const [memory] = await db
      .select()
      .from(memories)
      .where(eq(memories.document_uuid, document_uuid));

    if (memory) {
      memoryService.log.debug('Memory found for document', { memory_uuid: memory.uuid, name: memory.name });
    } else {
      memoryService.log.debug('No memory found for document', { document_uuid });
    }

    return memory;
  },

  async getRecentMemoriesContext(span?: LangfuseSpanClient): Promise<DocumentType> {
    const state = stateManager.getState();
    const today = new Date();

    try {
        // Get all categories from memory config
        const category_queries = memory_categories.map(category => ({
            category: category.name,
            subcategory: category.subcategory
        }));

        // Format the categories into a readable text
        const formatted_content = category_queries
            .map(query => `<category name="${query.category}" subcategory="${query.subcategory}"/>`)
            .join('\n');

        const final_content = formatted_content.trim() || 'No recent memory categories found.';

        return documentService.createDocument({
            conversation_uuid: state.config.conversation_uuid ?? 'unknown',
            source_uuid: 'memory_service',
            text: final_content,
            metadata_override: {
                type: 'document',
                content_type: 'full',
                name: 'RecentMemoryCategories',
                source: 'memory_service',
                description: 'Recent memory categories and subcategories from the last 7 days'
            }
        });
    } catch (error) {
        return documentService.createErrorDocument({
            error: error instanceof Error ? error : new Error('Failed to fetch recent memory categories'),
            conversation_uuid: state.config.conversation_uuid ?? 'unknown',
            context: 'Memory service - getRecentMemoriesContext',
            source_uuid: 'memory_service'
        });
    }
  },

  /**
   * Prunes old and unused memories to optimize storage and performance
   * @param {number} daysThreshold - Number of days after which memories are considered old
   * @returns {Promise<void>}
   */
  async pruneOldMemories(daysThreshold = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    try {
      // Find old memories that haven't been accessed
      const oldMemories = await db
        .select()
        .from(memories)
        .where(
          and(
            lt(memories.updated_at, cutoffDate.toISOString())
          )
        );

      // Batch process memory deletion
      const batchSize = 100;
      for (let i = 0; i < oldMemories.length; i += batchSize) {
        const batch = oldMemories.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async memory => {
            await Promise.all([
              memoryService.deleteMemory(memory.uuid),
              documentService.deleteDocument(memory.document_uuid)
            ]);
          })
        );
      }

      // Clear cache after pruning
      memoryCache.flushAll();
    } catch (error) {
      memoryService.log.error('Memory pruning failed', error as Error);
    }
  }
};
