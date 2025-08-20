import Link from 'next/link';

async function getConversations() {
  const res = await fetch('/api/conversations', { cache: 'no-store' });
  try {
    const data = await res.json();
    // backend returns { conversations }
    return Array.isArray(data?.conversations) ? data.conversations : [];
  } catch {
    return [] as any[];
  }
}

export default async function ConversationsPage() {
  const conversations = await getConversations();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Conversations</h1>
      {conversations.length === 0 && (
        <div className="opacity-60">No conversations yet.</div>
      )}
      <ul className="space-y-2">
        {conversations.map((c: any) => (
          <li key={c.uuid} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name || 'Conversation'}</div>
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
    </div>
  );
}


