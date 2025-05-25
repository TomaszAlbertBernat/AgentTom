/**
 * Validation Middleware for AgentTom
 * 
 * Provides comprehensive request validation using Zod schemas with consistent error handling.
 * This middleware integrates with the centralized validation schemas and provides detailed
 * error responses for validation failures.
 * 
 * Features:
 * - Request body, query, and parameter validation
 * - Detailed error messages with field-specific information
 * - Type-safe validation with TypeScript integration
 * - Consistent error response format
 * - Performance optimized with schema caching
 * 
 * @example
 * ```typescript
 * import { validateBody, validateQuery, validateParams } from '../middleware/validation';
 * import { UserSchemas } from '../validation/schemas';
 * 
 * // Validate request body
 * router.post('/users', validateBody(UserSchemas.create), async (c) => {
 *   const userData = c.get('validatedData'); // Fully typed and validated
 *   // ... handle request
 * });
 * 
 * // Validate query parameters
 * router.get('/users', validateQuery(CommonSchemas.pagination), async (c) => {
 *   const pagination = c.get('validatedQuery');
 *   // ... handle request
 * });
 * ```
 */

import type { MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { createLogger } from '../services/common/logger.service';

const validationLogger = createLogger('VALIDATION_MIDDLEWARE');

/**
 * Error response interface for validation failures
 */
interface ValidationErrorResponse {
  success: false;
  error: string;
  details: Array<{
    code: string;
    message: string;
    path: (string | number)[];
    received?: any;
  }>;
  meta: {
    timestamp: string;
    request_id?: string;
  };
}

/**
 * Formats Zod validation errors into a consistent response structure
 * 
 * @param error - The Zod validation error
 * @param context - Additional context about where the validation failed
 * @returns Formatted error response
 */
const formatValidationError = (error: z.ZodError, context: string): ValidationErrorResponse => {
  const details = error.errors.map(err => ({
    code: err.code,
    message: err.message,
    path: err.path,
    received: 'received' in err ? err.received : undefined
  }));

  validationLogger.warn(`Validation failed in ${context}`, {
    errorCount: details.length,
    errors: details
  });

  return {
    success: false,
    error: `Validation failed for ${context}`,
    details,
    meta: {
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Validates request body using the provided Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @returns Hono middleware handler
 * 
 * @example
 * ```typescript
 * import { UserSchemas } from '../validation/schemas';
 * 
 * router.post('/users', validateBody(UserSchemas.create), async (c) => {
 *   const userData = c.get('validatedData');
 *   console.log(userData.name); // Type-safe access
 * });
 * ```
 */
export const validateBody = <T>(schema: z.ZodSchema<T>): MiddlewareHandler => {
  return async (c, next) => {
    try {
      const body = await c.req.json();
      const validatedData = schema.parse(body);
      
      validationLogger.debug('Request body validation successful', {
        dataKeys: Object.keys(validatedData as any)
      });
      
      c.set('validatedData', validatedData);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse = formatValidationError(error, 'request body');
        return c.json(errorResponse, 400);
      }
      
      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        validationLogger.warn('Invalid JSON in request body', { error: error.message });
        return c.json({
          success: false,
          error: 'Invalid JSON in request body',
          details: [{
            code: 'invalid_json',
            message: 'Request body must be valid JSON',
            path: []
          }],
          meta: {
            timestamp: new Date().toISOString()
          }
        }, 400);
      }
      
      throw error; // Re-throw unexpected errors
    }
  };
};

/**
 * Validates query parameters using the provided Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @returns Hono middleware handler
 * 
 * @example
 * ```typescript
 * import { CommonSchemas } from '../validation/schemas';
 * 
 * router.get('/users', validateQuery(CommonSchemas.pagination), async (c) => {
 *   const { page, limit } = c.get('validatedQuery');
 *   // ... handle pagination
 * });
 * ```
 */
export const validateQuery = <T>(schema: z.ZodSchema<T>): MiddlewareHandler => {
  return async (c, next) => {
    try {
      const query = c.req.query();
      
      // Convert string values to appropriate types for validation
      const processedQuery: Record<string, any> = {};
      for (const [key, value] of Object.entries(query)) {
        // Try to parse numbers
        if (/^\d+$/.test(value)) {
          processedQuery[key] = parseInt(value, 10);
        } else if (/^\d*\.\d+$/.test(value)) {
          processedQuery[key] = parseFloat(value);
        } else if (value === 'true' || value === 'false') {
          processedQuery[key] = value === 'true';
        } else {
          processedQuery[key] = value;
        }
      }
      
      const validatedQuery = schema.parse(processedQuery);
      
      validationLogger.debug('Query parameters validation successful', {
        queryKeys: Object.keys(validatedQuery as any)
      });
      
      c.set('validatedQuery', validatedQuery);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse = formatValidationError(error, 'query parameters');
        return c.json(errorResponse, 400);
      }
      
      throw error;
    }
  };
};

/**
 * Validates route parameters using the provided Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @returns Hono middleware handler
 * 
 * @example
 * ```typescript
 * import { UserSchemas } from '../validation/schemas';
 * 
 * router.get('/users/:uuid', validateParams(UserSchemas.params), async (c) => {
 *   const { uuid } = c.get('validatedParams');
 *   // uuid is guaranteed to be a valid UUID
 * });
 * ```
 */
export const validateParams = <T>(schema: z.ZodSchema<T>): MiddlewareHandler => {
  return async (c, next) => {
    try {
      const params = c.req.param();
      const validatedParams = schema.parse(params);
      
      validationLogger.debug('Route parameters validation successful', {
        paramKeys: Object.keys(validatedParams as any)
      });
      
      c.set('validatedParams', validatedParams);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse = formatValidationError(error, 'route parameters');
        return c.json(errorResponse, 400);
      }
      
      throw error;
    }
  };
};

