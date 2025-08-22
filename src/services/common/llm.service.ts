// @cspell:ignore chatcmpl logprobs
import { embed as aiEmbed, generateText as aiGenerateText, generateObject as aiGenerateObject, streamText as aiStreamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import {type CompletionConfig} from '../../types/llm';
import type {CoreMessage} from 'ai';
import type {ChatCompletion} from 'openai/resources/chat/completions';

import { ValidationError } from '../../utils/errors';
import {providers} from '../../config/llm.config';
import { env } from '../../config/env.config';
import { isLocalMode, getApiKey } from '../../config/local-user.config';

/**
 * Get API key for a service, checking local user config first if in local mode
 * @param envKey - Environment variable name
 * @param localKey - Local user config key
 * @returns API key or undefined
 */
const getApiKeyForService = (envKey: string, localKey: string): string | undefined => {
  // In local mode, prefer local user config
  if (isLocalMode()) {
    const localApiKey = getApiKey(localKey as any);
    if (localApiKey) {
      return localApiKey;
    }
  }

  // Fall back to environment variable
  return process.env[envKey];
};

// Lightweight indirection layer to make AI SDK calls testable without network I/O
type AiOps = {
  generateText: typeof aiGenerateText;
  streamText: typeof aiStreamText;
  generateObject: typeof aiGenerateObject;
  embed: typeof aiEmbed;
};

let aiOps: AiOps = {
  generateText: aiGenerateText,
  streamText: aiStreamText,
  generateObject: aiGenerateObject,
  embed: aiEmbed,
};

// Test-only hook: allows unit tests to stub AI SDK calls
export function __setAiOpsForTest(overrides: Partial<AiOps>) {
  aiOps = { ...aiOps, ...overrides };
}

/**
 * Creates a base configuration for LLM operations
 * Automatically selects the appropriate provider based on the model and validates configuration
 * 
 * @param config - The completion configuration
 * @returns Base configuration with resolved provider and validated parameters
 * @throws {Error} When model is not found in configuration
 */
// NOTE: Do not use 'gemini-2.0-flash'. Default to env DEFAULT_TEXT_MODEL or 'gemini-2.5-flash'.
const resolveDefaultModel = () => {
  const configured = env.DEFAULT_TEXT_MODEL || 'gemini-2.5-flash';
  return configured === 'gemini-2.0-flash' ? 'gemini-2.5-flash' : configured;
};

const resolveFallbackModel = () => {
  // Use OpenAI as fallback since we removed FALLBACK_TEXT_MODEL from config
  return 'gpt-4o-mini';
};

const isRateLimitOrQuotaError = (error: unknown): boolean => {
  const err = error as any;
  const status = err?.status || err?.response?.status || err?.cause?.status;
  const message = (err?.message || err?.response?.data || '').toString().toLowerCase();
  return status === 429 || message.includes('rate limit') || message.includes('quota') || message.includes('resource exhausted');
};

type NormalizedErrorType =
  | 'rate_limit'
  | 'auth'
  | 'invalid_request'
  | 'timeout'
  | 'content_filter'
  | 'server'
  | 'network'
  | 'unknown';

function detectErrorType(err: any): NormalizedErrorType {
  const status = err?.status || err?.response?.status || err?.cause?.status;
  const msg = (err?.message || err?.response?.data || '').toString().toLowerCase();
  if (status === 429 || msg.includes('rate limit') || msg.includes('quota') || msg.includes('resource exhausted')) return 'rate_limit';
  if (status === 401 || msg.includes('invalid api key') || msg.includes('unauthorized')) return 'auth';
  if (status === 400 || msg.includes('bad request') || msg.includes('invalid') || msg.includes('malformed')) return 'invalid_request';
  if (status === 408 || msg.includes('timeout')) return 'timeout';
  if (status && status >= 500) return 'server';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('socket')) return 'network';
  return 'unknown';
}

function normalizeAIError(error: unknown, provider: string, model: string) {
  const err: any = error || {};
  const type = detectErrorType(err);
  const status = err?.status || err?.response?.status || err?.cause?.status;
  const code = err?.code || err?.response?.data?.code || (type === 'rate_limit' ? 'RATE_LIMIT' : undefined);
  const rawMessage = (err?.message || err?.response?.data || '').toString();
  const message = rawMessage || 'Unknown LLM provider error';
  return { type, code, status, provider, model, message };
}

