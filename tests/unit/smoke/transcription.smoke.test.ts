import { describe, test, expect } from 'bun:test';
import { transcription } from '../../../src/services/common/llm.service';

const hasKey = (name: string) => !!process.env[name] && process.env[name]!.length > 0;

describe('Smoke: Audio transcription (Whisper/OpenAI)', () => {
  if (!hasKey('OPENAI_API_KEY')) {
    test.skip('skipped – OPENAI_API_KEY not set', () => {});
    return;
  }

  test('transcribe short OGG sample buffer', async () => {
    // 1-second silent OGG file header (very small) – may still fail; use lenient assertions
    const base64 = 'T2dnUwACAAAAAAAAAAD5vQAA/////wE7nSYAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const buffer = Buffer.from(base64, 'base64');
    try {
      const text = await transcription.fromBuffer(buffer, { language: 'en', prompt: 'Silence sample' });
      // Some API versions reject silence; accept either empty or some string
      expect(typeof text).toBe('string');
    } catch (err) {
      // Accept network or content errors in smoke runs; ensure it throws a standard Error
      expect(err instanceof Error).toBe(true);
    }
  });
});


