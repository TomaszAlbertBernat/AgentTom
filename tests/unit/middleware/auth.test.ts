import { describe, test, expect } from 'bun:test';
import { Hono } from 'hono';
import { authMiddleware } from '../../../src/middleware/auth';
import jwt from 'jsonwebtoken';

describe('authMiddleware - JWT flow in dev/test', () => {
  const app = new Hono();
  app.use('/private/*', authMiddleware());
  app.get('/private/ping', (c) => c.text('ok'));

  test('rejects when JWT is missing', async () => {
    const res = await app.request('/private/ping');
    expect(res.status).toBe(401);
  });

  test('rejects when JWT is invalid', async () => {
    const res = await app.request('/private/ping', {
      headers: { Authorization: 'Bearer invalid' }
    });
    expect(res.status).toBe(401);
  });

  test('allows when JWT is valid and API key is disabled', async () => {
    const token = jwt.sign(
      { user_id: 'u-1' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '1h' }
    );

    const res = await app.request('/private/ping', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });
});


