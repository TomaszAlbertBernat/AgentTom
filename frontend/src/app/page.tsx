import { redirect } from 'next/navigation';
import { isAuthenticated, needsSetup, isLocalMode } from '@/lib/auth/local-mode';

export default async function Home() {
  const auth = await isAuthenticated();
  const isLocal = await isLocalMode();

  // In local mode, always redirect to setup if needed, otherwise to main app
  if (isLocal) {
    if (await needsSetup()) {
      redirect('/setup');
    }
    redirect('/chat');
  }

  // In multi-user mode, use standard auth flow
  if (!auth.authenticated) {
    redirect('/login');
  }

  redirect('/chat');
}
