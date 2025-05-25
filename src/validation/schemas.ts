/**
 * Centralized Validation Schemas for AgentTom
 * 
 * This file contains all Zod validation schemas used throughout the application.
 * It provides consistent validation patterns, error messages, and type safety.
 * 
 * Usage:
 * ```typescript
 * import { UserSchemas, ToolSchemas } from '../validation/schemas';
 * 
 * // Validate user creation
 * const userData = UserSchemas.create.parse(requestBody);
 * 
 * // Validate tool execution
 * const toolData = ToolSchemas.execute.parse(requestBody);
 * ```
 */

import { z } from 'zod';

/**
 * Common validation patterns and utilities
 */
export const CommonSchemas = {
  /** UUID validation with custom error messages */
  uuid: z.string().uuid('Invalid UUID format'),
  
  /** Email validation with normalization */
  email: z.string().email('Invalid email format').toLowerCase(),
  
  /** URL validation with protocol requirement */
  url: z.string().url('Invalid URL format'),
  
  /** Pagination parameters */
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).optional()
  }),
  
  /** Search filters common to multiple services */
  searchFilters: z.object({
    source_uuid: z.string().uuid().optional(),
    source: z.string().optional(),
    content_type: z.enum(['chunk', 'full', 'memory']).optional(),
    category: z.string().optional(),
    subcategory: z.string().optional()
  }),
  
  /** Timestamp validation */
  timestamp: z.string().datetime('Invalid ISO timestamp format'),
  
  /** Non-empty string validation */
  nonEmptyString: z.string().min(1, 'This field cannot be empty'),
  
  /** File size validation (in bytes) */
  fileSize: z.number().int().min(0).max(100 * 1024 * 1024, 'File size cannot exceed 100MB'),
  
  /** Base64 string validation */
  base64: z.string().regex(/^data:[^;]+;base64,/, 'Invalid base64 data URL format')
} as const;

/**
 * User-related validation schemas
 */
export const UserSchemas = {
  /** User creation schema */
  create: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: CommonSchemas.email,
    token: z.string().optional(),
    active: z.boolean().default(true)
  }),
  
  /** User update schema */
  update: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: CommonSchemas.email.optional(),
    active: z.boolean().optional()
  }),
  
  /** User ID parameter */
  params: z.object({
    uuid: CommonSchemas.uuid
  })
} as const;

/**
 * Authentication validation schemas
 */
export const AuthSchemas = {
  /** User registration schema */
  register: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: CommonSchemas.email,
    password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
  }),
  
  /** User login schema */
  login: z.object({
    email: CommonSchemas.email,
    password: z.string().min(1, 'Password is required')
  }),
  
  /** Token validation schema */
  token: z.object({
    token: z.string().min(1, 'Token is required')
  }),
  
  /** JWT payload schema */
  jwtPayload: z.object({
    user_id: CommonSchemas.uuid,
    email: CommonSchemas.email,
    iat: z.number(),
    exp: z.number()
  })
} as const;

/**
 * Tool execution validation schemas
 */
export const ToolSchemas = {
  /** Tool execution request */
  execute: z.object({
    tool_name: z.string().min(1, 'Tool name is required'),
    parameters: z.record(z.any()).default({}),
    timeout: z.number().int().min(1000, 'Timeout must be at least 1 second')
      .max(300000, 'Timeout cannot exceed 5 minutes').default(30000)
  }),
  
  /** Tool execution response */
  response: z.object({
    success: z.boolean(),
    execution_id: CommonSchemas.uuid,
    tool_name: z.string(),
    duration: z.number(),
    result: z.any().optional(),
    error: z.string().optional(),
    created_at: CommonSchemas.timestamp
  }),
  
  /** Tool parameters validation */
  params: z.object({
    tool_name: z.string().min(1)
  })
} as const;

/**
 * Memory service validation schemas
 */
export const MemorySchemas = {
  /** Memory creation schema */
  create: z.object({
    name: z.string().min(1, 'Memory name is required'),
    text: z.string().min(1, 'Memory text is required'),
    category_uuid: CommonSchemas.uuid.optional(),
    conversation_uuid: CommonSchemas.uuid.default('default')
  }),
  
  /** Memory update schema */
  update: z.object({
    name: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    category_uuid: CommonSchemas.uuid.optional(),
    conversation_uuid: CommonSchemas.uuid.optional()
  }),
  
  /** Memory search schema */
  search: z.object({
    query: z.string().min(1, 'Search query is required'),
    filters: CommonSchemas.searchFilters.optional(),
    limit: z.number().int().min(1).max(100).default(15),
    conversation_uuid: CommonSchemas.uuid.optional()
  }),
  
  /** Memory parameters */
  params: z.object({
    memory_uuid: CommonSchemas.uuid
  })
} as const;

