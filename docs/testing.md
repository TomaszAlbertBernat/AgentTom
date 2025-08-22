# Testing Guide

How to write and run tests in AgentTom.

## 🧪 Test Framework

AgentTom uses **Bun's built-in test runner** for fast, reliable testing.

### Test Structure
```
tests/
├── unit/           # Individual component tests
│   ├── services/   # Service layer tests
│   └── utils/      # Utility function tests
├── integration/    # Service interaction tests
└── helpers/        # Test utilities and mocks
```

## 🚀 Running Tests

### Basic Commands
```bash
bun test                    # Run all tests
bun test --watch           # Watch mode for development
bun test --coverage        # Run with coverage report
```

### Specific Tests
```bash
# Run specific test file
bun test tests/unit/services/logger.service.test.ts

# Run tests matching pattern
bun test --grep "auth"
```

### Available Scripts
```bash
bun run test              # Run all tests
bun run test:watch        # Watch mode
bun run test:coverage     # Coverage report
```

## ✍️ Writing Tests

### Basic Test Structure
```typescript
import { test, expect, describe } from 'bun:test';

describe('Service Name', () => {
  describe('method name', () => {
    test('should handle valid input', () => {
      // Arrange
      const input = { name: 'test', value: 42 };
      
      // Act
      const result = processInput(input);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
    
    test('should reject invalid input', () => {
      // Arrange
      const input = { name: '', value: -1 };
      
      // Act
      const result = processInput(input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });
});
```

### Testing Async Functions
```typescript
test('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

test('should handle async errors', async () => {
  await expect(failingAsyncFunction()).rejects.toThrow('Expected error');
});
```

### Mock Data Patterns
```typescript
// Create realistic mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User'
};

const mockResponse = {
  success: true,
  data: mockUser,
  metadata: { timestamp: new Date() }
};
```

## 📊 Current Test Coverage

### Completed Test Suites

**Logger Service** - 28 tests
- Log levels and logger creation
- Component-specific loggers
- Environment handling
- Mock logger functionality

**Vector Service** - 14 tests  
- Vector operations (search, upsert, delete)
- Environment validation
- Error handling and edge cases

**Search Service** - 10 tests
- Search query validation
- RRF score calculations  
- Filter matching and building

**Basic Utils** - 11 tests
- Math and string utilities
- Async operation handling
- Test infrastructure validation

### Test Statistics
- **Total Tests:** 63 tests
- **Execution Time:** ~168ms
- **Pass Rate:** 100%

## 🎯 Testing Best Practices

### 1. Test Organization
```typescript
// ✅ Use descriptive test names
test('should return user data when valid ID provided', () => {
  // test implementation
});

// ❌ Avoid vague test names
test('should work', () => {
  // test implementation
});
```

### 2. Arrange-Act-Assert Pattern
```typescript
test('should calculate total correctly', () => {
  // Arrange - Set up test data
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act - Execute the function
  const total = calculateTotal(items);
  
  // Assert - Check the result
  expect(total).toBe(30);
});
```

### 3. Test Both Success and Error Cases
```typescript
describe('validateEmail', () => {
  test('should accept valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });
  
  test('should reject invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
  });
  
  test('should handle empty input', () => {
    expect(validateEmail('')).toBe(false);
  });
});
```

### 4. Use Specific Assertions
```typescript
// ✅ Be specific about what you're testing
expect(result).toHaveProperty('id');
expect(result.data).toBeInstanceOf(Array);
expect(result.status).toBe(200);

// ❌ Avoid overly generic assertions
expect(result).toBeTruthy();
```

## 🔧 Testing Patterns

### Service Testing
```typescript
describe('UserService', () => {
  test('should create user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'securePassword',
      name: 'Test User'
    };
    
    const result = await userService.create(userData);
    
    expect(result.success).toBe(true);
    expect(result.user).toHaveProperty('id');
    expect(result.user.email).toBe(userData.email);
  });
});
```

