import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { aiService } from '../../../src/services/agent/ai.service';
import { stateManager } from '../../../src/services/agent/state.service';
import { toolsMap } from '../../../src/config/tools.config';

describe('aiService.act - tools dispatch', () => {
  let originalFileTool: any;

  const span = {
    event: async () => {},
    end: async () => {}
  } as any;

  beforeEach(async () => {
    originalFileTool = (toolsMap as any).file;
    await (stateManager as any).updateConfig({
      current_tool: { uuid: 'tool-1', name: 'file' },
      // Avoid DB writes in unit path by not setting current_action
      current_action: null,
      conversation_uuid: 'conv-123'
    });
  });

  afterEach(() => {
    (toolsMap as any).file = originalFileTool;
  });

  test('dispatches to current tool and forwards payload with conversation_uuid', async () => {
    const calls: any[] = [];
    (toolsMap as any).file = {
      execute: async (action: string, payload: any) => {
        calls.push({ action, payload });
        return { text: 'ok', metadata: { uuid: 'doc-1' } } as any;
      }
    };

    const result = await aiService.act(
      { action: 'upload', payload: { path: 'a.txt', content: 'x' } },
      span
    );

    expect(result).toEqual({ text: 'ok', metadata: { uuid: 'doc-1' } });
    expect(calls.length).toBe(1);
    expect(calls[0].action).toBe('upload');
    expect(calls[0].payload).toMatchObject({
      path: 'a.txt',
      content: 'x',
      conversation_uuid: 'conv-123'
    });
  });

  test('throws when current tool is missing', async () => {
    await (stateManager as any).updateConfig({
      current_tool: { uuid: 'tool-2', name: 'nonexistent' }
    });

    await expect(
      aiService.act({ action: 'x', payload: {} }, span)
    ).rejects.toThrow(/not found/i);
  });
});


