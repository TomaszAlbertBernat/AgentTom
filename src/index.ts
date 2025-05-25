import { serve } from '@hono/node-server';
import { app } from './app';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { sqlite } from './database';
import { env, logServiceStatus } from './config/env.config';

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

// Log service configuration status
logServiceStatus();

// Start server
const port = env.PORT;
console.log(`🚀 Server is running on port ${port}`);
console.log(`🌐 App URL: ${env.APP_URL}`);
console.log(`🔧 Environment: ${env.NODE_ENV}`);

serve({
  fetch: app.fetch,
  port: Number(port),
});

