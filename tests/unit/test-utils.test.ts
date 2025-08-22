/**
 * Test the comprehensive test utilities
 * Demonstrates usage of all testing helper functions
 */

import { describe, it, beforeAll, afterAll, expect } from 'bun:test';
import { testReporter } from '../helpers/test-setup.js';
import {
  TestUtils,
  QuickSetup,
  TestAssertions,
  UserFactory,
  ConversationFactory,
  MessageFactory,
  DocumentFactory,
  ToolExecutionFactory,
  ScenarioFactory,
  ApiKeyManager,
  MockServices
} from '../helpers/test-utils.js';

describe('Test Utilities Comprehensive Test', () => {
  beforeAll(() => {
    testReporter.startSuite();
  });

  afterAll(async () => {
    const metrics = testReporter.endSuite();
    await testReporter.saveJUnitReport('test-results.xml');
    await testReporter.saveMetricsReport('test-metrics.json');
  });

  describe('Test Context Creation', () => {
    it('should create basic test context', async () => {
      const context = await TestUtils.createTestContext('basic-context-test');

      expect(context.setup).toBeDefined();
      expect(context.mockServices).toBeDefined();
      expect(context.logger).toBeDefined();
      expect(context.cleanup).toBeDefined();

      await context.cleanup();
    });

    it('should create performance test context', async () => {
      const context = await TestUtils.createPerformanceTestContext('performance-context-test');

      expect(context.measurePerformance).toBeDefined();
      expect(context.setup).toBeDefined();
      expect(context.cleanup).toBeDefined();

      await context.cleanup();
    });

    it('should create mocked test context', async () => {
      const context = await TestUtils.createMockedTestContext('mocked-context-test', ['google']);

      expect(context.setup).toBeDefined();
      expect(context.mockServices).toBeDefined();
      expect(context.cleanup).toBeDefined();

      await context.cleanup();
    });

    it('should create scenario test context', async () => {
      const context = await TestUtils.createScenarioTestContext('scenario-context-test', 'simple');

      expect(context.scenario).toBeDefined();
      expect(context.scenario.user).toBeDefined();
      expect(context.scenario.conversation).toBeDefined();
      expect(context.scenario.messages).toBeDefined();

      TestAssertions.isValidUser(context.scenario.user);
      TestAssertions.isValidConversation(context.scenario.conversation);

      context.scenario.messages.forEach(message => {
        TestAssertions.isValidMessage(message);
      });

      await context.cleanup();
    });
  });

  describe('Quick Setup Functions', () => {
    it('should create basic setup', async () => {
      const { cleanup } = await QuickSetup.basic('quick-basic-test');
      await cleanup();
    });

    it('should create API setup', async () => {
      const context = await QuickSetup.api('quick-api-test');
      expect(context.api).toBeDefined();
      await context.cleanup();
    });

    it('should create mocked setup', async () => {
      const context = await QuickSetup.mocked('quick-mocked-test', ['google']);
      expect(context.mockServices).toBeDefined();
      await context.cleanup();
    });

    it('should create performance setup', async () => {
      const context = await QuickSetup.performance('quick-performance-test');
      expect(context.measurePerformance).toBeDefined();
      await context.cleanup();
    });

    it('should create scenario setup', async () => {
      const context = await QuickSetup.scenario('quick-scenario-test');
      expect(context.scenario).toBeDefined();
      await context.cleanup();
    });
  });

  describe('Test Data Factories', () => {
    it('should create valid user with factory', () => {
      const user = UserFactory.create();

      TestAssertions.isValidUser(user);
      expect(user.name).toContain('Test User');
      expect(user.isLocal).toBe(true);
    });

    it('should create local user with factory', () => {
      const user = UserFactory.createLocalUser({ name: 'Custom Local User' });

      TestAssertions.isValidUser(user);
      expect(user.name).toBe('Custom Local User');
      expect(user.isLocal).toBe(true);
    });

    it('should create admin user with factory', () => {
      const user = UserFactory.createAdminUser({ name: 'Admin User' });

      TestAssertions.isValidUser(user);
      expect(user.name).toBe('Admin User');
      expect(user.isLocal).toBe(false);
      expect(user.scopes).toContain('admin');
    });

    it('should create conversation with factory', () => {
      const user = UserFactory.create();
      const conversation = ConversationFactory.create(user.id);

      TestAssertions.isValidConversation(conversation);
      expect(conversation.userId).toBe(user.id);
      expect(conversation.title).toContain('Test Conversation');
    });

    it('should create conversation with messages', () => {
      const user = UserFactory.create();
      const result = ConversationFactory.createWithMessages(user.id, 3);

      TestAssertions.isValidConversation(result);
      expect(result.messages).toHaveLength(3);

      result.messages.forEach(message => {
        TestAssertions.isValidMessage(message);
        expect(message.conversationId).toBe(result.id);
      });
    });

    it('should create different message types', () => {
      const conversationId = 'test-conversation-id';

      const userMessage = MessageFactory.createUserMessage(conversationId, 'Hello!');
      const assistantMessage = MessageFactory.createAssistantMessage(conversationId, 'Hi there!');
      const systemMessage = MessageFactory.createSystemMessage(conversationId, 'System message');

      TestAssertions.isValidMessage(userMessage);
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe('Hello!');

      TestAssertions.isValidMessage(assistantMessage);
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.content).toBe('Hi there!');

      TestAssertions.isValidMessage(systemMessage);
      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toBe('System message');
    });

    it('should create documents with factory', () => {
      const document = DocumentFactory.create();

      expect(document.id).toBeDefined();
      expect(document.uuid).toBeDefined();
      expect(document.text).toContain('Test document content');
      expect(document.contentType).toBe('document');
      expect(document.createdAt).toBeInstanceOf(Date);
    });

    it('should create different document types', () => {
      const chunk = DocumentFactory.createChunk();
      expect(chunk.contentType).toBe('chunk');

      const webpage = DocumentFactory.createWebpage('https://example.com');
      expect(webpage.contentType).toBe('webpage');
      expect(webpage.source).toBe('https://example.com');
      expect(webpage.metadata?.url).toBe('https://example.com');
    });

    it('should create tool executions with factory', () => {
      const conversationId = 'test-conversation-id';

      const execution = ToolExecutionFactory.create(conversationId, 'weather');
      expect(execution.conversationId).toBe(conversationId);
      expect(execution.toolName).toBe('weather');
      expect(execution.status).toBe('completed');

      const pending = ToolExecutionFactory.createPending(conversationId, 'search');
      expect(pending.status).toBe('pending');

      const failed = ToolExecutionFactory.createFailed(conversationId, 'weather', 'API Error');
      expect(failed.status).toBe('failed');
      expect(failed.error).toBe('API Error');
    });

    it('should create complete scenarios', () => {
      const simpleScenario = ScenarioFactory.createSimpleChat('John Doe');
      expect(simpleScenario.user.name).toBe('John Doe');
      expect(simpleScenario.messages.length).toBeGreaterThan(0);

      const complexScenario = ScenarioFactory.createComplexScenario();
      expect(complexScenario.user).toBeDefined();
      expect(complexScenario.conversations.length).toBeGreaterThan(0);
      expect(complexScenario.messages.length).toBeGreaterThan(0);
      expect(complexScenario.documents.length).toBeGreaterThan(0);
      expect(complexScenario.toolExecutions.length).toBeGreaterThan(0);
    });
  });

  describe('API Key Management', () => {
    it('should generate test API keys', () => {
      const keys = ApiKeyManager.generateTestKeys(['google', 'openai']);

      expect(keys.google).toBeDefined();
      expect(keys.openai).toBeDefined();
      expect(keys.spotify).toBeUndefined(); // Not requested
    });

    it('should format environment keys correctly', () => {
      const keys = { google: 'test-key', custom: 'custom-key' };
      ApiKeyManager.setTestEnv(keys);

      expect(process.env.GOOGLE_API_KEY).toBe('test-key');
      expect(process.env.CUSTOM_API_KEY).toBe('custom-key');

      // Cleanup
      ApiKeyManager.clearTestEnv(['google', 'custom']);
    });
  });

  describe('Mock Services', () => {
    it('should create Google AI mock service', () => {
      const mockServer = MockServices.createGoogleAIMock();

      expect(mockServer).toBeDefined();
      // The server would be started in a real test scenario
    });

    it('should create OpenAI mock service', () => {
      const mockServer = MockServices.createOpenAI();

      expect(mockServer).toBeDefined();
    });

    it('should create multi-service mock', () => {
      const mockServer = MockServices.createMultiServiceMock(['google', 'spotify']);

      expect(mockServer).toBeDefined();
    });
  });

  describe('Test Assertions', () => {
    it('should validate success response', () => {
      const response = { status: 200 };
      expect(() => TestAssertions.isSuccessResponse(response)).not.toThrow();
    });

    it('should validate error response', () => {
      const response = { status: 404 };
      expect(() => TestAssertions.isErrorResponse(response, 404)).not.toThrow();
    });

    it('should validate required properties', () => {
      const obj = { name: 'test', value: 123 };
      expect(() => TestAssertions.hasRequiredProperties(obj, ['name', 'value'])).not.toThrow();
    });

    it('should validate user object', () => {
      const user = UserFactory.create();
      expect(() => TestAssertions.isValidUser(user)).not.toThrow();
    });

    it('should validate conversation object', () => {
      const user = UserFactory.create();
      const conversation = ConversationFactory.create(user.id);
      expect(() => TestAssertions.isValidConversation(conversation)).not.toThrow();
    });

    it('should validate message object', () => {
      const message = MessageFactory.create('test-conversation');
      expect(() => TestAssertions.isValidMessage(message)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle async timeouts', async () => {
      const promise = TestUtils.withTimeout(
        new Promise(resolve => setTimeout(resolve, 100)),
        200
      );

      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle async timeout errors', async () => {
      const promise = TestUtils.withTimeout(
        new Promise(resolve => setTimeout(resolve, 200)),
        100
      );

      await expect(promise).rejects.toThrow('Operation timed out');
    });

    it('should handle expected errors', async () => {
      const promise = Promise.reject(new Error('Expected error'));
      const error = await TestUtils.expectError(promise, 'Expected error');

      expect(error.message).toBe('Expected error');
    });
  });
});
