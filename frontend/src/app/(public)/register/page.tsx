'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { api } from '@/lib/api/client-wrapper';

export default function RegisterPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await api.POST('/api/auth/register', {
        body: { name, email, password },
        showToastOnError: false, // Handle error display manually
      });

      if (error) {
        showError(error, {
          description: 'Please check your information and try again',
        });
        return;
      }

      if (data) {
        showSuccess('Account created successfully!', {
          description: 'Welcome! Please log in to continue',
        });
        router.replace('/login');
      }
    } catch (err) {
      showError(err, {
        description: 'An unexpected error occurred during registration',
      });
    } finally {
      setLoading(false);
    }
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
        <button disabled={loading} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" type="submit">
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}


