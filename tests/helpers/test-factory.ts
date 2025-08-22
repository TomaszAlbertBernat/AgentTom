/**
 * Test data factories for generating consistent test data
 * Provides utilities for creating mock users, conversations, messages, etc.
 */

import { v4 as uuidv4 } from 'uuid';

export interface MockUser {
  id: string;
  uuid: string;
  email?: string;
  name: string;
  scopes: string[];
  isLocal: boolean;
  createdAt: Date;
}

export interface MockConversation {
  id: string;
  uuid: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockMessage {
  id: string;
  uuid: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockDocument {
  id: string;
  uuid: string;
  text: string;
  source: string;
  contentType: 'chunk' | 'document' | 'webpage';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockToolExecution {
  id: string;
  uuid: string;
  conversationId: string;
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Factory for creating mock users
 */
export class UserFactory {
  private static counter = 0;

  static create(overrides: Partial<MockUser> = {}): MockUser {
    const id = uuidv4();
    return {
      id,
      uuid: id,
      email: `test-user-${this.counter++}@example.com`,
      name: `Test User ${this.counter}`,
      scopes: ['user'],
      isLocal: true,
      createdAt: new Date(),
      ...overrides
    };
  }

  static createLocalUser(overrides: Partial<MockUser> = {}): MockUser {
    return this.create({
      name: 'Local User',
      isLocal: true,
      scopes: ['user', 'local'],
      ...overrides
    });
  }

  static createAdminUser(overrides: Partial<MockUser> = {}): MockUser {
    return this.create({
      name: 'Admin User',
      scopes: ['user', 'admin'],
      isLocal: false,
      ...overrides
    });
  }

  static createBatch(count: number): MockUser[] {
    return Array.from({ length: count }, () => this.create());
  }
}

/**
 * Factory for creating mock conversations
 */
export class ConversationFactory {
  private static counter = 0;

  static create(userId: string, overrides: Partial<MockConversation> = {}): MockConversation {
    const id = uuidv4();
    return {
      id,
      uuid: id,
      userId,
      title: `Test Conversation ${this.counter++}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createWithMessages(userId: string, messageCount: number = 3): MockConversation & { messages: MockMessage[] } {
    const conversation = this.create(userId);
    const messages = MessageFactory.createBatchForConversation(conversation.id, messageCount);

    return {
      ...conversation,
      messages
    };
  }

  static createBatch(userId: string, count: number): MockConversation[] {
    return Array.from({ length: count }, () => this.create(userId));
  }
}

/**
 * Factory for creating mock messages
 */
export class MessageFactory {
  private static counter = 0;

  static create(conversationId: string, overrides: Partial<MockMessage> = {}): MockMessage {
    const id = uuidv4();
    const roles: ('user' | 'assistant' | 'system')[] = ['user', 'assistant', 'system'];
    const role = roles[this.counter % roles.length];

    return {
      id,
      uuid: id,
      conversationId,
      role,
      content: `Test message content ${this.counter++}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createUserMessage(conversationId: string, content: string = 'Hello, can you help me?'): MockMessage {
    return this.create(conversationId, {
      role: 'user',
      content
    });
  }

  static createAssistantMessage(conversationId: string, content: string = 'I\'m happy to help!'): MockMessage {
    return this.create(conversationId, {
      role: 'assistant',
      content
    });
  }

  static createSystemMessage(conversationId: string, content: string = 'You are a helpful assistant.'): MockMessage {
    return this.create(conversationId, {
      role: 'system',
      content
    });
  }

  static createBatchForConversation(conversationId: string, count: number): MockMessage[] {
    const messages: MockMessage[] = [];

    for (let i = 0; i < count; i++) {
      const role = i === 0 ? 'user' : i % 2 === 1 ? 'assistant' : 'user';
      const content = role === 'user'
        ? `User question ${i}`
        : role === 'assistant'
          ? `Assistant response ${i}`
          : `System message ${i}`;

      messages.push(this.create(conversationId, { role, content }));
    }

    return messages;
  }
}

/**
 * Factory for creating mock documents
 */
export class DocumentFactory {
  private static counter = 0;

  static create(overrides: Partial<MockDocument> = {}): MockDocument {
    const id = uuidv4();
    return {
      id,
      uuid: id,
      text: `Test document content ${this.counter++}. This is a sample document for testing purposes.`,
      source: 'test',
      contentType: 'document',
      metadata: {
        test: true,
        createdBy: 'DocumentFactory'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createChunk(overrides: Partial<MockDocument> = {}): MockDocument {
    return this.create({
      contentType: 'chunk',
      text: `Test document chunk ${this.counter}. This is a small chunk of content for testing.`,
      ...overrides
    });
  }

  static createWebpage(url: string = 'https://example.com', overrides: Partial<MockDocument> = {}): MockDocument {
    return this.create({
      contentType: 'webpage',
      source: url,
      text: `Content from webpage ${url}`,
      metadata: {
        url,
        title: 'Test Webpage',
        ...overrides.metadata
      },
      ...overrides
    });
  }

  static createBatch(count: number): MockDocument[] {
    return Array.from({ length: count }, () => this.create());
  }
}

/**
 * Factory for creating mock tool executions
 */
export class ToolExecutionFactory {
  private static counter = 0;

  static create(conversationId: string, toolName: string, overrides: Partial<MockToolExecution> = {}): MockToolExecution {
    const id = uuidv4();
    return {
      id,
      uuid: id,
      conversationId,
      toolName,
      parameters: { test: true },
      result: { success: true },
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createPending(conversationId: string, toolName: string): MockToolExecution {
    return this.create(conversationId, toolName, {
      status: 'pending',
      result: undefined
    });
  }

  static createRunning(conversationId: string, toolName: string): MockToolExecution {
    return this.create(conversationId, toolName, {
      status: 'running',
      result: undefined
    });
  }

  static createFailed(conversationId: string, toolName: string, error: string = 'Tool execution failed'): MockToolExecution {
    return this.create(conversationId, toolName, {
      status: 'failed',
      error,
      result: undefined
    });
  }

  static createBatch(conversationId: string, toolNames: string[]): MockToolExecution[] {
    return toolNames.map(toolName => this.create(conversationId, toolName));
  }
}

/**
 * Utility for creating complete test scenarios
 */
export class ScenarioFactory {
  static createSimpleChat(userName: string = 'Test User'): {
    user: MockUser;
    conversation: MockConversation;
    messages: MockMessage[];
  } {
    const user = UserFactory.createLocalUser({ name: userName });
    const conversation = ConversationFactory.create(user.id, {
      title: 'Simple Chat Test'
    });
    const messages = MessageFactory.createBatchForConversation(conversation.id, 3);

    return { user, conversation, messages };
  }

  static createComplexScenario(): {
    user: MockUser;
    conversations: MockConversation[];
    messages: MockMessage[];
    documents: MockDocument[];
    toolExecutions: MockToolExecution[];
  } {
    const user = UserFactory.createLocalUser({ name: 'Complex Test User' });
    const conversations = ConversationFactory.createBatch(user.id, 2);
    const messages = conversations.flatMap(conv =>
      MessageFactory.createBatchForConversation(conv.id, 5)
    );
    const documents = DocumentFactory.createBatch(3);
    const toolExecutions = conversations.flatMap(conv =>
      ToolExecutionFactory.createBatch(conv.id, ['weather', 'search'])
    );

    return {
      user,
      conversations,
      messages,
      documents,
      toolExecutions
    };
  }
}
