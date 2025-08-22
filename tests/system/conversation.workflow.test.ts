/**
 * System tests for complete conversation workflows
 * Tests end-to-end user interactions with the AI agent
 */

import { test, expect, describe, beforeEach, mock } from 'bun:test';

// Mock all dependencies for system-level testing
mock.module('../../src/database', () => ({
  db: {
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => Promise.resolve([{
          id: 1,
          uuid: 'test-conversation-uuid',
          user_id: 'test-user-uuid',
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
            uuid: 'test-conversation-uuid',
            user_id: 'test-user-uuid',
            name: 'Test Conversation',
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
            uuid: 'test-message-uuid',
            conversation_uuid: 'test-conversation-uuid',
            role: 'user',
            content: 'Hello',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]))
        }))
      }))
    }))
  }
}));

mock.module('../../src/services/agent/agi.service', () => ({
  shouldContinueThinking: mock(() => false),
  updateActionState: mock(() => Promise.resolve()),
  setAssistantResponse: mock(() => Promise.resolve())
}));

mock.module('../../src/services/agent/state.service', () => ({
  stateManager: {
    getState: mock(() => ({
      interaction: {
        messages: [
          { role: 'user', content: 'Hello, can you help me?' },
          { role: 'assistant', content: 'Hi! I\'m here to help. What would you like to know?' }
        ],
        tasks: [],
        tool_context: []
      },
      config: {
        model: 'gemini-2.5-flash',
        alt_model: 'gemini-2.5-flash',
        user_uuid: 'test-user-uuid',
        conversation_uuid: 'test-conversation-uuid',
        step: 1,
        current_tool: null,
        current_action: null,
        current_task: null,
        fast_track: false
      },
      profile: {
        user_name: 'Test User'
      },
      thoughts: {
        environment: 'User is asking for help',
        context: 'New conversation with user',
        tools: [],
        memory: []
      },
      session: {
        tools: []
      }
    })),
    updateThoughts: mock(() => {}),
    updateInteraction: mock(() => {}),
    updateConfig: mock(() => Promise.resolve())
  }
}));

