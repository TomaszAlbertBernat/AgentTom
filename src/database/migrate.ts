import fs from 'node:fs/promises';
import path from 'node:path';
import { client } from './index';

async function runMigrations() {
  const migrationsFolder = './src/database/migrations';
  
  try {
    // Create migrations table if it doesn't exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS _drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of applied migrations
    const appliedMigrations = await client.execute(
      `SELECT name FROM _drizzle_migrations ORDER BY id ASC`
    );
    
    const appliedMigrationNames = appliedMigrations.rows.map(row => row.name);
    
    // Read migration files
    const migrationFiles = await fs.readdir(migrationsFolder);
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations are applied in order
    
    // Apply migrations that haven't been applied yet
    for (const sqlFile of sqlFiles) {
      if (!appliedMigrationNames.includes(sqlFile)) {
        console.log(`Applying migration: ${sqlFile}`);
        
        // Read migration file
        const migrationContent = await fs.readFile(
          path.join(migrationsFolder, sqlFile),
          'utf8'
        );
        
        // Begin transaction
        await client.execute('BEGIN TRANSACTION');
        
        try {
          // Apply migration
          await client.execute(migrationContent);
          
          // Record migration
          await client.execute({
            sql: `INSERT INTO _drizzle_migrations (name, hash) VALUES (?, ?)`,
            args: [sqlFile, 'manual migration']
          });
          
          // Commit transaction
          await client.execute('COMMIT');
          
          console.log(`Migration applied: ${sqlFile}`);
        } catch (error) {
          // Rollback on error
          await client.execute('ROLLBACK');
          throw error;
        }
      }
    }
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
