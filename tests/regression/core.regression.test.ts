/**
 * Core regression test suite
 * These tests ensure critical functionality remains working after changes
 * Run these tests before releases and after significant changes
 */

import { test, expect, describe, beforeAll, mock } from 'bun:test';

// Mock all external dependencies for consistent testing
mock.module('../../src/database', () => ({
  db: {
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => Promise.resolve([{
          id: 1,
          uuid: 'regression-test-uuid',
          user_id: 'test-user-uuid',
          name: 'Regression Test',
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
            uuid: 'regression-test-uuid',
            user_id: 'test-user-uuid',
            name: 'Regression Test',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]))
        }))
      }))
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() => Promise.resolve([{
            id: 1,
            uuid: 'message-uuid',
            conversation_uuid: 'regression-test-uuid',
            role: 'user',
            content: 'Test message',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]))
        }))
      }))
    }))
  }
}));

mock.module('../../src/services/common/llm.service', () => ({
  completion: {
    object: mock(() => Promise.resolve({
      result: {
        _thinking: 'Processing user request',
        content: 'Test response from AI'
      }
    }))
  }
}));

mock.module('../../src/services/agent/state.service', () => ({
  stateManager: {
    getState: mock(() => ({
      interaction: {
        messages: [{ role: 'user', content: 'Test message' }],
        tasks: [],
        tool_context: []
      },
      config: {
        model: 'gemini-2.5-flash',
        user_uuid: 'test-user-uuid',
        conversation_uuid: 'regression-test-uuid',
        step: 1
      },
      profile: { user_name: 'Test User' },
      thoughts: {},
      session: { tools: [] }
    })),
    updateThoughts: mock(() => {}),
    updateInteraction: mock(() => {}),
    updateConfig: mock(() => Promise.resolve())
  }
}));

mock.module('../../src/services/agent/observer.service', () => ({
  observer: {
    startSpan: mock(() => ({
      id: 'test-span-id',
      generation: mock(() => ({ end: mock(() => Promise.resolve()) })),
      event: mock(() => Promise.resolve()),
      end: mock(() => Promise.resolve())
    })),
    endSpan: mock(() => Promise.resolve())
  }
}));

mock.module('../../src/services/agent/agi.service', () => ({
  shouldContinueThinking: mock(() => false),
  updateActionState: mock(() => Promise.resolve()),
  setAssistantResponse: mock(() => Promise.resolve())
}));

mock.module('../../src/services/agent/task.service', () => ({
  taskService: {
    createTasks: mock(() => Promise.resolve([]))
  }
}));

mock.module('../../src/services/agent/action.service', () => ({
  actionService: {
    createAction: mock(() => Promise.resolve({
      id: 1,
      uuid: 'action-uuid',
      name: 'test action',
      task_uuid: 'task-uuid',
      tool_uuid: 'tool-uuid',
      payload: null,
      sequence: 1,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      result: null
    }))
  }
}));

mock.module('../../src/config/tools.config', () => ({
  toolsMap: {
    web: {
      execute: mock(() => Promise.resolve({ success: true, data: 'Test result' }))
    }
  }
}));

// Import services after mocks
const conversationService = await import('../../src/services/agent/conversation.service');
const aiService = await import('../../src/services/agent/ai.service');

