/**
 * Comprehensive test utilities that combine all testing helpers
 * Provides high-level interfaces for common testing scenarios
 */

import { testReporter, mockEnv, createMockLogger, createMockVectorService, createMockAlgoliaService, createMockDocumentService, createMockMemoryService, waitFor, createMockEmbedding, testHelpers } from './test-setup.js';
import { UserFactory, ConversationFactory, MessageFactory, DocumentFactory, ToolExecutionFactory, ScenarioFactory } from './test-factory.js';
import { TestSetup, ApiKeyManager } from './test-env.js';
import { MockServices, MockServiceManager } from './mock-server.js';
import { measurePerformance } from '../performance/performance-monitor.js';

export interface TestContext {
  setup: TestSetup;
  mockServices: MockServiceManager;
  logger: any;
  cleanup: () => Promise<void>;
}

export interface PerformanceTestContext extends TestContext {
  measurePerformance: typeof measurePerformance;
}

/**
 * Main test utilities class
 */
export class TestUtils {
  private static testSetup = new TestSetup();
  private static mockServices = new MockServiceManager();

  /**
   * Create a basic test context with common utilities
   */
  static async createTestContext(testName: string): Promise<TestContext> {
    // Set up test environment
    const { cleanup: envCleanup } = await this.testSetup.quickSetup(testName);

    // Create mock logger
    const logger = createMockLogger();

    // Cleanup function
    const cleanup = async () => {
      await this.mockServices.stopAll();
      await envCleanup();
    };

    return {
      setup: this.testSetup,
      mockServices: this.mockServices,
      logger,
      cleanup
    };
  }

  /**
   * Create a performance testing context
   */
  static async createPerformanceTestContext(testName: string): Promise<PerformanceTestContext> {
    const baseContext = await this.createTestContext(testName);

    return {
      ...baseContext,
      measurePerformance
    };
  }

  /**
   * Create test context with API mocking
   */
  static async createMockedTestContext(
    testName: string,
    services: string[] = ['google']
  ): Promise<TestContext> {
    const context = await this.createTestContext(testName);

    // Start mock services
    for (const service of services) {
      let mockServer;

      switch (service) {
        case 'google':
          mockServer = MockServices.createGoogleAIMock();
          break;
        case 'openai':
          mockServer = MockServices.createOpenAIMock();
          break;
        case 'spotify':
          mockServer = MockServices.createSpotifyMock();
          break;
        default:
          throw new Error(`Unknown mock service: ${service}`);
      }

      const url = await context.mockServices.startService(service, mockServer);
      process.env[`${service.toUpperCase()}_URL`] = url;
    }

    return context;
  }

  /**
   * Create test context with full scenario
   */
  static async createScenarioTestContext(
    testName: string,
    scenario: 'simple' | 'complex' = 'simple'
  ): Promise<TestContext & { scenario: any }> {
    const context = await this.createTestContext(testName);

    const scenarioData = scenario === 'simple'
      ? ScenarioFactory.createSimpleChat()
      : ScenarioFactory.createComplexScenario();

    return {
      ...context,
      scenario: scenarioData
    };
  }

