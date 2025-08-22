/**
 * Mock server utilities for external services
 * Provides isolated testing of integrations without external dependencies
 */

import { Server } from 'bun';

export interface MockServerConfig {
  port?: number;
  host?: string;
  services?: string[];
}

export interface MockResponse {
  status: number;
  headers?: Record<string, string>;
  body?: any;
}

export interface MockEndpoint {
  path: string;
  method?: string;
  response: MockResponse | ((req: Request) => MockResponse | Promise<MockResponse>);
  delay?: number;
}

/**
 * Mock server for external services
 */
export class MockServer {
  private server: Server | null = null;
  private endpoints: Map<string, MockEndpoint> = new Map();
  private config: Required<MockServerConfig>;

  constructor(config: MockServerConfig = {}) {
    this.config = {
      port: config.port || 0, // Let system assign port
      host: config.host || 'localhost',
      services: config.services || []
    };
  }

  /**
   * Add mock endpoint
   */
  addEndpoint(endpoint: MockEndpoint): void {
    const key = `${endpoint.method || 'GET'}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }

  /**
   * Add multiple endpoints
   */
  addEndpoints(endpoints: MockEndpoint[]): void {
    endpoints.forEach(endpoint => this.addEndpoint(endpoint));
  }

  /**
   * Start the mock server
   */
  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.server = Bun.serve({
          port: this.config.port,
          hostname: this.config.host,

          async fetch(req: Request): Promise<Response> {
            const url = new URL(req.url);
            const method = req.method;
            const key = `${method}:${url.pathname}`;

            const endpoint = this.endpoints.get(key);
            if (!endpoint) {
              return new Response(JSON.stringify({ error: 'Mock endpoint not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
              });
            }

            // Add delay if specified
            if (endpoint.delay) {
              await new Promise(resolve => setTimeout(resolve, endpoint.delay));
            }

            // Get response
            const response = typeof endpoint.response === 'function'
              ? await endpoint.response(req)
              : endpoint.response;

            return new Response(
              typeof response.body === 'object' ? JSON.stringify(response.body) : response.body,
              {
                status: response.status,
                headers: {
                  'Content-Type': 'application/json',
                  ...response.headers
                }
              }
            );
          }
        });

        const address = `http://${this.config.host}:${this.server.port}`;
        console.log(`🚀 Mock server started at ${address}`);
        resolve(address);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
      console.log('🛑 Mock server stopped');
    }
  }

  /**
   * Get server URL
   */
  get url(): string | null {
    return this.server ? `http://${this.config.host}:${this.server.port}` : null;
  }

  /**
   * Get server port
   */
  get port(): number | null {
    return this.server?.port || null;
  }

  /**
   * Clear all endpoints
   */
  clearEndpoints(): void {
    this.endpoints.clear();
  }
}

/**
 * Pre-configured mock services
 */
export class MockServices {
  /**
   * Create Google AI Studio mock server
   */
  static createGoogleAIMock(config: { apiKey?: string } = {}): MockServer {
    const server = new MockServer();

    server.addEndpoints([
      {
        path: '/v1beta/models/gemini-2.5-flash:generateContent',
        method: 'POST',
        response: (req: Request) => {
          // Verify API key if provided
          if (config.apiKey) {
            const authHeader = req.headers.get('Authorization');
            if (!authHeader || !authHeader.includes(config.apiKey)) {
              return {
                status: 401,
                body: { error: 'Invalid API key' }
              };
            }
          }

          return {
            status: 200,
            body: {
              candidates: [{
                content: {
                  parts: [{
                    text: 'This is a mock response from Google Gemini AI.'
                  }]
                }
              }],
              usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 20,
                totalTokenCount: 30
              }
            }
          };
        }
      },
      {
        path: '/v1beta/models/gemini-2.5-flash:streamGenerateContent',
        method: 'POST',
        response: {
          status: 200,
          body: 'data: {"candidates": [{"content": {"parts": [{"text": "Mock streaming response"}]}}]}\n\n'
        }
      }
    ]);

