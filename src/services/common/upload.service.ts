/**
 * File upload and management service for handling various file types.
 * Provides functionality for uploading, validating, storing, and retrieving files.
 * Supports multiple file formats including images, documents, audio, and more.
 * @module upload.service
 */

import {z} from 'zod';
import {mkdir, writeFile, readFile, readdir, unlink} from 'fs/promises';
import {join} from 'path';
import {v4 as uuidv4} from 'uuid';
import {FileType, UploadResult} from '../../types/upload';
import {mimeTypes} from '../../config/mime.config';
import {glob} from 'glob';

/**
 * Custom error class for file validation errors
 * @class FileValidationError
 * @extends Error
 */
class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Zod schema for validating file upload requests
 * @constant {z.ZodSchema} uploadSchema
 */
const uploadSchema = z.object({
  file: z.union([
    z.instanceof(Blob),
    z.instanceof(File),
    z.object({
      base64: z.string(),
      mime_type: z.string()
    })
  ]),
  type: z.nativeEnum(FileType),
  original_name: z.string(),
  uuid: z.string()
});

/**
 * Storage path for uploaded files (from environment or default)
 * @constant {string}
 */
const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

/**
 * Temporary file path for processing (from environment or default)
 * @constant {string}
 */
const TEMP_PATH = process.env.TEMP_PATH || '/tmp';

/**
 * Interface for temporary file operations
 * @interface TempFileResult
 */
interface TempFileResult {
  /** Path to the temporary file */
  path: string;
  /** Function to clean up the temporary file */
  cleanup: () => Promise<void>;
}

/**
 * Temporary file utilities for handling buffers and cleanup
 * @namespace tempFile
 */
export const tempFile = {
  /**
   * Creates a temporary file from a buffer with automatic cleanup
   * @param {Buffer} buffer - The buffer data to write to the temporary file
   * @param {string} extension - File extension for the temporary file
   * @returns {Promise<TempFileResult>} Object containing file path and cleanup function
   * @throws {Error} When temporary file creation fails
   */
  fromBuffer: async (buffer: Buffer, extension: string): Promise<TempFileResult> => {
    try {
      const temp_uuid = uuidv4();
      const temp_path = join(TEMP_PATH, `${temp_uuid}.${extension}`);
      await writeFile(temp_path, buffer);
      
      return {
        path: temp_path,
        cleanup: async () => {
          try {
            await unlink(temp_path);
          } catch (error) {
            console.error(`Failed to cleanup temp file ${temp_path}:`, error);
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to create temp file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Uploads and validates a file, storing it in the organized directory structure
 * @param {z.infer<typeof uploadSchema>} input - File upload input data
 * @param {File|Blob|{base64: string, mime_type: string}} input.file - File data to upload
 * @param {FileType} input.type - Type of file being uploaded
 * @param {string} input.original_name - Original filename with extension
 * @param {string} input.uuid - Unique identifier for the file
 * @returns {Promise<UploadResult>} Upload result with file information
 * @throws {FileValidationError} When file validation fails
 * @throws {Error} When file upload fails
 */
export const uploadFile = async (input: z.infer<typeof uploadSchema>): Promise<UploadResult> => {
  try {
    const {uuid, file, type, original_name} = uploadSchema.parse(input);

    const extension = original_name.match(/\.[0-9a-z]+$/i)?.[0].toLowerCase();
    if (!extension || !mimeTypes[type].extensions.includes(extension)) {
      throw new FileValidationError(`Invalid file extension ${extension} for type: ${type}`);
    }

    const mime_type = file instanceof File || file instanceof Blob ? file.type : file.mime_type;
    const base_mime_type = mime_type.split(';')[0];
    if (!mimeTypes[type].mimes.includes(base_mime_type)) {
      throw new FileValidationError(`Invalid mime type ${mime_type} for type: ${type}`);
    }

    const date_string = new Date().toISOString().slice(0, 10);
    const storage_path = join(STORAGE_PATH, type, date_string);
    const file_path = join(storage_path, uuid, original_name);

    await mkdir(join(storage_path, uuid), {recursive: true});

    const buffer =
      file instanceof Blob || file instanceof File
        ? Buffer.from(await file.arrayBuffer())
        : Buffer.from(file.base64.replace(/^data:[^;]+;base64,/, ''), 'base64');

    await writeFile(file_path, buffer);

    return {uuid, type, path: file_path, original_name};
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new FileValidationError(`Validation error: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Interface for file retrieval response
 * @interface FileResponse
 */
interface FileResponse {
  /** File content as buffer */
  buffer: Buffer;
  /** MIME type of the file */
  mime_type: string;
  /** Original filename */
  original_name: string;
}

/**
 * Finds and retrieves a file by its UUID from the storage system
 * @param {string} uuid - Unique identifier of the file to find
 * @returns {Promise<FileResponse|null>} File data and metadata, or null if not found
 * @throws {Error} When file retrieval fails or file type is unknown
 */
export const findFileByUuid = async (uuid: string): Promise<FileResponse | null> => {
  try {
    const files = await glob(`${STORAGE_PATH}/**/${uuid}/*`);

    if (!files.length) {
      return null;
    }

    const file_path = files[0];
    const original_name = file_path.split('/').pop() || '';
    const extension = original_name.match(/\.[0-9a-z]+$/i)?.[0].toLowerCase() || '';
    const file_type = Object.entries(mimeTypes).find(([_, config]) => config.extensions.includes(extension))?.[0] as
      | FileType
      | undefined;

    if (!file_type) {
      throw new Error('Unknown file type');
    }

    const mime_type = mimeTypes[file_type].mimes[0];
    const buffer = await readFile(file_path);

    return {
      buffer,
      mime_type,
      original_name
    };
  } catch (error) {
    console.error('Error finding file:', error);
    return null;
  }
};
