'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client-wrapper';
import type { paths } from '@/lib/api/types';

type ConversationsResponse = paths['/api/conversations']['get']['responses']['200']['content']['application/json'];
export type ConversationRecord = ConversationsResponse['conversations'][number];

async function fetchConversations(): Promise<ConversationRecord[]> {
  const { data, error } = await api.GET('/api/conversations', {
    showToastOnError: false, // Let React Query handle the error display
  });

  if (error) {
    throw new Error(error.message || 'Failed to load conversations');
  }

  return data?.conversations || [];
}

export function useConversationsQuery() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    staleTime: 60_000, // 1 minute
    meta: {
      errorMessage: 'Failed to load conversations',
    },
  });
}
