import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, BACKEND_API_KEY } from '@/lib/config';
import { validateOrigin } from '@/lib/csrf';

const BASE = `${API_BASE_URL}/api/web`;

function buildUrl(pathParts: string[], search: string) {
  const path = pathParts.join('/');
  const url = `${BASE}/${path}`;
  return search ? `${url}?${search}` : url;
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const url = buildUrl(params.path, req.nextUrl.searchParams.toString());

  const headers: Record<string, string> = {
    'content-type': req.headers.get('content-type') || 'application/json',
    ...(BACKEND_API_KEY ? { 'X-API-Key': BACKEND_API_KEY } : {}),
  };

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
    cache: 'no-store',
  };

  const res = await fetch(url, init);
  const data = await res.text();
  const headers = new Headers({ 'content-type': res.headers.get('content-type') || 'application/json' });
  const rlLimit = res.headers.get('x-ratelimit-limit') || res.headers.get('X-RateLimit-Limit');
  const rlRemaining = res.headers.get('x-ratelimit-remaining') || res.headers.get('X-RateLimit-Remaining');
  const rlReset = res.headers.get('x-ratelimit-reset') || res.headers.get('X-RateLimit-Reset');
  if (rlLimit) headers.set('x-ratelimit-limit', rlLimit);
  if (rlRemaining) headers.set('x-ratelimit-remaining', rlRemaining);
  if (rlReset) headers.set('x-ratelimit-reset', rlReset);
  return new Response(data, { status: res.status, headers });
}

export async function GET(req: NextRequest, context: any) {
  const params = await context.params;
  return proxy(req, params as { path: string[] });
}
export async function POST(req: NextRequest, context: any) {
  const csrf = validateOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: 'Forbidden', message: csrf.reason }, { status: 403 });
  }
  const params = await context.params;
  return proxy(req, params as { path: string[] });
}
export async function PUT(req: NextRequest, context: any) {
  const csrf = validateOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: 'Forbidden', message: csrf.reason }, { status: 403 });
  }
  const params = await context.params;
  return proxy(req, params as { path: string[] });
}
export async function DELETE(req: NextRequest, context: any) {
  const csrf = validateOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: 'Forbidden', message: csrf.reason }, { status: 403 });
  }
  const params = await context.params;
  return proxy(req, params as { path: string[] });
}