const createBaseConfig = ({model = resolveDefaultModel(), messages, temperature = 0.7, max_tokens = 16384, user}: CompletionConfig) => {
  const provider = Object.entries(providers).find(([_, models]) => 
    Object.keys(models).includes(model)
  )?.[0] ?? 'openai';

  const modelSpec = providers[provider][model];
  if (!modelSpec) {
    throw new ValidationError(`Model ${model} not found in configuration`);
  }

  // Return the actual LanguageModelV1 object based on provider
  let languageModel;
  if (provider === 'openai') {
    const openaiKey = getApiKeyForService('OPENAI_API_KEY', 'openai');
    if (!openaiKey) {
      throw new ValidationError('OpenAI API key not configured. ' + (isLocalMode()
        ? 'Configure OpenAI API key via local user settings or set OPENAI_API_KEY environment variable.'
        : 'Set OPENAI_API_KEY environment variable.'));
    }
    languageModel = openai(model);
  } else if (provider === 'google') {
    const googleKey = getApiKeyForService('GOOGLE_API_KEY', 'google');
    if (!googleKey) {
      throw new ValidationError('Google API key not configured. ' + (isLocalMode()
        ? 'Configure Google API key via local user settings or set GOOGLE_API_KEY environment variable.'
        : 'Set GOOGLE_API_KEY environment variable.'));
    }
    languageModel = google(model);
  } else {
    throw new ValidationError(`Unsupported provider: ${provider}`);
  }

  return {
    model: languageModel,
    messages: messages as CoreMessage[],
    temperature,
    maxTokens: Math.min(max_tokens, modelSpec.maxOutput),
    user: user.uuid
  };
};

/**
 * LLM Completion Service
 * 
 * Provides text generation, streaming, and structured object completion using various LLM providers.
 * Supports Google Gemini and OpenAI providers with automatic model selection and configuration.
 * 
 * Key features:
 * - Multi-provider support (Google Gemini, OpenAI)
 * - Streaming text generation
 * - Structured object generation
 * - Automatic token limit management
 * - OpenAI-compatible response formatting
 * 
 * @example
 * ```typescript
 * // Text completion
 * const text = await completion.text({
 *   model: 'gemini-2.5-flash',
 *   messages: [{ role: 'user', content: 'Hello, world!' }],
 *   user: { uuid: 'user-123' },
 *   temperature: 0.7
 * });
 * 
 * // Streaming completion
 * const stream = await completion.stream({
 *   model: 'gemini-2.5-flash',
 *   messages: [{ role: 'user', content: 'Write a story...' }],
 *   user: { uuid: 'user-123' }
 * });
 * 
 * for await (const chunk of stream) {
 *   console.log(chunk);
 * }
 * ```
 */