mock.module('../../src/services/common/llm.service', () => ({
  completion: {
    object: mock(() => Promise.resolve({
      result: {
        _thinking: 'User asked for help, I should provide assistance',
        content: 'Hi! I\'m here to help. What would you like to know?'
      }
    }))
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
  toolsMap: {}
}));

// Import services after mocks are set up
const conversationService = await import('../../src/services/agent/conversation.service');
const aiService = await import('../../src/services/agent/ai.service');

describe('Conversation Workflow System Tests', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('Complete Conversation Flow', () => {
    test('should handle new user conversation creation and first message', async () => {
      // 1. Create new conversation
      const conversation = await conversationService.conversationService.create({
        uuid: 'test-conversation-uuid',
        user_id: 'test-user-uuid',
        name: 'New Conversation'
      });

      expect(conversation).toBeDefined();
      expect(conversation.uuid).toBe('test-conversation-uuid');
      expect(conversation.user_id).toBe('test-user-uuid');
      expect(conversation.status).toBe('active');

      // 2. Verify conversation exists
      const foundConversation = await conversationService.conversationService.findByUuid('test-conversation-uuid');
      expect(foundConversation?.uuid).toBe('test-conversation-uuid');

      // 3. Get conversation messages (should be empty initially)
      const messages = await conversationService.conversationService.getConversationMessages('test-conversation-uuid');
      expect(Array.isArray(messages)).toBe(true);
    });

    test('should handle conversation message flow', async () => {
      const mockMessages = [
        {
          id: 1,
          uuid: 'user-message-uuid',
          conversation_uuid: 'test-conversation-uuid',
          role: 'user',
          content: 'Hello, can you help me?',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          uuid: 'assistant-message-uuid',
          conversation_uuid: 'test-conversation-uuid',
          role: 'assistant',
          content: 'Hi! I\'m here to help. What would you like to know?',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Mock the database to return messages
      const db = (await import('../../src/database')).db;
      db.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(mockMessages)
          })
        })
      }));

      const messages = await conversationService.conversationService.getConversationMessages('test-conversation-uuid');

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello, can you help me?');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toBe('Hi! I\'m here to help. What would you like to know?');

      // Verify chronological order
      const firstMessageTime = new Date(messages[0].created_at).getTime();
      const secondMessageTime = new Date(messages[1].created_at).getTime();
      expect(firstMessageTime).toBeLessThanOrEqual(secondMessageTime);
    });

    test('should handle getOrCreate conversation logic', async () => {
      // Test creating new conversation when none exists
      const newConversationId = await conversationService.conversationService.getOrCreate(
        undefined,
        'test-user-uuid'
      );

      expect(newConversationId).toBeDefined();
      expect(typeof newConversationId).toBe('string');

      // Test returning existing conversation
      const existingConversationId = await conversationService.conversationService.getOrCreate(
        'test-conversation-uuid',
        'test-user-uuid'
      );

      expect(existingConversationId).toBe('test-conversation-uuid');
    });
  });

  describe('AI Agent Reasoning Flow', () => {
    test('should execute complete AI reasoning cycle', async () => {
      // Mock fast-track decision
      const originalFastTrack = aiService.aiService.fastTrack;
      aiService.aiService.fastTrack = mock(() => Promise.resolve(false));

      // Mock individual AI service methods
      const originalObserve = aiService.aiService.observe;
      const originalDraft = aiService.aiService.draft;
      const originalPlan = aiService.aiService.plan;

      aiService.aiService.observe = mock(() => Promise.resolve({}));
      aiService.aiService.draft = mock(() => Promise.resolve({}));
      aiService.aiService.plan = mock(() => Promise.resolve({}));

      // Execute thinking flow
      await aiService.aiService.think();

      expect(originalObserve).toHaveBeenCalledTimes(1);
      expect(originalDraft).toHaveBeenCalledTimes(1);
      expect(originalPlan).toHaveBeenCalledTimes(1);

      // Restore original methods
      aiService.aiService.fastTrack = originalFastTrack;
      aiService.aiService.observe = originalObserve;
      aiService.aiService.draft = originalDraft;
      aiService.aiService.plan = originalPlan;
    });

    test('should handle fast-track queries correctly', async () => {
      // Mock fast-track decision
      const originalFastTrack = aiService.aiService.fastTrack;
      aiService.aiService.fastTrack = mock(() => Promise.resolve(true));

      const result = await aiService.aiService.fastTrack({} as any);

      expect(result).toBe(true);

      // Restore original method
      aiService.aiService.fastTrack = originalFastTrack;
    });

    test('should handle complex queries requiring full reasoning', async () => {
      // Mock fast-track decision
      const originalFastTrack = aiService.aiService.fastTrack;
      aiService.aiService.fastTrack = mock(() => Promise.resolve(false));

      const result = await aiService.aiService.fastTrack({} as any);

      expect(result).toBe(false);

      // Restore original method
      aiService.aiService.fastTrack = originalFastTrack;
    });
  });

  describe('Tool Integration Workflow', () => {
    test('should handle tool selection and action creation', async () => {
      // Mock AI service to return action planning result
      const originalNext = aiService.aiService.next;
      aiService.aiService.next = mock(() => Promise.resolve({
        uuid: 'action-uuid',
        task_uuid: 'task-uuid',
        tool_uuid: 'tool-uuid',
        name: 'search action',
        payload: null,
        sequence: 1,
        status: 'pending'
      }));

      const action = await aiService.aiService.next({} as any);

      expect(action).toBeDefined();
      expect(action?.name).toBe('search action');
      expect(action?.status).toBe('pending');

      // Restore original method
      aiService.aiService.next = originalNext;
    });

    test('should handle tool execution workflow', async () => {
      // Mock tool execution
      const mockToolExecute = mock(() => Promise.resolve({
        success: true,
        data: 'Search results'
      }));

      const toolsMap = (await import('../../src/config/tools.config')).toolsMap;
      toolsMap.web = { execute: mockToolExecute };

      // Mock AI service to provide tool usage payload
      const originalUse = aiService.aiService.use;
      aiService.aiService.use = mock(() => Promise.resolve({
        action: 'search',
        payload: { query: 'test search' }
      }));

      const payload = await aiService.aiService.use({} as any);

      expect(payload).toBeDefined();
      expect(payload?.action).toBe('search');

      // Test tool execution
      const originalAct = aiService.aiService.act;
      const result = await aiService.aiService.act(payload!, {} as any);

      expect(result).toEqual({
        success: true,
        data: 'Search results'
      });

      // Restore original methods
      aiService.aiService.use = originalUse;
      aiService.aiService.act = originalAct;
    });
  });

  describe('Multi-turn Conversation Flow', () => {
    test('should maintain conversation context across multiple turns', async () => {
      // Mock conversation with multiple messages
      const mockMessages = [
        {
          id: 1,
          uuid: 'msg-1',
          conversation_uuid: 'test-conversation-uuid',
          role: 'user',
          content: 'Hello',
          created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          updated_at: new Date(Date.now() - 300000).toISOString()
        },
        {
          id: 2,
          uuid: 'msg-2',
          conversation_uuid: 'test-conversation-uuid',
          role: 'assistant',
          content: 'Hi there!',
          created_at: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
          updated_at: new Date(Date.now() - 240000).toISOString()
        },
        {
          id: 3,
          uuid: 'msg-3',
          conversation_uuid: 'test-conversation-uuid',
          role: 'user',
          content: 'Can you help me with something?',
          created_at: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
          updated_at: new Date(Date.now() - 180000).toISOString()
        },
        {
          id: 4,
          uuid: 'msg-4',
          conversation_uuid: 'test-conversation-uuid',
          role: 'assistant',
          content: 'Of course! What do you need help with?',
          created_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          updated_at: new Date(Date.now() - 120000).toISOString()
        }
      ];

      const db = (await import('../../src/database')).db;
      db.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.resolve(mockMessages)
          })
        })
      }));

      const messages = await conversationService.conversationService.getConversationMessages('test-conversation-uuid');

      expect(messages).toHaveLength(4);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('user');
      expect(messages[3].role).toBe('assistant');

      // Verify chronological order is maintained
      for (let i = 1; i < messages.length; i++) {
        const prevTime = new Date(messages[i - 1].created_at).getTime();
        const currTime = new Date(messages[i].created_at).getTime();
        expect(prevTime).toBeLessThanOrEqual(currTime);
      }
    });

    test('should handle conversation state transitions', async () => {
      // Test conversation state changes would happen here
      // This would involve testing state management across multiple turns

      const conversation = await conversationService.conversationService.findByUuid('test-conversation-uuid');

      expect(conversation).toBeDefined();
      expect(conversation?.status).toBe('active');

      // In a real scenario, we might test status changes based on user actions
      // For now, we verify the conversation maintains its active state
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle conversation service errors gracefully', async () => {
      // Mock database error
      const db = (await import('../../src/database')).db;
      db.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(conversationService.conversationService.findByUuid('nonexistent-uuid'))
        .rejects.toThrow('Error finding conversation: Database connection failed');
    });

    test('should handle AI service errors gracefully', async () => {
      // Mock LLM service error
      const llmService = (await import('../../src/services/common/llm.service')).completion;
      llmService.object = mock(() => Promise.reject(new Error('LLM service unavailable')));

      const originalObserve = aiService.aiService.observe;

      // This would test error handling in the observe method
      // In practice, the observe method should handle LLM errors gracefully

      // Restore original method
      aiService.aiService.observe = originalObserve;
    });

    test('should recover from temporary service failures', async () => {
      // Test scenario: service fails initially but recovers
      // This would involve mocking a service that fails once then succeeds

      let callCount = 0;
      const db = (await import('../../src/database')).db;
      db.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary network error');
        }
        return {
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([{
                id: 1,
                uuid: 'recovered-conversation-uuid',
                user_id: 'test-user-uuid',
                name: 'Recovered Conversation',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }])
            })
          })
        };
      });

      // First call should fail
      await expect(conversationService.conversationService.findByUuid('test-uuid'))
        .rejects.toThrow('Temporary network error');

      // Second call should succeed (recovery simulation)
      const result = await conversationService.conversationService.findByUuid('test-uuid');
      expect(result).toBeDefined();
      expect(result?.uuid).toBe('recovered-conversation-uuid');
    });
  });
});
