/**
 * AI service for agent reasoning, planning, and tool execution
 * Implements the core AI agent loop with observation, planning, action, and reflection phases
 * Manages agent thoughts, tool selection, and execution coordination
 * @module ai.service
 */

import {completion} from '../common/llm.service';
import {stateManager} from './state.service';
import {prompt as environmentPrompt} from '../../prompts/agent/environment';
import {prompt as generalContextPrompt} from '../../prompts/agent/context';
import {prompt as toolsPrompt} from '../../prompts/agent/tools';
import {prompt as memoryPrompt} from '../../prompts/agent/memory';
import {prompt as taskPrompt} from '../../prompts/agent/task';
import {prompt as actionPrompt} from '../../prompts/agent/action';
import {prompt as usePrompt} from '../../prompts/agent/use';
import {CoreMessage} from 'ai';
import {observer} from './observer.service';
import {shouldContinueThinking, updateActionState} from './agi.service';
import {taskService} from './task.service';
import {actionService} from './action.service';

import type {Action, AgentThoughts, Task, ToolUsePayload, ToolUseResponse} from '../../types/agent';
import {SimpleSpan} from './observer.service';
import {prompt as fastTrackPrompt} from '../../prompts/agent/fast';
import { linearService } from '../tools/linear.service';
import { calendarService } from './calendar.service';
import { getToolsMap, ToolName } from '../../config/tools.config';
import { memoryService } from './memory.service';

/**
 * AI service for agent reasoning and execution
 * Provides the core intelligence layer for the agent system
 * @namespace aiService
 */
