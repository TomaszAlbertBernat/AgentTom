'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { paths } from '@/lib/api/types';

type ToolExecutionsResponse = paths['/api/tools/executions']['get']['responses']['200']['content']['application/json'];
export type ToolExecutionRecord = ToolExecutionsResponse['executions'][number];

async function fetchToolExecutions(): Promise<ToolExecutionRecord[]> {
  const { data, error } = await api.GET('/api/tools/executions');
  if (error) throw new Error(error.message || 'Failed to load tool executions');
  return data?.executions || [];
}

export function useToolExecutionsQuery() {
  return useQuery({
    queryKey: ['tool-executions'],
    queryFn: fetchToolExecutions,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 30_000, // Refetch every 30 seconds for real-time updates
  });
}
