import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import dynamic from 'next/dynamic';
import { isAuthenticated, needsSetup, isLocalMode } from '@/lib/auth/local-mode';

const RateLimitBanner = dynamic(() => import('@/components/RateLimitBanner'), { ssr: false });

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const auth = await isAuthenticated();
  const isLocal = await isLocalMode();

  // In local mode, always allow access (no auth redirect)
  if (!isLocal && !auth.authenticated) {
    redirect('/login');
  }

  // If in local mode and setup is needed, redirect to setup
  if (isLocal && await needsSetup()) {
    redirect('/setup');
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r p-4 space-y-3">
        <h2 className="font-semibold">AgentTom</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/">Dashboard</Link>
          <Link href="/chat">Chat</Link>
          <Link href="/conversations">Conversations</Link>
          <Link href="/tools">Tools</Link>
          <Link href="/files">Files</Link>
          <Link href="/search">Search</Link>
        </nav>
        {/* Only show logout button in multi-user mode */}
        {!isLocal && (
          <div className="pt-2 border-t mt-2">
            <LogoutButton />
          </div>
        )}
      </aside>
      <main className="flex-1 p-0">
        <RateLimitBanner />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}


