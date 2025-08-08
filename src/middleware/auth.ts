/**
 * Authentication middleware
 * Handles API key validation and request context setup
 * @module auth
 */

import {Context, Next} from 'hono';
import {v4 as uuidv4} from 'uuid';
import {providers} from '../config/llm.config';
import {apiKeyService} from '../services/common/api-key.service';
import jwt from 'jsonwebtoken';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  /^\/api\/auth\/google(?:\/.*)?$/,
  /^\/api\/auth\/(register|login|me)$/,
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
    const disableApiKey = (process.env.DISABLE_API_KEY === 'true') || ((process.env.NODE_ENV || 'development') !== 'production');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({error: 'Missing or invalid authorization header'}, {status: 401});
    }

    const token = authHeader.split(' ')[1];

    let userId: string | null = null;
    let scopes: string[] = [];

    if (disableApiKey) {
      // Prefer JWT-based auth when API key checks are disabled (dev-friendly)
      try {
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const payload = jwt.verify(token, secret) as { user_id?: string };
        if (!payload?.user_id) {
          return c.json({ error: 'Invalid JWT payload' }, { status: 401 });
        }
        userId = payload.user_id;
        scopes = ['user'];
      } catch (_) {
        return c.json({ error: 'Invalid or expired JWT' }, { status: 401 });
      }
    } else {
      // Validate the API key in production or when explicitly enabled
      const validation = await apiKeyService.validateApiKey({
        key: token,
        requiredScopes: ['api:access']
      });

      if (!validation.valid) {
        return c.json({error: 'Invalid or expired API key'}, {status: 401});
      }
      userId = validation.userId;
      scopes = validation.scopes || [];
    }

    // Set up request context
    // Avoid consuming request body here to not conflict with downstream validators
    const content_type = c.req.header('Content-Type') || '';
    const is_multipart = content_type.includes('multipart/form-data');
    const request_body: Record<string, unknown> = {};

    const supported_models = Object.values(providers)
      .flatMap(provider => Object.keys(provider));
    const default_model = 'gpt-4';
    const requested_model = is_multipart ? default_model : (request_body as any).model;
    const validated_model = supported_models.includes(requested_model) ? requested_model : default_model;

    if (requested_model && requested_model !== validated_model) {
      c.set('warning', `Invalid model '${requested_model}' requested. Using '${default_model}' instead.`);
    }

    // Set request context with user and model information
    c.set('request', {
      ...request_body,
      user: {
        id: userId,
        scopes,
      },
      model: validated_model,
      conversation_id: is_multipart ? uuidv4() : ((request_body as any).conversation_id || uuidv4())
    });

    await next();
  };
};
