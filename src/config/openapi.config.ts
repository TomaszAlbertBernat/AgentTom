/**
 * OpenAPI configuration for AgentTom API
 * Defines the API specification for automatic documentation generation
 * @module openapi.config
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

/**
 * OpenAPI specification configuration
 */
export const openApiConfig = {
  openapi: '3.0.0',
  info: {
    title: 'AgentTom API',
    version: '1.0.0',
    description: `
# AgentTom API Documentation

AgentTom is a comprehensive AI agent system that provides intelligent conversation capabilities, 
tool execution, file management, and integration with various external services.

## Features
- 🤖 AI-powered conversations with multiple LLM providers
- 🛠️ Extensible tool system for various tasks
- 📁 File upload and management
- 🔐 Secure authentication and API key management
- 🚀 High-performance caching and rate limiting
- 📊 Comprehensive logging and monitoring

## Authentication
All API endpoints (except public auth endpoints) require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer your_api_key_here
\`\`\`

## Rate Limiting
API requests are rate-limited to ensure fair usage. Rate limit headers are included in responses:
- \`X-RateLimit-Limit\`: Maximum requests allowed
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Time when rate limit resets

## Error Handling
All endpoints return consistent error responses with appropriate HTTP status codes and detailed error information.
    `,
    contact: {
      name: 'AgentTom Support',
      email: 'support@agenttom.ai'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.APP_URL || 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.agenttom.ai',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'API key for authentication'
      }
    },
    schemas: {
      Error: z.object({
        error: z.string().describe('Error type'),
        message: z.string().describe('Human-readable error message'),
        details: z.any().optional().describe('Additional error details'),
        timestamp: z.string().optional().describe('Error timestamp')
      }).openapi('Error'),
      
      Success: z.object({
        success: z.boolean().describe('Operation success status'),
        message: z.string().optional().describe('Success message'),
        data: z.any().optional().describe('Response data')
      }).openapi('Success'),

      User: z.object({
        uuid: z.string().uuid().describe('User unique identifier'),
        name: z.string().describe('User display name'),
        email: z.string().email().describe('User email address'),
        created_at: z.string().describe('User creation timestamp'),
        updated_at: z.string().describe('User last update timestamp')
      }).openapi('User'),

      Conversation: z.object({
        uuid: z.string().uuid().describe('Conversation unique identifier'),
        user_id: z.string().uuid().describe('User ID who owns the conversation'),
        title: z.string().describe('Conversation title'),
        status: z.enum(['active', 'archived', 'deleted']).describe('Conversation status'),
        created_at: z.string().describe('Conversation creation timestamp'),
        updated_at: z.string().describe('Conversation last update timestamp')
      }).openapi('Conversation'),

      Message: z.object({
        uuid: z.string().uuid().describe('Message unique identifier'),
        conversation_uuid: z.string().uuid().describe('Parent conversation ID'),
        role: z.enum(['system', 'user', 'assistant', 'tool']).describe('Message role'),
        content_type: z.enum(['text', 'multi_part']).describe('Content type'),
        content: z.string().nullable().describe('Message text content'),
        multipart: z.any().nullable().describe('Multipart content (images, files, etc.)'),
        created_at: z.string().describe('Message creation timestamp')
      }).openapi('Message'),

      Tool: z.object({
        uuid: z.string().uuid().describe('Tool unique identifier'),
        name: z.string().describe('Tool name'),
        description: z.string().describe('Tool description'),
        category: z.string().describe('Tool category'),
        enabled: z.boolean().describe('Tool availability status'),
        parameters: z.any().describe('Tool parameter schema'),
        created_at: z.string().describe('Tool creation timestamp')
      }).openapi('Tool'),

      Task: z.object({
        uuid: z.string().uuid().describe('Task unique identifier'),
        conversation_uuid: z.string().uuid().describe('Parent conversation ID'),
        name: z.string().describe('Task name'),
        type: z.string().describe('Task type'),
        status: z.string().describe('Task status'),
        description: z.string().nullable().describe('Task description'),
        scheduled_for: z.string().nullable().describe('Task scheduled execution time'),
        completed_at: z.string().nullable().describe('Task completion time'),
        result: z.string().nullable().describe('Task execution result'),
        created_at: z.string().describe('Task creation timestamp')
      }).openapi('Task'),

      FileUpload: z.object({
        uuid: z.string().uuid().describe('File unique identifier'),
        original_name: z.string().describe('Original filename'),
        mime_type: z.string().describe('File MIME type'),
        size: z.number().describe('File size in bytes'),
        url: z.string().url().describe('File access URL'),
        type: z.enum(['image', 'document', 'audio', 'video', 'other']).describe('File type category'),
        created_at: z.string().describe('File upload timestamp')
      }).openapi('FileUpload')
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints'
    },
    {
      name: 'AGI',
      description: 'AI conversation and chat endpoints'
    },
    {
      name: 'Tools',
      description: 'Tool management and execution endpoints'
    },
    {
      name: 'Files',
      description: 'File upload and management endpoints'
    },
    {
      name: 'Conversations',
      description: 'Conversation management endpoints'
    },
    {
      name: 'Users',
      description: 'User management endpoints'
    },
    {
      name: 'Tasks',
      description: 'Task and job management endpoints'
    },
    {
      name: 'Health',
      description: 'System health and status endpoints'
    }
  ]
};

/**
 * Common response schemas for reuse across endpoints
 */
export const commonResponses = {
  400: {
    description: 'Bad Request - Invalid input parameters',
    content: {
      'application/json': {
        schema: z.object({
          error: z.string(),
          message: z.string(),
          details: z.any().optional()
        })
      }
    }
  },
  401: {
    description: 'Unauthorized - Invalid or missing authentication',
    content: {
      'application/json': {
        schema: z.object({
          error: z.literal('Unauthorized'),
          message: z.string()
        })
      }
    }
  },
  403: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: z.object({
          error: z.literal('Forbidden'),
          message: z.string()
        })
      }
    }
  },
  404: {
    description: 'Not Found - Resource does not exist',
    content: {
      'application/json': {
        schema: z.object({
          error: z.literal('Not Found'),
          message: z.string()
        })
      }
    }
  },
  429: {
    description: 'Too Many Requests - Rate limit exceeded',
    content: {
      'application/json': {
        schema: z.object({
          error: z.literal('Too Many Requests'),
          message: z.string(),
          retry_after: z.number().optional()
        })
      }
    }
  },
  500: {
    description: 'Internal Server Error - Unexpected server error',
    content: {
      'application/json': {
        schema: z.object({
          error: z.literal('Internal Server Error'),
          message: z.string()
        })
      }
    }
  }
};

/**
 * Create OpenAPI Hono instance with configuration
 */
export function createOpenAPIApp() {
  return new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: 'Validation Error',
            message: 'Request validation failed',
            details: result.error.flatten()
          },
          400
        );
      }
    }
  });
} 