import Link from 'next/link';
import { Suspense } from 'react';
import ConversationsList from './conversations-list';

export default function ConversationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Conversations</h1>
      <Suspense fallback={<div className="opacity-60">Loading conversations...</div>}>
        <ConversationsList />
      </Suspense>
    </div>
  );
}


