import { describe, test, expect, mock, beforeEach } from 'bun:test';

// Mocks for observer and AGI service
const endGeneration = mock.fn(async (_id: string, _output: any) => {});
const finalizeTrace = mock.fn(async (_traceId: string, _messages: any[], _completions: any[]) => {});
const setAssistantResponse = mock.fn(async (_: any) => {});

// Mock modules BEFORE importing the module under test
mock.module('../../../src/services/agent/observer.service', () => ({
  observer: { endGeneration, finalizeTrace },
}));

mock.module('../../../src/services/agent/agi.service', () => ({
  setAssistantResponse,
}));

// Import after mocks are set up
const { streamResponse } = await import('../../../src/utils/response');

function readableFromChunks(chunks: string[], delayMs = 0): ReadableStream<string> {
  let index = 0;
  return new ReadableStream<string>({
    async start(controller) {
      for (const chunk of chunks) {
        if (delayMs) await new Promise(r => setTimeout(r, delayMs));
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

describe('streamResponse monitoring hooks', () => {
  beforeEach(() => {
    endGeneration.mock.reset();
    finalizeTrace.mock.reset();
    setAssistantResponse.mock.reset();
  });

  test('calls endGeneration and finalizeTrace on flush', async () => {
    const metadata = {
      traceId: 'trace-xyz',
      generationId: 'gen-abc',
      messages: [{ role: 'user', content: 'hi' }],
      conversation_id: 'conv-1',
    } as const;

    const ctx: any = {
      header: (_name: string, _value: string) => {},
      newResponse: (stream: ReadableStream<string>) => stream,
    };

    const source = readableFromChunks(['Hello', ' ', 'world']);
    const result = await streamResponse(ctx, source, metadata, 'gemini-2.5-flash');

    // Consume the stream to completion to trigger flush actions
    const reader = (result as ReadableStream<string>).getReader();
    let received = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value;
    }

    // Ensure SSE framing occurred (basic sanity check)
    expect(received.includes('data: ')).toBeTrue();

    // Monitoring hooks should have been called once
    expect(endGeneration.mock.calls.length).toBe(1);
    expect(finalizeTrace.mock.calls.length).toBe(1);

    // Validate arguments
    expect(endGeneration.mock.calls[0][0]).toBe('gen-abc');
    expect(finalizeTrace.mock.calls[0][0]).toBe('trace-xyz');

    // Assistant response should be recorded via mocked AGI service
    expect(setAssistantResponse.mock.calls.length).toBe(1);
    expect(setAssistantResponse.mock.calls[0][0].conversation_id).toBe('conv-1');
  });
});


