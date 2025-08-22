/**
 * Unit tests for AI service
 * Tests the core AI agent reasoning, planning, and tool execution
 */

import { test, expect, describe, beforeEach, mock } from 'bun:test';

// Mock dependencies before importing the service
mock.module('../../../src/services/agent/observer.service', () => ({
  observer: {
    startSpan: mock(() => ({ id: 'test-span-id', generation: mock(() => ({ end: mock(() => Promise.resolve()) })), event: mock(() => Promise.resolve()), end: mock(() => Promise.resolve()) })),
    endSpan: mock(() => Promise.resolve())
  }
}));

mock.module('../../../src/services/agent/state.service', () => ({
  stateManager: {
    getState: mock(() => ({
      interaction: {
        messages: [{ role: 'user', content: 'test message' }],
        tasks: [],
        tool_context: []
      },
      config: {
        model: 'gemini-2.5-flash',
        alt_model: 'gemini-2.5-flash',
        user_uuid: 'test-user-uuid',
        conversation_uuid: 'test-conv-uuid',
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
        environment: '',
        context: '',
        tools: [],
        memory: []
      },
      session: {
        tools: [
          { uuid: 'tool-uuid-1', name: 'web', available: true },
          { uuid: 'tool-uuid-2', name: 'search', available: true }
        ]
      }
    })),
    updateThoughts: mock(() => {}),
    updateInteraction: mock(() => {}),
    updateConfig: mock(() => Promise.resolve())
  }
}));

mock.module('../../../src/services/agent/agi.service', () => ({
  shouldContinueThinking: mock(() => false),
  updateActionState: mock(() => Promise.resolve())
}));

mock.module('../../../src/services/agent/task.service', () => ({
  taskService: {
    createTasks: mock(() => Promise.resolve([]))
  }
}));

mock.module('../../../src/services/agent/action.service', () => ({
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
    })),
    updateAction: mock(() => Promise.resolve({
      uuid: 'action-uuid',
      name: 'test action',
      task_uuid: 'task-uuid',
      tool_uuid: 'tool-uuid',
      payload: { test: 'data' },
      sequence: 1,
      status: 'completed',
      result: 'test result'
    }))
  }
}));

mock.module('../../../src/services/common/llm.service', () => ({
  completion: {
    object: mock(() => Promise.resolve({ result: { test: 'response' } }))
  }
}));

mock.module('../../../src/config/tools.config', () => ({
  toolsMap: {
    web: {
      execute: mock(() => Promise.resolve({ success: true, data: 'web result' }))
    }
  }
}));

// Import after mocks are set up
const { aiService } = await import('../../../src/services/agent/ai.service');

