import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { sqlite } from './index';
import { logger } from '../services/common/logger.service';
import { isLocalMode } from '../config/local-user.config';

// Single source of truth: use drizzle migrator against './src/database/migrations'
try {
  await migrate(sqlite, { migrationsFolder: './src/database/migrations' });

  if (isLocalMode()) {
    logger.migration('Local mode detected - running with optional user authentication');
    logger.migration('User sessions will be handled locally without database persistence');
  } else {
    logger.migration('Multi-user mode detected - full authentication system enabled');
  }

  logger.migration('Migrations completed successfully');
} catch (error) {
  logger.error('Migration failed:', error as Error);

  // In local mode, we can be more permissive about migration failures
  if (isLocalMode()) {
    logger.warn('Local mode: Continuing despite migration warnings - user auth is optional');
  } else {
    throw error;
  }
}
