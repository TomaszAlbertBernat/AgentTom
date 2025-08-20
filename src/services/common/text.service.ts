/**
 * Text processing and tokenization service for handling text analysis and chunking.
 * Provides functionality for token counting, text splitting, header extraction, and document processing.
 * Supports various text models and efficient chunking algorithms for large documents.
 * @module text.service
 */

import {createByModelName} from '@microsoft/tiktokenizer';
import type {Document, DocumentMetadata} from '../../types/document';
import {z} from 'zod';
import { ValidationError } from '../../utils/errors';
import {v4 as uuidv4} from 'uuid';

/**
 * Special tokens used for chat formatting and tokenization
 * @constant {Map<string, number>}
 */
const SPECIAL_TOKENS = new Map<string, number>([
  ['<|im_start|>', 100264],
  ['<|im_end|>', 100265],
  ['<|im_sep|>', 100266]
]);

/**
 * Zod schema for text service configuration
 * @constant {z.ZodSchema}
 */
const textServiceSchema = z.object({
  model_name: z.string().default('gemini-2.5-flash')
});

/**
 * Interface for maintaining tokenizer state and model information
 * @interface TokenizerState
 */
interface TokenizerState {
  /** The initialized tokenizer instance */
  tokenizer: Awaited<ReturnType<typeof createByModelName>> | undefined;
  /** Name of the model being used */
  model_name: string;
}

/**
 * Formats text for tokenization with chat-style markers
 * @param {string} text - The text to format
 * @returns {string} Formatted text with chat markers
 */
const formatForTokenization = (text: string): string => `<|im_start|>user\n${text}<|im_end|>\n<|im_start|>assistant<|im_end|>`;

/**
 * Counts the number of tokens in a text string
 * @param {TokenizerState['tokenizer']} tokenizer - The tokenizer instance
 * @param {string} text - The text to count tokens for
 * @returns {number} Number of tokens in the text
 * @throws {Error} When tokenizer is not initialized
 */
const countTokens = (tokenizer: TokenizerState['tokenizer'], text: string): number => {
  if (!tokenizer) {
    throw new ValidationError('Tokenizer not initialized');
  }
  return tokenizer.encode(text, Array.from(SPECIAL_TOKENS.keys())).length;
};

/**
 * Initializes or updates the tokenizer for a specific model
 * @param {TokenizerState} state - Current tokenizer state
 * @param {string} [model] - Optional model name to use
 * @returns {Promise<TokenizerState>} Updated tokenizer state
 */
/**
 * Maps arbitrary provider model names to a tokenizer-supported model name.
 * Tokenizers are provider-specific; for unsupported models (e.g., Gemini),
 * we default to an OpenAI tokenizer that approximates token counts.
 */
const normalizeModelForTokenizer = (modelName: string): string => {
  // Use a stable tokenizer baseline; for non-OpenAI models, approximate with GPT tokenizer
  const fallback = 'gpt-4o';
  if (!modelName) return fallback;
  return modelName.startsWith('gpt') ? modelName : fallback;
};

const initializeTokenizer = async (state: TokenizerState, model?: string): Promise<TokenizerState> => {
  if (!state.tokenizer || model !== state.model_name) {
    const model_name = model || state.model_name;
    const tokenizerModel = normalizeModelForTokenizer(model_name);
    const tokenizer = await createByModelName(tokenizerModel, SPECIAL_TOKENS);
    return {tokenizer, model_name};
  }
  return state;
};

/**
 * Extracts markdown headers from text and organizes them by level
 * @param {string} text - The text to extract headers from
 * @returns {Record<string, string[]>} Object with header levels as keys and arrays of header text as values
 */
