'use client';

import { useToolsQuery } from '@/lib/hooks/useTools';

export default function ToolsList() {
  const { data, isLoading, isError, refetch } = useToolsQuery();

  if (isLoading) return <div className="opacity-60">Loading…</div>;
  if (isError) return (
    <div className="text-sm text-red-600 flex items-center gap-2">
      Failed to load tools
      <button className="underline text-xs" onClick={() => refetch()}>Retry</button>
    </div>
  );

  const tools = data || [];
  if (tools.length === 0) return <div className="opacity-60">No tools available.</div>;

  return (
    <ul className="grid md:grid-cols-2 gap-3">
      {tools.map((t: any) => {
        const disabled = t.available === false || t.enabled === false;
        return (
          <li key={t.id || t.name} className={`border rounded p-3 ${disabled ? 'opacity-60' : ''}`}>
            <div className="font-medium">{t.name || t.id}</div>
            <div className="text-sm opacity-60">{t.description || '—'}</div>
            <div className="text-xs opacity-50 mt-1">{disabled ? 'Unavailable' : 'Available'}</div>
            <div className="mt-2">
              <a
                className={`text-blue-600 underline ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                aria-disabled={disabled}
                href={disabled ? undefined : `/tools/${encodeURIComponent(t.name || t.id)}`}
              >
                Open
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}


