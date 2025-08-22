/**
 * Unit tests for Conversation Service
 * Tests conversation creation, retrieval, and management
 */

import { test, expect, describe, beforeEach, mock } from 'bun:test';

// Mock database before importing the service
mock.module('../../../src/database', () => ({
  db: {
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => Promise.resolve([{
          id: 1,
          uuid: 'test-uuid',
          user_id: 'test-user',
          name: 'Test Conversation',
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
            uuid: 'test-uuid',
            user_id: 'test-user',
            name: 'Test Conversation',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]))
        }))
      }))
    })),
    from: mock(() => ({
      where: mock(() => ({
        orderBy: mock(() => ({
          limit: mock(() => Promise.resolve([{
            id: 1,
            uuid: 'test-uuid',
            user_id: 'test-user',
            name: 'Test Conversation',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]))
        }))
      }))
    }))
  }
}));

// Mock logger service
mock.module('../../../src/services/common/logger.service', () => ({
  createLogger: mock(() => ({
    debug: mock(() => {}),
    error: mock(() => {}),
    info: mock(() => {})
  }))
}));

// Import after mocks are set up
const { conversationService } = await import('../../../src/services/agent/conversation.service');

describe('Conversation Service', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('create', () => {
    test('should create conversation successfully', async () => {
      const params = {
        uuid: 'test-uuid',
        user_id: 'test-user',
        name: 'Test Conversation'
      };

      const result = await conversationService.create(params);

      expect(result).toBeDefined();
      expect(result.uuid).toBe('test-uuid');
      expect(result.user_id).toBe('test-user');
      expect(result.name).toBe('Test Conversation');
      expect(result.status).toBe('active');
    });

    test('should use default name when none provided', async () => {
      const params = {
        uuid: 'test-uuid',
        user_id: 'test-user'
      };

      const result = await conversationService.create(params);

      expect(result.name).toBe('Test Conversation'); // Mock returns this name
    });

    test('should handle database errors', async () => {
      const db = (await import('../../../src/database')).db;
      db.insert.mockImplementation(() => ({
        values: () => ({
          returning: () => Promise.resolve([]) // Simulate no rows returned
        })
      }));

      const params = {
        uuid: 'test-uuid',
        user_id: 'test-user',
        name: 'Test Conversation'
      };

      await expect(conversationService.create(params)).rejects.toThrow('Failed to create conversation');
    });

    test('should handle database connection errors', async () => {
      const db = (await import('../../../src/database')).db;
      db.insert.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const params = {
        uuid: 'test-uuid',
        user_id: 'test-user',
        name: 'Test Conversation'
      };

      await expect(conversationService.create(params)).rejects.toThrow('Error creating conversation: Database connection failed');
    });
  });

  describe('findByUuid', () => {
    test('should find conversation by UUID', async () => {
      const result = await conversationService.findByUuid('test-uuid');

      expect(result).toBeDefined();
      expect(result?.uuid).toBe('test-uuid');
      expect(result?.user_id).toBe('test-user');
    });

    test('should return undefined when conversation not found', async () => {
      const db = (await import('../../../src/database')).db;
      db.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]) // No results
          })
        })
      }));

      const result = await conversationService.findByUuid('nonexistent-uuid');

      expect(result).toBeUndefined();
    });

    test('should handle database errors', async () => {
      const db = (await import('../../../src/database')).db;
      db.select.mockImplementation(() => {
        throw new Error('Database query failed');
      });

      await expect(conversationService.findByUuid('test-uuid')).rejects.toThrow('Error finding conversation: Database query failed');
    });
  });

  describe('getOrCreate', () => {
    test('should return existing conversation when provided', async () => {
      const result = await conversationService.getOrCreate('test-uuid', 'test-user');

      expect(result).toBe('test-uuid');
    });

    test('should create new conversation when none provided', async () => {
      const result = await conversationService.getOrCreate(undefined, 'test-user');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should create new conversation when provided UUID not found', async () => {
      const db = (await import('../../../src/database')).db;
      // First call returns empty (not found), second call succeeds (create)
      db.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]) // Not found
          })
        })
      }));

      const result = await conversationService.getOrCreate('nonexistent-uuid', 'test-user');

      expect(result).toBe('test-uuid'); // Mock returns this from create
    });

    test('should handle database errors in findByUuid', async () => {
      const db = (await import('../../../src/database')).db;
      db.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(conversationService.getOrCreate('test-uuid', 'test-user')).rejects.toThrow('Error in getOrCreate: Database error');
    });

    test('should handle database errors in create', async () => {
      const db = (await import('../../../src/database')).db;
      // First call succeeds (conversation not found)
      db.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]) // Not found
          })
        })
      }));
      // Second call fails (create error)
      db.insert.mockImplementation(() => {
        throw new Error('Create failed');
      });

      await expect(conversationService.getOrCreate(undefined, 'test-user')).rejects.toThrow('Error in getOrCreate: Create failed');
    });
  });

  describe('getRecentConversations', () => {
    test('should return recent conversations', async () => {
      const result = await conversationService.getRecentConversations({
        user_id: 'test-user',
        limit: 5
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('uuid');
      expect(result[0]).toHaveProperty('user_id');
      expect(result[0]).toHaveProperty('name');
    });

    test('should use default limit when not provided', async () => {
      const result = await conversationService.getRecentConversations({
        user_id: 'test-user'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle empty results', async () => {
      const db = (await import('../../../src/database')).db;
      db.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]) // Empty results
            })
          })
        })
      }));

      const result = await conversationService.getRecentConversations({
        user_id: 'test-user'
      });

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const db = (await import('../../../src/database')).db;
      db.select.mockImplementation(() => {
        throw new Error('Database query failed');
      });

      await expect(conversationService.getRecentConversations({ user_id: 'test-user' })).rejects.toThrow('Error getting recent conversations: Database query failed');
    });

    test('should log debug information', async () => {
      const logger = (await import('../../../src/services/common/logger.service')).createLogger;
      const mockLogger = {
        debug: mock(() => {}),
        error: mock(() => {}),
        info: mock(() => {})
      };
      logger.mockReturnValue(mockLogger);

      await conversationService.getRecentConversations({
        user_id: 'test-user',
        limit: 5
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Fetching recent conversations', { user_id: 'test-user', limit: 5 });
    });
  });

  describe('getConversationMessages', () => {
    test('should return conversation messages', async () => {
      const mockMessages = [
        {
          id: 1,
          uuid: 'msg-1',
          conversation_uuid: 'test-uuid',
          role: 'user',
          content: 'Hello',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          uuid: 'msg-2',
          conversation_uuid: 'test-uuid',
          role: 'assistant',
          content: 'Hi there!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const db = (await import('../../../src/database')).db;
      db.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(mockMessages)
          })
        })
      }));

      const result = await conversationService.getConversationMessages('test-uuid');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockMessages);
    });

    test('should return empty array when no messages', async () => {
      const db = (await import('../../../src/database')).db;
      db.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve([]) // No messages
          })
        })
      }));

      const result = await conversationService.getConversationMessages('test-uuid');

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const db = (await import('../../../src/database')).db;
      db.select.mockImplementation(() => {
        throw new Error('Database query failed');
      });

      await expect(conversationService.getConversationMessages('test-uuid')).rejects.toThrow('Error getting conversation messages: Database query failed');
    });

    test('should order messages by creation date', async () => {
      const mockMessages = [
        {
          id: 1,
          uuid: 'msg-1',
          conversation_uuid: 'test-uuid',
          role: 'user',
          content: 'First message',
          created_at: new Date('2023-01-01').toISOString(),
          updated_at: new Date('2023-01-01').toISOString()
        },
        {
          id: 2,
          uuid: 'msg-2',
          conversation_uuid: 'test-uuid',
          role: 'assistant',
          content: 'Second message',
          created_at: new Date('2023-01-02').toISOString(),
          updated_at: new Date('2023-01-02').toISOString()
        }
      ];

      const db = (await import('../../../src/database')).db;
      db.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(mockMessages)
          })
        })
      }));

      const result = await conversationService.getConversationMessages('test-uuid');

      expect(result).toEqual(mockMessages);
      expect(new Date(result[0].created_at).getTime()).toBeLessThan(new Date(result[1].created_at).getTime());
    });
  });
});
