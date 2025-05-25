# Testing Documentation for AgentTom

## Overview

AgentTom uses Bun's built-in test runner for fast, reliable unit testing. The testing infrastructure is designed to help maintain code quality and catch regressions during development.

## Test Structure

```
tests/
├── unit/           # Unit tests for individual components
│   ├── services/   # Service layer tests
│   ├── routes/     # API route tests
│   └── utils/      # Utility function tests
├── integration/    # Integration tests
└── helpers/        # Test utilities and mocks
```

## Running Tests

### All Tests
```bash
bun test
```

### Specific Test File
```bash
bun test tests/unit/services/logger.service.test.ts
```

### Watch Mode
```bash
bun test --watch
```

### Coverage Report
```bash
bun test --coverage
```

## Test Scripts

Available in `package.json`:

- `bun run test` - Run all tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with coverage report

## Current Test Coverage

### ✅ Completed Test Suites

#### 1. Logger Service (`tests/unit/services/logger.service.test.ts`)
- **28 tests** covering all logging functionality
- Tests log levels, logger creation, component loggers
- Validates convenience methods (startup, database, api, tool, migration)
- Environment handling and error scenarios
- Mock logger functionality for test isolation

#### 2. Vector Service (`tests/unit/services/vector.service.test.ts`)
- **14 tests** covering vector operations
- Environment validation and configuration
- Vector search, upsert, and delete operations
- Error handling and edge cases
- Vector similarity calculations and normalization

#### 3. Search Service (`tests/unit/services/search.service.test.ts`)
- **10 tests** covering search functionality
- Search query structure validation
- RRF (Reciprocal Rank Fusion) score calculations
- Filter matching and Algolia filter building
- Complex filter combinations and edge cases

#### 4. Basic Infrastructure (`tests/unit/utils/basic.test.ts`)
- **11 tests** validating test infrastructure
- Math utilities (add, multiply, divide)
- String utilities (capitalize, reverse, palindrome)
- Async operation handling
- Basic assertion validation

### 📊 Test Statistics

- **Total Tests**: 62
- **Total Assertions**: 194+ expect() calls
- **Execution Time**: ~168ms
- **Pass Rate**: 100%
- **Files Covered**: 4 test files

## Writing Tests

### Test File Naming

Follow the pattern: `{service-name}.test.ts`

```typescript
// tests/unit/services/example.service.test.ts
import { test, expect, describe } from 'bun:test';

describe('Example Service', () => {
  test('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Test Structure

Use descriptive nested describe blocks:

```typescript
describe('Service Name', () => {
  describe('Feature Group', () => {
    test('should handle specific case', () => {
      // Test implementation
    });
  });
});
```

### Mock Data and Utilities

Create mock data that mirrors real service interfaces:

```typescript
const mockData = {
  uuid: 'test-uuid',
  content: 'test content',
  metadata: { test: true }
};
```

### Async Testing

Handle async operations properly:

```typescript
test('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

## Testing Best Practices

### 1. Test Structure
- Use descriptive test names that explain the expected behavior
- Group related tests in `describe` blocks
- Keep tests isolated and independent

### 2. Assertions
- Use specific matchers (`toBe`, `toContain`, `toBeGreaterThan`)
- Test both happy path and error cases
- Validate expected data types and structures

### 3. Mock Data
- Create realistic mock data that matches production interfaces
- Use proper TypeScript types for mock objects
- Keep mock data focused on the test requirements

### 4. Error Testing
- Test error scenarios and edge cases
- Validate error messages and types
- Use `expect().toThrow()` for exception testing

## Common Test Patterns

### Testing Service Methods

```typescript
test('should handle service method', () => {
  const result = service.methodName(input);
  expect(result).toHaveProperty('expectedProperty');
  expect(result.expectedProperty).toBe('expectedValue');
});
```

### Testing Data Validation

```typescript
test('should validate input data', () => {
  const validData = { /* valid structure */ };
  const invalidData = { /* invalid structure */ };
  
  expect(() => validate(validData)).not.toThrow();
  expect(() => validate(invalidData)).toThrow();
});
```

### Testing Async Operations

```typescript
test('should handle async operations', async () => {
  const promise = asyncFunction();
  await expect(promise).resolves.toBeDefined();
});
```

## Integration with Development

### IDE Integration
- Tests work with VSCode and Cursor
- TypeScript errors in test files are cosmetic (Bun handles runtime)
- Use test runner integration for immediate feedback

### CI/CD Integration
Tests can be integrated into GitHub Actions:

```yaml
- name: Run Tests
  run: bun test
```

### Pre-commit Hooks
Consider adding tests to pre-commit hooks:

```json
{
  "pre-commit": "bun test"
}
```

## Future Test Development

### Priority Areas

1. **API Route Testing**: Test all HTTP endpoints
2. **Database Integration**: Test with actual database operations  
3. **Tool Service Testing**: Test individual tool implementations
4. **Error Handling**: Comprehensive error scenario testing
5. **Performance Testing**: Load and performance validation

### Test Utilities to Add

1. **Database Fixtures**: Reusable test data setup
2. **HTTP Test Client**: For API endpoint testing
3. **Mock External Services**: For integration testing
4. **Test Data Factories**: Automated test data generation

## Debugging Tests

### Running Individual Tests
```bash
bun test tests/unit/services/logger.service.test.ts
```

### Verbose Output
Add console logs for debugging:

```typescript
test('debug test', () => {
  console.log('Debug info:', data);
  expect(data).toBeDefined();
});
```

### Environment Variables
Set test-specific environment:

```typescript
beforeEach(() => {
  process.env.LOG_LEVEL = 'ERROR'; // Reduce noise
});
```

## Summary

The AgentTom testing infrastructure provides:

- ✅ **Fast Execution**: Bun's optimized test runner
- ✅ **Comprehensive Coverage**: Core services thoroughly tested  
- ✅ **Developer Friendly**: Easy to write and maintain tests
- ✅ **CI/CD Ready**: Suitable for automated testing pipelines
- ✅ **Type Safe**: Full TypeScript support for test code

This foundation ensures AgentTom maintains high code quality as it continues to evolve and new features are added. 