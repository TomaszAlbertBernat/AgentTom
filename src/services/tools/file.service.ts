/**
 * File service for loading, processing, and writing files of various types
 * Supports text files, audio files, URLs, YouTube videos, and web content
 * Provides file type detection, content extraction, and document creation
 * @module file.service
 */

import {z} from 'zod';
import {LangfuseSpanClient} from 'langfuse';
import {stateManager} from '../agent/state.service';
import {documentService} from '../agent/document.service';
import type {DocumentType} from '../agent/document.service';
import {uploadFile, findFileByUuid} from '../common/upload.service';
import {FileType} from '../../types/upload';
import {createTextService} from '../common/text.service';
import {webService} from './web.service';
import {
  mimeTypes,
  supportedExtensions,
  getMimeTypeFromExtension
} from '../../config/mime.config';
import {completion, transcription} from '../common/llm.service';
import {prompt as writePrompt} from '../../prompts/tools/file.write';
import {v4 as uuidv4} from 'uuid';
import { db } from '../../database';
import { documents } from '../../schema/document';
import {youtubeService} from './youtube.service';
import { CoreMessage } from 'ai';

/**
 * Schema for validating file service actions and payloads
 * Supports write, load, and upload operations with type-safe validation
 * @constant
 */
const filePayloadSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('write'),
    payload: z.object({
      query: z.string(),
      context: z.array(z.string().uuid())
    })
  }),
  z.object({
    action: z.literal('load'),
    payload: z.object({
      path: z.string()
    })
  }),
  z.object({
    action: z.literal('upload'),
    payload: z.object({
      path: z.string(),
      content: z.string()
    })
  })
]);

/** Text service instance for tokenization and processing */
const text_service = await createTextService({model_name: 'gpt-4o'});

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 * @param path - The string to validate
 * @returns True if the path is a valid URL, false otherwise
 * @private
 */
const isValidUrl = (path: string): boolean => /^https?:\/\//i.test(path);

/**
 * Determines if a URL points directly to a supported file type
 * @param url - The URL to check
 * @returns True if the URL appears to be a direct file link, false otherwise
 * @private
 */
const isDirectFileUrl = (url: string): boolean => {
  const path_without_params = url.split('?')[0].split('#')[0];
  const extension = path_without_params.split('.').pop()?.toLowerCase();
  return extension ? supportedExtensions.includes(extension) : false;
};

/**
 * Handler interface for different file types
 * Defines the structure for type-specific file processing
 * @interface FileTypeHandler
 */
interface FileTypeHandler {
  /** Supported file extensions for this type */
  extensions: string[];
  /** Supported MIME types for this type */
  mimeTypes: string[];
  /** Function to load and process files of this type */
  load: (url: string, span?: LangfuseSpanClient) => Promise<{content: string; mimeType: string; path: string}>;
}

/**
 * File type handlers for different supported formats
 * Each handler provides specialized processing for its file type
 * @constant
 */
