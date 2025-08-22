'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client-wrapper';
import type { paths } from '@/lib/api/types';

type ToolsResponse = paths['/api/tools']['get']['responses']['200']['content']['application/json'];
export type ToolRecord = ToolsResponse['tools'][number];

async function fetchTools(): Promise<ToolRecord[]> {
  const { data, error } = await api.GET('/api/tools', {
    showToastOnError: false, // Let React Query handle the error display
  });

  if (error) {
    throw new Error(error.message || 'Failed to load tools');
  }

  return data?.tools || [];
}

export function useToolsQuery() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: fetchTools,
    staleTime: 30_000,
    meta: {
      errorMessage: 'Failed to load tools',
    },
  });
}


