'use client';

import { useState } from 'react';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    try {
      setLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <button
      onClick={onLogout}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
      disabled={loading}
      aria-label="Logout"
    >
      {loading ? 'Logging out…' : 'Logout'}
    </button>
  );
}


