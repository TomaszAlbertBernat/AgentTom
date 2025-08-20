'use client';

import { useState } from 'react';

type Props = {
  toolName: string;
  available?: boolean;
};

export default function ToolExecuteForm({ toolName, available }: Props) {
  const [action, setAction] = useState('');
  const [params, setParams] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [rateInfo, setRateInfo] = useState<{ remaining?: number; limit?: number; reset?: number } | null>(null);

  async function onExecute(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    let parsed: any = {};
    try {
      parsed = params.trim() ? JSON.parse(params) : {};
    } catch (err) {
      setError('Parameters must be valid JSON');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tool_name: toolName, action, parameters: parsed }),
      });
      const data = await res.json().catch(() => ({}));
      const rl = {
        remaining: Number(res.headers.get('x-ratelimit-remaining') || ''),
        limit: Number(res.headers.get('x-ratelimit-limit') || ''),
        reset: Number(res.headers.get('x-ratelimit-reset') || ''),
      };
      if (!Number.isNaN(rl.remaining) || !Number.isNaN(rl.limit) || !Number.isNaN(rl.reset)) {
        setRateInfo(rl);
        window.dispatchEvent(
          new CustomEvent('rate-limit', {
            detail: rl,
          })
        );
      }
      if (!res.ok || data?.success === false) {
        setError(data?.error || 'Execution failed');
      } else {
        setResult(data?.result ?? data);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onExecute} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Action</label>
        <input
          className="w-full border rounded p-2"
          placeholder="e.g. search, write, createIssue"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          disabled={!available}
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Parameters (JSON)</label>
        <textarea
          className="w-full border rounded p-2 font-mono text-sm min-h-40"
          value={params}
          onChange={(e) => setParams(e.target.value)}
          disabled={!available}
          placeholder="{}"
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => {
              setError(null);
              void onExecute(new Event('submit') as any);
            }}
          >
            Retry
          </button>
        </div>
      )}
      <button
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={loading || !available}
        type="submit"
      >
        {available === false ? 'Unavailable' : loading ? 'Executing…' : 'Execute'}
      </button>
      {rateInfo && (
        <div className="text-xs opacity-60">
          Rate limit: {rateInfo.remaining ?? '-'} / {rateInfo.limit ?? '-'} left{rateInfo.reset ? `, resets ~${Math.max(0, Math.round((rateInfo.reset * 1000 - Date.now()) / 1000))}s` : ''}
        </div>
      )}
      {result != null && (
        <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-80 whitespace-pre-wrap mt-2">{JSON.stringify(result, null, 2)}</pre>
      )}
    </form>
  );
}


