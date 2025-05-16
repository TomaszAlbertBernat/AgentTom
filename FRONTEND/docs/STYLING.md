# Styling Documentation

This document outlines the styling architecture and patterns used in the frontend application.

## Overview

The application uses Chakra UI as its primary styling solution, providing a consistent and accessible design system. The styling is organized into themes, components, and utilities.

## Theme Configuration

### 1. Base Theme

```typescript
// src/theme/index.ts
import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  colors: {
    brand: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'md',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
      },
    },
  },
});
```

### 2. Theme Provider

```typescript
// src/App.tsx
import { ChakraProvider } from '@chakra-ui/react';
import { theme } from './theme';

const App = () => {
  return (
    <ChakraProvider theme={theme}>
      {/* App content */}
    </ChakraProvider>
  );
};
```

## Component Styling

### 1. Basic Component

```typescript
// src/components/Button.tsx
import { Button as ChakraButton } from '@chakra-ui/react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button = ({ children, onClick }: ButtonProps) => {
  return (
    <ChakraButton
      variant="solid"
      onClick={onClick}
      _hover={{ transform: 'scale(1.05)' }}
      transition="all 0.2s"
    >
      {children}
    </ChakraButton>
  );
};
```

### 2. Responsive Component

```typescript
// src/components/Card.tsx
import { Box } from '@chakra-ui/react';

interface CardProps {
  children: React.ReactNode;
}

export const Card = ({ children }: CardProps) => {
  return (
    <Box
      p={{ base: 4, md: 6, lg: 8 }}
      borderRadius="lg"
      boxShadow="md"
      bg="white"
      _dark={{
        bg: 'gray.700',
      }}
    >
      {children}
    </Box>
  );
};
```

## Layout Components

### 1. Container

```typescript
// src/components/Container.tsx
import { Box } from '@chakra-ui/react';

interface ContainerProps {
  children: React.ReactNode;
}

export const Container = ({ children }: ContainerProps) => {
  return (
    <Box
      maxW="1200px"
      mx="auto"
      px={{ base: 4, md: 6, lg: 8 }}
      py={{ base: 8, md: 12, lg: 16 }}
    >
      {children}
    </Box>
  );
};
```

### 2. Grid Layout

```typescript
// src/components/Grid.tsx
import { SimpleGrid } from '@chakra-ui/react';

interface GridProps {
  children: React.ReactNode;
}

export const Grid = ({ children }: GridProps) => {
  return (
    <SimpleGrid
      columns={{ base: 1, md: 2, lg: 3 }}
      spacing={{ base: 4, md: 6, lg: 8 }}
    >
      {children}
    </SimpleGrid>
  );
};
```

## Dark Mode

### 1. Theme Toggle

```typescript
// src/components/ThemeToggle.tsx
import { IconButton, useColorMode } from '@chakra-ui/react';
import { FiSun, FiMoon } from 'react-icons/fi';

export const ThemeToggle = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <IconButton
      aria-label="Toggle theme"
      icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
      onClick={toggleColorMode}
      variant="ghost"
    />
  );
};
```

### 2. Color Mode Hook

```typescript
// src/hooks/useColorMode.ts
import { useColorMode as useChakraColorMode } from '@chakra-ui/react';

export const useColorMode = () => {
  const { colorMode, setColorMode } = useChakraColorMode();

  const toggleColorMode = () => {
    setColorMode(colorMode === 'light' ? 'dark' : 'light');
  };

  return {
    colorMode,
    setColorMode,
    toggleColorMode,
  };
};
```

## Responsive Design

### 1. Breakpoints

```typescript
// src/theme/breakpoints.ts
export const breakpoints = {
  sm: '30em',   // 480px
  md: '48em',   // 768px
  lg: '62em',   // 992px
  xl: '80em',   // 1280px
  '2xl': '96em', // 1536px
};
```

### 2. Responsive Styles

```typescript
// src/components/ResponsiveBox.tsx
import { Box } from '@chakra-ui/react';

interface ResponsiveBoxProps {
  children: React.ReactNode;
}

export const ResponsiveBox = ({ children }: ResponsiveBoxProps) => {
  return (
    <Box
      width={{ base: '100%', md: '50%', lg: '33%' }}
      p={{ base: 2, md: 4, lg: 6 }}
      fontSize={{ base: 'sm', md: 'md', lg: 'lg' }}
    >
      {children}
    </Box>
  );
};
```

## Animation

### 1. Keyframes

```typescript
// src/theme/animations.ts
export const keyframes = {
  fadeIn: {
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
  },
  slideIn: {
    '0%': { transform: 'translateY(20px)', opacity: 0 },
    '100%': { transform: 'translateY(0)', opacity: 1 },
  },
};
```

### 2. Animated Component

```typescript
// src/components/AnimatedBox.tsx
import { Box } from '@chakra-ui/react';

interface AnimatedBoxProps {
  children: React.ReactNode;
}

export const AnimatedBox = ({ children }: AnimatedBoxProps) => {
  return (
    <Box
      animation="fadeIn 0.5s ease-in-out"
      transition="all 0.2s"
      _hover={{
        transform: 'scale(1.05)',
      }}
    >
      {children}
    </Box>
  );
};
```

## Custom Hooks

### 1. Media Query Hook

```typescript
// src/hooks/useMediaQuery.ts
import { useBreakpointValue } from '@chakra-ui/react';

export const useMediaQuery = (query: string) => {
  return useBreakpointValue({
    base: false,
    [query]: true,
  });
};
```

### 2. Responsive Value Hook

```typescript
// src/hooks/useResponsiveValue.ts
import { useBreakpointValue } from '@chakra-ui/react';

export const useResponsiveValue = <T>(values: {
  base: T;
  md?: T;
  lg?: T;
  xl?: T;
}) => {
  return useBreakpointValue(values);
};
```

## Best Practices

### 1. Component Organization

- Keep styles close to components
- Use theme tokens for consistency
- Implement responsive design from the start
- Use semantic HTML elements

### 2. Performance

- Use CSS-in-JS sparingly
- Implement proper memoization
- Use proper loading states
- Optimize animations

### 3. Accessibility

- Use proper color contrast
- Implement keyboard navigation
- Use semantic HTML
- Add proper ARIA attributes

### 4. Maintainability

- Use consistent naming conventions
- Document complex styles
- Use theme tokens
- Implement proper error states 