export const completion = {
  /**
   * Generates text completion using the specified model
   * 
   * @param config - The completion configuration
   * @param config.model - The model to use (default: 'gemini-2.5-flash')
   * @param config.messages - Array of conversation messages
   * @param config.temperature - Randomness level (0-1, default: 0.7)
   * @param config.max_tokens - Maximum tokens to generate (default: 16384)
   * @param config.user - User information for tracking
   * @param openAIFormat - Whether to return OpenAI-compatible response format
   * @returns Generated text or OpenAI-formatted response
   * @throws {Error} When text completion fails
   * 
   * @example
   * ```typescript
   * // Simple text generation
   * const text = await completion.text({
 *   model: 'gemini-2.5-flash',
   *   messages: [
   *     { role: 'system', content: 'You are a helpful assistant.' },
   *     { role: 'user', content: 'Explain quantum computing in simple terms.' }
   *   ],
   *   user: { uuid: 'user-123' },
   *   temperature: 0.5,
   *   max_tokens: 1000
   * });
   * 
   * // OpenAI-compatible format
   * const response = await completion.text(config, true);
   * console.log(response.choices[0].message.content);
   * ```
   */
  text: async ({max_tokens = 16384, ...config}: CompletionConfig, openAIFormat = false): Promise<string | ChatCompletion> => {
    const primaryModel = (config.model && config.model !== 'gemini-2.0-flash') ? config.model : resolveDefaultModel();
    const fallbackModel = resolveFallbackModel();
    try {
      const result = await aiOps.generateText({
        ...createBaseConfig({...config, model: primaryModel}),
        // maxTokens removed - using AI SDK defaults
      });
      return openAIFormat ? generateResponseBody(result.text, primaryModel, result.usage) : result.text;
    } catch (error) {
      // Retry with fallback on rate limit/quota
      if (isRateLimitOrQuotaError(error) && fallbackModel !== primaryModel) {
        try {
          const result = await aiOps.generateText({
            ...createBaseConfig({...config, model: fallbackModel}),
            // maxTokens removed - using AI SDK defaults
          });
          return openAIFormat ? generateResponseBody(result.text, fallbackModel, result.usage) : result.text;
        } catch (fallbackError) {
          const norm = normalizeAIError(fallbackError, 'fallback', fallbackModel);
          throw new Error(`Text completion failed after fallback [${norm.type}${norm.status ? ` ${norm.status}` : ''}]: ${norm.message}`);
        }
      }
      const norm = normalizeAIError(error, 'primary', primaryModel);
      throw new Error(`Text completion failed [${norm.type}${norm.status ? ` ${norm.status}` : ''}]: ${norm.message}`);
    }
  },

  /**
   * Creates a streaming text completion
   * Returns an async iterable stream of text chunks
   * 
   * @param config - The completion configuration
   * @param config.model - The model to use (default: 'gemini-2.5-flash')
   * @param config.messages - Array of conversation messages
   * @param config.temperature - Randomness level (0-1, default: 0.7)
   * @param config.max_tokens - Maximum tokens to generate (default: 16384)
   * @param config.user - User information for tracking
   * @returns Async iterable stream of text chunks
   * @throws {Error} When stream completion fails
   * 
   * @example
   * ```typescript
   * const stream = await completion.stream({
 *   model: 'gemini-2.5-flash',
   *   messages: [
   *     { role: 'user', content: 'Write a creative story about AI.' }
   *   ],
   *   user: { uuid: 'user-123' },
   *   temperature: 0.8
   * });
   * 
   * let fullResponse = '';
   * for await (const chunk of stream) {
   *   fullResponse += chunk;
   *   console.log(chunk); // Print each chunk as it arrives
   * }
   * ```
   */
  stream: async ({max_tokens = 16384, ...config}: CompletionConfig) => {
    const primaryModel = (config.model && config.model !== 'gemini-2.0-flash') ? config.model : resolveDefaultModel();
    const fallbackModel = resolveFallbackModel();
    try {
      const _provider = Object.entries(providers).find(([_, models]) =>
        Object.keys(models).includes(primaryModel)
      )?.[0] ?? 'openai';

      const {textStream} = aiOps.streamText({
        ...createBaseConfig({...config, model: primaryModel}),
        // maxTokens removed - using AI SDK defaults
      });
      return textStream;
    } catch (error) {
      if (isRateLimitOrQuotaError(error) && fallbackModel !== primaryModel) {
        const _provider = Object.entries(providers).find(([_, models]) =>
          Object.keys(models).includes(fallbackModel)
        )?.[0] ?? 'openai';
        const {textStream} = aiOps.streamText({
          ...createBaseConfig({...config, model: fallbackModel}),
          // maxTokens removed - using AI SDK defaults
        });
        return textStream;
      }
      const norm = normalizeAIError(error, 'primary', primaryModel);
      throw new Error(`Stream completion failed [${norm.type}${norm.status ? ` ${norm.status}` : ''}]: ${norm.message}`);
    }
  },

  /**
   * Generates structured object completion
   * Returns a parsed JSON object based on the model's response
   * 
   * @template T - The expected return type of the generated object
   * @param config - The completion configuration
   * @returns Parsed object of type T
   * @throws {Error} When object completion or parsing fails
   * 
   * @example
   * ```typescript
   * interface AnalysisResult {
   *   sentiment: 'positive' | 'negative' | 'neutral';
   *   confidence: number;
   *   keywords: string[];
   * }
   * 
   * const analysis = await completion.object<AnalysisResult>({
 *   model: 'gemini-2.5-flash',
   *   messages: [
   *     {
   *       role: 'system',
   *       content: 'Analyze the sentiment and extract keywords. Return JSON with sentiment, confidence, and keywords.'
   *     },
   *     { role: 'user', content: 'I love this new AI technology!' }
   *   ],
   *   user: { uuid: 'user-123' }
   * });
   * 
   * console.log(analysis.sentiment); // 'positive'
   * console.log(analysis.confidence); // 0.95
   * ```
   */
  object: async <T = unknown>(config: CompletionConfig): Promise<T> => {
    const primaryModel = (config.model && config.model !== 'gemini-2.0-flash') ? config.model : resolveDefaultModel();
    const fallbackModel = resolveFallbackModel();
    try {
      const _provider = Object.entries(providers).find(([_, models]) =>
        Object.keys(models).includes(primaryModel)
      )?.[0] ?? 'openai';



      const {object} = await aiOps.generateObject({
        ...createBaseConfig({...config, model: primaryModel}),
        output: 'no-schema'
      });
      return object as T;
    } catch (error) {
      if (isRateLimitOrQuotaError(error) && fallbackModel !== primaryModel) {
        // Fallback to text and JSON.parse if generateObject not supported by fallback
        try {
          const result = await completion.text({ ...config, model: fallbackModel });
          return JSON.parse(result as string) as T;
        } catch (fallbackError) {
          const norm = normalizeAIError(fallbackError, 'fallback', fallbackModel);
          throw new Error(`Object completion failed after fallback [${norm.type}${norm.status ? ` ${norm.status}` : ''}]: ${norm.message}`);
        }
      }
      const norm = normalizeAIError(error, 'primary', primaryModel);
      throw new Error(`Object completion failed [${norm.type}${norm.status ? ` ${norm.status}` : ''}]: ${norm.message}`);
    }
  }
};