### Error Testing
```typescript
test('should handle database connection error', async () => {
  // Mock a database error
  const mockError = new Error('Database connection failed');
  
  const result = await serviceWithDatabaseCall();
  
  expect(result.success).toBe(false);
  expect(result.error).toContain('connection');
});
```

### Validation Testing
```typescript
describe('input validation', () => {
  test('should accept valid input schema', () => {
    const validInput = { name: 'test', age: 25 };
    expect(() => validateInput(validInput)).not.toThrow();
  });
  
  test('should reject invalid input schema', () => {
    const invalidInput = { name: '', age: -1 };
    expect(() => validateInput(invalidInput)).toThrow();
  });
});
```

## 🛠️ Testing Utilities

### Mock Helper Functions
```typescript
// tests/helpers/mocks.ts
export const createMockUser = (overrides = {}) => ({
  id: 'mock-user-id',
  email: 'mock@example.com',
  name: 'Mock User',
  ...overrides
});

export const createMockResponse = (data: any) => ({
  success: true,
  data,
  timestamp: new Date().toISOString()
});
```

### Environment Setup
```typescript
// Set test environment variables
beforeEach(() => {
  process.env.LOG_LEVEL = 'ERROR'; // Reduce noise in tests
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Clean up if needed
});
```

## 🚀 Integration Testing

### API Endpoint Testing
```typescript
test('should authenticate user with valid credentials', async () => {
  const credentials = {
    email: 'test@example.com',
    password: 'validPassword'
  };
  
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  expect(response.status).toBe(200);
  
  const data = await response.json();
  expect(data).toHaveProperty('token');
  expect(data.user.email).toBe(credentials.email);
});
```

### Database Testing
```typescript
test('should store and retrieve user data', async () => {
  // Create test user
  const user = await createUser({ email: 'test@example.com' });
  
  // Retrieve user
  const retrieved = await getUserById(user.id);
  
  expect(retrieved.email).toBe('test@example.com');
});
```

## 📈 Test Development Workflow

### 1. Write Failing Test First (TDD)
```typescript
test('should calculate tax correctly', () => {
  const result = calculateTax(100, 0.1);
  expect(result).toBe(10);
});
```

### 2. Implement Minimal Code
```typescript
function calculateTax(amount: number, rate: number): number {
  return amount * rate;
}
```

### 3. Refactor and Improve
```typescript
function calculateTax(amount: number, rate: number): number {
  if (amount < 0 || rate < 0) {
    throw new Error('Amount and rate must be positive');
  }
  return Math.round(amount * rate * 100) / 100;
}
```

## 🔍 Debugging Tests

### Debug Individual Tests
```bash
# Run specific test with detailed output
bun test tests/unit/auth.test.ts --verbose
```

### Add Debug Logging
```typescript
test('debug test', () => {
  const data = processData(input);
  console.log('Debug data:', data);
  expect(data).toBeDefined();
});
```

### Test Environment Variables
```typescript
test('should use test environment', () => {
  expect(process.env.NODE_ENV).toBe('test');
});
```

## 🎯 Testing Checklist

### Before Writing Tests
- [ ] Understand what you're testing
- [ ] Identify edge cases and error conditions
- [ ] Prepare mock data if needed

### Writing Tests
- [ ] Use descriptive test names
- [ ] Follow Arrange-Act-Assert pattern
- [ ] Test both success and failure paths
- [ ] Use specific assertions

### After Writing Tests
- [ ] All tests pass locally
- [ ] Tests run quickly (under 1 second each)
- [ ] Tests are independent and can run in any order
- [ ] Mock external dependencies

## 📚 Resources

### Testing Examples
- Look at existing tests in `tests/unit/` for patterns
- Check `tests/helpers/` for reusable utilities
- Review service tests for integration patterns

### Bun Test Documentation
- [Bun Test Runner](https://bun.sh/docs/cli/test)
- Built-in matchers and assertions
- Mock and spy functionality

---

**Quick Start:** Run `bun test` to see existing tests, then create your own following the patterns in `tests/unit/services/`.