import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, BACKEND_API_KEY } from '@/lib/config';
import { getJwtFromCookies } from '@/lib/auth/session';
import { validateOrigin } from '@/lib/csrf';

const BASE = `${API_BASE_URL}/api/files`;

function buildUrl(pathParts: string[], search: string) {
  const path = pathParts.join('/');
  const url = `${BASE}/${path}`;
  return search ? `${url}?${search}` : url;
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const token = await getJwtFromCookies();
  const url = buildUrl(params.path, req.nextUrl.searchParams.toString());

  const headers: Record<string, string> = {
    ...(BACKEND_API_KEY ? { 'X-API-Key': BACKEND_API_KEY } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
    cache: 'no-store',
  };

  const res = await fetch(url, init);
  const blob = await res.arrayBuffer();
  return new Response(blob, { status: res.status, headers: res.headers });
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


