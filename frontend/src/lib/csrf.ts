import { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

export function validateOrigin(req: NextRequest): { ok: true } | { ok: false; reason: string } {
  const method = req.method.toUpperCase();
  if (isSafeMethod(method)) return { ok: true };

  const allowedOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || null;

  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');

  const originHost = parseHost(originHeader);
  const refererHost = parseHost(refererHeader);
  const selfHost = req.nextUrl.host;

  const isSameOrigin = originHost === selfHost || refererHost === selfHost;
  const isAllowed = allowedOrigin ? originHeader === allowedOrigin || refererHeader?.startsWith(allowedOrigin) : false;

  if (originHeader == null && refererHeader == null) {
    // Non-browser clients; allow
    return { ok: true };
  }

  if (isSameOrigin || isAllowed) return { ok: true };

  return { ok: false, reason: 'CSRF validation failed (bad Origin/Referer)' };
}