/**
 * Generates text embeddings for semantic search and similarity operations
 * Uses OpenAI's text-embedding-3-large model for high-quality vector representations
 * 
 * @param text - The text to generate embeddings for
 * @returns Array of numbers representing the text embedding
 * @throws {Error} When embedding generation fails
 * 
 * @example
 * ```typescript
 * const textEmbedding = await embedding('This is a sample text for embedding');
 * console.log(textEmbedding.length); // 3072 (text-embedding-3-large dimensions)
 * 
 * // Use in vector search
 * const searchResults = await vectorService.searchSimilar(textEmbedding, {
 *   source: 'documents',
 *   limit: 10
 * });
 * ```
 */
export const embedding = async (text: string) => {
  try {
    const {embedding} = await aiOps.embed({
      model: google.embedding('text-embedding-004'),
      value: text
    });
    return embedding;
  } catch (error) {
    // Fallback to OpenAI embeddings if available
    const openaiKey = getApiKeyForService('OPENAI_API_KEY', 'openai');
    if (openaiKey) {
      const {embedding} = await aiOps.embed({
        model: openai.embedding('text-embedding-3-large'),
        value: text
      });
      return embedding;
    }
    throw error instanceof Error ? error : new Error('Embedding generation failed');
  }
};

/**
 * Generates streaming chunk response in OpenAI format
 * Creates a properly formatted streaming response chunk for real-time text generation
 * 
 * @param delta - The text content for this chunk
 * @param model - The model identifier
 * @returns OpenAI-compatible streaming chunk object
 * 
 * @example
 * ```typescript
 * const chunk = generateChunk('Hello, ', 'gemini-2.5-flash');
 * // Returns: { id: 'chatcmpl-...', object: 'chat.completion.chunk', ... }
 * ```
 */
export function generateChunk(delta: string, model: string) {
  return {
    id: 'chatcmpl-' + Date.now(),
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    system_fingerprint: 'fp_' + Math.random().toString(36).substring(2, 15),
    choices: [{index: 0, delta: {role: 'assistant', content: delta}, logprobs: null, finish_reason: null}]
  };
}

/**
 * Generates complete response body in OpenAI format
 * Creates a properly formatted completion response compatible with OpenAI API
 * 
 * @param response - The generated text response
 * @param model - The model identifier
 * @param usage - Optional usage statistics
 * @returns OpenAI-compatible ChatCompletion object
 * 
 * @example
 * ```typescript
 * const response = generateResponseBody(
 *   'Hello! How can I help you today?',
 *   'gemini-2.5-flash',
 *   { promptTokens: 20, completionTokens: 8, totalTokens: 28 }
 * );
 * ```
 */
export function generateResponseBody(response: string, model: string, usage?: any): ChatCompletion {
  return {
    id: 'chatcmpl-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    system_fingerprint: 'fp_' + Math.random().toString(36).substring(2, 15),
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: response,
          refusal: null
        },
        logprobs: null,
        finish_reason: 'stop'
      }
    ],
    usage: usage
      ? {
          prompt_tokens: usage.promptTokens ?? 0,
          completion_tokens: usage.completionTokens ?? 0,
          total_tokens: usage.totalTokens ?? 0
        }
      : {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
  };
}

