/**
 * Authentication middleware
 * Handles API key validation and request context setup
 * @module auth
 */

import {Context, Next} from 'hono';
import {v4 as uuidv4} from 'uuid';
import {providers} from '../config/llm.config';
import {apiKeyService} from '../services/common/api-key.service';
import { env } from '../config/env.config';
import jwt from 'jsonwebtoken';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  /^\/api\/auth\/google(?:\/.*)?$/,
  /^\/api\/auth\/(register|login|me)$/,
  /^\/api\/auth\/api-keys$/,
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

    const authorization = c.req.header('Authorization') || c.req.header('authorization');
    const xApiKey = c.req.header('X-API-Key') || c.req.header('x-api-key');
    const xJwt = c.req.header('X-JWT') || c.req.header('x-jwt');
    const disableApiKey = (process.env.DISABLE_API_KEY === 'true') || ((process.env.NODE_ENV || 'development') !== 'production');

    let userId: string | null = null;
    let scopes: string[] = [];

    if (disableApiKey) {
      // Dev/non-production: accept JWT via Authorization Bearer or X-JWT
      const jwtToken = (authorization?.startsWith('Bearer ') ? authorization.split(' ')[1] : undefined) || xJwt || '';
      if (!jwtToken) {
        return c.json({ error: 'Missing JWT. Provide Authorization: Bearer <jwt> or X-JWT header' }, { status: 401 });
      }
      try {
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const payload = jwt.verify(jwtToken, secret) as { user_id?: string };
        if (!payload?.user_id) {
          return c.json({ error: 'Invalid JWT payload' }, { status: 401 });
        }
        userId = payload.user_id;
        scopes = ['user'];
      } catch (_) {
        return c.json({ error: 'Invalid or expired JWT' }, { status: 401 });
      }
    } else {
      // Production: prefer X-API-Key for API key auth; fall back to Authorization: Bearer <api_key> for backward compatibility
      const apiKey = xApiKey || (authorization?.startsWith('Bearer ') ? authorization.split(' ')[1] : undefined);
      if (!apiKey) {
        return c.json({ error: 'Missing API key. Provide X-API-Key header.' }, { status: 401 });
      }
      const validation = await apiKeyService.validateApiKey({
        key: apiKey,
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
    const configured_default = env.DEFAULT_TEXT_MODEL || 'gemini-2.5-flash';
    const default_model = configured_default === 'gemini-2.0-flash' ? 'gemini-2.5-flash' : configured_default;
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
        uuid: userId,
        scopes,
      },
      model: validated_model,
      conversation_id: is_multipart ? uuidv4() : ((request_body as any).conversation_id || uuidv4())
    });

    await next();
  };
};
