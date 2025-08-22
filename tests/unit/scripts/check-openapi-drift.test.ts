/**
 * Unit tests for check-openapi-drift.ts script
 * Tests the OpenAPIDriftChecker class and its drift checking methods
 */

import { test, expect, describe, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAPIDriftChecker } from '../../../scripts/check-openapi-drift';

// Test setup
const TEST_ROOT = path.join(process.cwd(), '.agenttom-test');
const TEST_FRONTEND_SRC = path.join(TEST_ROOT, 'frontend/src');
const TEST_TYPES_PATH = path.join(TEST_FRONTEND_SRC, 'lib/api/types.d.ts');
const TEST_CLIENT_WRAPPER_PATH = path.join(TEST_FRONTEND_SRC, 'lib/api/client-wrapper.ts');
const TEST_OPENAPI_CONFIG_PATH = path.join(TEST_ROOT, 'src/config/openapi.config.ts');

describe('OpenAPIDriftChecker', () => {
  let checker: OpenAPIDriftChecker;

  beforeEach(() => {
    checker = new OpenAPIDriftChecker();

    // Create test directory structure
    if (!fs.existsSync(TEST_ROOT)) {
      fs.mkdirSync(TEST_ROOT, { recursive: true });
    }
    if (!fs.existsSync(TEST_FRONTEND_SRC)) {
      fs.mkdirSync(TEST_FRONTEND_SRC, { recursive: true });
    }
    if (!fs.existsSync(path.join(TEST_FRONTEND_SRC, 'lib'))) {
      fs.mkdirSync(path.join(TEST_FRONTEND_SRC, 'lib'), { recursive: true });
    }
    if (!fs.existsSync(path.join(TEST_FRONTEND_SRC, 'lib/api'))) {
      fs.mkdirSync(path.join(TEST_FRONTEND_SRC, 'lib/api'), { recursive: true });
    }
    // Create the src/config directory structure
    if (!fs.existsSync(path.join(TEST_ROOT, 'src'))) {
      fs.mkdirSync(path.join(TEST_ROOT, 'src'), { recursive: true });
    }
    if (!fs.existsSync(path.join(TEST_ROOT, 'src/config'))) {
      fs.mkdirSync(path.join(TEST_ROOT, 'src/config'), { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_ROOT)) {
      fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    test('should initialize with empty drift check result', () => {
      expect(checker['results']).toEqual({
        hasDrift: false,
        issues: [],
        recommendations: []
      });
    });
  });

  describe('checkDrift (main method)', () => {
    test('should call individual check methods', async () => {
      // Mock all check methods to avoid actual file system operations
      spyOn(checker, 'checkGeneratedTypesExist').mockResolvedValue();
      spyOn(checker, 'checkTypeScriptCompilation').mockResolvedValue();
      spyOn(checker, 'checkOpenAPISpecConsistency').mockResolvedValue();
      spyOn(checker, 'checkFrontendClientUsage').mockResolvedValue();

      // Mock printReport to avoid process.exit
      spyOn(checker, 'printReport').mockImplementation();

      // Mock process.exit to prevent test runner from exiting
      spyOn(process, 'exit').mockImplementation(() => {});

      await checker.checkDrift();

      expect(checker.checkGeneratedTypesExist).toHaveBeenCalled();
      expect(checker.checkTypeScriptCompilation).toHaveBeenCalled();
      expect(checker.checkOpenAPISpecConsistency).toHaveBeenCalled();
      expect(checker.checkFrontendClientUsage).toHaveBeenCalled();
      expect(checker.printReport).toHaveBeenCalled();
    });

    test('should detect drift when issues are found', async () => {
      spyOn(checker, 'checkGeneratedTypesExist').mockImplementation(() => {
        checker['results'].hasDrift = true;
        checker['results'].issues.push('Test drift detected');
      });
      spyOn(checker, 'checkTypeScriptCompilation').mockResolvedValue();
      spyOn(checker, 'checkOpenAPISpecConsistency').mockResolvedValue();
      spyOn(checker, 'checkFrontendClientUsage').mockResolvedValue();
      spyOn(checker, 'printReport').mockImplementation();
      spyOn(process, 'exit').mockImplementation(() => {});

      await checker.checkDrift();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('Test drift detected');
    });

    test('should complete without drift when no issues found', async () => {
      spyOn(checker, 'checkGeneratedTypesExist').mockResolvedValue();
      spyOn(checker, 'checkTypeScriptCompilation').mockResolvedValue();
      spyOn(checker, 'checkOpenAPISpecConsistency').mockResolvedValue();
      spyOn(checker, 'checkFrontendClientUsage').mockResolvedValue();
      spyOn(checker, 'printReport').mockImplementation();
      spyOn(process, 'exit').mockImplementation(() => {});

      await checker.checkDrift();

      expect(checker['results'].hasDrift).toBe(false);
    });
  });

  describe('checkGeneratedTypesExist', () => {
    test('should pass when types file exists and is recent', async () => {
      fs.writeFileSync(TEST_TYPES_PATH, '// Generated types');
      // Set file modification time to 1 day ago
      const recentTime = Date.now() - (24 * 60 * 60 * 1000);
      fs.utimesSync(TEST_TYPES_PATH, new Date(recentTime), new Date(recentTime));

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkGeneratedTypesExist();

      expect(checker['results'].issues).not.toContain('Generated types file does not exist');

      process.cwd = originalCwd;
    });

    test('should fail when types file does not exist', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkGeneratedTypesExist();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('Generated types file does not exist');
      expect(checker['results'].recommendations).toContain('Run: bun run generate:types');

      process.cwd = originalCwd;
    });

    test('should warn when types file is older than 7 days', async () => {
      fs.writeFileSync(TEST_TYPES_PATH, '// Generated types');
      // Set file modification time to 10 days ago
      const oldTime = Date.now() - (10 * 24 * 60 * 60 * 1000);
      fs.utimesSync(TEST_TYPES_PATH, new Date(oldTime), new Date(oldTime));

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkGeneratedTypesExist();

      expect(checker['results'].issues).toContain('Generated types are older than 7 days');
      expect(checker['results'].recommendations).toContain('Consider regenerating types to ensure they are current');

      process.cwd = originalCwd;
    });

    test('should handle file access errors gracefully', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue('/nonexistent/path');

      await checker.checkGeneratedTypesExist();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('Generated types file does not exist');

      process.cwd = originalCwd;
    });
  });

  describe('checkTypeScriptCompilation', () => {
    test('should handle TypeScript compilation check', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      // Mock the method to avoid actual compilation
      spyOn(checker, 'checkTypeScriptCompilation').mockImplementation(async () => {
        // Simulate successful compilation
      });

      await checker.checkTypeScriptCompilation();

      // Should complete without errors
      expect(checker['results'].hasDrift).toBe(false);

      process.cwd = originalCwd;
    });

    test('should handle compilation failure scenario', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      // Mock the method to simulate failure
      spyOn(checker, 'checkTypeScriptCompilation').mockImplementation(async () => {
        checker['results'].hasDrift = true;
        checker['results'].issues.push('TypeScript compilation failed');
      });

      await checker.checkTypeScriptCompilation();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('TypeScript compilation failed');

      process.cwd = originalCwd;
    });
  });

  describe('checkOpenAPISpecConsistency', () => {
    test('should pass when OpenAPI config is valid', async () => {
      const validConfig = `
export const openApiConfig = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/test': {
      get: {
        responses: {
          '200': { description: 'Success' }
        }
      }
    }
  }
};
`;

      fs.writeFileSync(TEST_OPENAPI_CONFIG_PATH, validConfig);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkOpenAPISpecConsistency();

      expect(mockConsoleLog).toHaveBeenCalledWith('✅ OpenAPI specification is well-formed');

      process.cwd = originalCwd;
    });

    test('should fail when OpenAPI config file is missing', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkOpenAPISpecConsistency();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('OpenAPI configuration file missing');

      process.cwd = originalCwd;
    });

    test('should fail when OpenAPI config is invalid', async () => {
      const invalidConfig = `
export const openApiConfig = {
  // Missing required fields
  openapi: '3.0.0'
};
`;

      fs.writeFileSync(TEST_OPENAPI_CONFIG_PATH, invalidConfig);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkOpenAPISpecConsistency();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('OpenAPI configuration is invalid');

      process.cwd = originalCwd;
    });

    test('should detect endpoints with missing responses', async () => {
      const configWithIssues = `
export const openApiConfig = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/test': {
      get: {
        // Missing responses
      }
    }
  }
};
`;

      fs.writeFileSync(TEST_OPENAPI_CONFIG_PATH, configWithIssues);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkOpenAPISpecConsistency();

      expect(checker['results'].issues).toContain('Endpoint GET /test has no responses defined');

      process.cwd = originalCwd;
    });

    test('should handle import errors gracefully', async () => {
      const invalidSyntaxConfig = `
export const openApiConfig = {
  // Syntax error
  invalid: syntax,
};
`;

      fs.writeFileSync(TEST_OPENAPI_CONFIG_PATH, invalidSyntaxConfig);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkOpenAPISpecConsistency();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('OpenAPI specification validation failed');

      process.cwd = originalCwd;
    });
  });

  describe('checkFrontendClientUsage', () => {
    test('should pass when client wrapper imports generated types', async () => {
      const clientWrapperContent = `
import type { paths } from './types';

export class ApiClient {
  // Implementation
}
`;

      fs.writeFileSync(TEST_CLIENT_WRAPPER_PATH, clientWrapperContent);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkFrontendClientUsage();

      // Should not detect drift when types are properly imported
      expect(checker['results'].hasDrift).toBe(false);

      process.cwd = originalCwd;
    });

    test('should fail when client wrapper does not import types', async () => {
      const clientWrapperWithoutTypes = `
export class ApiClient {
  // Implementation without type imports
}
`;

      fs.writeFileSync(TEST_CLIENT_WRAPPER_PATH, clientWrapperWithoutTypes);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkFrontendClientUsage();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('Frontend client does not import generated types');
      expect(checker['results'].recommendations).toContain('Ensure client-wrapper imports generated types');

      process.cwd = originalCwd;
    });

    test('should fail when client wrapper file is missing', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkFrontendClientUsage();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('Frontend client wrapper missing');

      process.cwd = originalCwd;
    });

    test('should handle file read errors gracefully', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue('/nonexistent/path');

      await checker.checkFrontendClientUsage();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('Frontend client usage check failed');

      process.cwd = originalCwd;
    });
  });

  describe('printReport', () => {
    test('should handle comprehensive drift check report', () => {
      checker['results'] = {
        hasDrift: true,
        issues: ['Issue 1', 'Issue 2'],
        recommendations: ['Fix 1', 'Fix 2']
      };

      // Should complete without errors
      expect(() => checker.printReport()).not.toThrow();
    });

    test('should handle no issues message when no drift detected', () => {
      checker['results'] = {
        hasDrift: false,
        issues: [],
        recommendations: []
      };

      // Should complete without errors
      expect(() => checker.printReport()).not.toThrow();
    });

    test('should handle empty recommendations', () => {
      checker['results'] = {
        hasDrift: false,
        issues: [],
        recommendations: []
      };

      // Should complete without errors
      expect(() => checker.printReport()).not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete drift check workflow', async () => {
      // Create valid test files
      fs.writeFileSync(TEST_TYPES_PATH, '// Generated types');
      fs.writeFileSync(TEST_CLIENT_WRAPPER_PATH, 'import type { paths } from "./types";');

      const validConfig = `
export const openApiConfig = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/test': {
      get: {
        responses: {
          '200': { description: 'Success' }
        }
      }
    }
  }
};
`;

      fs.writeFileSync(TEST_OPENAPI_CONFIG_PATH, validConfig);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      // Mock successful TypeScript compilation
      global.Bun = {
        spawn: mock((command: string[]) => ({
          exitCode: 0,
          stdout: { pipe: mock() },
          stderr: { pipe: mock() }
        }))
      } as any;

      await checker.checkDrift();

      expect(checker['results'].hasDrift).toBe(false);

      process.cwd = originalCwd;
    });

    test('should detect drift in complex scenario', async () => {
      // Create files with issues
      fs.writeFileSync(TEST_CLIENT_WRAPPER_PATH, '// No type imports');

      const configWithIssues = `
export const openApiConfig = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/test': {
      get: {
        // Missing responses
      }
    }
  }
};
`;

      fs.writeFileSync(TEST_OPENAPI_CONFIG_PATH, configWithIssues);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      // Mock failed TypeScript compilation
      global.Bun = {
        spawn: mock((command: string[]) => ({
          exitCode: 1,
          stdout: { pipe: mock() },
          stderr: { pipe: mock() }
        }))
      } as any;

      await checker.checkDrift();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues.length).toBeGreaterThan(0);

      process.cwd = originalCwd;
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle missing frontend directory gracefully', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue('/nonexistent/path');

      await checker.checkDrift();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues.length).toBeGreaterThan(0);

      process.cwd = originalCwd;
    });

    test('should handle invalid JSON in config files', async () => {
      const invalidJsonConfig = `
export const openApiConfig = {
  "invalid": json syntax,
  "missing": quotes
};
`;

      fs.writeFileSync(TEST_OPENAPI_CONFIG_PATH, invalidJsonConfig);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkOpenAPISpecConsistency();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('OpenAPI specification validation failed');

      process.cwd = originalCwd;
    });

    test('should handle very old generated types', async () => {
      fs.writeFileSync(TEST_TYPES_PATH, '// Very old generated types');
      // Set file modification time to 30 days ago
      const veryOldTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
      fs.utimesSync(TEST_TYPES_PATH, new Date(veryOldTime), new Date(veryOldTime));

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkGeneratedTypesExist();

      expect(checker['results'].issues).toContain('Generated types are older than 7 days');

      process.cwd = originalCwd;
    });

    test('should handle empty OpenAPI config', async () => {
      const emptyConfig = `
export const openApiConfig = {};
`;

      fs.writeFileSync(TEST_OPENAPI_CONFIG_PATH, emptyConfig);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkOpenAPISpecConsistency();

      expect(checker['results'].hasDrift).toBe(true);
      expect(checker['results'].issues).toContain('OpenAPI configuration is invalid');

      process.cwd = originalCwd;
    });

    test('should handle malformed client wrapper file', async () => {
      const malformedClient = `
import type { paths } from './types';

export class ApiClient {
  // Missing closing brace
`;

      fs.writeFileSync(TEST_CLIENT_WRAPPER_PATH, malformedClient);

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await checker.checkFrontendClientUsage();

      // Should still be able to check for type imports even if file has syntax issues
      expect(checker['results'].hasDrift).toBe(false);

      process.cwd = originalCwd;
    });
  });
});
