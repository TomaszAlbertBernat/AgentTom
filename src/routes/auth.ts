import { Hono } from 'hono';
import { google } from 'googleapis';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { findByToken, findByUUID, getGoogleTokens, updateGoogleTokens } from '../services/common/user.service';
import { randomBytes } from 'crypto';
import { spotifyService } from '../services/tools/spotify.service';
import { AppEnv } from '../types/hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '../database';
import { users } from '../schema/users';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


// Session interfaces
interface SessionData {
  id: string;
  user_email: string;
  access_token: string;
  refresh_token?: string;
  created_at: Date;
}

const SessionSchema = z.object({
  user_email: z.string().email(),
  access_token: z.string(),
  refresh_token: z.string().optional()
});

const SpotifyCallbackSchema = z.object({
  code: z.string(),
  state: z.string()
});

// In-memory session storage
const sessions = new Map<string, SessionData>();

// Constants
const GOOGLE_REDIRECT_URI = `${process.env.APP_URL}/api/auth/google/callback`;
const SPOTIFY_REDIRECT_URI = `${process.env.APP_URL}/api/auth/spotify/callback`;

// Environment validation schema
const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  APP_URL: z.string().url()
});

// OAuth2 client setup with error handling
const createOAuth2Client = () => {
  const env = envSchema.parse(process.env);
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
};

// Initialize OAuth2 client
const oauth2Client = createOAuth2Client();

const sessionService = {
  create: async (data: z.infer<typeof SessionSchema>) => {
    const session: SessionData = {
      id: uuidv4(),
      ...data,
      created_at: new Date()
    };
    sessions.set(session.id, session);
    return session;
  },
  get: async (session_id: string) => sessions.get(session_id) || null
};

const googleService = {
  getAuthUrl: () => {
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      response_type: 'code',
      scope: scopes,
      prompt: 'consent',
      state: uuidv4(),
      redirect_uri: GOOGLE_REDIRECT_URI
    });
  },

  handleCallback: async (code: string) => {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const user_info = await oauth2.userinfo.get();

    return sessionService.create({
      user_email: user_info.data.email!,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? undefined
    });
  }
};

// Update the Google OAuth client setup to use user tokens
const createGoogleClient = async (user_uuid: string) => {
  const tokens = await getGoogleTokens(user_uuid);
  if (!tokens?.access_token) {
    throw new Error('Google authentication required');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expires_at?.getTime()
  });

  return oauth2Client;
};

// Add this schema for request validation
const AuthRequestSchema = z.object({
  token: z.string().optional()
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
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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
  const user_id = uuidv4();
  await db.insert(users).values({
    id: user_id,
    email,
    password: hashedPassword,
    name,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Generate JWT
  const token = jwt.sign({ user_id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

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
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Generate JWT
  const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

  return c.json({ token });
});

// Protected route example
auth.get('/me', jwtMiddleware, async (c) => {
  const user_id = (c.get('jwtPayload' as any) as any).user_id;

  const user = await db.query.users.findFirst({
    where: eq(users.id, user_id),
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
});

export { auth as authRoutes };
