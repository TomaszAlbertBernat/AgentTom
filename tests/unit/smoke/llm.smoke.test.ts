import { describe, test, expect } from 'bun:test';
import { completion, embedding } from '../../../src/services/common/llm.service';

const hasKey = (name: string) => !!process.env[name] && process.env[name]!.length > 0;

describe('Smoke: LLM (Gemini)', () => {
  if (!hasKey('GOOGLE_API_KEY')) {
    test.skip('skipped – GOOGLE_API_KEY not set', () => {});
    return;
  }

  test('text completion returns non-empty string', async () => {
    const result = await completion.text({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in one short sentence.' }
      ],
      user: { uuid: 'smoke-user' },
      temperature: 0
    });

    expect(typeof result).toBe('string');
    expect((result as string).length).toBeGreaterThan(0);
  });

  test('streaming yields at least one chunk', async () => {
    const stream = await completion.stream({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are concise.' },
        { role: 'user', content: 'Stream two short words.' }
      ],
      user: { uuid: 'smoke-user' },
      temperature: 0
    });

    let seen = 0;
    for await (const chunk of stream as AsyncIterable<string>) {
      expect(typeof chunk).toBe('string');
      seen += chunk.length > 0 ? 1 : 0;
      if (seen > 0) break; // only need to verify at least one
    }
    expect(seen).toBeGreaterThan(0);
  });

  test('embeddings returns numeric vector', async () => {
    const vec = await embedding('hello world');
    expect(Array.isArray(vec)).toBe(true);
    expect(vec.length).toBeGreaterThan(100);
    expect(vec.every((v) => typeof v === 'number')).toBe(true);
  });
});


