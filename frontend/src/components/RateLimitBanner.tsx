'use client';

import { useEffect, useState } from 'react';

export default function RateLimitBanner() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [reset, setReset] = useState<number | null>(null);

  useEffect(() => {
    const handler = (event: CustomEvent<{ limit?: number; remaining?: number; reset?: number }>) => {
      if (typeof event.detail.remaining === 'number') setRemaining(event.detail.remaining);
      if (typeof event.detail.limit === 'number') setLimit(event.detail.limit);
      if (typeof event.detail.reset === 'number') setReset(event.detail.reset);
    };

    // Listen for custom events dispatched by proxy route responses
    window.addEventListener('rate-limit', handler as EventListener);
    return () => window.removeEventListener('rate-limit', handler as EventListener);
  }, []);

  if (remaining == null || limit == null) return null;
  if (remaining > Math.max(1, Math.ceil((limit || 1) * 0.1))) return null;

  const resetText = reset ? `Resets in ~${Math.max(0, Math.round((reset * 1000 - Date.now()) / 1000))}s` : '';

  return (
    <div className="w-full bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-xs px-3 py-2">
      Approaching rate limit: {remaining}/{limit} left. {resetText}
    </div>
  );
}


