'use client';

import { useState, useEffect } from 'react';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);

  useEffect(() => {
    // Check if we're in local mode
    fetch('/api/local-user/me')
      .then(res => res.json())
      .then(data => setIsLocalMode(data.isLocal === true))
      .catch(() => setIsLocalMode(false));
  }, []);

  async function onLogout() {
    try {
      setLoading(true);
      if (!isLocalMode) {
        await fetch('/api/auth/logout', { method: 'POST' });
      }
    } finally {
      window.location.href = isLocalMode ? '/setup' : '/login';
    }
  }

  return (
    <button
      onClick={onLogout}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
      disabled={loading}
      aria-label="Logout"
    >
      {loading ? 'Logging out…' : isLocalMode ? 'Reset Setup' : 'Logout'}
    </button>
  );
}


