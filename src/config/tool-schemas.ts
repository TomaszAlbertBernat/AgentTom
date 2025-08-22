/**
 * Validation schemas for tool parameters
 * Provides type-safe validation for all tool actions and payloads
 * @module tool-schemas
 */

import { z } from 'zod';

// Spotify Tool Schemas
export const spotifySchemas = {
  search: z.object({
    query: z.string(),
    type: z.enum(['track', 'album', 'artist', 'playlist']),
    limit: z.number().int().min(1).max(50).default(20)
  }),
  play: z.object({
    uri: z.string().startsWith('spotify:'),
    device_id: z.string().optional()
  }),
  pause: z.object({
    device_id: z.string().optional()
  })
};

// Memory Tool Schemas
export const memorySchemas = {
  recall: z.object({
    query: z.string(),
    limit: z.number().int().min(1).max(100).default(10),
    threshold: z.number().min(0).max(1).default(0.7)
  }),
  store: z.object({
    content: z.string(),
    metadata: z.record(z.string(), z.string()).optional()
  })
};

// Resend Tool Schemas
export const resendSchemas = {
  send: z.object({
    to: z.string().email(),
    subject: z.string(),
    text: z.string(),
    html: z.string().optional(),
    from: z.string().email().optional()
  })
};

// File Tool Schemas
export const fileSchemas = {
  write: z.object({
    query: z.string(),
    context: z.array(z.string().uuid()).default([])
  }),
  load: z.object({
    path: z.string()
  }),
  upload: z.object({
    path: z.string(),
    content: z.string()
  })
};

// Speak Tool Schemas
export const speakSchemas = {
  textToSpeech: z.object({
    text: z.string(),
    voice: z.string().optional(),
    speed: z.number().min(0.5).max(2).default(1)
  })
};

// Linear Tool Schemas
export const linearSchemas = {
  createIssue: z.object({
    title: z.string(),
    description: z.string().optional(),
    teamId: z.string(),
    priority: z.number().min(0).max(4).default(2),
    labels: z.array(z.string()).optional()
  }),
  updateIssue: z.object({
    issueId: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    stateId: z.string().optional(),
    priority: z.number().min(0).max(4).optional()
  })
};

// Map Tool Schemas
export const mapSchemas = {
  search: z.object({
    query: z.string(),
    location: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    radius: z.number().min(1).max(50000).default(5000)
  }),
  directions: z.object({
    origin: z.string(),
    destination: z.string(),
    mode: z.enum(['driving', 'walking', 'bicycling', 'transit']).default('driving')
  })
};

// Crypto Tool Schemas
export const cryptoSchemas = {
  encrypt: z.object({
    text: z.string(),
    key: z.string().min(32)
  }),
  decrypt: z.object({
    text: z.string(),
    key: z.string().min(32)
  })
};

// Web Tool Schemas
export const webSchemas = {
  search: z.object({
    query: z.string()
  }),
  getContents: z.object({
    url: z.string().url()
  })
};

// Image Tool Schemas
export const imageSchemas = {
  analyze: z.object({
    image_url: z.string().url(),
    query: z.string().optional(),
    context: z.string().optional()
  }),
  generate: z.object({
    prompt: z.string(),
    size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
    quality: z.enum(['standard', 'hd']).default('standard'),
    style: z.enum(['vivid', 'natural']).default('vivid')
  }),
  edit: z.object({
    image_url: z.string().url(),
    mask_url: z.string().url().optional(),
    prompt: z.string(),
    size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024')
  }),
  variation: z.object({
    image_url: z.string().url(),
    n: z.number().int().min(1).max(10).default(1),
    size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024')
  })
};

// Calendar Tool Schemas
export const calendarSchemas = {
  createEvent: z.object({
    summary: z.string(),
    description: z.string().optional(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    attendees: z.array(z.string().email()).optional()
  }),
  updateEvent: z.object({
    eventId: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    attendees: z.array(z.string().email()).optional()
  })
};

// Combined schemas for all tools
export const toolSchemas = {
  spotify: spotifySchemas,
  memory: memorySchemas,
  resend: resendSchemas,
  file: fileSchemas,
  speak: speakSchemas,
  linear: linearSchemas,
  map: mapSchemas,
  crypto: cryptoSchemas,
  web: webSchemas,
  image: imageSchemas,
  calendar: calendarSchemas
} as const;

// Type for tool action payloads
export type ToolActionPayload<T extends keyof typeof toolSchemas, A extends keyof typeof toolSchemas[T]> = 
  z.infer<typeof toolSchemas[T][A] extends z.ZodType ? typeof toolSchemas[T][A] : never>; 