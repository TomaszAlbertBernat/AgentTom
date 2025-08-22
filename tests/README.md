# AgentTom Testing Infrastructure

Enhanced testing framework with automated reporting, CI/CD integration, and performance monitoring capabilities.

## 🚀 Quick Start

### Run All Tests
```bash
bun run test
```

### Run Specific Test Categories
```bash
bun run test:unit           # Unit tests only
bun run test:integration    # Integration tests only
bun run test:smoke          # Smoke tests only
bun run test:system         # System tests only
```

### Run with Coverage
```bash
bun run test:coverage       # Generate coverage reports
```

### CI/CD Mode
```bash
bun run test:ci             # Verbose output with coverage
```

## 📊 Test Reporting

### Automated Reports
The testing framework automatically generates:
- **JUnit XML** (`test-results.xml`) - For CI/CD systems
- **JSON Metrics** (`test-metrics.json`) - For analysis and dashboards

### View Test Dashboard
```bash
bun run test:dashboard                    # Show help
bun run test:dashboard:summary           # Latest test summary
bun run test:dashboard:trends            # Historical trends
bun run test:dashboard:coverage          # Coverage analysis
```

## 🏗️ Architecture

### Test Reporter System
```typescript
import { testReporter } from './helpers/test-setup.js';

// Record test results
testReporter.recordResult('Suite', 'Test Name', 'pass', duration, error?);

// Generate reports
await testReporter.saveJUnitReport('test-results.xml');
await testReporter.saveMetricsReport('test-metrics.json');

// Get metrics
const metrics = testReporter.generateMetricsReport();
```

### Test Structure
```
tests/
├── helpers/              # Test utilities and setup
│   ├── test-setup.ts     # Global test configuration
│   └── test-reporter.ts  # Custom test reporter
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── smoke/                # Smoke tests
├── system/               # System tests
├── regression/           # Regression tests
├── reporter.ts           # Test runner with reporting
├── test-runner.ts        # Enhanced test runner
└── dashboard.ts          # Test dashboard utility
```

## 🔧 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run test suite with CI reporting
  run: bun run test:ci

- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: |
      test-results.xml
      test-metrics.json

- name: Publish test results
  uses: dorny/test-reporter@v1
  with:
    name: Test Results
    path: test-results.xml
    reporter: java-junit
```

### JUnit XML Format
The generated XML follows standard JUnit format:
```xml
<testsuites name="AgentTom Test Suite">
  <testsuite name="Suite Name" tests="5" failures="1" skipped="0">
    <testcase name="Test Name" time="0.1" />
    <testcase name="Failing Test" time="0.05">
      <failure message="Error message">
        <![CDATA[Stack trace or error details]]>
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

### JSON Metrics Format
```json
{
  "total": 100,
  "passed": 95,
  "failed": 3,
  "skipped": 2,
  "duration": 45000,
  "coverage": {
    "lines": { "total": 1000, "covered": 850, "percentage": 85.0 },
    "functions": { "total": 150, "covered": 140, "percentage": 93.3 },
    "branches": { "total": 200, "covered": 180, "percentage": 90.0 },
    "statements": { "total": 1200, "covered": 1020, "percentage": 85.0 }
  },
  "timestamp": "2024-08-22T18:10:59.586Z",
  "environment": "test"
}
```

## 📈 Performance Testing

### Performance Test Structure
```typescript
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  it('should respond within 100ms', async () => {
    const start = performance.now();

    // Your test code here
    await someOperation();

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

### Test Timing
The framework automatically tracks:
- **Test Duration** - Individual test execution time
- **Suite Duration** - Total suite execution time
- **Performance Trends** - Historical performance data

## 🛠️ Test Utilities

### Quick Test Setup
```typescript
import { QuickSetup } from './helpers/test-utils.js';

// Basic test setup
const context = await QuickSetup.basic('my-test');
await context.cleanup();

// API test setup
const apiContext = await QuickSetup.api('api-test');
const response = await apiContext.api.get('/health');
await apiContext.cleanup();

// Mock service setup
const mockContext = await QuickSetup.mocked('mock-test', ['google']);
await mockContext.cleanup();

// Performance test setup
const perfContext = await QuickSetup.performance('perf-test');
await perfContext.cleanup();

// Scenario test setup
const scenarioContext = await QuickSetup.scenario('scenario-test', 'complex');
await scenarioContext.cleanup();
```

### Test Data Factories
```typescript
import {
  UserFactory,
  ConversationFactory,
  MessageFactory,
  DocumentFactory,
  ScenarioFactory
} from './helpers/test-utils.js';

// Create test data
const user = UserFactory.createLocalUser({ name: 'Test User' });
const conversation = ConversationFactory.createWithMessages(user.id, 5);
const document = DocumentFactory.createWebpage('https://example.com');
const scenario = ScenarioFactory.createSimpleChat('Alice');
```

### Environment & API Key Management
```typescript
import { ApiKeyManager, TestSetup } from './helpers/test-utils.js';

