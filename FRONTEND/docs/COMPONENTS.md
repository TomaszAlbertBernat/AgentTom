# Components Documentation

This document provides detailed information about the frontend components, their usage, and implementation details.

## Core Components

### Chat Component

The Chat component (`src/components/Chat.tsx`) is the main interface for user interactions with the AI.

#### Features
- Real-time message display
- Message input with keyboard shortcuts
- Dark/Light theme toggle
- Font size customization
- Auto-scrolling to latest messages
- Loading states
- Error handling

#### Props
```typescript
interface ChatProps {
  // No props required as it uses global state
}
```

#### State Management
- Uses `useChatStore` for message management
- Uses `useSettingsStore` for UI preferences

#### Usage Example
```typescript
import { Chat } from '../components/Chat';

const App = () => {
  return (
    <div>
      <Chat />
    </div>
  );
};
```

#### Key Features Implementation

1. **Message Handling**
```typescript
const handleSend = async () => {
  if (!input.trim()) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    content: input,
    role: 'user',
    created_at: new Date().toISOString(),
  };

  addMessage(userMessage);
  setInput('');
  setIsLoading(true);

  try {
    const response = await conversationService.sendMessage(input, currentConversationId);
    // Handle response...
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};
```

2. **Auto-scrolling**
```typescript
const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
};

useEffect(() => {
  scrollToBottom();
}, [messages]);
```

3. **Theme Management**
```typescript
const [isDarkMode, setIsDarkMode] = useState(false);

// Theme toggle implementation
const handleToggleTheme = () => {
  setIsDarkMode(!isDarkMode);
};
```

## Component Guidelines

### Best Practices

1. **Type Safety**
   - Always use TypeScript interfaces for props
   - Define explicit return types for functions
   - Use proper type guards when necessary

2. **State Management**
   - Use local state for UI-only concerns
   - Use global state for shared data
   - Implement proper loading and error states

3. **Performance**
   - Use `useCallback` for event handlers
   - Use `useMemo` for expensive computations
   - Implement proper cleanup in `useEffect`

4. **Accessibility**
   - Use semantic HTML elements
   - Implement proper ARIA attributes
   - Ensure keyboard navigation support

### Component Structure

```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { Box, Text } from '@chakra-ui/react';

// 2. Types/Interfaces
interface ComponentProps {
  // Props definition
}

// 3. Component
export const Component = ({ prop1, prop2 }: ComponentProps) => {
  // 4. State
  const [state, setState] = useState(initialState);

  // 5. Effects
  useEffect(() => {
    // Effect implementation
  }, [dependencies]);

  // 6. Handlers
  const handleEvent = () => {
    // Event handling
  };

  // 7. Render
  return (
    <Box>
      {/* Component JSX */}
    </Box>
  );
};
```

## Styling Guidelines

### Chakra UI Usage

1. **Theme Customization**
```typescript
// theme.ts
import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  // Custom theme configuration
});
```

2. **Component Styling**
```typescript
<Box
  p={4}
  borderRadius="lg"
  bg={isDarkMode ? 'gray.700' : 'gray.50'}
  // Other styles
>
```

### Responsive Design

1. **Breakpoints**
```typescript
<Box
  width={{ base: '100%', md: '50%', lg: '33%' }}
  // Other responsive styles
>
```

2. **Flexible Layouts**
```typescript
<Flex
  direction={{ base: 'column', md: 'row' }}
  gap={4}
  // Other flex properties
>
```

## Testing Components

### Unit Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

describe('Chat Component', () => {
  it('renders chat interface', () => {
    render(<Chat />);
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    render(<Chat />);
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));
    // Assert message was sent
  });
});
```

## Error Handling

### Component Level
```typescript
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  // Handle error appropriately
}
```

### Error Boundaries
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
``` 