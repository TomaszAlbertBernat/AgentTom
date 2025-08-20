import { describe, test, expect } from 'bun:test';
import { imageService } from '../../../src/services/tools/image.service';
import { stateManager } from '../../../src/services/agent/state.service';

const hasKey = (name: string) => !!process.env[name] && process.env[name]!.length > 0;

describe('Smoke: Image analysis (Gemini) and generation (OpenAI DALL·E or Vertex Images)', () => {
  // Ensure a conversation id exists
  const state = stateManager.getState();
  // Ensure a valid UUID or leave undefined so DB FK is not violated
  // Ensure conversation_uuid remains nullable in state; tests will rely on service to handle NULL FK
  if (!state.config.conversation_uuid) {
    // leave as null to satisfy schema; no update necessary
  }

  const enableDbSmoke = process.env.SMOKE_IMAGE_DB === '1';

  const testAnalyze = (!hasKey('GOOGLE_API_KEY') || !enableDbSmoke) ? test.skip : test;
  const useVertex = (process.env.IMAGE_PROVIDER || '').toLowerCase() === 'vertex';
  const vertexReady = !!process.env.VERTEX_PROJECT_ID && !!process.env.VERTEX_LOCATION;
  const openaiReady = !!process.env.OPENAI_API_KEY;
  const canGenerate = enableDbSmoke && ((useVertex && vertexReady) || (!useVertex && openaiReady));
  const testGenerate = canGenerate ? test : test.skip;

  testAnalyze('analyze simple image URL with Gemini', async () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/640px-Example.jpg';
    const doc = await imageService.execute('analyze', { image_url: url, query: 'What is this?' });
    expect(doc.text.length).toBeGreaterThan(0);
    expect(doc.metadata.images?.length || 0).toBeGreaterThan(0);
  });

  testGenerate('generate image with configured provider', async () => {
    const doc = await imageService.execute('generate', { prompt: 'a small red triangle icon on a white background', size: '1024x1024' });
    expect(doc.text.includes('Generated image')).toBe(true);
    expect(doc.metadata.images?.length || 0).toBeGreaterThan(0);
  });
});


