'use client';
import { useState } from 'react';

export default function FilesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useBase64, setUseBase64] = useState(false);

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      setError(data?.error || 'Upload failed');
    }
    setResult(data?.data ?? data);
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

  async function uploadBase64() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const str = String(reader.result || '');
          const idx = str.indexOf(',');
          resolve(idx >= 0 ? str.slice(idx + 1) : str);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const payload = {
        file: { base64, mime_type: file.type || 'application/octet-stream' },
        type: 'document',
        original_name: file.name,
      };
      const res = await fetch('/api/files/upload/base64', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error || 'Upload failed');
      }
      setResult(data?.data ?? data);
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
    } catch (err) {
      setError('Failed to read file');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Files</h1>
      <div className="flex gap-2 items-center">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <label className="text-sm flex items-center gap-1">
          <input type="checkbox" checked={useBase64} onChange={(e) => setUseBase64(e.target.checked)} /> Upload as base64
        </label>
        {useBase64 ? (
          <button className="bg-black text-white px-4 py-1 rounded disabled:opacity-50" disabled={!file || loading} onClick={uploadBase64}>
            Upload Base64
          </button>
        ) : (
          <button className="bg-black text-white px-4 py-1 rounded disabled:opacity-50" disabled={!file || loading} onClick={upload}>
            Upload
          </button>
        )}
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {result && (
        <div className="space-y-2">
          <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-64">{JSON.stringify(result, null, 2)}</pre>
          {/* Link to fetch by uuid if present */}
          {result?.uuid && (
            <div className="space-y-1">
              <a className="text-blue-600 underline break-all" href={`/api/files/${encodeURIComponent(result.uuid)}`} target="_blank" rel="noreferrer">
                Download raw by uuid: {result.uuid}
              </a>
              <div>
                <a className="text-blue-600 underline" href={`/files/${encodeURIComponent(result.uuid)}`}>View file page</a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


