import { serve } from '@hono/node-server';
import { app } from './app';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { sqlite } from './database';
import { env, logServiceStatus } from './config/env.config';
import { logger } from './services/common/logger.service';

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

serve({
  fetch: app.fetch,
  port: Number(port),
});

