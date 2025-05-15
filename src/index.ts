import { serve } from '@hono/node-server';
import { app } from './app';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sqlite } from './database';

// Run migrations
migrate(sqlite, { migrationsFolder: './src/database/migrations' });

// Start server
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port: Number(port),
});

