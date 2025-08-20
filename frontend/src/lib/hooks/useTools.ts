'use client';

import { useQuery } from '@tanstack/react-query';

export type ToolRecord = {
  id?: string;
  name?: string;
  description?: string;
  available?: boolean;
  enabled?: boolean;
};

async function fetchTools(): Promise<ToolRecord[]> {
  const res = await fetch('/api/tools', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load tools');
  const data = await res.json().catch(() => ({}));
  const tools = Array.isArray(data?.tools) ? data.tools : Array.isArray(data) ? data : [];
  return tools as ToolRecord[];
}

export function useToolsQuery() {
  return useQuery({ queryKey: ['tools'], queryFn: fetchTools, staleTime: 30_000 });
}