// Generate test API keys
const keys = ApiKeyManager.generateTestKeys(['google', 'openai']);
ApiKeyManager.setTestEnv(keys);

// Complete test environment
const { env, keys: testKeys, cleanup } = await TestSetup.setupTestEnvironment(
  'integration-test',
  { services: ['google'], withDatabase: true }
);
await cleanup();
```

### Mock Services
```typescript
import { MockServices, MockServiceManager } from './helpers/test-utils.js';

// Create and start mock services
const mockManager = new MockServiceManager();
const googleMock = MockServices.createGoogleAIMock();
const openaiMock = MockServices.createOpenAIMock();

await mockManager.startService('google', googleMock);
await mockManager.startService('openai', openaiMock);

// Set environment variables for mock URLs
mockManager.setServiceEnvs();

await mockManager.stopAll();
```

### Test Assertions
```typescript
import { TestAssertions } from './helpers/test-utils.js';

// Validate responses and data
TestAssertions.isSuccessResponse({ status: 200 });
TestAssertions.isErrorResponse({ status: 404 }, 404);
TestAssertions.hasRequiredProperties(obj, ['id', 'name']);
TestAssertions.isValidUser(user);
TestAssertions.isValidConversation(conversation);
TestAssertions.isValidMessage(message);
```

### Advanced Testing Utilities
```typescript
import { TestUtils } from './helpers/test-utils.js';

// API testing utilities
const apiUtils = TestUtils.createApiTestUtils('http://localhost:3000');
const response = await apiUtils.post('/api/chat', { message: 'Hello' });

// WebSocket testing
const wsUtils = TestUtils.createWebSocketTestUtils();
const ws = await wsUtils.connect('ws://localhost:3000/chat');
const response = await wsUtils.sendAndWait(ws, { type: 'message', content: 'Hi' });

// File testing
const fileUtils = TestUtils.createFileTestUtils();
const testFile = await fileUtils.createTestFile('test content', 'example.txt');
const content = await fileUtils.readTestFile(testFile);
await fileUtils.cleanupTestFile(testFile);

// Error testing
await TestUtils.expectError(promise, 'Expected error message');
const result = await TestUtils.withTimeout(promise, 5000);
```

### Legacy Test Utilities
```typescript
// Original test utilities are still available
import { testHelpers, createMockLogger } from './helpers/test-setup.js';

testHelpers.assertArrayLength(array, expectedLength);
testHelpers.assertCalledWith(mockLogs, 'ERROR', 'error message');
```

## 📊 Coverage Reporting

### Coverage Configuration
Coverage is automatically collected when using:
```bash
bun run test:coverage
```

### Coverage Output
- **Console Output** - Summary in terminal
- **HTML Report** - Detailed coverage in `coverage/` directory
- **JSON Data** - Machine-readable coverage data

### Coverage Thresholds
Default thresholds (configurable):
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

## 🔍 Debugging Tests

### Verbose Mode
```bash
bun run test:ci  # Enables verbose output
```

### Debug Individual Tests
```bash
bun test tests/unit/specific.test.ts
```

### Watch Mode
```bash
bun run test:watch
```

## 📋 Best Practices

### Writing Tests
1. **Use descriptive test names** that explain the behavior being tested
2. **Group related tests** in describe blocks with clear names
3. **Test one thing per test** - keep tests focused and atomic
4. **Use meaningful assertions** with descriptive failure messages
5. **Clean up after tests** - use beforeEach/afterEach for setup/teardown

### Test Organization
1. **Unit Tests** - Test individual functions/classes in isolation
2. **Integration Tests** - Test interactions between components
3. **Smoke Tests** - Quick validation that critical paths work
4. **System Tests** - End-to-end testing of complete workflows
5. **Regression Tests** - Prevent re-introduction of known bugs

### Performance Testing
1. **Set realistic performance budgets** based on requirements
2. **Test under realistic load** conditions
3. **Monitor performance trends** over time
4. **Use consistent testing environments** for reliable results

## 🚨 Troubleshooting

### Common Issues

**Tests are slow**
- Use `beforeAll` for expensive setup instead of `beforeEach`
- Mock external dependencies
- Reduce test data size

**Tests are flaky**
- Avoid timing dependencies
- Use proper async/await patterns
- Don't rely on external services

**Coverage is low**
- Add tests for uncovered code paths
- Focus on critical business logic
- Consider if low-coverage code is actually needed

**CI/CD failures**
- Check JUnit XML format
- Verify file paths in CI environment
- Ensure all dependencies are installed

## 📝 Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Add appropriate test categories
3. Update this documentation if needed
4. Ensure tests pass in CI/CD

When modifying the test framework:
1. Maintain backward compatibility
2. Update documentation
3. Test the changes thoroughly
4. Consider impact on CI/CD systems

## 🎯 Success Metrics

- **Test Coverage**: ≥80% overall coverage
- **Test Execution**: <30 minutes for full suite
- **CI/CD Integration**: Tests pass consistently in CI
- **Performance**: P95 response times within budgets
- **Reliability**: <5% test flakiness rate