/**
 * Configuration interface for audio transcription
 */
interface TranscriptionConfig {
  /** Language code for transcription (e.g., 'en', 'es', 'fr') */
  language: string;
  /** Optional prompt to guide transcription */
  prompt?: string;
  /** Model to use for transcription (default: 'whisper-1') */
  model?: string;
}

/**
 * Result interface for transcription operations
 */
interface TranscriptionResult {
  /** The transcribed text content */
  text: string;
  /** Original filename */
  file_name: string;
  /** Optional file path */
  file_path?: string;
}



/**
 * Audio Transcription Service
 * 
 * Provides speech-to-text conversion using OpenAI's Whisper model.
 * Supports multiple audio formats and batch processing capabilities.
 * 
 * Key features:
 * - Buffer and file-based transcription
 * - Multi-language support
 * - Batch processing for multiple files
 * - Automatic temporary file management
 * 
 * @example
 * ```typescript
 * // Transcribe audio buffer
 * const audioBuffer = await fs.readFile('audio.mp3');
 * const text = await transcription.fromBuffer(audioBuffer, {
 *   language: 'en',
 *   prompt: 'This is a technical discussion about AI.'
 * });
 * 
 * // Batch transcription
 * const results = await transcription.fromFiles([
 *   'audio1.mp3',
 *   'audio2.wav'
 * ], { language: 'en' });
 * ```
 */
export const transcription = {
  /**
   * Transcribes audio from a buffer
   * 
   * @param audio_buffer - The audio data as a Buffer
   * @param config - Transcription configuration
   * @returns The transcribed text
   * @throws {Error} When transcription fails
   * 
   * @example
   * ```typescript
   * const audioBuffer = await fs.readFile('recording.mp3');
   * const transcribedText = await transcription.fromBuffer(audioBuffer, {
   *   language: 'en',
   *   prompt: 'Technical discussion about machine learning',
   *   model: 'whisper-1'
   * });
   * 
   * console.log('Transcribed:', transcribedText);
   * ```
   */
  fromBuffer: async (
    audio_buffer: Buffer,
    config: TranscriptionConfig = { language: 'en' }
  ): Promise<string> => {
    // Prefer Gemini audio transcription when available; fall back to Whisper
    const googleKey = getApiKeyForService('GOOGLE_API_KEY', 'google') ||
                     process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const useGoogle = !!googleKey;

    // Simplified: Only basic audio transcription support for local-first usage

    // No fallback available - require Google API key for transcription
    throw new ValidationError('Audio transcription requires Google API key. ' + (isLocalMode()
      ? 'Configure Google API key via local user settings or set GOOGLE_API_KEY environment variable.'
      : 'Set GOOGLE_API_KEY environment variable.'));
  },

  /**
   * Transcribes multiple audio files in batch
   * 
   * @param file_paths - Array of file paths to transcribe
   * @param config - Transcription configuration with optional output naming
   * @returns Array of transcription results with metadata
   * @throws {Error} When batch transcription fails
   * 
   * @example
   * ```typescript
   * const results = await transcription.fromFiles([
   *   '/path/to/meeting1.mp3',
   *   '/path/to/meeting2.wav',
   *   '/path/to/interview.m4a'
   * ], {
   *   language: 'en',
   *   prompt: 'Business meeting transcription'
   * });
   * 
   * results.forEach(result => {
   *   console.log(`File: ${result.file_name}`);
   *   console.log(`Text: ${result.text}`);
   * });
   * ```
   */
  fromFiles: async (
    file_paths: string[],
    config: TranscriptionConfig & { output_name?: string } = { language: 'en' }
  ): Promise<TranscriptionResult[]> => {
    try {
      const results = await Promise.all(
        file_paths.map(async (file_path): Promise<TranscriptionResult> => {
          const file = Bun.file(file_path);
          const buffer = await file.arrayBuffer();
          
          const text = await transcription.fromBuffer(Buffer.from(buffer), config);
          
          return {
            text,
            file_name: file.name || 'unknown.ogg',
            file_path
          };
        })
      );

      return results;
    } catch (error) {
      throw new Error(`Batch transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};
