import { serve } from '@hono/node-server';
import { app } from './app';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { sqlite } from './database';

// Run migrations
try {
  console.log('Running database migrations...');
  migrate(sqlite, { migrationsFolder: './src/database/migrations' });
  console.log('Migrations completed successfully');
} catch (error) {
  console.log('Migration error (this is normal if tables already exist):');
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log(String(error));
  }
}

// Start server
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port: Number(port),
});

