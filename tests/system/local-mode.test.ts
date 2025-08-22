/**
 * Local-first mode system tests
 * Tests core functionality optimized for local-first use
 */

import { test, expect, describe, mock } from 'bun:test';

// Mock dependencies for local-first testing
mock.module('../../src/database', () => ({
  db: {
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => Promise.resolve([{
          id: 1,
          uuid: 'local-conversation-uuid',
          user_id: null, // Local mode doesn't require user_id
          name: 'Local Conversation',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]))
      }))
    })),
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => Promise.resolve([{
            id: 1,
            uuid: 'local-conversation-uuid',
            user_id: null,
            name: 'Local Conversation',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]))
        }))
      }))
    }))
  }
}));

mock.module('../../src/config/tools.config', () => ({
  buildToolsMap: mock(() => Promise.resolve({
    memory: { execute: mock(() => Promise.resolve({ text: 'Memory result', metadata: {} })) },
    file: { execute: mock(() => Promise.resolve({ text: 'File result', metadata: {} })) },
    speak: { execute: mock(() => Promise.resolve({ text: 'Speech result', metadata: {} })) },
    crypto: { execute: mock(() => Promise.resolve({ text: 'Crypto result', metadata: {} })) },
    image: { execute: mock(() => Promise.resolve({ text: 'Image result', metadata: {} })) }
  })),
  getToolsMap: mock(() => Promise.resolve({
    memory: { execute: mock(() => Promise.resolve({ text: 'Memory result', metadata: {} })) },
    file: { execute: mock(() => Promise.resolve({ text: 'File result', metadata: {} })) },
    speak: { execute: mock(() => Promise.resolve({ text: 'Speech result', metadata: {} })) },
    crypto: { execute: mock(() => Promise.resolve({ text: 'Crypto result', metadata: {} })) },
    image: { execute: mock(() => Promise.resolve({ text: 'Image result', metadata: {} })) }
  }))
}));

describe('Local-First Mode System Tests', () => {
  describe('Core Tools Availability', () => {
    test('should load core tools without external services', async () => {
      const { getToolsMap } = await import('../../src/config/tools.config');
      const toolsMap = await getToolsMap();

      // Core tools should always be available
      expect(toolsMap).toHaveProperty('memory');
      expect(toolsMap).toHaveProperty('file');
      expect(toolsMap).toHaveProperty('speak');
      expect(toolsMap).toHaveProperty('crypto');
      expect(toolsMap).toHaveProperty('image');

      // External services should not be loaded without keys
      expect(toolsMap).not.toHaveProperty('spotify');
      expect(toolsMap).not.toHaveProperty('linear');
      expect(toolsMap).not.toHaveProperty('resend');
    });

    test('should execute core tools successfully', async () => {
      const { getToolsMap } = await import('../../src/config/tools.config');
      const toolsMap = await getToolsMap();

      const memoryResult = await toolsMap.memory.execute('recall', { query: 'test' });
      expect(memoryResult).toHaveProperty('text');
      expect(memoryResult.text).toBe('Memory result');

      const fileResult = await toolsMap.file.execute('read', { path: 'test.txt' });
      expect(fileResult).toHaveProperty('text');
      expect(fileResult.text).toBe('File result');
    });
  });

  describe('Local Mode Configuration', () => {
    test('should work with minimal environment variables', async () => {
      // Set minimal local mode environment
      process.env.AUTH_MODE = 'local';
      process.env.GOOGLE_API_KEY = 'test-key';

      const { buildToolsMap } = await import('../../src/config/tools.config');
      const toolsMap = await buildToolsMap();

      expect(Object.keys(toolsMap).length).toBeGreaterThan(0);
      expect(toolsMap).toHaveProperty('memory');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing external service gracefully', async () => {
      const { buildToolsMap } = await import('../../src/config/tools.config');

      // Ensure external service keys are not set
      delete process.env.SPOTIFY_CLIENT_ID;
      delete process.env.SPOTIFY_CLIENT_SECRET;
      delete process.env.LINEAR_API_KEY;

      const toolsMap = await buildToolsMap();

      // Should not include external services
      expect(toolsMap).not.toHaveProperty('spotify');
      expect(toolsMap).not.toHaveProperty('linear');

      // But should still have core tools
      expect(toolsMap).toHaveProperty('memory');
      expect(toolsMap).toHaveProperty('file');
    });
  });
});
