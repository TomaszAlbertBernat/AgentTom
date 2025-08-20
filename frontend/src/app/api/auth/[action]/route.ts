import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_API_KEY, API_BASE_URL } from '@/lib/config';
import { setJwtCookie, clearJwtCookie, getJwtFromCookies } from '@/lib/auth/session';
import { validateOrigin } from '@/lib/csrf';

const BACKEND_AUTH_BASE = `${API_BASE_URL}/api/auth`;

export async function POST(req: NextRequest, context: any) {
  const { action } = (await context.params) as { action: string };
  const body = await req.json().catch(() => ({}));

  if (!['login', 'register', 'logout'].includes(action)) {
    return NextResponse.json({ ok: false, message: 'Unsupported action' }, { status: 400 });
  }

  if (action === 'logout') {
    const csrf = validateOrigin(req);
    if (!csrf.ok) {
      return NextResponse.json({ error: 'Forbidden', message: csrf.reason }, { status: 403 });
    }
    await clearJwtCookie();
    return NextResponse.json({ ok: true });
  }

  const csrf = validateOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: 'Forbidden', message: csrf.reason }, { status: 403 });
  }

  const res = await fetch(`${BACKEND_AUTH_BASE}/${action}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(BACKEND_API_KEY ? { 'X-API-Key': BACKEND_API_KEY } : {}),
    },
    body: JSON.stringify(body),
    // Do not forward client cookies to backend
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json({ ok: false, message: data?.error || 'Auth failed' }, { status: res.status });
  }

  const token: string | undefined = data?.token;
  if (!token) {
    return NextResponse.json({ ok: false, message: 'Missing token from backend' }, { status: 500 });
  }

  // Set HttpOnly JWT cookie
  await setJwtCookie(token);

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, context: any) {
  const { action } = (await context.params) as { action: string };
  if (action !== 'me') {
    return NextResponse.json({ ok: false, message: 'Unsupported action' }, { status: 400 });
  }
  const token = await getJwtFromCookies();
  if (!token) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${BACKEND_AUTH_BASE}/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(BACKEND_API_KEY ? { 'X-API-Key': BACKEND_API_KEY } : {}),
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}


