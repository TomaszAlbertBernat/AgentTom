# Testing Strategy - AgentTom

## 🎯 Current Test Coverage Status

### ✅ **Working Test Categories (54 passing tests)**

#### **Unit Tests - Services**
- **Search Service** (9 tests) - Search functionality, RRF scoring, filter handling
- **Vector Service** (14 tests) - Vector operations, similarity calculations, error handling
- **Logger Service** (28 tests) - Logging levels, component loggers, environment handling

#### **Unit Tests - Utilities**
- **Basic Utils** (11 tests) - Math utilities, string operations, async handling
- **Encryption Utils** (20 tests) - Encryption/decryption, validation, masking, edge cases

#### **Test Infrastructure**
- **Logger Service Mock** - Mock logger functionality for testing
- **Test Setup** - Basic test infrastructure validation

### ❌ **Failing/Missing Test Categories (21 failing tests)**

#### **Dependencies Issues**
- Missing AI SDK packages (`ai`, `langfuse`)
- Missing Zod package references
- Missing Hono framework imports

#### **Service Tests with Issues**
- **LLM Service** (4 failing) - AI SDK integration tests
- **Observer Service** (7 failing) - Langfuse integration tests
- **Cache Service** - Environment configuration tests
- **API Tools Dispatch** - Tool execution tests

#### **Infrastructure Tests**
- **API Smoke Tests** - Basic API endpoint validation
- **Image Smoke Tests** - Image processing validation
- **Response Utils** - Mock function issues

## 🎯 **Testing Strategy Goals**

### **Phase 1: Fix Existing Tests (Current Priority)**
1. **Resolve dependency issues** - Install missing packages
2. **Fix mock implementations** - Update test mocks for current codebase
3. **Update test configurations** - Ensure tests can run without external dependencies

### **Phase 2: Expand Unit Test Coverage (Target: >80%)**
1. **Local User Configuration** ✅ - Already implemented
2. **Setup Service** - Test setup wizard functionality
3. **API Route Tests** - Test all endpoint validations
4. **Middleware Tests** - Auth, CORS, rate limiting, sanitization

### **Phase 3: Integration Tests**
1. **API Endpoint Tests** - Full request/response cycles
2. **Database Integration** - SQLite operations with Drizzle
3. **External Service Mocks** - Google AI, OpenAI, other APIs

### **Phase 4: System Tests**
1. **End-to-End Workflows** - Complete user journeys
2. **Setup Wizard Flow** - First-run experience
3. **Chat Functionality** - Message processing with AI
4. **Tool Execution** - External tool integration

### **Phase 5: Regression Test Suite**
1. **Critical Path Protection** - Prevent breaking core functionality
2. **Configuration Management** - Ensure setup reliability
3. **API Compatibility** - Maintain backward compatibility

## 🔧 **Implementation Plan**

### **Immediate Actions (P0)**

#### 1. **Fix Dependency Issues**
```bash
# Install missing packages
bun add -D @types/node
bun add ai langfuse zod hono

# Update test configurations
```

#### 2. **Update Mock Implementations**
- Fix `__setAiOpsForTest` function in LLM service
- Update observer service mocks for Langfuse
- Fix `mock.fn` usage in response tests

#### 3. **Add Missing Test Categories**
- Setup service tests
- Local user configuration tests ✅ (completed)
- Enhanced encryption tests ✅ (completed)

### **Test Structure Standards**

#### **Unit Test Structure**
```typescript
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';

describe('Service Name', () => {
  beforeEach(() => {
    // Setup test environment
  });

  afterEach(() => {
    // Cleanup
  });

  describe('method name', () => {
    test('should handle valid input', () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = serviceMethod(input);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should reject invalid input', () => {
      // Arrange, Act, Assert
      expect(() => serviceMethod(invalidInput)).toThrow();
    });
  });
});
```

#### **Integration Test Structure**
```typescript
describe('API Integration', () => {
  test('should authenticate user and return session', async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('token');
  });
});
```

### **Test Coverage Goals**

#### **Target Coverage by Category**
- **Unit Tests**: >80% code coverage
- **Integration Tests**: All API endpoints
- **System Tests**: Critical user workflows
- **Regression Tests**: P0/P1 functionality

#### **Priority Test Areas**
1. **Authentication & Authorization** - Local mode vs multi-user
2. **API Key Management** - Encryption, validation, rotation
3. **Setup Wizard** - First-run configuration
4. **Chat Functionality** - AI integration
5. **Tool Execution** - External service integration

### **Test Data Management**

#### **Mock Data Strategy**
- **Realistic test data** - Representative of production
- **Edge case coverage** - Boundary conditions
- **Error condition testing** - Failure scenarios

#### **Test Environment**
- **Isolated test database** - SQLite in-memory for tests
- **Mock external services** - Avoid API calls in tests
- **Deterministic results** - Reproducible test outcomes

### **Continuous Integration**

#### **Test Automation**
- **Pre-commit hooks** - Run relevant tests before commits
- **CI pipeline** - Full test suite on pull requests
- **Coverage reporting** - Track coverage trends

#### **Test Organization**
```
tests/
├── unit/           # Fast, isolated tests
│   ├── services/   # Business logic tests
│   ├── utils/      # Utility function tests
│   └── config/     # Configuration tests
├── integration/    # Service interaction tests
│   ├── api/        # API endpoint tests
│   └── database/   # Database operation tests
├── system/         # End-to-end tests
│   ├── workflows/  # Complete user journeys
│   └── setup/      # Setup wizard tests
├── regression/     # Critical path protection
└── helpers/        # Test utilities and mocks
```

## 📊 **Success Metrics**

### **Quantitative Goals**
- **Unit Test Coverage**: >80%
- **Test Execution Time**: <30 seconds for unit tests
- **Integration Test Coverage**: 100% of API endpoints
- **System Test Coverage**: 100% of P0 workflows

### **Qualitative Goals**
- **Test Reliability**: <5% flaky test rate
- **Maintainability**: Easy to update tests when code changes
- **Documentation**: Clear test descriptions and expectations
- **Developer Experience**: Fast feedback cycle

## 🚀 **Next Steps**

### **Week 1: Foundation**
1. Fix existing failing tests
2. Resolve dependency issues
3. Implement setup service tests
4. Add middleware tests

### **Week 2: Expansion**
1. API endpoint integration tests
2. Database operation tests
3. Enhanced error handling tests
4. Performance test baseline

### **Week 3: System Testing**
1. End-to-end workflow tests
2. Setup wizard integration tests
3. Chat functionality tests
4. Tool execution tests

### **Week 4: Optimization**
1. Test performance optimization
2. Coverage gap analysis
3. Regression test suite
4. Documentation updates

---

## 📝 **Test Implementation Status**

### **Completed ✅**
- [x] Encryption utilities tests (20 tests)
- [x] Local user configuration tests (implemented)
- [x] Basic utility tests (11 tests)
- [x] Search service tests (9 tests)
- [x] Vector service tests (14 tests)

### **In Progress 🔄**
- [ ] Setup service tests
- [ ] API route tests
- [ ] Dependency fixes

### **Planned 📋**
- [ ] Integration tests
- [ ] System tests
- [ ] Performance tests
- [ ] Regression suite
