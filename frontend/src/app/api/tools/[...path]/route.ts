import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, BACKEND_API_KEY } from '@/lib/config';
import { getJwtFromCookies } from '@/lib/auth/session';
import { validateOrigin } from '@/lib/csrf';

const BASE = `${API_BASE_URL}/api/tools`;

function buildUrl(pathParts: string[], search: string) {
  const path = pathParts.join('/');
  const url = `${BASE}/${path}`;
  return search ? `${url}?${search}` : url;
}

function extractRateLimitHeaders(headers: Headers) {
  return {
    limit: Number(headers.get('x-ratelimit-limit') || headers.get('X-RateLimit-Limit') || '') || undefined,
    remaining: Number(headers.get('x-ratelimit-remaining') || headers.get('X-RateLimit-Remaining') || '') || undefined,
    reset: Number(headers.get('x-ratelimit-reset') || headers.get('X-RateLimit-Reset') || '') || undefined,
  } as const;
}

function dispatchClientRateLimit(headers: Headers) {
  // Only runs client-side when the response is consumed by the browser
  const rl = extractRateLimitHeaders(headers);
  // Attach to a trailer header that the client can parse from fetch if needed
  return rl;
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const token = await getJwtFromCookies();
  const url = buildUrl(params.path, req.nextUrl.searchParams.toString());

  const requestHeaders: Record<string, string> = {
    'content-type': req.headers.get('content-type') || 'application/json',
    ...(BACKEND_API_KEY ? { 'X-API-Key': BACKEND_API_KEY } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const init: RequestInit = {
    method: req.method,
    headers: requestHeaders,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
    cache: 'no-store',
  };

  const res = await fetch(url, init);
  const data = await res.text();
  const rl = dispatchClientRateLimit(res.headers);
  const responseHeaders = new Headers({ 'content-type': res.headers.get('content-type') || 'application/json' });
  if (rl.limit != null) responseHeaders.set('x-ratelimit-limit', String(rl.limit));
  if (rl.remaining != null) responseHeaders.set('x-ratelimit-remaining', String(rl.remaining));
  if (rl.reset != null) responseHeaders.set('x-ratelimit-reset', String(rl.reset));
  return new Response(data, { status: res.status, headers: responseHeaders });
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


