/**
 * Environment and API key management utilities for testing
 * Provides isolated test environments and API key management
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';

export interface TestEnvironment {
  tempDir: string;
  envFile: string;
  cleanup: () => Promise<void>;
}

export interface ApiKeys {
  google?: string;
  openai?: string;
  spotify?: string;
  linear?: string;
  resend?: string;
  [key: string]: string | undefined;
}

/**
 * Environment isolation utility for tests
 */
export class TestEnvironmentManager {
  private environments: Map<string, TestEnvironment> = new Map();

  /**
   * Create an isolated test environment
   */
  async createTestEnvironment(testName: string): Promise<TestEnvironment> {
    const tempDir = join(tmpdir(), `agenttom-test-${testName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const envFile = join(tempDir, '.env');

    // Create temp directory
    await mkdir(tempDir, { recursive: true });

    const env = {
      tempDir,
      envFile,
      cleanup: async () => {
        try {
          if (existsSync(tempDir)) {
            await rm(tempDir, { recursive: true, force: true });
          }
        } catch (error) {
          console.warn(`Failed to cleanup test environment ${testName}:`, error);
        }
        this.environments.delete(testName);
      }
    };

    this.environments.set(testName, env);
    return env;
  }

  /**
   * Get existing test environment
   */
  getTestEnvironment(testName: string): TestEnvironment | undefined {
    return this.environments.get(testName);
  }

  /**
   * Clean up all test environments
   */
  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.environments.values()).map(env => env.cleanup());
    await Promise.all(cleanupPromises);
    this.environments.clear();
  }
}

/**
 * API key management for testing
 */
export class ApiKeyManager {
  private static readonly TEST_API_KEYS: ApiKeys = {
    google: 'test-google-api-key',
    openai: 'test-openai-api-key',
    spotify: 'test-spotify-api-key',
    linear: 'test-linear-api-key',
    resend: 'test-resend-api-key'
  };

  /**
   * Generate test API keys for specific services
   */
  static generateTestKeys(services: (keyof ApiKeys)[] = []): ApiKeys {
    const keys: ApiKeys = {};

    if (services.length === 0) {
      // Return all test keys
      return { ...this.TEST_API_KEYS };
    }

    services.forEach(service => {
      keys[service] = this.TEST_API_KEYS[service];
    });

    return keys;
  }

  /**
   * Create .env file with test API keys
   */
  static async createEnvFile(envFile: string, keys: ApiKeys = {}): Promise<void> {
    const envContent = Object.entries(keys)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${this.formatEnvKey(key)}=${value}`)
      .join('\n');

    await writeFile(envFile, envContent, 'utf-8');
  }

  /**
   * Load environment variables from test .env file
   */
  static async loadTestEnv(envFile: string): Promise<Record<string, string>> {
    if (!existsSync(envFile)) {
      return {};
    }

    const content = await Bun.file(envFile).text();
    const env: Record<string, string> = {};

    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return env;
  }

  /**
   * Set environment variables for testing
   */
  static setTestEnv(keys: ApiKeys): void {
    Object.entries(keys).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[this.formatEnvKey(key)] = value;
      }
    });
  }

  /**
   * Clear test environment variables
   */
  static clearTestEnv(keys: (keyof ApiKeys)[] = []): void {
    const allKeys = keys.length > 0 ? keys : Object.keys(this.TEST_API_KEYS);

    allKeys.forEach(key => {
      delete process.env[this.formatEnvKey(key)];
    });
  }

  /**
   * Format environment variable key
   */
  private static formatEnvKey(key: string): string {
    const keyMap: Record<string, string> = {
      google: 'GOOGLE_API_KEY',
      openai: 'OPENAI_API_KEY',
      spotify: 'SPOTIFY_CLIENT_ID',
      linear: 'LINEAR_API_KEY',
      resend: 'RESEND_API_KEY'
    };

    return keyMap[key] || key.toUpperCase() + '_API_KEY';
  }
}

/**
 * Database isolation for testing
 */
export class DatabaseManager {
  private static testDatabases: Map<string, string> = new Map();

  /**
   * Create isolated test database
   */
  static async createTestDatabase(testName: string): Promise<string> {
    const dbPath = join(tmpdir(), `agenttom-test-${testName}-${Date.now()}.db`);

    this.testDatabases.set(testName, dbPath);

    // Set environment to use test database
    process.env.DATABASE_URL = `file:${dbPath}`;

    return dbPath;
  }

  /**
   * Get test database path
   */
  static getTestDatabase(testName: string): string | undefined {
    return this.testDatabases.get(testName);
  }

  /**
   * Clean up test database
   */
  static async cleanupTestDatabase(testName: string): Promise<void> {
    const dbPath = this.testDatabases.get(testName);

    if (dbPath && existsSync(dbPath)) {
      try {
        await rm(dbPath, { force: true });
      } catch (error) {
        console.warn(`Failed to cleanup test database ${testName}:`, error);
      }
    }

    this.testDatabases.delete(testName);
  }

  /**
   * Clean up all test databases
   */
  static async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.testDatabases.keys()).map(testName =>
      this.cleanupTestDatabase(testName)
    );

    await Promise.all(cleanupPromises);
    this.testDatabases.clear();
  }
}

/**
 * Complete test setup utility
 */
export class TestSetup {
  private envManager: TestEnvironmentManager;
  private apiKeyManager: typeof ApiKeyManager;
  private dbManager: typeof DatabaseManager;

  constructor() {
    this.envManager = new TestEnvironmentManager();
    this.apiKeyManager = ApiKeyManager;
    this.dbManager = DatabaseManager;
  }

  /**
   * Set up complete test environment with API keys and database
   */
  async setupTestEnvironment(
    testName: string,
    options: {
      services?: (keyof ApiKeys)[];
      withDatabase?: boolean;
    } = {}
  ): Promise<{
    env: TestEnvironment;
    keys: ApiKeys;
    cleanup: () => Promise<void>;
  }> {
    const { services = [], withDatabase = false } = options;

    // Create test environment
    const env = await this.envManager.createTestEnvironment(testName);

    // Generate and set up API keys
    const keys = this.apiKeyManager.generateTestKeys(services);
    await this.apiKeyManager.createEnvFile(env.envFile, keys);
    this.apiKeyManager.setTestEnv(keys);

    // Set up test database if requested
    if (withDatabase) {
      await this.dbManager.createTestDatabase(testName);
    }

    // Create cleanup function
    const cleanup = async () => {
      await env.cleanup();

      if (withDatabase) {
        await this.dbManager.cleanupTestDatabase(testName);
      }

      this.apiKeyManager.clearTestEnv(services);
    };

    return { env, keys, cleanup };
  }

  /**
   * Quick setup for simple tests
   */
  async quickSetup(
    testName: string,
    services: (keyof ApiKeys)[] = ['google']
  ): Promise<{ cleanup: () => Promise<void> }> {
    const { cleanup } = await this.setupTestEnvironment(testName, { services });
    return { cleanup };
  }

  /**
   * Global cleanup
   */
  async globalCleanup(): Promise<void> {
    await this.envManager.cleanupAll();
    await this.dbManager.cleanupAll();
  }
}

// Export singleton instance for easy use
export const testSetup = new TestSetup();