const fileTypeHandlers: Record<string, FileTypeHandler> = {
  text: {
    extensions: mimeTypes[FileType.TEXT].extensions.map(ext => ext.replace('.', '')),
    mimeTypes: mimeTypes[FileType.TEXT].mimes,
    /**
     * Loads and processes text files from URLs
     * @param url - URL of the text file
     * @param span - Optional Langfuse span for tracing
     * @returns Promise with file content, MIME type, and uploaded file path
     * @throws Error if file cannot be fetched or processed
     */
    load: async (url: string, span?: LangfuseSpanClient) => {
      const response = await fetch(url);
      if (!response.ok) {
        span?.event({
          name: 'text_file_fetch_error',
          input: { url },
          output: { status: response.status, statusText: response.statusText },
          level: 'ERROR'
        });
        throw new Error(`Failed to fetch text file: ${response.statusText}`);
      }

      const content = await response.text();
      const file_name = url.split('/').pop() ?? 'unknown.txt';
      const extension = file_name.split('.').pop()?.toLowerCase();
      const mime_type = extension ? 
        getMimeTypeFromExtension(extension) ?? response.headers.get('content-type') ?? 'text/plain' :
        response.headers.get('content-type') ?? 'text/plain';

      const upload_result = await uploadFile({
        uuid: uuidv4(),
        file: new Blob([content], { type: mime_type }),
        type: FileType.TEXT,
        original_name: file_name
      });

      span?.event({
        name: 'text_file_fetch_success',
        input: { url },
        output: { mime_type, file_name, size: content.length }
      });

      return {
        content,
        mimeType: mime_type,
        path: `${process.env.APP_URL}/api/files/${upload_result.uuid}`
      };
    }
  },
  image: {
    extensions: mimeTypes[FileType.IMAGE].extensions.map(ext => ext.replace('.', '')),
    mimeTypes: mimeTypes[FileType.IMAGE].mimes,
    /**
     * Placeholder for image file loading (not yet implemented)
     * @throws Error indicating feature is not implemented
     */
    load: async () => {
      throw new Error('Image file loading not implemented');
    }
  },
  audio: {
    extensions: mimeTypes[FileType.AUDIO].extensions.map(ext => ext.replace('.', '')),
    mimeTypes: mimeTypes[FileType.AUDIO].mimes,
    /**
     * Loads and transcribes audio files from URLs
     * @param url - URL of the audio file
     * @param span - Optional Langfuse span for tracing
     * @returns Promise with transcribed content, MIME type, and uploaded file path
     * @throws Error if file cannot be fetched, uploaded, or transcribed
     */
    load: async (url: string, span?: LangfuseSpanClient) => {
      span?.event({
        name: 'audio_file_fetch_start',
        input: { url }
      });

      const response = await fetch(url);
      if (!response.ok) {
        span?.event({
          name: 'audio_file_fetch_error',
          input: { url },
          output: { status: response.status, statusText: response.statusText },
          level: 'ERROR'
        });
        throw new Error(`Failed to fetch audio file: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const file_name = url.split('/').pop() ?? 'unknown.audio';
      const extension = file_name.split('.').pop()?.toLowerCase();
      const mime_type = extension ? 
        getMimeTypeFromExtension(extension) ?? response.headers.get('content-type') ?? 'audio/mpeg' :
        response.headers.get('content-type') ?? 'audio/mpeg';

      const upload_result = await uploadFile({
        uuid: uuidv4(),
        file: new Blob([buffer], { type: mime_type }),
        type: FileType.AUDIO,
        original_name: file_name
      });

      const transcribed_text = await transcription.fromBuffer(buffer, {
        language: 'en',
        prompt: `Transcription of ${file_name}`
      });

      span?.event({
        name: 'audio_file_fetch_success',
        input: { url },
        output: { 
          mime_type, 
          file_name, 
          size: buffer.length,
          transcription_length: transcribed_text.length 
        }
      });

      return {
        content: transcribed_text,
        mimeType: mime_type,
        path: `${process.env.APP_URL}/api/files/${upload_result.uuid}`
      };
    }
  }
};

/**
 * Determines the file type from a URL based on its extension
 * @param url - The URL to analyze
 * @returns The file type string if recognized, null otherwise
 * @private
 */
const getFileTypeFromUrl = (url: string): string | null => {
  const extension = url.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();
  if (!extension) return null;

  return Object.entries(fileTypeHandlers).find(([_, handler]) => handler.extensions.includes(extension))?.[0] ?? null;
};

/**
 * Schema for validating file write payload
 * @constant
 */
const WritePayloadSchema = z.object({
  query: z.string(),
  context: z.array(z.string().uuid()).default([])
});

/**
 * File service for comprehensive file handling and processing
 * Provides methods for loading, writing, and processing various file types
 * @namespace fileService
 */
const fileService = {
  /**
   * Loads content from various sources including URLs, files, and YouTube videos
   * @param path - Path or URL to the content to load
   * @param conversation_uuid - UUID of the current conversation
   * @param span - Optional Langfuse span for tracing
   * @returns Promise that resolves to a document containing the loaded content
   * @throws Error if loading fails or unsupported content type
   * @example
   * ```typescript
   * // Load a text file
   * const doc = await fileService.load('./document.txt', 'conv-123');
   * 
   * // Load from URL
   * const doc = await fileService.load('https://example.com/file.pdf', 'conv-123');
   * 
   * // Load YouTube video
   * const doc = await fileService.load('https://youtube.com/watch?v=xyz', 'conv-123');
   * ```
   */
  load: async (path: string, conversation_uuid: string, span?: LangfuseSpanClient): Promise<DocumentType> => {
    try {
      const is_url = isValidUrl(path);
      const is_youtube = is_url && youtubeService.isYoutubeUrl(path);
      const is_direct_file = is_url && !is_youtube && isDirectFileUrl(path);

      span?.event({
        name: 'file_load_attempt',
        input: {
          path,
          type: is_url ? 
            (is_youtube ? 'youtube_url' : 
             is_direct_file ? 'direct_file_url' : 
             'webpage_url') : 
            'local_path'
        }
      });

      if (is_url) {
        if (is_youtube) {
          const transcript = await youtubeService.getTranscript(path, 'en', span);
          const [tokenized_content] = await text_service.split(transcript, Infinity);

          return documentService.createDocument({
            uuid: uuidv4(),
            conversation_uuid,
            source_uuid: conversation_uuid,
            text: transcript,
            metadata_override: {
              type: 'document',
              content_type: 'full',
              tokens: tokenized_content.metadata.tokens,
              name: `YouTube Transcript: ${path}`,
              source: path,
              mimeType: 'text/plain',
              description: `Transcript from YouTube video: ${path}`
            }
          });
        }

        if (!is_direct_file) {
          return webService.getContents(path, conversation_uuid, span);
        }

        const file_type = getFileTypeFromUrl(path);
        if (!file_type) {
          throw new Error('Unsupported file type');
        }

        const handler = fileTypeHandlers[file_type];
        const {content, mimeType, path: stored_path} = await handler.load(path, span);
        const [tokenized_content] = await text_service.split(content, Infinity);

        return documentService.createDocument({
          uuid: uuidv4(),
          conversation_uuid,
          source_uuid: conversation_uuid,
          text: content,
          metadata_override: {
            type: 'document',
            content_type: 'full',
            tokens: tokenized_content.metadata.tokens,
            name: path.split('/').pop() ?? 'unknown',
            source: stored_path,
            mimeType,
            description: `File loaded from URL: ${path}`
          }
        });
      } else {
        throw new Error('Local path loading not implemented');
      }
    } catch (error) {
      span?.event({
        name: 'file_load_error',
        input: { path },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });

      return documentService.createErrorDocument({
        error,
        conversation_uuid,
        context: `Failed to load file from path: ${path}`
      });
    }
  },

  /**
   * Uploads file content to the system and creates a document
   * @param file_path - Path or name for the file being uploaded
   * @param content - Text content of the file
   * @param conversation_uuid - UUID of the current conversation
   * @param span - Optional Langfuse span for tracing
   * @returns Promise that resolves to a document containing the uploaded content
   * @throws Error if upload fails or content processing fails
   * @example
   * ```typescript
   * const doc = await fileService.uploadFile('notes.txt', 'Hello world', 'conv-123');
   * console.log(`Uploaded file: ${doc.metadata.name}`);
   * ```
   */
  uploadFile: async (file_path: string, content: string, conversation_uuid: string, span?: LangfuseSpanClient): Promise<DocumentType> => {
    try {
      const blob = new Blob([content], {type: 'text/plain'});
      const upload_result = await uploadFile({
        uuid: uuidv4(),
        file: blob,
        type: FileType.TEXT,
        original_name: file_path.split('/').pop() ?? 'unknown.txt'
      });

      const [tokenized_content] = await text_service.split(content, Infinity);

      span?.event({
        name: 'file_upload',
        input: {file_path},
        output: {success: true, upload_result}
      });

      return documentService.createDocument({
        conversation_uuid,
        source_uuid: conversation_uuid,
        text: content,
        metadata_override: {
          type: 'document',
          content_type: 'full',
          tokens: tokenized_content.metadata.tokens,
          name: upload_result.original_name,
          source: upload_result.path,
          mimeType: 'text/plain',
          description: `File uploaded to system: ${upload_result.original_name}`
        }
      });
    } catch (error) {
      span?.event({
        name: 'file_upload_error',
        input: { file_path },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });

      return documentService.createErrorDocument({
        error,
        conversation_uuid,
        context: `Failed to upload file: ${file_path}`
      });
    }
  },

  /**
   * Generates and writes file content based on a query and context documents
   * Uses AI to create content that incorporates information from provided context
   * @param query - The query or prompt for content generation
   * @param context_uuids - Array of document UUIDs to use as context
   * @param conversation_uuid - UUID of the current conversation
   * @param span - Optional Langfuse span for tracing
   * @returns Promise that resolves to a document containing the generated content
   * @throws Error if generation fails or context documents cannot be loaded
   * @example
   * ```typescript
   * const doc = await fileService.write(
   *   'Create a summary of the research findings',
   *   ['doc-uuid-1', 'doc-uuid-2'],
   *   'conv-123'
   * );
   * console.log(`Generated file: ${doc.metadata.name}`);
   * ```
   */
  write: async (query: string, context_uuids: string[], conversation_uuid: string, span?: LangfuseSpanClient): Promise<DocumentType> => {
    try {
      // Load context documents
      const context_docs = await Promise.all(
        context_uuids.map(async uuid => {
          const doc = await documentService.getDocumentByUuid(uuid);
          
          if (!doc) {
            throw new Error(`Document with UUID ${uuid} not found`);
          }
          
          return doc;
        })
      );

      // Restore placeholders in context documents
      const restored_context = context_docs.map(doc => 
        documentService.restorePlaceholders(doc)
      );

      span?.event({
        name: 'file_write_start',
        input: { 
          query,
          context_count: context_uuids.length 
        }
      });

      const state = stateManager.getState();

      const writing_messages: CoreMessage[] = [
        {
          role: 'system',
          content: writePrompt({documents: restored_context})
        },
        {
          role: 'user',
          content: `Context documents:\n${restored_context.map(doc => doc.text).join('\n\n')}\n\nQuery: ${query}`
        }
      ];
      
      // Start generation tracking
      const file_generation = span?.generation({
        name: 'file_content_generation',
        input: writing_messages,
        model: state.config.model
      });

      // Generate content using LLM
      const result = await completion.object<{ name: string; content: string }>({
        model: state.config.model,
        messages: writing_messages,
        temperature: 0.7,
        user: { uuid: conversation_uuid, name: 'file_write_tool' }
      });

      // End generation tracking
      await file_generation?.end({
        output: {
          generated_name: result.name,
          result_content: result.content,
          content_length: result.content.length,
        }
      });

      // Replace context references if any
      const processed_content = result.content.replace(
        /\[\[([^\]]+)\]\]/g,
        (_, uuid) => {
          const doc = restored_context.find(d => d.metadata.uuid === uuid);
          return doc ? doc.text : `[[${uuid}]]`;
        }
      );

      // Ensure we use the exact MIME type for markdown
      const uuid = uuidv4();
      const document_mime_type = 'text/markdown'; // Use 'text/markdown' for markdown files
      const file_name = `${uuid}.md`; // Use .md extension for markdown files

      // Create blob with explicit MIME type without charset
      const blob = new Blob([processed_content], { 
        type: document_mime_type // This will be exactly 'text/markdown'
      });

      const upload_result = await uploadFile({
        uuid,
        file: blob,
        type: FileType.TEXT,
        original_name: file_name
      });

      span?.event({
        name: 'file_write_complete',
        output: { 
          file_name,
          content_length: processed_content.length,
          upload_path: upload_result.path,
          mime_type: document_mime_type
        }
      });

      return documentService.createDocument({
        uuid,
        conversation_uuid,
        source_uuid: conversation_uuid,
        text: processed_content,
        name: result.name,
        metadata_override: {
          type: 'document',
          content_type: 'full',
          source: `${process.env.APP_URL}/api/files/${upload_result.uuid}`,
          mimeType: document_mime_type,
          description: `Generated content based on query: ${query}`
        }
      });

    } catch (error) {
      span?.event({
        name: 'file_write_error',
        input: { query },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });

      return documentService.createErrorDocument({
        error,
        conversation_uuid,
        context: `Failed to generate file content for query: ${query}`
      });
    }
  },

  /**
   * Executes file operations based on action type and payload
   * Main entry point for file service operations with validation and error handling
   * @param action - The action to perform ('write', 'load', or 'upload')
   * @param payload - Action-specific payload data
   * @param span - Optional Langfuse span for tracing
   * @returns Promise that resolves to a document containing the operation result
   * @throws Error if action is invalid or operation fails
   * @example
   * ```typescript
   * // Write a file
   * const doc = await fileService.execute('write', {
   *   query: 'Create a report',
   *   context: ['doc-uuid-1']
   * });
   * 
   * // Load a file
   * const doc = await fileService.execute('load', {
   *   path: 'https://example.com/file.txt'
   * });
   * 
   * // Upload content
   * const doc = await fileService.execute('upload', {
   *   path: 'notes.txt',
   *   content: 'Hello world'
   * });
   * ```
   */
  execute: async (action: string, payload: unknown, span?: LangfuseSpanClient): Promise<DocumentType> => {
    try {
      const state = stateManager.getState();
      const conversation_uuid = state.config.conversation_uuid ?? 'unknown';

      span?.event({
        name: 'file_tool_execute',
        input: { action, payload }
      });

      const validatedPayload = filePayloadSchema.parse({ action, payload });

      switch (validatedPayload.action) {
        case 'write': {
          return fileService.write(validatedPayload.payload.query, validatedPayload.payload.context, conversation_uuid, span);
        }
        case 'load': {
          return fileService.load(validatedPayload.payload.path, conversation_uuid, span);
        }
        case 'upload': {
          return fileService.uploadFile(validatedPayload.payload.path, validatedPayload.payload.content, conversation_uuid, span);
        }
        default:
          return documentService.createErrorDocument({
            error: new Error(`Unknown action: ${action}`),
            conversation_uuid,
            context: 'Invalid file operation requested'
          });
      }
    } catch (error) {
      const state = stateManager.getState();
      return documentService.createErrorDocument({
        error,
        conversation_uuid: state.config.conversation_uuid ?? 'unknown',
        context: 'Failed to execute file operation'
      });
    }
  }
};

export {fileService};
