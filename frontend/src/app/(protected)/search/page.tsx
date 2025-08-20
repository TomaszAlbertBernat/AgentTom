'use client';
import { useState } from 'react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [contentByUrl, setContentByUrl] = useState<Record<string, string>>({});

  async function runSearch() {
    setLoading(true);
    const res = await fetch('/api/web/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json().catch(() => ({}));
    setResults(Array.isArray(data?.results) ? data.results : []);
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

  async function getContents(url: string) {
    const res = await fetch('/api/web/get-contents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // backend expects either { url } or bulk list; support both
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    const text =
      data?.text ||
      data?.content ||
      (Array.isArray(data?.contents) ? data.contents.map((c: any) => c?.text || c?.content || '').join('\n\n') : '') ||
      (Array.isArray(data) ? data.map((c: any) => c?.text || c?.content || '').join('\n\n') : '');
    setContentByUrl((prev) => ({ ...prev, [url]: String(text || '').slice(0, 4000) }));
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
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Web search</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
        className="flex gap-2"
      >
        <input className="flex-1 border rounded p-2" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search terms" />
        <button className="bg-black text-white px-4 rounded disabled:opacity-50" disabled={loading} type="submit">
          Search
        </button>
      </form>
      <ul className="space-y-2">
        {results.map((r, i) => (
          <li key={i} className="border rounded p-3">
            <div className="font-medium">{r.title || r.url}</div>
            <div className="text-sm opacity-60 break-all">{r.url}</div>
            {r.snippet && <p className="text-sm mt-1">{r.snippet}</p>}
            <div className="mt-2 flex gap-2">
              <a className="text-blue-600 underline" href={r.url} target="_blank" rel="noreferrer">Open</a>
              <button className="text-blue-600 underline" onClick={() => getContents(r.url)}>Get contents</button>
            </div>
            {contentByUrl[r.url] && (
              <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-64 whitespace-pre-wrap mt-2">{contentByUrl[r.url]}</pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}


