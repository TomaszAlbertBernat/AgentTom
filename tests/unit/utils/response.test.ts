import { describe, test, expect, mock, beforeEach } from 'bun:test';

// Mocks for observer and AGI service
const endGeneration = mock(() => Promise.resolve());
const finalizeTrace = mock(() => Promise.resolve());
const setAssistantResponse = mock(() => Promise.resolve());

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
    endGeneration.mockClear();
    finalizeTrace.mockClear();
    setAssistantResponse.mockClear();
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
    expect(endGeneration).toHaveBeenCalledTimes(1);
    expect(finalizeTrace).toHaveBeenCalledTimes(1);

    // Validate arguments
    expect(endGeneration).toHaveBeenCalledWith('gen-abc', expect.any(Object));
    expect(finalizeTrace).toHaveBeenCalledWith('trace-xyz', expect.any(Array), expect.any(Array));

    // Assistant response should be recorded via mocked AGI service
    expect(setAssistantResponse).toHaveBeenCalledTimes(1);
    expect(setAssistantResponse).toHaveBeenCalledWith(expect.objectContaining({ conversation_id: 'conv-1' }));
  });
});