describe('AI Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mock.restore();
  });

  describe('fastTrack', () => {
    test('should return true for fast-track queries', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({ result: true }));

      // Mock the completion call to return fast-track decision
      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.fastTrack(mockSpan as any);

      expect(result).toBe(true);
      expect(mockCompletion).toHaveBeenCalledTimes(1);
    });

    test('should return false for complex queries', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({ result: false }));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.fastTrack(mockSpan as any);

      expect(result).toBe(false);
      expect(mockCompletion).toHaveBeenCalledTimes(1);
    });

    test('should handle LLM errors gracefully', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.reject(new Error('LLM Error')));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.fastTrack(mockSpan as any);

      expect(result).toBe(false);
    });

    test('should use recent messages for fast-track analysis', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({ result: true }));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      await aiService.fastTrack(mockSpan as any);

      expect(mockCompletion).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'test message' })
        ])
      }));
    });
  });

  describe('think', () => {
    test('should execute observation and drafting phases', async () => {
      const mockShouldContinue = mock(() => false);
      const originalShouldContinue = (await import('../../../src/services/agent/agi.service')).shouldContinueThinking;
      originalShouldContinue.mockImplementation(mockShouldContinue);

      await aiService.think();

      // Should call observe and draft
      expect(mockShouldContinue).toHaveBeenCalledTimes(1);
    });

    test('should continue thinking loop when needed', async () => {
      let callCount = 0;
      const mockShouldContinue = mock(() => {
        callCount++;
        return callCount < 2; // Continue for one iteration
      });

      const originalShouldContinue = (await import('../../../src/services/agent/agi.service')).shouldContinueThinking;
      originalShouldContinue.mockImplementation(mockShouldContinue);

      await aiService.think();

      expect(mockShouldContinue).toHaveBeenCalledTimes(2);
    });

    test('should break loop on final_answer tool', async () => {
      let callCount = 0;
      const mockShouldContinue = mock(() => {
        callCount++;
        return callCount < 3; // Continue for multiple iterations
      });

      const originalShouldContinue = (await import('../../../src/services/agent/agi.service')).shouldContinueThinking;
      originalShouldContinue.mockImplementation(mockShouldContinue);

      // Mock state to return final_answer tool
      const stateManager = (await import('../../../src/services/agent/state.service')).stateManager;
      stateManager.getState.mockImplementation(() => ({
        config: {
          current_tool: { name: 'final_answer' },
          step: 1
        }
      }));

      await aiService.think();

      expect(mockShouldContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('observe', () => {
    test('should analyze environment and context', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({ result: 'test observation' }));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.observe(mockSpan as any);

      expect(result).toBeDefined();
      expect(mockCompletion).toHaveBeenCalledTimes(2); // environment + context
    });

    test('should handle empty messages gracefully', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({ result: 'test observation' }));

      // Mock empty messages
      const stateManager = (await import('../../../src/services/agent/state.service')).stateManager;
      stateManager.getState.mockImplementation(() => ({
        interaction: { messages: [] },
        config: { alt_model: 'gemini-2.5-flash', user_uuid: 'test', model: 'gemini-2.5-flash' },
        profile: { user_name: 'Test' },
        thoughts: {}
      }));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.observe(mockSpan as any);

      expect(result).toBeDefined();
      expect(mockCompletion).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hello' }) // Default message
        ])
      }));
    });

    test('should update state with observations', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({ result: 'environment observation' }));
      const mockUpdateThoughts = mock(() => {});

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const stateManager = (await import('../../../src/services/agent/state.service')).stateManager;
      stateManager.updateThoughts.mockImplementation(mockUpdateThoughts);

      await aiService.observe(mockSpan as any);

      expect(mockUpdateThoughts).toHaveBeenCalledWith({
        environment: 'environment observation',
        context: 'environment observation'
      });
    });
  });

  describe('draft', () => {
    test('should analyze tools and memory', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({ result: ['tool1', 'tool2'] }));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.draft(mockSpan as any);

      expect(result).toBeDefined();
      expect(mockCompletion).toHaveBeenCalledTimes(2); // tools + memory
    });

    test('should handle empty tool results', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve(null));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.draft(mockSpan as any);

      expect(result).toBeDefined();
    });
  });

  describe('plan', () => {
    test('should create tasks from planning', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({ result: [{ name: 'task1', description: 'test task' }] }));
      const mockCreateTasks = mock(() => Promise.resolve([{ uuid: 'task-uuid', name: 'task1' }]));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const taskService = (await import('../../../src/services/agent/task.service')).taskService;
      taskService.createTasks.mockImplementation(mockCreateTasks);

      const result = await aiService.plan(mockSpan as any);

      expect(result).toBeDefined();
      expect(mockCreateTasks).toHaveBeenCalledWith('test-conv-uuid', [{ name: 'task1', description: 'test task' }]);
    });

    test('should handle empty task results', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve(null));
      const mockCreateTasks = mock(() => Promise.resolve([]));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const taskService = (await import('../../../src/services/agent/task.service')).taskService;
      taskService.createTasks.mockImplementation(mockCreateTasks);

      const result = await aiService.plan(mockSpan as any);

      expect(result).toBeDefined();
      expect(mockCreateTasks).toHaveBeenCalledWith('test-conv-uuid', []);
    });
  });

  describe('next', () => {
    test('should select and create action', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({
        result: {
          name: 'test action',
          tool_name: 'web',
          task_uuid: 'task-uuid'
        }
      }));
      const mockCreateAction = mock(() => Promise.resolve({
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
      }));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const actionService = (await import('../../../src/services/agent/action.service')).actionService;
      actionService.createAction.mockImplementation(mockCreateAction);

      const result = await aiService.next(mockSpan as any);

      expect(result).toBeDefined();
      expect(result?.name).toBe('test action');
      expect(mockCreateAction).toHaveBeenCalledTimes(1);
    });

    test('should return undefined when no action planned', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve(null));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.next(mockSpan as any);

      expect(result).toBeUndefined();
    });

    test('should return undefined when tool not found', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({
        result: {
          name: 'test action',
          tool_name: 'nonexistent-tool',
          task_uuid: 'task-uuid'
        }
      }));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.next(mockSpan as any);

      expect(result).toBeUndefined();
    });
  });

  describe('use', () => {
    test('should generate tool usage payload', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({
        result: {
          action: 'search',
          payload: { query: 'test' }
        }
      }));

      // Mock current tool
      const stateManager = (await import('../../../src/services/agent/state.service')).stateManager;
      stateManager.getState.mockImplementation(() => ({
        config: {
          current_tool: { name: 'web' },
          current_action: { uuid: 'action-uuid' },
          current_task: { uuid: 'task-uuid' },
          model: 'gemini-2.5-flash',
          user_uuid: 'test',
          conversation_uuid: 'test-conv'
        },
        profile: { user_name: 'Test' },
        interaction: {
          messages: [{ role: 'user', content: 'test' }],
          tasks: [{ uuid: 'task-uuid', name: 'test task', actions: [] }],
          tool_context: []
        }
      }));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.use(mockSpan as any);

      expect(result).toBeDefined();
      expect(result?.action).toBe('search');
    });

    test('should return null when no tool use planned', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve(null));

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.use(mockSpan as any);

      expect(result).toBeNull();
    });

    test('should handle tool-specific context gathering', async () => {
      const mockSpan = { generation: mock(() => ({ end: mock(() => Promise.resolve()) })) };
      const mockCompletion = mock(() => Promise.resolve({
        result: {
          action: 'getIssues',
          payload: {}
        }
      }));

      // Mock linear tool
      const stateManager = (await import('../../../src/services/agent/state.service')).stateManager;
      stateManager.getState.mockImplementation(() => ({
        config: {
          current_tool: { name: 'linear' },
          current_action: { uuid: 'action-uuid' },
          model: 'gemini-2.5-flash',
          user_uuid: 'test',
          conversation_uuid: 'test-conv'
        },
        profile: { user_name: 'Test' },
        interaction: {
          messages: [{ role: 'user', content: 'test' }],
          tasks: [],
          tool_context: []
        }
      }));

      // Mock linear service
      const linearService = await import('../../../src/services/tools/linear.service');
      linearService.linearService = { getRecentTasksContext: mock(() => Promise.resolve('linear context')) };

      const originalCompletion = (await import('../../../src/services/common/llm.service')).completion;
      originalCompletion.object = mockCompletion;

      const result = await aiService.use(mockSpan as any);

      expect(result).toBeDefined();
    });
  });

  describe('act', () => {
    test('should execute tool successfully', async () => {
      const mockSpan = {
        end: mock(() => Promise.resolve()),
        event: mock(() => Promise.resolve())
      };
      const mockToolExecute = mock(() => Promise.resolve({ success: true, data: 'result' }));

      // Mock tools map
      const toolsMap = (await import('../../../src/config/tools.config')).toolsMap;
      toolsMap.web = { execute: mockToolExecute };

      const payload = {
        action: 'search',
        payload: { query: 'test' }
      };

      const result = await aiService.act(payload, mockSpan as any);

      expect(result).toEqual({ success: true, data: 'result' });
      expect(mockToolExecute).toHaveBeenCalledWith('search', { query: 'test', conversation_uuid: 'test-conv-uuid' }, mockSpan);
    });

    test('should throw error for unknown tool', async () => {
      const mockSpan = {
        end: mock(() => Promise.resolve()),
        event: mock(() => Promise.resolve())
      };

      // Mock unknown tool
      const stateManager = (await import('../../../src/services/agent/state.service')).stateManager;
      stateManager.getState.mockImplementation(() => ({
        config: {
          current_tool: { name: 'unknown-tool' },
          current_action: { uuid: 'action-uuid' }
        }
      }));

      const payload = {
        action: 'search',
        payload: { query: 'test' }
      };

      await expect(aiService.act(payload, mockSpan as any)).rejects.toThrow('Tool unknown-tool not found');
    });

    test('should handle tool execution errors', async () => {
      const mockSpan = {
        end: mock(() => Promise.resolve()),
        event: mock(() => Promise.resolve())
      };
      const mockToolExecute = mock(() => Promise.reject(new Error('Tool execution failed')));

      const toolsMap = (await import('../../../src/config/tools.config')).toolsMap;
      toolsMap.web = { execute: mockToolExecute };

      const payload = {
        action: 'search',
        payload: { query: 'test' }
      };

      await expect(aiService.act(payload, mockSpan as any)).rejects.toThrow('Tool execution failed');
    });
  });
});