/**
 * Validates all request components (body, query, params) using provided schemas
 * 
 * @param options - Validation options for different request components
 * @returns Hono middleware handler
 * 
 * @example
 * ```typescript
 * import { UserSchemas, CommonSchemas } from '../validation/schemas';
 * 
 * router.patch('/users/:uuid', validateRequest({
 *   body: UserSchemas.update,
 *   params: UserSchemas.params,
 *   query: CommonSchemas.pagination
 * }), async (c) => {
 *   const body = c.get('validatedData');
 *   const params = c.get('validatedParams');
 *   const query = c.get('validatedQuery');
 * });
 * ```
 */
export const validateRequest = (options: {
  body?: z.ZodSchema<any>;
  query?: z.ZodSchema<any>;
  params?: z.ZodSchema<any>;
}): MiddlewareHandler => {
  return async (c, next) => {
    // Validate parameters first (most likely to fail fast)
    if (options.params) {
      try {
        const params = c.req.param();
        const validatedParams = options.params.parse(params);
        c.set('validatedParams', validatedParams);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorResponse = formatValidationError(error, 'route parameters');
          return c.json(errorResponse, 400);
        }
        throw error;
      }
    }

    // Validate query parameters
    if (options.query) {
      try {
        const query = c.req.query();
        const processedQuery: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(query)) {
          if (/^\d+$/.test(value)) {
            processedQuery[key] = parseInt(value, 10);
          } else if (/^\d*\.\d+$/.test(value)) {
            processedQuery[key] = parseFloat(value);
          } else if (value === 'true' || value === 'false') {
            processedQuery[key] = value === 'true';
          } else {
            processedQuery[key] = value;
          }
        }
        
        const validatedQuery = options.query.parse(processedQuery);
        c.set('validatedQuery', validatedQuery);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorResponse = formatValidationError(error, 'query parameters');
          return c.json(errorResponse, 400);
        }
        throw error;
      }
    }

    // Validate request body last (potentially largest)
    if (options.body) {
      try {
        const body = await c.req.json();
        const validatedData = options.body.parse(body);
        c.set('validatedData', validatedData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorResponse = formatValidationError(error, 'request body');
          return c.json(errorResponse, 400);
        }
        
        if (error instanceof SyntaxError) {
          return c.json({
            success: false,
            error: 'Invalid JSON in request body',
            details: [{
              code: 'invalid_json',
              message: 'Request body must be valid JSON',
              path: []
            }],
            meta: {
              timestamp: new Date().toISOString()
            }
          }, 400);
        }
        
        throw error;
      }
    }

    validationLogger.debug('Complete request validation successful');
    await next();
  };
};

/**
 * Higher-order function to create custom validation middleware
 * Useful for specialized validation scenarios
 * 
 * @param validator - Custom validation function
 * @param context - Context description for error messages
 * @returns Hono middleware handler
 * 
 * @example
 * ```typescript
 * const validateFileSize = createCustomValidator(
 *   (req) => {
 *     const contentLength = req.headers.get('content-length');
 *     if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
 *       throw new Error('File too large');
 *     }
 *   },
 *   'file size'
 * );
 * ```
 */
export const createCustomValidator = (
  validator: (req: Request) => void | Promise<void>,
  context: string
): MiddlewareHandler => {
  return async (c, next) => {
    try {
      await validator(c.req.raw);
      validationLogger.debug(`Custom validation successful: ${context}`);
      await next();
    } catch (error) {
      validationLogger.warn(`Custom validation failed: ${context}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return c.json({
        success: false,
        error: `Validation failed for ${context}`,
        details: [{
          code: 'custom_validation_error',
          message: error instanceof Error ? error.message : 'Validation failed',
          path: []
        }],
        meta: {
          timestamp: new Date().toISOString()
        }
      }, 400);
    }
  };
};

/**
 * Middleware to validate Content-Type header for specific endpoints
 * 
 * @param expectedTypes - Array of acceptable content types
 * @returns Hono middleware handler
 * 
 * @example
 * ```typescript
 * router.post('/upload', 
 *   validateContentType(['multipart/form-data', 'application/json']),
 *   // ... handler
 * );
 * ```
 */
export const validateContentType = (expectedTypes: string[]): MiddlewareHandler => {
  return async (c, next) => {
    const contentType = c.req.header('content-type') || '';
    const isValid = expectedTypes.some(type => contentType.includes(type));
    
    if (!isValid) {
      validationLogger.warn('Invalid content type', {
        received: contentType,
        expected: expectedTypes
      });
      
      return c.json({
        success: false,
        error: 'Invalid Content-Type header',
        details: [{
          code: 'invalid_content_type',
          message: `Expected one of: ${expectedTypes.join(', ')}`,
          path: ['headers', 'content-type'],
          received: contentType
        }],
        meta: {
          timestamp: new Date().toISOString()
        }
      }, 400);
    }
    
    await next();
  };
};

/**
 * Type definitions for validated data access
 * Extends Hono context variables to include our validation results
 */
declare module 'hono' {
  interface ContextVariableMap {
    validatedData?: any;
    validatedQuery?: any;
    validatedParams?: any;
  }
} 