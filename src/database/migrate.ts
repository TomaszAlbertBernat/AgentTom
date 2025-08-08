import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { sqlite } from './index';
import { logger } from '../services/common/logger.service';

// Single source of truth: use drizzle migrator against './src/database/migrations'
await migrate(sqlite, { migrationsFolder: './src/database/migrations' });
logger.migration('Migrations completed successfully');
