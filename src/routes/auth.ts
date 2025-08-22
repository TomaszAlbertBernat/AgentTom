import { Hono } from 'hono';
import { google } from 'googleapis';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { AppEnv } from '../types/hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../database';
import { users } from '../schema/user';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { apiKeyService } from '../services/common/api-key.service';






// Constants
const GOOGLE_REDIRECT_URI = `${process.env.APP_URL}/api/auth/google/callback`;

// Environment validation schema
const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  APP_URL: z.string().url()
});









const auth = new Hono<AppEnv>();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2),
});

// JWT middleware
export const jwtMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    c.set('jwtPayload', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

// Register route
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');

  // Check if user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    return c.json({ error: 'User already exists' }, 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user_uuid = uuidv4();
  await db.insert(users).values({
    uuid: user_uuid,
    email,
    password: hashedPassword,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Generate JWT
  const token = jwt.sign({ user_id: user_uuid }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

  return c.json({ token });
});

// Login route
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Compare password
  if (!user.password) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Generate JWT
  const token = jwt.sign({ user_id: user.uuid }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

  return c.json({ token });
});

// Protected route example
auth.get('/me', jwtMiddleware, async (c) => {
  const user_id = (c.get('jwtPayload' as any) as any).user_id;

  const user = await db.query.users.findFirst({
    where: eq(users.uuid, user_id),
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    id: user.uuid,
    email: user.email,
    name: user.name,
  });
});

export { auth as authRoutes };

// API Key management (JWT-protected)
// Create/mint a new API key for the authenticated user
const createApiKeyRequestSchema = z.object({
  name: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
  scopes: z.array(z.string()).optional(),
  maxRequestsPerDay: z.number().int().positive().optional()
});

auth.post('/api-keys', jwtMiddleware, zValidator('json', createApiKeyRequestSchema), async (c) => {
  const { name, expiresAt, scopes, maxRequestsPerDay } = c.req.valid('json');
  const jwtPayload = c.get('jwtPayload' as any) as { user_id?: string };
  const userId = jwtPayload?.user_id;

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { key } = await apiKeyService.createApiKey({
    userId,
    name,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    scopes,
    maxRequestsPerDay
  });

  return c.json({
    key,
    meta: {
      name,
      scopes: scopes || [],
      maxRequestsPerDay: maxRequestsPerDay || 1000,
      expiresAt: expiresAt || null
    }
  }, 201);
});
