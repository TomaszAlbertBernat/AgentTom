import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import LogoutButton from '@/components/LogoutButton';
import dynamic from 'next/dynamic';

const RateLimitBanner = dynamic(() => import('@/components/RateLimitBanner'), { ssr: false });

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const jwt = store.get('jwt')?.value;
  if (!jwt) {
    redirect('/login');
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
        <div className="pt-2 border-t mt-2">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-0">
        <RateLimitBanner />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}


