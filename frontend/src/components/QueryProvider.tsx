'use client';

import { PropsWithChildren, useState } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { showErrorToast } from '@/lib/hooks/useToast';

export default function QueryProvider({ children }: PropsWithChildren<{}>) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (_failureCount, _error) => {
              // Don't retry on certain error types
              const errorMessage = error instanceof Error ? error.message : String(error);

              // Don't retry auth errors
              if (errorMessage.includes('401') || errorMessage.includes('403')) {
                return false;
              }

              // Don't retry client errors (4xx)
              if (errorMessage.includes('400') || errorMessage.includes('422')) {
                return false;
              }

              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: (_failureCount, _error) => {
              // Don't retry mutations by default (they usually have side effects)
              return false;
            },
          },
        },
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Only show toast for user-initiated queries, not background refetches
            if (query.state.status === 'error' && query.state.fetchStatus === 'fetching') {
              showErrorToast(error, {
                description: `Failed to load ${query.queryKey[0] || 'data'}`,
              });
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (_error, _variables, _context, mutation) => {
            // Always show toast for mutations since they are user-initiated
            showErrorToast(error, {
              description: `Operation failed: ${mutation.options.mutationKey?.[0] || 'Unknown'}`,
            });
          },
        }),
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}


