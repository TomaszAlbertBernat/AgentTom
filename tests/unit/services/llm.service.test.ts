import { describe, test, expect, beforeEach } from 'bun:test';

// Ensure provider env keys exist for provider selection validation
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-google-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';

let completion: any;
let embedding: any;
let __setAiOpsForTest: any;

function createAsyncIterable(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) {
        await Promise.resolve();
        yield c;
      }
    },
  } as AsyncIterable<string>;
}

describe('LLM Service (unit, mocked AI SDK)', () => {
  beforeEach(async () => {
    // Import fresh module after env is set to ensure provider setup reads env
    const mod = await import('../../../src/services/common/llm.service');
    completion = mod.completion;
    embedding = mod.embedding;
    __setAiOpsForTest = mod.__setAiOpsForTest;

    // Reset AI ops to known mocks before each test
    __setAiOpsForTest({
      generateText: undefined as any,
      streamText: undefined as any,
      generateObject: undefined as any,
      embed: undefined as any,
    });
  });

  test('completion.text uses Google provider path and returns text', async () => {
    __setAiOpsForTest({
      generateText: async () => ({ text: 'hello from google', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }) as any,
    });

    const result = await completion.text({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'ping' }],
      user: { uuid: 'u1' },
      temperature: 0,
    });

    expect(result).toBe('hello from google');
  });

  test('completion.text falls back on rate-limit to fallback model', async () => {
    let callCount = 0;
    __setAiOpsForTest({
      generateText: async () => {
        callCount += 1;
        if (callCount === 1) {
          const err: any = new Error('rate limit');
          err.status = 429;
          throw err;
        }
        return { text: 'recovered via fallback', usage: { totalTokens: 1 } } as any;
      },
    });

    // Ensure fallback model is OpenAI mini unless overridden
    process.env.FALLBACK_TEXT_MODEL = 'gpt-4o-mini';

    const result = await completion.text({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'trigger fallback' }],
      user: { uuid: 'u2' },
    });

    expect(result).toBe('recovered via fallback');
    expect(callCount).toBe(2);
  });

  test.skip('completion.stream returns async iterable', async () => {
    const iterable = createAsyncIterable(['a', 'b']);
    __setAiOpsForTest({
      streamText: async () => ({ textStream: iterable }) as any,
    });

    const stream = await completion.stream({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'stream' }],
      user: { uuid: 'u3' },
    });

    const seen: string[] = [];
    for await (const chunk of stream as AsyncIterable<string>) {
      seen.push(chunk);
    }
    expect(seen).toEqual(['a', 'b']);
  });

  test('completion.object uses generateObject and returns parsed object', async () => {
    __setAiOpsForTest({
      generateObject: async () => ({ object: { ok: true, value: 42 } }) as any,
    });

    const obj = await completion.object<{ ok: boolean; value: number }>({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'return json' }],
      user: { uuid: 'u4' },
    });

    expect(obj.ok).toBe(true);
    expect(obj.value).toBe(42);
  });

  test('embedding uses google embedding path', async () => {
    __setAiOpsForTest({
      embed: async () => ({ embedding: [0.1, 0.2, 0.3] }) as any,
    });

    const vec = await embedding('hello');
    expect(Array.isArray(vec)).toBe(true);
    expect(vec.length).toBe(3);
    expect(vec[0]).toBeCloseTo(0.1);
  });
});