/**
 * Conversation validation schemas
 */
export const ConversationSchemas = {
  /** Message creation schema */
  message: z.object({
    content: z.string().min(1, 'Message content is required'),
    conversation_id: CommonSchemas.uuid.optional(),
    role: z.enum(['user', 'assistant', 'system']).default('user')
  }),
  
  /** Conversation creation schema */
  create: z.object({
    name: z.string().min(1, 'Conversation name is required').default('New Conversation'),
    user_id: CommonSchemas.uuid
  }),
  
  /** Conversation parameters */
  params: z.object({
    conversation_id: CommonSchemas.uuid
  })
} as const;

/**
 * File upload validation schemas
 */
export const FileSchemas = {
  /** File upload schema */
  upload: z.object({
    uuid: CommonSchemas.uuid,
    file: z.any(), // File object or base64 data
    type: z.enum(['audio', 'image', 'document', 'video']),
    original_name: z.string().min(1, 'Filename is required'),
    description: z.string().optional()
  }),
  
  /** Base64 upload schema */
  base64Upload: z.object({
    image_data: CommonSchemas.base64,
    filename: z.string().min(1, 'Filename is required'),
    description: z.string().optional()
  }),
  
  /** File validation result */
  result: z.object({
    uuid: CommonSchemas.uuid,
    type: z.enum(['audio', 'image', 'document', 'video']),
    path: z.string(),
    original_name: z.string(),
    url: z.string().url().optional()
  })
} as const;

/**
 * Vector service validation schemas
 */
export const VectorSchemas = {
  /** Vector search schema */
  search: z.object({
    query: z.string().min(1, 'Search query is required'),
    filters: CommonSchemas.searchFilters.optional(),
    limit: z.number().int().min(1).max(100).default(10)
  }),
  
  /** Vector point schema */
  point: z.object({
    document_uuid: CommonSchemas.uuid,
    source_uuid: CommonSchemas.uuid,
    source: z.string().min(1),
    text: z.string().min(1),
    metadata: z.record(z.any()).default({}),
    created_at: CommonSchemas.timestamp,
    updated_at: CommonSchemas.timestamp
  }),
  
  /** Vector embedding schema */
  embedding: z.array(z.number()).min(1, 'Embedding vector cannot be empty')
} as const;

/**
 * Text processing validation schemas
 */
export const TextSchemas = {
  /** Text splitting schema */
  split: z.object({
    text: z.string().min(1, 'Text is required'),
    limit: z.number().int().min(100).max(10000).default(1000),
    metadata: z.object({
      source: z.string().optional(),
      title: z.string().optional(),
      author: z.string().optional(),
      category: z.string().optional()
    }).optional()
  })
} as const;

/**
 * Image service validation schemas
 */
export const ImageSchemas = {
  /** Image analysis schema */
  analyze: z.object({
    action: z.literal('analyze'),
    payload: z.object({
      image_url: CommonSchemas.url,
      query: z.string().optional(),
      context: z.string().optional()
    })
  }),
  
  /** Image generation schema */
  generate: z.object({
    action: z.literal('generate'),
    payload: z.object({
      prompt: z.string().min(1, 'Prompt is required'),
      size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
      quality: z.enum(['standard', 'hd']).default('standard'),
      style: z.enum(['vivid', 'natural']).default('vivid')
    })
  }),
  
  /** Image edit schema */
  edit: z.object({
    action: z.literal('edit'),
    payload: z.object({
      image_url: CommonSchemas.url,
      mask_url: CommonSchemas.url.optional(),
      prompt: z.string().min(1, 'Prompt is required'),
      size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024')
    })
  }),
  
  /** Image variation schema */
  variation: z.object({
    action: z.literal('variation'),
    payload: z.object({
      image_url: CommonSchemas.url,
      n: z.number().int().min(1).max(10).default(1),
      size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024')
    })
  }),
  
  /** Image upload schema */
  upload: z.object({
    action: z.literal('upload'),
    payload: z.object({
      image_data: CommonSchemas.base64,
      filename: z.string().min(1, 'Filename is required'),
      description: z.string().optional()
    })
  })
} as const;

