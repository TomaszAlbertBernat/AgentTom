'use client';

import Link from 'next/link';
import { useConversationsQuery } from '@/lib/hooks/useConversations';

export default function ConversationsList() {
  const { data, isLoading, isError, refetch } = useConversationsQuery();

  if (isLoading) return <div className="opacity-60">Loading conversations...</div>;
  if (isError) return (
    <div className="text-sm text-red-600 flex items-center gap-2">
      Failed to load conversations
      <button className="underline text-xs" onClick={() => refetch()}>Retry</button>
    </div>
  );

  const conversations = data || [];
  if (conversations.length === 0) return <div className="opacity-60">No conversations yet.</div>;

  return (
    <ul className="space-y-2">
      {conversations.map((c) => (
        <li key={c.uuid} className="border rounded p-3 flex items-center justify-between">
          <div>
            <div className="font-medium">{c.title || 'Conversation'}</div>
            <div className="text-xs opacity-60">{c.uuid}</div>
          </div>
          <div className="flex gap-2">
            <Link className="text-blue-600 underline" href={`/chat?conversation=${encodeURIComponent(c.uuid)}`}>
              Open in chat
            </Link>
            <Link className="text-blue-600 underline" href={`/api/conversations/${encodeURIComponent(c.uuid)}`}>
              Inspect (raw)
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
