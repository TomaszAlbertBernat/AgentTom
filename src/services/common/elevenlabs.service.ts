/**
 * ElevenLabs text-to-speech service for generating audio from text.
 * Provides functionality for converting text to speech using ElevenLabs API.
 * Supports voice selection, model configuration, and streaming audio generation.
 * @module elevenlabs.service
 */

import {z} from 'zod';
import {ElevenLabsClient} from 'elevenlabs';
import { createLogger } from './logger.service';
const ttsLog = createLogger('ElevenLabs');



/**
 * Zod schema for speech generation configuration
 * @constant {z.ZodSchema}
 */
const speechConfigSchema = z.object({
  /** Text to convert to speech */
  text: z.string(),
  /** Voice ID to use for generation (default: Rachel voice) */
  voice: z.string().default('21m00Tcm4TlvDq8ikWAM'),
  /** Model ID for speech generation (default: eleven_turbo_v2_5) */
  model_id: z.string().default('eleven_turbo_v2_5')
});

/** ElevenLabs client instance */
let client: ElevenLabsClient;
try {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required');
  }
  client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
  });
} catch (error) {
  ttsLog.error('Failed to initialize ElevenLabs client. Check ELEVENLABS_API_KEY in .env. ElevenLabs is required for text-to-speech.', error as Error);
  throw error;
}

/**
 * ElevenLabs service for text-to-speech generation
 * @namespace elevenlabsService
 */
const elevenlabsService = {
  /**
   * Converts text to speech using ElevenLabs API
   * @param {string} text - Text to convert to speech
   * @param {string} [voice='21m00Tcm4TlvDq8ikWAM'] - Voice ID to use for generation
   * @param {string} [model_id='eleven_turbo_v2_5'] - Model ID for speech generation
   * @param {LangfuseSpanClient} [span] - Optional Langfuse span for tracking
   * @returns {Promise<AsyncIterable<Uint8Array>>} Streaming audio data
   * @throws {Error} When text-to-speech generation fails
   */
  speak: async (
    text: string,
    voice?: string,
    model_id?: string
  ): Promise<AsyncIterable<Uint8Array>> => {
    try {
      const config = speechConfigSchema.parse({
        text,
        voice,
        model_id
      });

      const audio_stream = await client.generate({
        text: config.text,
        voice: config.voice,
        model_id: config.model_id,
        stream: true
      });

      return audio_stream;
    } catch (error) {
      throw error;
    }
  }
};

export {elevenlabsService};
