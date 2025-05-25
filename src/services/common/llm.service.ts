// @cspell:ignore chatcmpl logprobs
import {embed, generateText, generateObject, streamText} from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import OpenAI, { toFile } from 'openai';
import {type CompletionConfig} from '../../types/llm';
import type {CoreMessage} from 'ai';
import type {ChatCompletion} from 'openai/resources/chat/completions';
import {tempFile} from './upload.service';
import {providers} from '../../config/llm.config';

/**
 * Creates a base configuration for LLM operations
 * Automatically selects the appropriate provider based on the model and validates configuration
 * 
 * @param config - The completion configuration
 * @returns Base configuration with resolved provider and validated parameters
 * @throws {Error} When model is not found in configuration
 */
const createBaseConfig = ({model = 'gpt-4o', messages, temperature = 0.7, max_tokens = 16384, user}: CompletionConfig) => {
  const provider = Object.entries(providers).find(([_, models]) => 
    Object.keys(models).includes(model)
  )?.[0] ?? 'openai';

  const modelSpec = providers[provider][model];
  if (!modelSpec) {
    throw new Error(`Model ${model} not found in configuration`);
  }

  // Return the actual LanguageModelV1 object based on provider
  let languageModel;
  if (provider === 'openai') {
    languageModel = openai(model);
  } else if (provider === 'anthropic') {
    languageModel = anthropic(model);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
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
 * Supports OpenAI, Anthropic, and other providers with automatic model selection and configuration.
 * 
 * Key features:
 * - Multi-provider support (OpenAI, Anthropic, XAI)
 * - Streaming text generation
 * - Structured object generation
 * - Automatic token limit management
 * - OpenAI-compatible response formatting
 * 
 * @example
 * ```typescript
 * // Text completion
 * const text = await completion.text({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello, world!' }],
 *   user: { uuid: 'user-123' },
 *   temperature: 0.7
 * });
 * 
 * // Streaming completion
 * const stream = await completion.stream({
 *   model: 'gpt-4o',
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
   * @param config.model - The model to use (default: 'gpt-4o')
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
   *   model: 'gpt-4o',
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
    try {
      const result = await generateText({
        ...createBaseConfig(config),
        maxTokens: max_tokens
      });

      return openAIFormat ? generateResponseBody(result.text, config.model || 'gpt-4o', result.usage) : result.text;
    } catch (error) {
      throw new Error(`Text completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Creates a streaming text completion
   * Returns an async iterable stream of text chunks
   * 
   * @param config - The completion configuration
   * @param config.model - The model to use (default: 'gpt-4o')
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
   *   model: 'gpt-4o',
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
    try {
      const provider = Object.entries(providers).find(([_, models]) => 
        Object.keys(models).includes(config.model || 'gpt-4o')
      )?.[0] ?? 'openai';

      const {textStream} = streamText({
        ...createBaseConfig(config),
        maxTokens: Math.min(max_tokens, providers[provider][config.model || 'gpt-4o'].maxOutput)
      });
      return textStream;
    } catch (error) {
      throw new Error(`Stream completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   *   model: 'gpt-4o',
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
    try {
      const provider = Object.entries(providers).find(([_, models]) => 
        Object.keys(models).includes(config.model || 'gpt-4o')
      )?.[0] ?? 'openai';

      if (provider === 'anthropic') {
        const result = await completion.text({
          ...config,
          max_tokens: providers[provider][config.model || 'gpt-4o'].maxOutput
        });
        return JSON.parse(result as string) as T;
      }

      const {object} = await generateObject({
        ...createBaseConfig(config),
        output: 'no-schema'
      });
      return object as T;
    } catch (error) {
      throw new Error(`Object completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  const {embedding} = await embed({
    model: openai.embedding('text-embedding-3-large'),
    value: text
  });

  return embedding;
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
 * const chunk = generateChunk('Hello, ', 'gpt-4o');
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
 *   'gpt-4o',
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

const openai_client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const temp = await tempFile.fromBuffer(audio_buffer, 'ogg');
    
    try {
      const file = await toFile(audio_buffer, 'audio.ogg');
      
      const result = await openai_client.audio.transcriptions.create({
        file,
        model: config.model || 'whisper-1',
        language: config.language,
        prompt: config.prompt,
      });
      
      return result.text;
    } finally {
      await temp.cleanup();
    }
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
