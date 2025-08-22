'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api/client-wrapper';
import { useToast } from '@/lib/hooks/useToast';
import type { paths } from '@/lib/api/types';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  async function ensureConversation() {
    if (conversationId) return conversationId;

    try {
      const { data, error } = await api.POST('/api/agi/conversations', {
        showToastOnError: false, // Handle error display manually
      });

      if (error) {
        showError(error, {
          description: 'Failed to create new conversation',
        });
        throw new Error(error.message || 'Failed to create conversation');
      }

      // backend returns { conversation_id }
      const id = data?.conversation_id || data?.id || data?.uuid || data?.conversationId;
      if (!id) {
        throw new Error('No conversation ID returned');
      }

      setConversationId(id);
      // reflect id in URL for reload/share
      router.replace(`/chat?conversation=${encodeURIComponent(id)}`);
      return id as string;
    } catch (err) {
      showError(err, {
        description: 'Unable to start a new conversation',
      });
      throw err;
    }
  }

  async function sendMessage() {
    setLoading(true);

    try {
      const id = await ensureConversation();
      const userMsg: Message = { role: 'user', content: input };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');

      // Add a placeholder for the assistant message that will be streamed
      const assistantMsg: Message = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsStreaming(true);

      try {
        // Use the streaming endpoint
        const response = await fetch('/api/agi/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: id,
            content: userMsg.content,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                    accumulatedContent += parsed.choices[0].delta.content;

                    // Update the assistant message with the accumulated content
                    setMessages((prev) =>
                      prev.map((msg, index) =>
                        index === prev.length - 1 && msg.role === 'assistant'
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    );
                  }
                } catch (parseError) {
                  // Ignore parse errors for non-JSON data
                  console.warn('Failed to parse streaming data:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          setIsStreaming(false);
        }

        showSuccess('Message sent successfully!', {
          duration: 2000,
        });
      } catch (streamError) {
        // Remove the failed assistant message placeholder
        setMessages((prev) => prev.slice(0, -1));
        setIsStreaming(false);

        showError(streamError, {
          description: 'Failed to send message to AI assistant',
          action: {
            label: 'Retry',
            onClick: () => {
              setInput(userMsg.content);
              setMessages((prev) => prev.slice(0, -1)); // Remove failed user message
            },
          },
        });
      }
    } catch (err) {
      // Remove any messages added in case of error
      setMessages((prev) => prev.slice(0, -1));
      showError(err, {
        description: 'Failed to send message',
      });
    } finally {
      setLoading(false);
    }
  }

  // Load messages for a given conversation
  async function loadHistory(id: string) {
    try {
      const { data, error } = await api.GET('/api/agi/conversations/{id}/messages', {
        params: { path: { id } },
        showToastOnError: false, // Handle error display manually
      });

      if (error) {
        showError(error, {
          description: 'Failed to load conversation history',
          action: {
            label: 'Retry',
            onClick: () => loadHistory(id),
          },
        });
        return;
      }

      const history = Array.isArray(data?.messages) ? data.messages : [];
      const mapped = history
        .filter((m: any) => m?.content && (m?.role === 'user' || m?.role === 'assistant' || m?.role === 'system'))
        .map((m: any) => ({ role: m.role as Message['role'], content: m.content as string }));
      setMessages(mapped);
    } catch (err) {
      showError(err, {
        description: 'Unable to load conversation history',
      });
    }
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
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <span className="text-xs opacity-60 mr-2">{m.role}</span>
            <span>
              {m.content}
              {isStreaming && i === messages.length - 1 && m.role === 'assistant' && (
                <span className="animate-pulse ml-1">▊</span>
              )}
            </span>
          </div>
        ))}
        {messages.length === 0 && <p className="opacity-60">Start a conversation…</p>}
        {isStreaming && (
          <div className="text-xs opacity-60 italic">
            AI is typing...
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isStreaming) return;
          void sendMessage();
        }}
        className="flex gap-2"
      >
        <input
          className="flex-1 border rounded p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message"
          disabled={isStreaming}
        />
        <button
          className="bg-black text-white px-4 rounded disabled:opacity-50"
          disabled={loading || isStreaming}
          type="submit"
        >
          {isStreaming ? 'Streaming...' : 'Send'}
        </button>
      </form>
    </div>
  );
}