export const aiService = {

  /**
   * Determines if a query can be answered quickly without complex reasoning
   * Uses fast-track analysis to bypass full reasoning loop for simple queries
   * @param span - Tracing span for the fast-track decision
   * @returns Promise that resolves to true if fast-track should be used, false otherwise
   * @example
   * ```typescript
   * const shouldFastTrack = await aiService.fastTrack(span);
   * if (shouldFastTrack) {
   *   // Handle simple query directly
   * } else {
   *   // Use full reasoning loop
   * }
   * ```
   */
  fastTrack: async (span: any): Promise<boolean> => {
    const messages = stateManager.getState().interaction.messages;
    const last_three_user_messages = messages
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .slice(-3) as CoreMessage[];

    const fastTrackMessages: CoreMessage[] = [
      {role: 'system', content: fastTrackPrompt(stateManager.getState())},
      ...last_three_user_messages
    ];

    const fastTrackGeneration = span.generation({
      name: 'fast_track',
      input: fastTrackMessages,
      model: stateManager.getState().config.model
    });

    const fastTrack = await completion.object<{result: boolean}>({
      messages: fastTrackMessages,
      model: stateManager.getState().config.model,
      temperature: 0,
      user: {
        uuid: stateManager.getState().config.user_uuid || '',
        name: stateManager.getState().profile.user_name
      }
    });

    fastTrackGeneration.end({output: fastTrack});

    stateManager.updateConfig({fast_track: !fastTrack?.result || false });

    return fastTrack?.result || false;
  },

  /**
   * Main reasoning loop that orchestrates agent thinking process
   * Combines observation, planning, action, and reflection in iterative cycles
   * Continues until the agent determines it has completed the task
   * @example
   * ```typescript
   * await aiService.think();
   * // Agent has completed its reasoning and action sequence
   * ```
   */
  think: async () => {
    const observingSpan = observer.startSpan('observing', {
      phase: 'observation_and_drafting'
    });

    await aiService.observe(observingSpan);
    await aiService.draft(observingSpan);

    observer.endSpan(observingSpan.id);

    while (shouldContinueThinking()) {
      const thinkingSpan = observer.startSpan(`thinking #${stateManager.getState().config.step}`, {
        phase: 'reasoning_loop'
      });

      await aiService.plan(thinkingSpan);
      await aiService.next(thinkingSpan);

      const state = stateManager.getState();
      if (state.config.current_tool?.name === 'final_answer') break;

      const payload = await aiService.use(thinkingSpan);
      if (payload) {
        await aiService.act(payload, thinkingSpan);
      }

      stateManager.updateConfig({
        step: stateManager.getState().config.step + 1
      });

      observer.endSpan(thinkingSpan.id);
    }
  },

  /**
   * Observes the current environment and context to understand the situation
   * Analyzes the user's message and current state to form environmental awareness
   * @param span - Tracing span for the observation phase
   * @returns Promise that resolves to the updated agent state
   * @example
   * ```typescript
   * const state = await aiService.observe(span);
   * console.log(`Environment: ${state.thoughts.environment}`);
   * ```
   */
  observe: async (span: SimpleSpan) => {
    const state = stateManager.getState();
    const user_message = state.interaction.messages.at(-1)?.content ?? 'Hello';

    const environmentMessages: CoreMessage[] = [
      {role: 'system', content: environmentPrompt(state)},
      {role: 'user', content: user_message}
    ];

    const generalContextMessages: CoreMessage[] = [
      {role: 'system', content: generalContextPrompt(state)},
      {role: 'user', content: user_message}
    ];

    const envGeneration = span.generation({
      name: 'environment',
      input: environmentMessages,
      model: state.config.alt_model
    });

    const contextGeneration = span.generation({
      name: 'context',
      input: generalContextMessages,
      model: state.config.alt_model
    });

    const [environmentObservation, generalContextObservation] = await Promise.all([
      completion.object<AgentThoughts['environment']>({
        messages: environmentMessages,
        model: state.config.alt_model ?? state.config.model,
        temperature: 0,
        user: {
          uuid: state.config.user_uuid || '',
          name: state.profile.user_name
        }
      }),
      completion.object<AgentThoughts['context']>({
        messages: generalContextMessages,
        model: state.config.alt_model ?? state.config.model,
        temperature: 0,
        user: {
          uuid: state.config.user_uuid || '',
          name: state.profile.user_name
        }
      })
    ]);

    stateManager.updateThoughts({
      environment: environmentObservation?.result ?? '',
      context: generalContextObservation?.result ?? ''
    });

    await Promise.all([envGeneration.end({output: environmentObservation}), contextGeneration.end({output: generalContextObservation})]);

    return stateManager.getState();
  },

  /**
   * Drafts initial thoughts about tools and memory relevant to the current task
   * Analyzes available tools and retrieves relevant memories for context
   * @param span - Tracing span for the drafting phase
   * @returns Promise that resolves when drafting is complete
   * @example
   * ```typescript
   * await aiService.draft(span);
   * const state = stateManager.getState();
   * console.log(`Available tools: ${state.thoughts.tools.length}`);
   * ```
   */
  draft: async (span: SimpleSpan) => {
    const state = stateManager.getState();
    const user_message = state.interaction.messages.at(-1)?.content ?? 'Hello';

    const toolsMessages: CoreMessage[] = [
      {role: 'system', content: toolsPrompt(state)},
      {role: 'user', content: user_message}
    ];

    const memoryMessages: CoreMessage[] = [
      {role: 'system', content: memoryPrompt(state)},
      {role: 'user', content: user_message}
    ];

    const toolsGeneration = span.generation({
      name: 'tools',
      input: toolsMessages,
      model: state.config.alt_model ?? state.config.model
    });

    const memoryGeneration = span.generation({
      name: 'memory',
      input: memoryMessages,
      model: state.config.alt_model ?? state.config.model
    });

    const [toolsObservation, memoryObservation] = await Promise.all([
      completion.object<AgentThoughts['tools']>({
        messages: toolsMessages,
        model: state.config.alt_model ?? state.config.model,
        temperature: 0,
        user: {
          uuid: state.config.user_uuid || '',
          name: state.profile.user_name
        }
      }),
      completion.object<AgentThoughts['memory']>({
        messages: memoryMessages,
        model: state.config.alt_model ?? state.config.model,
        temperature: 0,
        user: {
          uuid: state.config.user_uuid || '',
          name: state.profile.user_name
        }
      })
    ]);

    stateManager.updateThoughts({
      tools: toolsObservation?.result ?? [],
      memory: memoryObservation?.result ?? []
    });

    await Promise.all([toolsGeneration.end({output: toolsObservation}), memoryGeneration.end({output: memoryObservation})]);

    return stateManager.getState();
  },

  /**
   * Plans tasks based on the current context and user request
   * Breaks down the user's request into actionable tasks and persists them
   * @param span - Tracing span for the planning phase
   * @returns Promise that resolves to the updated agent state
   * @example
   * ```typescript
   * const state = await aiService.plan(span);
   * console.log(`Created ${state.interaction.tasks.length} tasks`);
   * ```
   */
  plan: async (span: SimpleSpan) => {
    const state = stateManager.getState();

    const user_message = state.interaction.messages.at(-1)?.content ?? 'Hello';

    const taskMessages: CoreMessage[] = [
      {role: 'system', content: taskPrompt(state)},
      {role: 'user', content: user_message}
    ];

    const task_generation = span.generation({
      name: 'task_planning',
      input: taskMessages,
      // NOTE: Never use 'gemini-2.0-flash'.
      model: 'gemini-2.5-flash'
    });

    const taskPlanning = await completion.object<AgentThoughts['task']>({
      messages: taskMessages,
      // NOTE: Never use 'gemini-2.0-flash'.
      model: 'gemini-2.5-flash',
      temperature: 0,
      user: {
        uuid: state.config.user_uuid || '',
        name: state.profile.user_name
      }
    });

    const persisted_tasks = await taskService.createTasks(state.config.conversation_uuid!, taskPlanning?.result ?? []);

    stateManager.updateInteraction({
      tasks: persisted_tasks
    });

    await task_generation.end({output: taskPlanning});

    return stateManager.getState();
  },

  /**
   * Selects the next action to take based on current tasks and context
   * Chooses appropriate tools and creates action records for execution
   * @param span - Tracing span for the action selection phase
   * @returns Promise that resolves to the selected action or undefined if no action needed
   * @example
   * ```typescript
   * const action = await aiService.next(span);
   * if (action) {
   *   console.log(`Selected action: ${action.name} using tool: ${action.tool_uuid}`);
   * }
   * ```
   */
  next: async (span: SimpleSpan) => {
    const state = stateManager.getState();
    const user_message = state.interaction.messages.at(-1)?.content ?? 'Hello';

    const actionMessages: CoreMessage[] = [
      {role: 'system', content: actionPrompt(state)},
      {role: 'user', content: user_message}
    ];

    const action_generation = span.generation({
      name: 'action_selection',
      input: actionMessages,
      model: state.config.model
    });

    const actionPlanning = await completion.object<{
      _thinking: string;
      result: {
        name: string;
        tool_name: string;
        task_uuid: string;
      };
    }>({
      messages: actionMessages,
      model: state.config.model,
      temperature: 0,
      user: {
        uuid: state.config.user_uuid || '',
        name: state.profile.user_name
      }
    });

    if (!actionPlanning?.result) {
      await action_generation.end({output: null});
      return;
    }

    const selected_tool = state.session.tools.find(tool => tool.name === actionPlanning.result.tool_name);

    if (!selected_tool) {
      await action_generation.end({output: null});
      return;
    }

    if (!selected_tool.uuid) {
      await action_generation.end({output: null});
      return;
    }

    const action: Action = {
      uuid: crypto.randomUUID(),
      task_uuid: actionPlanning.result.task_uuid,
      tool_uuid: selected_tool.uuid,
      name: actionPlanning.result.name,
      payload: null,
      sequence: state.config.step,
      status: 'pending' as const
    };

    const persisted_action = await actionService.createAction(action);

    const current_task = state.interaction.tasks.find(task => task.uuid === action.task_uuid);
    if (current_task) {
      const updated_tasks = state.interaction.tasks.map(task =>
        task.uuid === current_task.uuid
          ? {
              ...task,
              actions: [...(task.actions || []), mapActionRecordToAction(persisted_action)]
            }
          : task
      );

      stateManager.updateInteraction({tasks: updated_tasks});
    }

    await stateManager.updateConfig({
      current_action: {uuid: action.uuid, name: action.name},
      current_tool: {uuid: selected_tool.uuid, name: selected_tool.name},
      current_task: current_task
        ? {
            uuid: current_task.uuid,
            name: current_task.name
          }
        : undefined
    });

    const updatedState = stateManager.getState();

    await action_generation.end({output: actionPlanning});

    return action;
  },

  /**
   * Generates tool usage parameters for the selected action
   * Gathers relevant context and determines specific parameters for tool execution
   * @param span - Tracing span for the tool usage phase
   * @returns Promise that resolves to tool use payload or null if no tool use needed
   * @example
   * ```typescript
   * const payload = await aiService.use(span);
   * if (payload) {
   *   console.log(`Tool: ${payload.action}, Payload:`, payload.payload);
   * }
   * ```
   */
  use: async (span: SimpleSpan) => {
    let state = stateManager.getState();
    const user_message = state.interaction.messages.at(-1)?.content ?? 'Hello';

    if (state.config.current_tool?.name === 'linear') {
      const linearContext = await linearService.getRecentTasksContext();
      stateManager.updateInteraction({
        tool_context: [...(stateManager.getState().interaction.tool_context || []), linearContext]
      });
    } else if (state.config.current_tool?.name === 'calendar') {
      const calendarContext = await calendarService.getRecentEventsContext();
      stateManager.updateInteraction({
        tool_context: [...(stateManager.getState().interaction.tool_context || []), calendarContext]
      });
    } else if (state.config.current_tool?.name === 'memory') {
      const memoryContext = await memoryService.getRecentMemoriesContext();
      stateManager.updateInteraction({
        tool_context: [...(stateManager.getState().interaction.tool_context || []), memoryContext]
      });
    }

    state = stateManager.getState();

    const useMessages: CoreMessage[] = [
      {role: 'system', content: usePrompt(state)},
      {role: 'user', content: user_message}
    ];

    const use_generation = span.generation({
      name: 'tool_use',
      input: useMessages,
      model: state.config.model
    });

    const toolUse = await completion.object<ToolUseResponse>({
      messages: useMessages,
      model: state.config.model,
      temperature: 0,
      user: {
        uuid: state.config.user_uuid || '',
        name: state.profile.user_name
      }
    });

    if (!toolUse?.result) {
      await use_generation.end({output: null});
      return null;
    }

    if (state.config.current_action?.uuid) {
      const updated_action = await actionService.updateAction(state.config.current_action.uuid, {
        payload: toolUse.result.payload,
        status: 'pending'
      });

      const current_task = state.interaction.tasks.find(t => t.uuid === state.config.current_task?.uuid);
      if (current_task) {
        const updated_tasks: Task[] = state.interaction.tasks.map((task: Task) =>
          task.uuid === current_task.uuid
            ? {
                ...task,
                actions: task.actions.map(action => (action.uuid === updated_action.uuid ? mapActionRecordToAction(updated_action) : action))
              }
            : task
        );

        stateManager.updateInteraction({tasks: updated_tasks});
      }
    }

    await use_generation.end({output: toolUse});

    return toolUse.result;
  },

  /**
   * Executes the selected tool with the generated payload
   * Handles tool execution, result processing, and state updates
   * @param payload - Tool use payload containing action and parameters
   * @param span - Tracing span for the execution phase
   * @returns Promise that resolves to the tool execution result
   * @throws Error if tool is not found or execution fails
   * @example
   * ```typescript
   * const result = await aiService.act({
   *   action: 'search',
   *   payload: { query: 'AI developments' }
   * };
   * console.log('Tool execution result:', result);
   * ```
   */
  act: async ({action, payload}: ToolUsePayload, span: SimpleSpan) => {
    const state = stateManager.getState();
    const current_tool = state.config.current_tool;

    const toolsMap = await getToolsMap();
    const tool = toolsMap[current_tool?.name ?? 'unknown'];
    if (!tool) {
      await span.end?.({
        output: `Tool ${current_tool?.name} not found`
      });
      throw new Error(`Tool ${current_tool?.name} not found`);
    }

    try {
      const result = await tool.execute(action, {...payload, conversation_uuid: state.config.conversation_uuid});

      if (state.config.current_action?.uuid) {
        await updateActionState({
          action_uuid: state.config.current_action.uuid,
          result
        });
      }

      await span.event?.({
        name: `${current_tool?.name.toLowerCase()}_execution_complete`,
        input: {action, payload},
        output: result,
        metadata: {
          tool: current_tool?.name,
          action,
          payload,
          result
        }
      });

      return result;
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Maps database action record to Action type
 * Converts database record format to the internal Action interface
 * @param record - Database action record with all fields
 * @returns Mapped Action object with proper typing
 * @private
 */
const mapActionRecordToAction = (record: {
  name: string;
  type: string;
  status: string | null;
  id: number;
  uuid: string;
  created_at: string | null;
  updated_at: string | null;
  result: unknown;
  task_uuid: string;
  tool_uuid: string;
  payload: unknown;
  sequence: number | null;
}): Action => ({
  uuid: record.uuid,
  task_uuid: record.task_uuid,
  tool_uuid: record.tool_uuid,
  name: record.name,
  payload: record.payload,
  sequence: record.sequence,
  status: record.status ?? null,
  result: typeof record.result === 'string' ? record.result : null
});