const extractHeaders = (text: string): Record<string, string[]> => {
  const headers: Record<string, string[]> = {};
  const header_regex = /(^|\n)(#{1,6})\s+(.*)/g;
  let match;

  while ((match = header_regex.exec(text)) !== null) {
    const level = match[2].length;
    const content = match[3].trim();
    const key = `h${level}`;
    headers[key] = headers[key] || [];
    headers[key].push(content);
  }

  return headers;
};

/**
 * Updates current headers with newly extracted headers, maintaining hierarchy
 * @param {Record<string, string[]>} current - Current header state
 * @param {Record<string, string[]>} extracted - Newly extracted headers
 * @returns {Record<string, string[]>} Updated header state with proper hierarchy
 */
const updateHeaders = (current: Record<string, string[]>, extracted: Record<string, string[]>): Record<string, string[]> => {
  const updated = {...current};

  for (let level = 1; level <= 6; level++) {
    const key = `h${level}`;
    if (extracted[key]) {
      updated[key] = extracted[key];
      for (let l = level + 1; l <= 6; l++) {
        delete updated[`h${l}`];
      }
    }
  }

  return updated;
};

/**
 * Extracts URLs and images from markdown text, replacing them with placeholders
 * @param {string} text - The text to process
 * @returns {{content: string, urls: string[], images: string[]}} Processed content with extracted URLs and images
 */
const extractUrlsAndImages = (text: string) => {
  const urls: string[] = [];
  const images: string[] = [];
  let url_index = 0;
  let image_index = 0;

  const content = text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt_text, url) => {
      images.push(url);
      return `![${alt_text}]({{$img${image_index++}}})`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, link_text, url) => {
      if (!url.startsWith('{{$img')) {
        urls.push(url);
        return `[${link_text}]({{$url${url_index++}}})`;
      }
      return _match;
    });

  return {content, urls, images};
};

/**
 * Zod schema for validating document structure
 * @constant {z.ZodSchema}
 */
const DocumentSchema = z.object({
  uuid: z.string().uuid(),
  source_uuid: z.string(),
  conversation_uuid: z.string(),
  text: z.string(),
  metadata: z.object({
    uuid: z.string().uuid(),
    tokens: z.number(),
    headers: z.record(z.string(), z.array(z.string())),
    urls: z.array(z.string()),
    images: z.array(z.string()),
    type: z.enum(['text', 'audio', 'image', 'document']),
    content_type: z.enum(['chunk', 'full', 'memory'])
  }),
  created_at: z.string(),
  updated_at: z.string()
});

/**
 * Efficiently extracts a text chunk using binary search to optimize token limits
 * Uses binary search algorithm to find the maximum text that fits within token limits
 * @param {TokenizerState['tokenizer']} tokenizer - The tokenizer instance
 * @param {string} text - The full text to chunk
 * @param {number} start - Starting position in the text
 * @param {number} limit - Maximum number of tokens allowed
 * @returns {{chunk_text: string, chunk_end: number}} Extracted chunk and end position
 */
const getChunk = (tokenizer: TokenizerState['tokenizer'], text: string, start: number, limit: number): {chunk_text: string; chunk_end: number} => {
  // Compute overhead once
  const overhead = countTokens(tokenizer, formatForTokenization('')) - countTokens(tokenizer, '');
  const maxPos = text.length;

  let low = start;
  let high = maxPos;
  let bestFit = start;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidateText = text.slice(start, mid);
    const tokens = countTokens(tokenizer, candidateText) + overhead;

    if (tokens <= limit) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const tryAdjustBoundary = (pos: number) => {
    const nextNewline = text.indexOf('\n', pos);
    if (nextNewline !== -1 && nextNewline < maxPos) {
      const candidate = nextNewline + 1;
      const candidateText = text.slice(start, candidate);
      const candidateTokens = countTokens(tokenizer, candidateText) + overhead;
      if (candidateTokens <= limit) return candidate;
    }

    const prevNewline = text.lastIndexOf('\n', pos);
    if (prevNewline > start) {
      const candidate = prevNewline + 1;
      const candidateText = text.slice(start, candidate);
      const candidateTokens = countTokens(tokenizer, candidateText) + overhead;
      if (candidateTokens <= limit) return candidate;
    }

    return pos;
  };

  const finalEnd = tryAdjustBoundary(bestFit);
  const finalText = text.slice(start, finalEnd);

  return { chunk_text: finalText, chunk_end: finalEnd };
};

