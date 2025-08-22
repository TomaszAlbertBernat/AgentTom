'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { paths } from '@/lib/api/types';

type HealthResponse = paths['/api/web/health']['get']['responses']['200']['content']['application/json'];
type HealthDetailsResponse = paths['/api/web/health/details']['get']['responses']['200']['content']['application/json'];

export type HealthData = HealthResponse;
export type HealthDetailsData = HealthDetailsResponse;

async function fetchHealth(): Promise<HealthData> {
  const { data, error } = await api.GET('/api/web/health');
  if (error) throw new Error(error.message || 'Failed to load health data');
  return data;
}

async function fetchHealthDetails(): Promise<HealthDetailsData> {
  const { data, error } = await api.GET('/api/web/health/details');
  if (error) throw new Error(error.message || 'Failed to load health details');
  return data;
}

export function useHealthQuery() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
  });
}

export function useHealthDetailsQuery() {
  return useQuery({
    queryKey: ['health-details'],
    queryFn: fetchHealthDetails,
    staleTime: 15_000, // 15 seconds
    refetchInterval: 30_000, // Refetch every 30 seconds
  });
}
