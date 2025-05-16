# API Integration Documentation

This document outlines the API integration patterns and services used in the frontend application.

## Overview

The frontend application communicates with the backend through a service layer that handles API calls, error handling, and type definitions. The service layer is organized into domain-specific services.

## Service Layer

### Conversation Service

```typescript
// src/services/api.ts
import { Message } from '../types/api';

interface ConversationResponse {
  conversation_id: string;
  response: string;
}

export const conversationService = {
  async sendMessage(
    message: string,
    conversationId?: string
  ): Promise<ConversationResponse> {
    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
};
```

## Type Definitions

### API Types

```typescript
// src/types/api.ts
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}
```

## Error Handling

### 1. API Error Handler

```typescript
// src/utils/apiErrorHandler.ts
import { ApiError } from '../types/api';

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      status: 500,
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    status: 500,
  };
};
```

### 2. Error Boundary Component

```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';
import { Box, Text, Button } from '@chakra-ui/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p={4} textAlign="center">
          <Text mb={4}>Something went wrong.</Text>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

## API Integration Patterns

### 1. Custom Hook Pattern

```typescript
// src/hooks/useApi.ts
import { useState, useCallback } from 'react';
import { ApiError } from '../types/api';

interface UseApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (...args: any[]) => Promise<void>;
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>
): UseApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(
    async (...args: any[]) => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFunction(...args);
        setData(result);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [apiFunction]
  );

  return { data, loading, error, execute };
}
```

### 2. Service Factory Pattern

```typescript
// src/services/baseService.ts
interface ServiceConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

export const createService = (config: ServiceConfig) => {
  const { baseUrl, headers = {} } = config;

  return {
    async get<T>(endpoint: string): Promise<T> {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          ...headers,
        },
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      return response.json();
    },

    async post<T>(endpoint: string, data: unknown): Promise<T> {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      return response.json();
    },
  };
};
```

## API Configuration

### 1. Environment Variables

```typescript
// src/config/api.ts
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL,
  wsUrl: import.meta.env.VITE_WS_URL,
  timeout: 30000,
};
```

### 2. API Client Configuration

```typescript
// src/services/apiClient.ts
import { API_CONFIG } from '../config/api';

export const apiClient = createService({
  baseUrl: API_CONFIG.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## WebSocket Integration

### 1. WebSocket Service

```typescript
// src/services/websocket.ts
import { API_CONFIG } from '../config/api';

export const createWebSocket = () => {
  const ws = new WebSocket(API_CONFIG.wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
};
```

### 2. WebSocket Hook

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { createWebSocket } from '../services/websocket';

export const useWebSocket = (onMessage: (data: any) => void) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = createWebSocket();

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    return () => {
      ws.current?.close();
    };
  }, [onMessage]);

  return ws.current;
};
```

## Testing API Integration

### 1. Mock Service Worker Setup

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/conversation', (req, res, ctx) => {
    return res(
      ctx.json({
        conversation_id: '123',
        response: 'Mock response',
      })
    );
  }),
];
```

### 2. API Integration Tests

```typescript
// src/services/__tests__/api.test.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { conversationService } from '../api';
import { handlers } from '../../mocks/handlers';

const server = setupServer(...handlers);

describe('Conversation Service', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('sends message successfully', async () => {
    const response = await conversationService.sendMessage('Hello');
    expect(response.conversation_id).toBe('123');
    expect(response.response).toBe('Mock response');
  });
});
``` 