/**
 * Creates a text service instance with tokenization and chunking capabilities
 * @param {z.infer<typeof textServiceSchema>} config - Configuration for the text service
 * @param {string} [config.model_name='gemini-2.5-flash'] - Name of the model to use for tokenization
 * @returns {Promise<{split: Function, countTokens: Function}>} Text service with split and countTokens methods
 */
export const createTextService = async (config: z.infer<typeof textServiceSchema>) => {
  let state: TokenizerState = {
    tokenizer: undefined,
    model_name: textServiceSchema.parse(config).model_name
  };

  /**
   * Splits text into chunks based on token limits while preserving structure
   * @param {string} text - The text to split into chunks
   * @param {number} limit - Maximum number of tokens per chunk
   * @param {Partial<DocumentMetadata>} [metadata] - Optional metadata for the documents
   * @returns {Promise<Document[]>} Array of document chunks with metadata
   * @throws {Error} When text is empty or required
   */
  const split = async (text: string, limit: number, metadata?: Partial<DocumentMetadata>): Promise<Document[]> => {
    if (!text) {
      throw new ValidationError('Text is required for splitting');
    }

    state = await initializeTokenizer(state);

    const chunks: Document[] = [];
    let position = 0;
    let current_headers: Record<string, string[]> = {};

    while (position < text.length) {
      const {chunk_text, chunk_end} = getChunk(state.tokenizer, text, position, limit);
      const tokens = countTokens(state.tokenizer, chunk_text);

      const headers_in_chunk = extractHeaders(chunk_text);
      current_headers = updateHeaders(current_headers, headers_in_chunk);

      const {content, urls, images} = extractUrlsAndImages(chunk_text);

      chunks.push({
        uuid: uuidv4(),
        source_uuid: metadata?.source_uuid || '',
        conversation_uuid: metadata?.conversation_uuid || '',
        text: content,
        metadata: {
          uuid: uuidv4(),
          tokens,
          headers: current_headers,
          urls,
          images,
          type: (metadata?.type || 'text') as 'text' | 'audio' | 'image' | 'document',
          content_type: (metadata?.content_type || 'chunk') as 'chunk' | 'full' | 'memory',
          ...metadata
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      position = chunk_end;
    }

    return chunks.map(chunk => {
      try {
        return DocumentSchema.parse(chunk);
      } catch (error) {
        // Avoid noisy console in tight loops; rethrow as typed error
        throw new ValidationError('Failed to create valid document chunk', { cause: error });
      }
    });
  };

  return {
    split: (text: string, limit: number, metadata?: Partial<DocumentMetadata>) => split(text, limit, metadata)
  };
};

/**
 * Creates a standalone tokenizer instance for token counting and text formatting
 * @param {string} [model_name='gemini-2.5-flash'] - Name of the model to use for tokenization
 * @returns {Promise<{countTokens: Function, formatForTokenization: Function}>} Tokenizer with utility methods
 */
export const createTokenizer = async (model_name: string = 'gemini-2.5-flash') => {
  const state: TokenizerState = {
    tokenizer: undefined,
    model_name
  };

  const initialized_state = await initializeTokenizer(state);

  return {
    /**
     * Counts tokens in the provided text
     * @param {string} text - Text to count tokens for
     * @returns {number} Number of tokens
     */
    countTokens: (text: string) => countTokens(initialized_state.tokenizer, text),
    /**
     * Formats text for tokenization with chat markers
     * @param {string} text - Text to format
     * @returns {string} Formatted text
     */
    formatForTokenization: (text: string) => formatForTokenization(text)
  };
};