  /**
   * Utility for testing async operations with timeout
   */
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 5000,
    errorMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    );

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Utility for testing error scenarios
   */
  static async expectError(
    promise: Promise<any>,
    expectedError?: string | RegExp
  ): Promise<Error> {
    try {
      await promise;
      throw new Error('Expected promise to reject, but it resolved');
    } catch (error) {
      if (expectedError) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (typeof expectedError === 'string') {
          expect(errorMessage).toContain(expectedError);
        } else {
          expect(errorMessage).toMatch(expectedError);
        }
      }
      return error as Error;
    }
  }

  /**
   * Utility for testing API endpoints
   */
  static createApiTestUtils(baseUrl: string = 'http://localhost:3000') {
    return {
      async get(endpoint: string, headers: Record<string, string> = {}) {
        const response = await fetch(`${baseUrl}${endpoint}`, { headers });
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          json: () => response.json(),
          text: () => response.text()
        };
      },

      async post(endpoint: string, data: any, headers: Record<string, string> = {}) {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(data)
        });
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          json: () => response.json(),
          text: () => response.text()
        };
      },

      async put(endpoint: string, data: any, headers: Record<string, string> = {}) {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(data)
        });
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          json: () => response.json(),
          text: () => response.text()
        };
      },

      async delete(endpoint: string, headers: Record<string, string> = {}) {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'DELETE',
          headers
        });
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          json: () => response.json(),
          text: () => response.text()
        };
      }
    };
  }

  /**
   * Utility for testing WebSocket connections
   */
  static createWebSocketTestUtils() {
    return {
      async connect(url: string): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
          const ws = new WebSocket(url);

          ws.onopen = () => resolve(ws);
          ws.onerror = (error) => reject(error);

          // Set timeout
          setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        });
      },

      async sendAndWait(ws: WebSocket, message: any, timeout: number = 5000): Promise<any> {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);

          ws.onmessage = (event) => {
            clearTimeout(timer);
            try {
              resolve(JSON.parse(event.data));
            } catch {
              resolve(event.data);
            }
          };

          ws.onerror = (error) => {
            clearTimeout(timer);
            reject(error);
          };

          ws.send(typeof message === 'string' ? message : JSON.stringify(message));
        });
      }
    };
  }

  /**
   * Utility for testing file operations
   */
  static createFileTestUtils() {
    return {
      async createTestFile(content: string, filename: string = 'test.txt'): Promise<string> {
        const tempDir = await import('fs/promises').then(fs => fs.mkdtemp('/tmp/agenttom-test-'));
        const filePath = `${tempDir}/${filename}`;

        await Bun.write(filePath, content);
        return filePath;
      },

      async readTestFile(filePath: string): Promise<string> {
        return Bun.file(filePath).text();
      },

      async cleanupTestFile(filePath: string): Promise<void> {
        const fs = await import('fs/promises');
        const path = await import('path');

        try {
          await fs.unlink(filePath);
          const dir = path.dirname(filePath);
          await fs.rmdir(dir);
        } catch (error) {
          console.warn(`Failed to cleanup test file ${filePath}:`, error);
        }
      },

      generateTestImage(width: number = 100, height: number = 100): ArrayBuffer {
        // Create a simple test image (1x1 pixel PNG)
        const pngSignature = new Uint8Array([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        ]);

        return pngSignature.buffer.slice(0, 8);
      }
    };
  }

  /**
   * Utility for testing database operations
   */
  static createDatabaseTestUtils() {
    return {
      async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
        // This would integrate with the actual database transaction system
        // For now, just execute the callback
        return callback();
      },

      async withRollback<T>(callback: () => Promise<T>): Promise<T> {
        // This would create a savepoint and rollback after the test
        // For now, just execute the callback
        return callback();
      },

      async cleanupTestData(pattern: string): Promise<void> {
        // This would clean up test data matching a pattern
        // Implementation would depend on the actual database schema
        console.log(`Cleanup test data matching: ${pattern}`);
      }
    };
  }
}

/**
 * Quick setup functions for common test scenarios
 */
export const QuickSetup = {
  /**
   * Basic test setup
   */
  async basic(testName: string) {
    return TestUtils.createTestContext(testName);
  },

  /**
   * API test setup
   */
  async api(testName: string) {
    const context = await TestUtils.createTestContext(testName);
    const apiUtils = TestUtils.createApiTestUtils();

    return { ...context, api: apiUtils };
  },

  /**
   * Mock API test setup
   */
  async mocked(testName: string, services: string[] = ['google']) {
    return TestUtils.createMockedTestContext(testName, services);
  },

  /**
   * Performance test setup
   */
  async performance(testName: string) {
    return TestUtils.createPerformanceTestContext(testName);
  },

  /**
   * Full scenario test setup
   */
  async scenario(testName: string, type: 'simple' | 'complex' = 'simple') {
    return TestUtils.createScenarioTestContext(testName, type);
  }
};

/**
 * Common test assertions
 */
export const TestAssertions = {
  /**
   * Assert that a response is successful
   */
  isSuccessResponse(response: { status: number }) {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  },

  /**
   * Assert that a response is an error
   */
  isErrorResponse(response: { status: number }, expectedStatus: number = 400) {
    expect(response.status).toBe(expectedStatus);
  },

  /**
   * Assert that an object has required properties
   */
  hasRequiredProperties(obj: any, properties: string[]) {
    properties.forEach(prop => {
      expect(obj).toHaveProperty(prop);
    });
  },

  /**
   * Assert that a user object is valid
   */
  isValidUser(user: any) {
    this.hasRequiredProperties(user, ['id', 'uuid', 'name']);
    expect(user.isLocal).toBeDefined();
    expect(user.createdAt).toBeInstanceOf(Date);
  },

  /**
   * Assert that a conversation object is valid
   */
  isValidConversation(conversation: any) {
    this.hasRequiredProperties(conversation, ['id', 'uuid', 'userId', 'title']);
    expect(conversation.createdAt).toBeInstanceOf(Date);
    expect(conversation.updatedAt).toBeInstanceOf(Date);
  },

  /**
   * Assert that a message object is valid
   */
  isValidMessage(message: any) {
    this.hasRequiredProperties(message, ['id', 'uuid', 'conversationId', 'role', 'content']);
    expect(['user', 'assistant', 'system']).toContain(message.role);
    expect(message.createdAt).toBeInstanceOf(Date);
    expect(message.updatedAt).toBeInstanceOf(Date);
  }
};

// Re-export commonly used utilities for convenience
export {
  testReporter,
  mockEnv,
  createMockLogger,
  createMockVectorService,
  createMockAlgoliaService,
  createMockDocumentService,
  createMockMemoryService,
  waitFor,
  createMockEmbedding,
  testHelpers,
  UserFactory,
  ConversationFactory,
  MessageFactory,
  DocumentFactory,
  ToolExecutionFactory,
  ScenarioFactory,
  TestSetup,
  ApiKeyManager,
  MockServices,
  MockServiceManager
};
