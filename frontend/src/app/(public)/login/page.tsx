'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { api } from '@/lib/api/client-wrapper';

export default function LoginPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await api.POST('/api/auth/login', {
        body: { email, password },
        showToastOnError: false, // Handle error display manually
      });

      if (error) {
        showError(error, {
          description: 'Please check your credentials and try again',
        });
        return;
      }

      if (data) {
        showSuccess('Successfully logged in!', {
          description: 'Welcome back!',
        });
        router.replace('/');
      }
    } catch (err) {
      showError(err, {
        description: 'An unexpected error occurred during login',
      });
    } finally {
      setLoading(false);
    }

    // Handle rate limiting
    // Note: This would need to be extracted from the response headers
    // For now, we'll let the API wrapper handle the error normalization
  }

  return (
    <div className="max-w-sm mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-6">Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full border rounded p-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input className="w-full border rounded p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button disabled={loading} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" type="submit">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}