    return server;
  }

  /**
   * Create OpenAI API mock server
   */
  static createOpenAI(config: { apiKey?: string } = {}): MockServer {
    const server = new MockServer();

    server.addEndpoints([
      {
        path: '/v1/chat/completions',
        method: 'POST',
        response: (req: Request) => {
          // Verify API key if provided
          if (config.apiKey) {
            const authHeader = req.headers.get('Authorization');
            if (!authHeader || !authHeader.includes(config.apiKey)) {
              return {
                status: 401,
                body: { error: 'Invalid API key' }
              };
            }
          }

          return {
            status: 200,
            body: {
              id: 'chatcmpl-mock',
              object: 'chat.completion',
              created: Date.now(),
              model: 'gpt-4',
              choices: [{
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'This is a mock response from OpenAI.'
                },
                finish_reason: 'stop'
              }],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30
              }
            }
          };
        }
      }
    ]);

    return server;
  }

  /**
   * Create Spotify API mock server
   */
  static createSpotifyMock(): MockServer {
    const server = new MockServer();

    server.addEndpoints([
      {
        path: '/v1/me/player/play',
        method: 'PUT',
        response: { status: 204 }
      },
      {
        path: '/v1/me/player/pause',
        method: 'PUT',
        response: { status: 204 }
      },
      {
        path: '/v1/me/player/next',
        method: 'POST',
        response: { status: 204 }
      },
      {
        path: '/v1/me/player/previous',
        method: 'POST',
        response: { status: 204 }
      },
      {
        path: '/v1/search',
        method: 'GET',
        response: {
          status: 200,
          body: {
            tracks: {
              items: [
                {
                  id: 'mock-track-1',
                  name: 'Mock Song',
                  artists: [{ name: 'Mock Artist' }],
                  album: { name: 'Mock Album' },
                  duration_ms: 180000
                }
              ]
            }
          }
        }
      }
    ]);

    return server;
  }

  /**
   * Create generic webhook mock server
   */
  static createWebhookMock(): MockServer {
    const server = new MockServer();
    const receivedWebhooks: any[] = [];

    server.addEndpoint({
      path: '/webhook',
      method: 'POST',
      response: (req: Request) => {
        receivedWebhooks.push({
          timestamp: new Date(),
          headers: Object.fromEntries(req.headers.entries()),
          body: req.body
        });

        return {
          status: 200,
          body: { status: 'received', timestamp: new Date().toISOString() }
        };
      }
    });

    // Add method to get received webhooks
    (server as any).getReceivedWebhooks = () => receivedWebhooks;

    return server;
  }

  /**
   * Create mock server with multiple services
   */
  static createMultiServiceMock(services: string[] = []): MockServer {
    const server = new MockServer();

    if (services.includes('google') || services.length === 0) {
      server.addEndpoints(MockServices.createGoogleAIMock().endpoints);
    }

    if (services.includes('openai')) {
      server.addEndpoints(MockServices.createOpenAIMock().endpoints);
    }

    if (services.includes('spotify')) {
      server.addEndpoints(MockServices.createSpotifyMock().endpoints);
    }

    return server;
  }
}

/**
 * Mock service manager for easy setup and teardown
 */
export class MockServiceManager {
  private servers: Map<string, MockServer> = new Map();

  /**
   * Start a mock service
   */
  async startService(name: string, server: MockServer): Promise<string> {
    const url = await server.start();
    this.servers.set(name, server);
    return url;
  }

  /**
   * Stop a mock service
   */
  async stopService(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (server) {
      await server.stop();
      this.servers.delete(name);
    }
  }

  /**
   * Stop all mock services
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(name =>
      this.stopService(name)
    );
    await Promise.all(stopPromises);
  }

  /**
   * Get service URL
   */
  getServiceUrl(name: string): string | null {
    const server = this.servers.get(name);
    return server?.url || null;
  }

  /**
   * Set environment variables for mock services
   */
  setServiceEnvs(): void {
    this.servers.forEach((server, name) => {
      if (server.url) {
        const envKey = `${name.toUpperCase()}_URL`;
        process.env[envKey] = server.url;
      }
    });
  }

  /**
   * Clear service environment variables
   */
  clearServiceEnvs(): void {
    this.servers.forEach((_, name) => {
      const envKey = `${name.toUpperCase()}_URL`;
      delete process.env[envKey];
    });
  }
}

// Export singleton instance
export const mockServiceManager = new MockServiceManager();