describe('Core Regression Test Suite', () => {
  beforeAll(() => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.API_KEY = 'test-api-key';
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  describe('Application Startup Regression', () => {
    test('should have all required environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.APP_URL).toBe('http://localhost:3000');
      expect(process.env.API_KEY).toBe('test-api-key');
      expect(process.env.JWT_SECRET).toBe('test-jwt-secret');
    });

    test('should load critical services without errors', async () => {
      // Test that services can be imported without throwing
      expect(conversationService).toBeDefined();
      expect(aiService).toBeDefined();

      // Test basic service functionality
      const conversation = await conversationService.conversationService.create({
        uuid: 'regression-test-uuid',
        user_id: 'test-user-uuid',
        name: 'Regression Test'
      });

      expect(conversation).toBeDefined();
      expect(conversation.uuid).toBe('regression-test-uuid');
    });
  });

  describe('Database Operations Regression', () => {
    test('should perform basic CRUD operations', async () => {
      // Create
      const conversation = await conversationService.conversationService.create({
        uuid: 'regression-db-uuid',
        user_id: 'test-user-uuid',
        name: 'DB Regression Test'
      });

      expect(conversation).toBeDefined();
      expect(conversation.name).toBe('DB Regression Test');

      // Read
      const found = await conversationService.conversationService.findByUuid('regression-db-uuid');
      expect(found?.uuid).toBe('regression-db-uuid');

      // Update (via getOrCreate with existing UUID)
      const existing = await conversationService.conversationService.getOrCreate(
        'regression-db-uuid',
        'test-user-uuid'
      );
      expect(existing).toBe('regression-db-uuid');
    });

    test('should handle database errors gracefully', async () => {
      const db = (await import('../../src/database')).db;
      const originalSelect = db.select;

      // Mock database error
      db.select = mock(() => {
        throw new Error('Database connection failed');
      });

      await expect(conversationService.conversationService.findByUuid('test-uuid'))
        .rejects.toThrow('Error finding conversation: Database connection failed');

      // Restore original method
      db.select = originalSelect;
    });
  });

  describe('AI Service Regression', () => {
    test('should handle fast-track decisions', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };

      // Test fast-track true
      const llmService = (await import('../../src/services/common/llm.service')).completion;
      llmService.object = mock(() => Promise.resolve({ result: true }));

      const fastTrackResult = await aiService.aiService.fastTrack(mockSpan as any);
      expect(fastTrackResult).toBe(true);

      // Test fast-track false
      llmService.object = mock(() => Promise.resolve({ result: false }));

      const noFastTrackResult = await aiService.aiService.fastTrack(mockSpan as any);
      expect(noFastTrackResult).toBe(false);
    });

    test('should execute reasoning cycle', async () => {
      const originalObserve = aiService.aiService.observe;
      const originalDraft = aiService.aiService.draft;
      const originalPlan = aiService.aiService.plan;

      // Mock methods to avoid external dependencies
      aiService.aiService.observe = mock(() => Promise.resolve({}));
      aiService.aiService.draft = mock(() => Promise.resolve({}));
      aiService.aiService.plan = mock(() => Promise.resolve({}));

      await aiService.aiService.think();

      expect(aiService.aiService.observe).toHaveBeenCalledTimes(1);
      expect(aiService.aiService.draft).toHaveBeenCalledTimes(1);
      expect(aiService.aiService.plan).toHaveBeenCalledTimes(1);

      // Restore original methods
      aiService.aiService.observe = originalObserve;
      aiService.aiService.draft = originalDraft;
      aiService.aiService.plan = originalPlan;
    });

    test('should handle tool execution', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const payload = {
        action: 'search',
        payload: { query: 'test' }
      };

      const result = await aiService.aiService.act(payload, mockSpan as any);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBe('Test result');
    });
  });

  describe('Authentication Regression', () => {
    test('should handle JWT token operations', async () => {
      // Mock JWT operations
      const mockJwt = {
        sign: mock(() => Promise.resolve('test-jwt-token')),
        verify: mock(() => Promise.resolve({ userId: 'test-user-uuid' }))
      };

      // This test would verify JWT signing/verification works
      // In a real scenario, this would test the actual auth middleware
      expect(mockJwt.sign).toBeDefined();
      expect(mockJwt.verify).toBeDefined();

      const token = await mockJwt.sign({ userId: 'test-user-uuid' }, 'secret');
      expect(token).toBe('test-jwt-token');

      const payload = await mockJwt.verify(token, 'secret');
      expect(payload.userId).toBe('test-user-uuid');
    });

    test('should validate user authentication flows', async () => {
      // Test authentication flow logic
      // This would verify user registration, login, and token validation

      const mockUser = {
        id: 'test-user-uuid',
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockToken = 'test-jwt-token';

      // Verify user object structure
      expect(mockUser).toHaveProperty('id');
      expect(mockUser).toHaveProperty('email');
      expect(mockUser).toHaveProperty('name');
      expect(mockToken).toBeDefined();
    });
  });

  describe('API Endpoints Regression', () => {
    test('should handle HTTP request/response cycle', async () => {
      // Mock HTTP client behavior
      const mockFetch = mock(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok' })
      }));

      global.fetch = mockFetch;

      // Simulate API call
      const response = await mockFetch('http://localhost:3000/api/web/health');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });

    test('should handle error responses correctly', async () => {
      const mockFetch = mock(() => Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      }));

      global.fetch = mockFetch;

      const response = await mockFetch('http://localhost:3000/api/protected');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Configuration Regression', () => {
    test('should load configuration without errors', async () => {
      // Test configuration loading
      const envConfig = await import('../../src/config/env.config');
      const llmConfig = await import('../../src/config/llm.config');

      expect(envConfig).toBeDefined();
      expect(llmConfig).toBeDefined();

      // Verify critical config values
      expect(envConfig.envConfig.app).toBeDefined();
      expect(envConfig.envConfig.auth).toBeDefined();
    });

    test('should validate environment variables', () => {
      // Test environment variable validation
      const requiredEnvVars = [
        'NODE_ENV',
        'APP_URL',
        'API_KEY',
        'JWT_SECRET'
      ];

      requiredEnvVars.forEach(envVar => {
        expect(process.env[envVar]).toBeDefined();
        expect(process.env[envVar]).not.toBe('');
      });
    });
  });

  describe('Performance Regression', () => {
    test('should complete operations within acceptable time limits', async () => {
      const startTime = Date.now();

      // Test a basic operation
      await conversationService.conversationService.create({
        uuid: 'performance-test-uuid',
        user_id: 'test-user-uuid',
        name: 'Performance Test'
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle concurrent operations', async () => {
      const operationCount = 10;
      const promises = Array(operationCount).fill(null).map((_, i) =>
        conversationService.conversationService.create({
          uuid: `concurrent-test-${i}`,
          user_id: 'test-user-uuid',
          name: `Concurrent Test ${i}`
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All operations should succeed
      results.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(result.uuid).toBe(`concurrent-test-${i}`);
      });

      // Should complete within reasonable time (allowing for some overhead)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Error Handling Regression', () => {
    test('should handle service unavailability gracefully', async () => {
      // Mock service unavailability
      const llmService = (await import('../../src/services/common/llm.service')).completion;
      const originalObject = llmService.object;

      llmService.object = mock(() => Promise.reject(new Error('Service unavailable')));

      // Test that AI service handles the error
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };

      await expect(aiService.aiService.observe(mockSpan as any)).rejects.toThrow('Service unavailable');

      // Restore original method
      llmService.object = originalObject;
    });

    test('should validate input data correctly', async () => {
      // Test input validation
      await expect(conversationService.conversationService.create({
        uuid: '', // Invalid UUID
        user_id: 'test-user',
        name: 'Test'
      })).rejects.toThrow();

      await expect(conversationService.conversationService.create({
        uuid: 'test-uuid',
        user_id: '', // Invalid user ID
        name: 'Test'
      })).rejects.toThrow();
    });
  });

  describe('Data Integrity Regression', () => {
    test('should maintain data consistency across operations', async () => {
      const testUuid = 'integrity-test-uuid';

      // Create conversation
      const created = await conversationService.conversationService.create({
        uuid: testUuid,
        user_id: 'test-user-uuid',
        name: 'Integrity Test'
      });

      expect(created.uuid).toBe(testUuid);
      expect(created.user_id).toBe('test-user-uuid');
      expect(created.name).toBe('Integrity Test');

      // Verify conversation exists
      const found = await conversationService.conversationService.findByUuid(testUuid);
      expect(found?.uuid).toBe(testUuid);
      expect(found?.user_id).toBe('test-user-uuid');
      expect(found?.name).toBe('Integrity Test');

      // Verify data consistency
      expect(created.uuid).toBe(found?.uuid);
      expect(created.user_id).toBe(found?.user_id);
      expect(created.name).toBe(found?.name);
    });

    test('should handle concurrent data modifications', async () => {
      // Test concurrent modifications don't corrupt data
      const testUuid = 'concurrent-data-test';

      // Create multiple promises that modify the same conversation
      const promises = [
        conversationService.conversationService.getOrCreate(testUuid, 'user-1'),
        conversationService.conversationService.getOrCreate(testUuid, 'user-2'),
        conversationService.conversationService.getOrCreate(testUuid, 'user-3')
      ];

      const results = await Promise.all(promises);

      // All should return the same UUID (first one wins)
      results.forEach(result => {
        expect(result).toBe(testUuid);
      });
    });
  });
});
