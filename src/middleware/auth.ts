/**
 * Authentication middleware
 * Handles API key validation and request context setup
 * @module auth
 */

import {Context, Next} from 'hono';
import {v4 as uuidv4} from 'uuid';
import {providers} from '../config/llm.config';
import {apiKeyService} from '../services/common/api-key.service';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  /^\/api\/auth\/google(?:\/.*)?$/,
  /^\/(api\/auth|api\/files|api\/file)\/[0-9a-f-]+$/i,
  /^\/api\/auth\/spotify\/(?:callback|authorize)/
];

/**
 * Authentication middleware factory
 * @returns {Function} Hono middleware function
 */
export const authMiddleware = () => {
  return async (c: Context, next: Next) => {
    // Skip authentication for public paths
    if (PUBLIC_PATHS.some(pattern => c.req.path.match(pattern))) {
      return next();
    }

    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({error: 'Missing or invalid authorization header'}, {status: 401});
    }

    const token = authHeader.split(' ')[1];
    
    // Validate the API key
    const validation = await apiKeyService.validateApiKey({
      key: token,
      requiredScopes: ['api:access']
    });

    if (!validation.valid) {
      return c.json({error: 'Invalid or expired API key'}, {status: 401});
    }

    // Set up request context
    const content_type = c.req.header('Content-Type') || '';
    const is_multipart = content_type.includes('multipart/form-data');
    const request_body = is_multipart ? {} : await c.req.json().catch(() => ({}));

    const supported_models = Object.values(providers)
      .flatMap(provider => Object.keys(provider));
    const default_model = 'gpt-4';
    const requested_model = is_multipart ? default_model : request_body.model;
    const validated_model = supported_models.includes(requested_model) ? requested_model : default_model;

    if (requested_model && requested_model !== validated_model) {
      c.set('warning', `Invalid model '${requested_model}' requested. Using '${default_model}' instead.`);
    }

    // Set request context with user and model information
    c.set('request', {
      ...request_body,
      user: {
        id: validation.userId,
        scopes: validation.scopes
      },
      model: validated_model,
      conversation_id: is_multipart ? uuidv4() : request_body.conversation_id || uuidv4()
    });

    await next();
  };
};
