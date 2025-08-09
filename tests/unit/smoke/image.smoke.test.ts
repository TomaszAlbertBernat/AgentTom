import { describe, test, expect } from 'bun:test';
import { imageService } from '../../../src/services/tools/image.service';
import { stateManager } from '../../../src/services/agent/state.service';

const hasKey = (name: string) => !!process.env[name] && process.env[name]!.length > 0;

describe('Smoke: Image analysis (Gemini) and generation (OpenAI DALL·E)', () => {
  // Ensure a conversation id exists
  const state = stateManager.getState();
  if (!state.config.conversation_uuid) {
    stateManager.updateConfig({ conversation_uuid: 'smoke-conv' });
  }

  const enableDbSmoke = process.env.SMOKE_IMAGE_DB === '1';

  test(!hasKey('GOOGLE_API_KEY') || !enableDbSmoke ? test.skip : 'analyze simple image URL with Gemini', async () => {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/640px-Example.jpg';
    const doc = await imageService.execute('analyze', { image_url: url, query: 'What is this?' });
    expect(doc.text.length).toBeGreaterThan(0);
    expect(doc.metadata.images?.length || 0).toBeGreaterThan(0);
  });

  test(!hasKey('OPENAI_API_KEY') || !enableDbSmoke ? test.skip : 'generate image with DALL·E', async () => {
    const doc = await imageService.execute('generate', { prompt: 'a small red triangle icon on a white background', size: '1024x1024' });
    expect(doc.text.includes('Generated image')).toBe(true);
    expect(doc.metadata.images?.length || 0).toBeGreaterThan(0);
  });
});


