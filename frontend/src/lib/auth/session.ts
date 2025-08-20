import { cookies } from 'next/headers';
import { isProduction } from '../config';

const JWT_COOKIE_NAME = 'jwt';

export async function getJwtFromCookies(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(JWT_COOKIE_NAME)?.value;
}

export async function setJwtCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearJwtCookie(): Promise<void> {
  const store = await cookies();
  store.set(JWT_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: 0,
  });
}


