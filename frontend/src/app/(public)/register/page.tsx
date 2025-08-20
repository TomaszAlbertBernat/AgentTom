'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.message || 'Register failed');
    } else {
      router.replace('/');
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

  return (
    <div className="max-w-sm mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-6">Register</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full border rounded p-2" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full border rounded p-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input className="w-full border rounded p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" type="submit">
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}


