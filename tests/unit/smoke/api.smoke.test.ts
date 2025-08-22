import { describe, test, expect } from 'bun:test';
import { app } from '../../../src/app';

const run = process.env.SMOKE_API === '1';

(run ? describe : describe.skip)('Smoke: API minimal flow', () => {
  test('migrate, register, login, create conversation', async () => {
    await import('../../../src/database/migrate');

    const email = `user_${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'Smoke User';

    let res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    expect(res.status).toBe(200);
    const reg = await res.json();
    expect(typeof reg.token).toBe('string');

    res = await app.request('/api/agi/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${reg.token}` }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.conversation_id).toBe('string');
  });
});


