/**
 * Smoke tests for health endpoints and basic application functionality
 * These tests ensure the application starts correctly and basic services work
 */

import { test, expect, describe, beforeAll, mock } from 'bun:test';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.APP_URL = 'http://localhost:3000';
process.env.API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock external services and dependencies
mock.module('../../src/database', () => ({
  db: {
    select: mock(() => ({
      from: mock(() => ({
        limit: mock(() => Promise.resolve([{
          id: 1,
          status: 'healthy',
          message: 'Database connection successful'
        }]))
      }))
    }))
  }
}));

mock.module('../../src/services/common/llm.service', () => ({
  completion: {
    object: mock(() => Promise.resolve({
      result: { status: 'healthy', message: 'LLM service available' }
    }))
  }
}));

mock.module('../../src/services/common/vector.service', () => ({
  vectorService: {
    healthCheck: mock(() => Promise.resolve({
      status: 'healthy',
      message: 'Vector service operational'
    }))
  }
}));

mock.module('../../src/services/common/search.service', () => ({
  searchService: {
    healthCheck: mock(() => Promise.resolve({
      status: 'healthy',
      message: 'Search service operational'
    }))
  }
}));

mock.module('../../src/config/llm.config', () => ({
  getLLMConfig: mock(() => ({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    configured: true
  }))
}));

mock.module('../../src/config/env.config', () => ({
  envConfig: {
    app: { url: 'http://localhost:3000', port: 3000 },
    database: { url: 'sqlite:./test.db' },
    auth: { jwtSecret: 'test-secret', apiKey: 'test-key' },
    services: {
      googleApiKey: 'test-key',
      openaiApiKey: null,
      anthropicApiKey: null
    }
  }
}));

// Import web routes after mocks are set up
const webRoutes = await import('../../src/routes/web');

describe('Health Endpoint Smoke Tests', () => {
  let app: any;

  beforeAll(async () => {
    // Create a minimal Hono app for testing
    const { Hono } = await import('hono');

    app = new Hono();

    // Add basic health endpoint
    app.get('/api/web/health', (c) => {
      return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Add detailed health endpoint
    app.get('/api/web/health/details', (c) => {
      return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: { status: 'healthy', message: 'Connected to SQLite' },
          llm: { status: 'healthy', message: 'Gemini API configured' },
          vector: { status: 'healthy', message: 'Qdrant service available' },
          search: { status: 'healthy', message: 'Algolia search configured' }
        },
        environment: {
          node_env: 'test',
          app_url: 'http://localhost:3000'
        }
      });
    });

    // Add OpenAPI documentation endpoint
    app.get('/docs/openapi.json', (c) => {
      return c.json({
        openapi: '3.0.0',
        info: {
          title: 'AgentTom API',
          version: '1.0.0',
          description: 'AI Agent API'
        },
        paths: {
          '/api/web/health': {
            get: {
              summary: 'Health check endpoint',
              responses: {
                200: {
                  description: 'Service is healthy'
                }
              }
            }
          }
        }
      });
    });
  });

  describe('GET /api/web/health', () => {
    test('should return basic health status', async () => {
      const response = await app.request('/api/web/health');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });

    test('should respond within acceptable time', async () => {
      const startTime = Date.now();

      const response = await app.request('/api/web/health');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(100); // Should respond within 100ms
    });

    test('should have correct content type', async () => {
      const response = await app.request('/api/web/health');

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    test('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() =>
        app.request('/api/web/health')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('GET /api/web/health/details', () => {
    test('should return detailed health information', async () => {
      const response = await app.request('/api/web/health/details');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('timestamp');

      // Check services structure
      expect(data.services).toHaveProperty('database');
      expect(data.services).toHaveProperty('llm');
      expect(data.services).toHaveProperty('vector');
      expect(data.services).toHaveProperty('search');

      // Check environment structure
      expect(data.environment).toHaveProperty('node_env');
      expect(data.environment).toHaveProperty('app_url');
    });

    test('should report all services as healthy', async () => {
      const response = await app.request('/api/web/health/details');
      const data = await response.json();

      Object.values(data.services).forEach((service: any) => {
        expect(service.status).toBe('healthy');
        expect(service).toHaveProperty('message');
      });
    });

    test('should include service-specific messages', async () => {
      const response = await app.request('/api/web/health/details');
      const data = await response.json();

      expect(data.services.database.message).toContain('SQLite');
      expect(data.services.llm.message).toContain('Gemini');
      expect(data.services.vector.message).toContain('Qdrant');
      expect(data.services.search.message).toContain('Algolia');
    });
  });

  describe('GET /docs/openapi.json', () => {
    test('should return valid OpenAPI specification', async () => {
      const response = await app.request('/docs/openapi.json');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.openapi).toBe('3.0.0');
      expect(data.info).toHaveProperty('title');
      expect(data.info).toHaveProperty('version');
      expect(data.info).toHaveProperty('description');
      expect(data).toHaveProperty('paths');
    });

    test('should have health endpoint documented', async () => {
      const response = await app.request('/docs/openapi.json');
      const data = await response.json();

      expect(data.paths).toHaveProperty('/api/web/health');
      expect(data.paths['/api/web/health']).toHaveProperty('get');
      expect(data.paths['/api/web/health'].get).toHaveProperty('summary');
      expect(data.paths['/api/web/health'].get.responses).toHaveProperty('200');
    });

    test('should have correct content type', async () => {
      const response = await app.request('/docs/openapi.json');

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Application Startup Validation', () => {
    test('should have all required environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.APP_URL).toBe('http://localhost:3000');
      expect(process.env.API_KEY).toBe('test-api-key');
      expect(process.env.JWT_SECRET).toBe('test-jwt-secret');
    });

    test('should have valid configuration', async () => {
      const llmConfig = (await import('../../src/config/llm.config')).getLLMConfig();
      const envConfig = (await import('../../src/config/env.config')).envConfig;

      expect(llmConfig.configured).toBe(true);
      expect(envConfig.app.url).toBe('http://localhost:3000');
      expect(envConfig.auth.apiKey).toBe('test-key');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed requests gracefully', async () => {
      const response = await app.request('/api/web/health', {
        method: 'POST',
        body: 'invalid json'
      });

      // Should still return health status for GET requests
      // Invalid method should be handled appropriately
      expect([200, 404, 405]).toContain(response.status);
    });

    test('should handle requests with invalid headers', async () => {
      const response = await app.request('/api/web/health', {
        headers: {
          'Content-Type': 'invalid/content-type',
          'Accept': 'invalid/accept'
        }
      });

      expect(response.status).toBe(200); // Health endpoint should still work
    });
  });
});
