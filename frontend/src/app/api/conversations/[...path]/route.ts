import { NextRequest } from 'next/server';
import { API_BASE_URL, BACKEND_API_KEY } from '@/lib/config';
import { getJwtFromCookies } from '@/lib/auth/session';

const BASE = `${API_BASE_URL}/api/conversations`;

function buildUrl(pathParts: string[], search: string) {
  const path = pathParts.join('/');
  const url = `${BASE}/${path}`;
  return search ? `${url}?${search}` : url;
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const token = await getJwtFromCookies();
  const url = buildUrl(params.path, req.nextUrl.searchParams.toString());

  const headers: Record<string, string> = {
    'content-type': req.headers.get('content-type') || 'application/json',
    ...(BACKEND_API_KEY ? { 'X-API-Key': BACKEND_API_KEY } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
    cache: 'no-store',
  };

  const res = await fetch(url, init);
  const data = await res.text();
  return new Response(data, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
}

export async function GET(req: NextRequest, context: any) {
  const params = await context.params;
  return proxy(req, params as { path: string[] });
}
export async function POST(req: NextRequest, context: any) {
  const params = await context.params;
  return proxy(req, params as { path: string[] });
}
export async function PUT(req: NextRequest, context: any) {
  const params = await context.params;
  return proxy(req, params as { path: string[] });
}
export async function DELETE(req: NextRequest, context: any) {
  const params = await context.params;
  return proxy(req, params as { path: string[] });
}


