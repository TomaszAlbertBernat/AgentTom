/**
 * Unit tests for Logger Service
 * Tests the core logging functionality, log levels, and component loggers
 */

import { test, expect, describe, beforeEach } from 'bun:test';
import { LogLevel, createLogger } from '../../../src/services/common/logger.service';
import { setupTestEnvironment, createMockLogger, testHelpers } from '../../helpers/test-setup';

// Setup test environment
setupTestEnvironment();

describe('Logger Service', () => {
  describe('LogLevel enum', () => {
    test('should have correct log levels in order', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
      expect(LogLevel.TRACE).toBe(4);
    });

    test('should have all required log levels', () => {
      expect(LogLevel).toHaveProperty('ERROR');
      expect(LogLevel).toHaveProperty('WARN');
      expect(LogLevel).toHaveProperty('INFO');
      expect(LogLevel).toHaveProperty('DEBUG');
      expect(LogLevel).toHaveProperty('TRACE');
    });
  });

  describe('Logger creation', () => {
    test('should create logger with service name', () => {
      const logger = createLogger('TestService');
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.trace).toBe('function');
      expect(typeof logger.startup).toBe('function');
      expect(typeof logger.database).toBe('function');
      expect(typeof logger.api).toBe('function');
      expect(typeof logger.tool).toBe('function');
      expect(typeof logger.migration).toBe('function');
      expect(typeof logger.child).toBe('function');
    });

    test('should create multiple loggers with different names', () => {
      const logger1 = createLogger('Service1');
      const logger2 = createLogger('Service2');
      
      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('Mock Logger functionality', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
      mockLogger = createMockLogger();
    });

    test('should capture error logs with error objects', () => {
      const testError = new Error('Test error');
      mockLogger.error('Something went wrong', testError, { context: 'test' });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('ERROR');
      expect(logEntry.message).toBe('Something went wrong');
      expect(logEntry.data.error).toBe(testError);
      expect(logEntry.data.context).toBe('test');
    });

    test('should capture info logs', () => {
      mockLogger.info('Information message', { userId: '123' });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('Information message');
      expect(logEntry.data.userId).toBe('123');
    });

    test('should capture warn logs', () => {
      mockLogger.warn('Warning message', { warning: true });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('WARN');
      expect(logEntry.message).toBe('Warning message');
      expect(logEntry.data.warning).toBe(true);
    });

    test('should capture debug logs', () => {
      mockLogger.debug('Debug information', { debugLevel: 'verbose' });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('DEBUG');
      expect(logEntry.message).toBe('Debug information');
      expect(logEntry.data.debugLevel).toBe('verbose');
    });

    test('should capture trace logs', () => {
      mockLogger.trace('Trace message', { traceId: 'abc123' });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('TRACE');
      expect(logEntry.message).toBe('Trace message');
      expect(logEntry.data.traceId).toBe('abc123');
    });
  });

  describe('Convenience logging methods', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
      mockLogger = createMockLogger();
    });

    test('should log startup messages with emoji', () => {
      mockLogger.startup('Application started', { port: 8080 });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('🚀 Application started');
      expect(logEntry.data.port).toBe(8080);
    });

    test('should log database messages with emoji', () => {
      mockLogger.database('Migration completed', { tables: 5 });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('🗄️ Migration completed');
      expect(logEntry.data.tables).toBe(5);
    });

    test('should log API messages with emoji', () => {
      mockLogger.api('Request processed', { method: 'GET', path: '/health' });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('🌐 Request processed');
      expect(logEntry.data.method).toBe('GET');
      expect(logEntry.data.path).toBe('/health');
    });

    test('should log tool messages with emoji', () => {
      mockLogger.tool('Tool executed', { toolName: 'search', duration: 123 });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('🔧 Tool executed');
      expect(logEntry.data.toolName).toBe('search');
      expect(logEntry.data.duration).toBe(123);
    });

    test('should log migration messages with emoji', () => {
      mockLogger.migration('Schema updated', { version: '1.2.3' });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('📦 Schema updated');
      expect(logEntry.data.version).toBe('1.2.3');
    });
  });

  describe('Component Logger', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;
    let componentLogger: ReturnType<typeof createMockLogger>['child'];

    beforeEach(() => {
      mockLogger = createMockLogger();
      componentLogger = mockLogger.child('TEST_COMPONENT');
    });

    test('should create component logger', () => {
      expect(componentLogger).toBeDefined();
      expect(typeof componentLogger.info).toBe('function');
      expect(typeof componentLogger.error).toBe('function');
    });

    test('should include component name in logs', () => {
      componentLogger.info('Component message', { action: 'test' });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('Component message');
      expect(logEntry.data.component).toBe('TEST_COMPONENT');
      expect(logEntry.data.action).toBe('test');
    });

    test('should handle component error logs', () => {
      const testError = new Error('Component error');
      componentLogger.error('Component failed', testError, { retries: 3 });

      testHelpers.assertArrayLength(mockLogger.logs, 1);
      
      const logEntry = mockLogger.logs[0];
      expect(logEntry.level).toBe('ERROR');
      expect(logEntry.message).toBe('Component failed');
      expect(logEntry.data.component).toBe('TEST_COMPONENT');
      expect(logEntry.data.error).toBe(testError);
      expect(logEntry.data.retries).toBe(3);
    });
  });

  describe('Test helpers validation', () => {
    test('should validate array length assertion', () => {
      const testArray = [1, 2, 3];
      
      // Should not throw for correct length
      testHelpers.assertArrayLength(testArray, 3);
      
      // Should throw for incorrect length
      expect(() => testHelpers.assertArrayLength(testArray, 2)).toThrow();
    });

    test('should validate object properties assertion', () => {
      const testObject = { name: 'test', value: 123, active: true };
      
      // Should not throw for existing properties
      testHelpers.assertHasProperties(testObject, ['name', 'value']);
      
      // Should throw for missing properties
      expect(() => testHelpers.assertHasProperties(testObject, ['missing'])).toThrow();
    });

    test('should validate log pattern assertion', () => {
      const mockLogs = [
        { level: 'INFO', message: 'Test message' },
        { level: 'ERROR', message: 'Error occurred' }
      ];
      
      // Should not throw for existing pattern
      testHelpers.assertCalledWith(mockLogs, 'INFO', 'Test message');
      testHelpers.assertCalledWith(mockLogs, 'ERROR', /Error/);
      
      // Should throw for non-existing pattern
      expect(() => testHelpers.assertCalledWith(mockLogs, 'WARN', 'Missing')).toThrow();
    });
  });

  describe('Logger functionality', () => {
    let logger: ReturnType<typeof createLogger>;

    beforeEach(() => {
      // Set test log level to capture all logs
      process.env.LOG_LEVEL = 'TRACE';
      logger = createLogger('TestService');
    });

    test('should not throw when logging various data types', () => {
      // Test that logger methods don't throw errors
      expect(() => logger.error('Error message')).not.toThrow();
      expect(() => logger.warn('Warning message')).not.toThrow();
      expect(() => logger.info('Info message')).not.toThrow();
      expect(() => logger.debug('Debug message')).not.toThrow();
      expect(() => logger.trace('Trace message')).not.toThrow();
    });

    test('should handle error objects', () => {
      const testError = new Error('Test error');
      expect(() => logger.error('Something went wrong', testError)).not.toThrow();
    });

    test('should handle additional data', () => {
      const data = { userId: '123', action: 'test' };
      expect(() => logger.info('User action', data)).not.toThrow();
    });

    test('should handle convenience methods', () => {
      expect(() => logger.startup('Application started')).not.toThrow();
      expect(() => logger.database('Migration completed')).not.toThrow();
      expect(() => logger.api('Request processed')).not.toThrow();
      expect(() => logger.tool('Tool executed')).not.toThrow();
      expect(() => logger.migration('Schema updated')).not.toThrow();
    });

    test('should handle component logger methods', () => {
      const componentLogger = logger.child('TEST_COMPONENT');
      
      expect(() => componentLogger.error('Component error')).not.toThrow();
      expect(() => componentLogger.warn('Component warning')).not.toThrow();
      expect(() => componentLogger.info('Component info')).not.toThrow();
      expect(() => componentLogger.debug('Component debug')).not.toThrow();
      expect(() => componentLogger.trace('Component trace')).not.toThrow();
    });
  });

  describe('Environment handling', () => {
    test('should handle different LOG_LEVEL values', () => {
      const testLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
      
      testLevels.forEach(level => {
        process.env.LOG_LEVEL = level;
        expect(() => createLogger('TestService')).not.toThrow();
      });
    });

    test('should handle invalid LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'INVALID';
      expect(() => createLogger('TestService')).not.toThrow();
    });

    test('should handle missing LOG_LEVEL', () => {
      delete process.env.LOG_LEVEL;
      expect(() => createLogger('TestService')).not.toThrow();
    });
  });
}); 