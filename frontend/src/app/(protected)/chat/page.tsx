'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureConversation() {
    if (conversationId) return conversationId;
    const res = await fetch('/api/agi/conversations', { method: 'POST' });
    const data = await res.json();
    // backend returns { conversation_id }
    const id = data?.conversation_id || data?.id || data?.uuid || data?.conversationId;
    setConversationId(id);
    // reflect id in URL for reload/share
    router.replace(`/chat?conversation=${encodeURIComponent(id)}`);
    return id as string;
  }

  async function sendMessage() {
    setLoading(true);
    const id = await ensureConversation();
    const userMsg: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    const res = await fetch('/api/agi/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // backend expects conversation_id + content/message
      body: JSON.stringify({ conversation_id: id, content: userMsg.content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || 'Failed to send message');
    } else {
      const text = data?.response || data?.message || data?.content || '';
      const assistantMsg: Message = { role: 'assistant', content: String(text || 'OK') };
      setMessages((prev) => [...prev, assistantMsg]);
    }
    const rlRemaining = Number(res.headers.get('x-ratelimit-remaining') || '');
    const rlLimit = Number(res.headers.get('x-ratelimit-limit') || '');
    const rlReset = Number(res.headers.get('x-ratelimit-reset') || '');
    if (!Number.isNaN(rlRemaining) || !Number.isNaN(rlLimit) || !Number.isNaN(rlReset)) {
      window.dispatchEvent(
        new CustomEvent('rate-limit', {
          detail: { remaining: rlRemaining, limit: rlLimit, reset: rlReset },
        })
      );
    }
    setLoading(false);
  }

  // Load messages for a given conversation
  async function loadHistory(id: string) {
    const res = await fetch(`/api/agi/conversations/${id}/messages`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || 'Failed to load history');
      return;
    }
    const history = Array.isArray(data?.messages) ? data.messages : [];
    const mapped = history
      .filter((m: any) => m?.content && (m?.role === 'user' || m?.role === 'assistant' || m?.role === 'system'))
      .map((m: any) => ({ role: m.role as Message['role'], content: m.content as string }));
    setMessages(mapped);
  }

  // On mount, use ?conversation= to load existing messages
  useEffect(() => {
    const paramId = searchParams.get('conversation');
    if (paramId && !conversationId) {
      setConversationId(paramId);
      void loadHistory(paramId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Chat</h1>
      <div className="border rounded p-3 min-h-64 space-y-2">
        {error && (
          <div className="text-sm text-red-600 mb-2 flex items-center justify-between">
            <span>{error}</span>
            <button
              className="text-xs underline"
              onClick={() => {
                setError(null);
                if (conversationId) void loadHistory(conversationId);
              }}
            >
              Retry
            </button>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <span className="text-xs opacity-60 mr-2">{m.role}</span>
            <span>{m.content}</span>
          </div>
        ))}
        {messages.length === 0 && <p className="opacity-60">Start a conversation…</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          void sendMessage();
        }}
        className="flex gap-2"
      >
        <input className="flex-1 border rounded p-2" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message" />
        <button className="bg-black text-white px-4 rounded disabled:opacity-50" disabled={loading} type="submit">
          Send
        </button>
      </form>
    </div>
  );
}


