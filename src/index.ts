import { app } from './app';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { sqlite } from './database';
import { env, logServiceStatus } from './config/env.config';
import { logger } from './services/common/logger.service';
import { memoryTracker, timerRegistry } from './utils/memory-management';

// Initialize memory monitoring
const MEMORY_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
logger.startup('Initializing memory monitoring');

// Run migrations
try {
  logger.migration('Running database migrations...');
  migrate(sqlite, { migrationsFolder: './src/database/migrations' });
  logger.migration('Migrations completed successfully');
} catch (error) {
  logger.warn('Migration error (this is normal if tables already exist)');
  if (error instanceof Error) {
    logger.debug('Migration error details', { message: error.message });
  } else {
    logger.debug('Migration error details', { error: String(error) });
  }
}

// Log service configuration status
logServiceStatus();

// Start server
const port = env.PORT;
logger.startup(`Server is running on port ${port}`);
logger.startup(`App URL: ${env.APP_URL}`);
logger.startup(`Environment: ${env.NODE_ENV}`);

// Log initial memory usage
memoryTracker.logMemoryUsage();

// Set up periodic memory checks
const memoryCheckId = timerRegistry.setInterval(() => {
  memoryTracker.logDetailedMemoryUsage();
}, MEMORY_CHECK_INTERVAL);

// Start HTTP server using Bun.serve when available to avoid Response interop issues
const isBunRuntime = typeof (globalThis as any).Bun !== 'undefined' && typeof (globalThis as any).Bun.serve === 'function';

let stopServer: (() => void) | null = null;

if (isBunRuntime) {
  const bunServer = (globalThis as any).Bun.serve({
    fetch: app.fetch,
    port: Number(port),
  });
  stopServer = () => bunServer.stop();
} else {
  // Dynamically import node server only when not running under Bun
  (async () => {
    const { serve } = await import('@hono/node-server');
    const nodeServer = serve({
      fetch: app.fetch,
      port: Number(port),
    });
    stopServer = () => nodeServer.close();
  })();
}

// Handle graceful shutdown
const handleShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);

  // Log final memory usage
  memoryTracker.logDetailedMemoryUsage();

  // Clear all timers
  timerRegistry.clearAll();

  // Close server
  try {
    stopServer && stopServer();
    logger.info('HTTP server closed');
    process.exit(0);
  } catch (err) {
    logger.error('Error during server shutdown');
    process.exit(1);
  }

  // Force exit after timeout (safety)
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

