# State Management Documentation

This document outlines the state management architecture and patterns used in the frontend application.

## Overview

The application uses Zustand for state management, providing a simple and efficient way to manage global state. The state is organized into multiple stores, each responsible for a specific domain of the application.

## Store Structure

### Chat Store

The chat store manages conversation state and message handling.

```typescript
// src/store/chatStore.ts
import { create } from 'zustand';
import { Message } from '../types/api';

interface ChatState {
  messages: Message[];
  currentConversationId: string | null;
  addMessage: (message: Message) => void;
  setConversationId: (id: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  currentConversationId: null,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setConversationId: (id) =>
    set(() => ({
      currentConversationId: id,
    })),
  clearMessages: () =>
    set(() => ({
      messages: [],
      currentConversationId: null,
    })),
}));
```

### Settings Store

The settings store manages user preferences and UI settings.

```typescript
// src/store/settingsStore.ts
import { create } from 'zustand';

type FontSize = 'small' | 'medium' | 'large';

interface SettingsState {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  fontSize: 'medium',
  setFontSize: (size) =>
    set(() => ({
      fontSize: size,
    })),
}));
```

## State Management Patterns

### 1. Store Creation

```typescript
import { create } from 'zustand';

interface StoreState {
  // State properties
  value: string;
  // Actions
  setValue: (value: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  value: '',
  setValue: (value) => set({ value }),
}));
```

### 2. Store Usage in Components

```typescript
import { useStore } from '../store/store';

const Component = () => {
  const { value, setValue } = useStore();

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};
```

### 3. Selectors for Performance

```typescript
// Using selectors to prevent unnecessary re-renders
const Component = () => {
  const value = useStore((state) => state.value);
  const setValue = useStore((state) => state.setValue);

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};
```

## State Updates

### 1. Simple Updates

```typescript
// Direct state update
set((state) => ({
  value: newValue,
}));
```

### 2. Complex Updates

```typescript
// Update with previous state
set((state) => ({
  items: [...state.items, newItem],
}));
```

### 3. Async Updates

```typescript
const fetchData = async () => {
  set({ loading: true });
  try {
    const data = await api.getData();
    set({ data, loading: false });
  } catch (error) {
    set({ error, loading: false });
  }
};
```

## State Persistence

### 1. Local Storage Integration

```typescript
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      // Store implementation
    }),
    {
      name: 'store-name',
    }
  )
);
```

### 2. Session Storage Integration

```typescript
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      // Store implementation
    }),
    {
      name: 'store-name',
      storage: sessionStorage,
    }
  )
);
```

## Best Practices

### 1. Store Organization

- Keep stores focused and single-responsibility
- Split large stores into smaller, domain-specific stores
- Use meaningful store names
- Document store interfaces and actions

### 2. Performance Optimization

- Use selectors to prevent unnecessary re-renders
- Implement proper memoization
- Avoid storing computed values
- Use proper TypeScript types

### 3. Error Handling

```typescript
interface StoreState {
  error: Error | null;
  setError: (error: Error | null) => void;
}

export const useStore = create<StoreState>((set) => ({
  error: null,
  setError: (error) => set({ error }),
}));
```

### 4. Type Safety

```typescript
// Define proper types for state and actions
interface State {
  value: string;
  setValue: (value: string) => void;
}

// Use TypeScript to ensure type safety
export const useStore = create<State>((set) => ({
  value: '',
  setValue: (value: string) => set({ value }),
}));
```

## Testing Stores

### 1. Unit Testing

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useStore } from './store';

describe('Store', () => {
  it('updates value', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });
});
```

### 2. Integration Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from './Component';

describe('Component with Store', () => {
  it('updates store value', () => {
    render(<Component />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(input).toHaveValue('new value');
  });
});
``` 