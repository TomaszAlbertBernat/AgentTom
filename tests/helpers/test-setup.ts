/**
 * Test setup and utilities for AgentTom test suite
 */

// Global type declarations for Bun test functions
declare global {
  function beforeEach(fn: () => void | Promise<void>): void;
  function afterEach(fn: () => void | Promise<void>): void;
}

// Mock environment variables for testing
export const mockEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'ERROR', // Reduce noise in tests
  DATABASE_URL: ':memory:', // Use in-memory SQLite for tests
  OPENAI_API_KEY: 'test-openai-key',
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  QDRANT_URL: 'http://localhost:6333',
  ALGOLIA_APPLICATION_ID: 'test-algolia-app-id',
  ALGOLIA_API_KEY: 'test-algolia-key',
  ALGOLIA_INDEX_NAME: 'test-index'
};

// Store original environment variables
const originalEnv = { ...process.env };

/**
 * Mock logger for testing - suppresses output and captures logs
 */
export const createMockLogger = () => {
  const logs: Array<{ level: string; message: string; data?: any }> = [];
  
  return {
    logs,
    error: (message: string, error?: Error, data?: any) => 
      logs.push({ level: 'ERROR', message, data: { error, ...data } }),
    warn: (message: string, data?: any) => 
      logs.push({ level: 'WARN', message, data }),
    info: (message: string, data?: any) => 
      logs.push({ level: 'INFO', message, data }),
    debug: (message: string, data?: any) => 
      logs.push({ level: 'DEBUG', message, data }),
    trace: (message: string, data?: any) => 
      logs.push({ level: 'TRACE', message, data }),
    startup: (message: string, data?: any) => 
      logs.push({ level: 'INFO', message: `🚀 ${message}`, data }),
    database: (message: string, data?: any) => 
      logs.push({ level: 'INFO', message: `🗄️ ${message}`, data }),
    api: (message: string, data?: any) => 
      logs.push({ level: 'INFO', message: `🌐 ${message}`, data }),
    tool: (message: string, data?: any) => 
      logs.push({ level: 'INFO', message: `🔧 ${message}`, data }),
    migration: (message: string, data?: any) => 
      logs.push({ level: 'INFO', message: `📦 ${message}`, data }),
    child: (component: string) => createMockComponentLogger(component, logs)
  };
};

/**
 * Mock component logger for testing
 */
const createMockComponentLogger = (component: string, logs: any[]) => ({
  error: (message: string, error?: Error, data?: any) => 
    logs.push({ level: 'ERROR', message, data: { component, error, ...data } }),
  warn: (message: string, data?: any) => 
    logs.push({ level: 'WARN', message, data: { component, ...data } }),
  info: (message: string, data?: any) => 
    logs.push({ level: 'INFO', message, data: { component, ...data } }),
  debug: (message: string, data?: any) => 
    logs.push({ level: 'DEBUG', message, data: { component, ...data } }),
  trace: (message: string, data?: any) => 
    logs.push({ level: 'TRACE', message, data: { component, ...data } })
});

/**
 * Mock vector service for testing
 */
export const createMockVectorService = () => ({
  searchSimilar: async (embedding: number[], filters?: any, limit = 10) => {
    // Return mock vector search results
    return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
      id: `test-doc-${i}`,
      score: 0.9 - (i * 0.1),
      payload: {
        document_uuid: `test-document-uuid-${i}`,
        content_type: 'chunk',
        source: 'test',
        ...filters
      }
    }));
  },
  
  upsert: async (points: any[]) => {
    // Mock upsert operation
    return { operation_id: 'test-operation-id' };
  },
  
  delete: async (point_id: string) => {
    // Mock delete operation
    return { operation_id: 'test-delete-operation-id' };
  }
});

/**
 * Mock Algolia service for testing
 */
export const createMockAlgoliaService = () => ({
  search: async (query: string, options?: any) => {
    // Return mock Algolia search results
    return {
      results: [{
        hits: Array.from({ length: 3 }, (_, i) => ({
          objectID: `test-algolia-${i}`,
          document_uuid: `test-document-uuid-${i}`,
          text: `Test content for ${query} - result ${i}`,
          source: 'test',
          content_type: 'chunk'
        })),
        nbHits: 3,
        query
      }]
    };
  },
  
  index: async (documents: any[]) => {
    // Mock indexing operation
    return { objectIDs: documents.map((_, i) => `test-object-${i}`) };
  }
});

/**
 * Mock document service for testing
 */
export const createMockDocumentService = () => ({
  getDocumentByUuid: async (uuid: string) => {
    if (uuid.startsWith('test-document-uuid-')) {
      return {
        uuid,
        text: `Test document content for ${uuid}`,
        source: 'test',
        content_type: 'chunk',
        created_at: new Date(),
        updated_at: new Date(),
        metadata: { test: true }
      };
    }
    return null;
  },
  
  createDocument: async (data: any) => {
    return {
      uuid: 'new-test-document-uuid',
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
  }
});

/**
 * Mock memory service for testing
 */
export const createMockMemoryService = () => ({
  getMemoryByDocumentUuid: async (documentUuid: string) => {
    if (documentUuid.startsWith('test-document-uuid-')) {
      return {
        uuid: `memory-${documentUuid}`,
        name: `Test Memory for ${documentUuid}`,
        document_uuid: documentUuid,
        created_at: new Date(),
        updated_at: new Date()
      };
    }
    return null;
  }
});

/**
 * Utility to wait for async operations in tests
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility to create mock embedding vectors
 */
export const createMockEmbedding = (dimension = 768): number[] => {
  return Array.from({ length: dimension }, () => Math.random() - 0.5);
};

/**
 * Assertion helpers for testing
 */
export const testHelpers = {
  /**
   * Asserts that an array contains expected number of items
   */
  assertArrayLength: (array: any[], expectedLength: number, message?: string) => {
    if (array.length !== expectedLength) {
      throw new Error(message || `Expected array length ${expectedLength}, got ${array.length}`);
    }
  },

  /**
   * Asserts that an object has expected properties
   */
  assertHasProperties: (obj: any, properties: string[], message?: string) => {
    const missing = properties.filter(prop => !(prop in obj));
    if (missing.length > 0) {
      throw new Error(message || `Missing properties: ${missing.join(', ')}`);
    }
  },

  /**
   * Asserts that a mock function was called with expected arguments
   */
  assertCalledWith: (mockLogs: any[], level: string, messagePattern: string | RegExp) => {
    const found = mockLogs.some(log => 
      log.level === level && 
      (typeof messagePattern === 'string' 
        ? log.message.includes(messagePattern)
        : messagePattern.test(log.message)
      )
    );
    
    if (!found) {
      throw new Error(`Expected ${level} log with pattern "${messagePattern}" not found`);
    }
  }
}; 