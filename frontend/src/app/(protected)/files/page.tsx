'use client';
import { useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { api } from '@/lib/api/client-wrapper';

export default function FilesPage() {
  const { showError, showSuccess } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [useBase64, setUseBase64] = useState(false);

  async function upload() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append('file', file);

      const { data, error } = await api.POST('/api/files/upload', {
        body: form,
        showToastOnError: false, // Handle error display manually
      });

      if (error) {
        showError(error, {
          description: 'Failed to upload file. Please check the file and try again.',
          action: {
            label: 'Retry',
            onClick: () => upload(),
          },
        });
        return;
      }

      if (data) {
        setResult(data?.data ?? data);
        showSuccess('File uploaded successfully!', {
          description: `File "${file.name}" has been uploaded and processed`,
        });
      }
    } catch (err) {
      showError(err, {
        description: 'Network error occurred during file upload',
      });
    } finally {
      setLoading(false);
    }
  }

  async function uploadBase64() {
    if (!file) return;
    setLoading(true);
    setResult(null);

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

      const { data, error } = await api.POST('/api/files/upload/base64', {
        body: payload,
        showToastOnError: false, // Handle error display manually
      });

      if (error) {
        showError(error, {
          description: 'Failed to upload file as base64. Please try again.',
          action: {
            label: 'Retry',
            onClick: () => uploadBase64(),
          },
        });
        return;
      }

      if (data) {
        setResult(data?.data ?? data);
        showSuccess('File uploaded successfully!', {
          description: `File "${file.name}" has been uploaded and processed as base64`,
        });
      }
    } catch (err) {
      showError(err, {
        description: 'Failed to read file. Please check the file and try again.',
      });
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


