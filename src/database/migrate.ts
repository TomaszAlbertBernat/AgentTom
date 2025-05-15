import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sqlite } from './index';

// Run migrations
migrate(sqlite, { migrationsFolder: './src/database/migrations' });

console.log('Migrations completed successfully');