/**
 * Web service validation schemas
 */
export const WebSchemas = {
  /** Web content extraction schema */
  getContents: z.object({
    urls: z.array(CommonSchemas.url).min(1, 'At least one URL is required').max(10, 'Maximum 10 URLs allowed'),
    include_html: z.boolean().default(false),
    include_raw_html: z.boolean().default(false),
    max_timeout: z.number().int().min(1000).max(30000).default(10000)
  }),
  
  /** Web search schema */
  search: z.object({
    query: z.string().min(1, 'Search query is required'),
    limit: z.number().int().min(1).max(50).default(10),
    include_images: z.boolean().default(false),
    include_videos: z.boolean().default(false)
  })
} as const;

/**
 * Spotify service validation schemas
 */
export const SpotifySchemas = {
  /** Spotify search schema */
  search: z.object({
    query: z.string().min(1, 'Search query is required'),
    type: z.enum(['track', 'artist', 'album', 'playlist']).default('track'),
    limit: z.number().int().min(1).max(50).default(20)
  }),
  
  /** Spotify play schema */
  play: z.object({
    uri: z.string().min(1, 'Spotify URI is required'),
    device_id: z.string().optional(),
    position_ms: z.number().int().min(0).optional()
  })
} as const;

/**
 * Audio service validation schemas
 */
export const AudioSchemas = {
  /** Audio metadata schema */
  metadata: z.object({
    duration: z.number().positive('Duration must be positive'),
    sampleRate: z.number().positive('Sample rate must be positive'),
    channels: z.number().int().min(1).max(8),
    bitRate: z.number().positive('Bit rate must be positive'),
    codec: z.string().min(1),
    format: z.string().min(1)
  }),
  
  /** Audio transcription schema */
  transcription: z.object({
    language: z.string().length(2, 'Language must be a 2-character code'),
    prompt: z.string().optional(),
    model: z.string().default('whisper-1')
  })
} as const;

/**
 * API Response validation schemas
 */
export const ResponseSchemas = {
  /** Success response schema */
  success: <T>(dataSchema: z.ZodSchema<T>) => z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    meta: z.object({
      timestamp: CommonSchemas.timestamp,
      request_id: CommonSchemas.uuid.optional(),
      pagination: CommonSchemas.pagination.optional()
    }).optional()
  }),
  
  /** Error response schema */
  error: z.object({
    success: z.literal(false),
    error: z.string(),
    details: z.array(z.object({
      code: z.string(),
      message: z.string(),
      path: z.array(z.union([z.string(), z.number()])).optional()
    })).optional(),
    meta: z.object({
      timestamp: CommonSchemas.timestamp,
      request_id: CommonSchemas.uuid.optional()
    }).optional()
  })
};

/**
 * Environment validation schema
 */
export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']).default('INFO'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  APP_URL: CommonSchemas.url,
  API_KEY: z.string().min(1, 'API key is required'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  
  // AI Providers
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  ANTHROPIC_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  
  // External services (all optional but validated if provided)
  QDRANT_URL: CommonSchemas.url.optional(),
  ALGOLIA_APP_ID: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  LINEAR_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional()
});

/**
 * Type exports for TypeScript usage
 */
export type UserCreateInput = z.infer<typeof UserSchemas.create>;
export type UserUpdateInput = z.infer<typeof UserSchemas.update>;
export type AuthRegisterInput = z.infer<typeof AuthSchemas.register>;
export type AuthLoginInput = z.infer<typeof AuthSchemas.login>;
export type ToolExecuteInput = z.infer<typeof ToolSchemas.execute>;
export type MemoryCreateInput = z.infer<typeof MemorySchemas.create>;
export type MemorySearchInput = z.infer<typeof MemorySchemas.search>;
export type FileUploadInput = z.infer<typeof FileSchemas.upload>;
export type VectorSearchInput = z.infer<typeof VectorSchemas.search>;
export type TextSplitInput = z.infer<typeof TextSchemas.split>;
export type WebSearchInput = z.infer<typeof WebSchemas.search>;
export type SuccessResponse<T> = z.infer<ReturnType<typeof ResponseSchemas.success<T>>>;
export type ErrorResponse = z.infer<typeof ResponseSchemas.error>; 