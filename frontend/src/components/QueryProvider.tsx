'use client';

import { PropsWithChildren, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function QueryProvider({ children }: PropsWithChildren<{}>) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}


