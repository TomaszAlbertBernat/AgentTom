#!/usr/bin/env bun

/**
 * Migration script for existing AgentTom users
 * Helps transition from old configuration to new local-first mode
 * @module migrate-to-local-mode
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadLocalUserConfig, saveLocalUserConfig } from '../src/config/local-user.config';

interface MigrationReport {
  migrated: string[];
  skipped: string[];
  warnings: string[];
  errors: string[];
}

class LocalModeMigrator {
  private report: MigrationReport = {
    migrated: [],
    skipped: [],
    warnings: [],
    errors: [],
  };

  async migrate(): Promise<void> {
    console.log('🔄 AgentTom Local Mode Migration\n');
    console.log('This script helps you transition from the old configuration to the new local-first approach.\n');

    await this.backupExistingConfig();
    await this.migrateEnvironmentVariables();
    await this.migrateDatabaseSettings();
    await this.validateConfiguration();
    this.printReport();
  }

  private async backupExistingConfig(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'migration-backup', timestamp);

      // Create backup directory
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Backup .env file
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const backupEnvPath = path.join(backupDir, '.env.backup');
        fs.copyFileSync(envPath, backupEnvPath);
        this.report.migrated.push('Environment file backed up');
      }

      // Backup existing local user config
      const configDir = path.join(process.cwd(), '.agenttom');
      if (fs.existsSync(configDir)) {
        const backupConfigPath = path.join(backupDir, '.agenttom-backup');
        this.copyDirectory(configDir, backupConfigPath);
        this.report.migrated.push('Local user config backed up');
      }

      // Backup database if it exists
      const dbPath = path.join(process.cwd(), 'agi.db');
      if (fs.existsSync(dbPath)) {
        const backupDbPath = path.join(backupDir, 'agi.db.backup');
        fs.copyFileSync(dbPath, backupDbPath);
        this.report.migrated.push('Database backed up');
      }

      console.log(`✅ Backup created at: ${backupDir}`);

    } catch (error) {
      this.report.errors.push(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private copyDirectory(source: string, destination: string): void {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private async migrateEnvironmentVariables(): Promise<void> {
    console.log('\n🔧 Migrating environment variables...\n');

    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      this.report.skipped.push('No .env file found - nothing to migrate');
      return;
    }

    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envLines = envContent.split('\n');
      const newEnvLines: string[] = [];

      // Load current local config to update it
      const config = loadLocalUserConfig();

      for (const line of envLines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          newEnvLines.push(line);
          continue;
        }

        // Extract key-value pairs
        const match = trimmed.match(/^([^=]+)=(.+)$/);
        if (!match) {
          newEnvLines.push(line);
          continue;
        }

        const [, key, value] = match;

        // Migrate API keys to local config
        if (this.isApiKey(key)) {
          console.log(`Migrating ${key} to local config...`);

          const service = key.toLowerCase().replace('_api_key', '').replace('_client_id', '').replace('_client_secret', '');

          if (key.includes('SPOTIFY')) {
            // Handle Spotify keys separately
            if (key === 'SPOTIFY_CLIENT_ID') {
              config.apiKeys.spotify = { clientId: value };
            } else if (key === 'SPOTIFY_CLIENT_SECRET') {
              if (!config.apiKeys.spotify) {
                config.apiKeys.spotify = { clientId: '', clientSecret: '' };
              }
              config.apiKeys.spotify.clientSecret = value;
            }
          } else {
            // Standard API key
            config.apiKeys[service as keyof typeof config.apiKeys] = value;
          }

          this.report.migrated.push(`Migrated ${key} to local config`);
        } else {
          newEnvLines.push(line);
        }
      }

      // Save updated config
      saveLocalUserConfig(config);

      // Update .env file to remove migrated keys
      const updatedEnvContent = newEnvLines.join('\n');
      fs.writeFileSync(envPath, updatedEnvContent);

      // Add new local-mode specific environment variables
      this.updateEnvFile(envPath);

    } catch (error) {
      this.report.errors.push(`Environment migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private isApiKey(key: string): boolean {
    const apiKeyPatterns = [
      'GOOGLE_API_KEY',
      'OPENAI_API_KEY',
      'ELEVENLABS_API_KEY',
      'RESEND_API_KEY',
      'FIRECRAWL_API_KEY',
      'LINEAR_API_KEY',
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET'
    ];

    return apiKeyPatterns.includes(key);
  }

  private updateEnvFile(envPath: string): void {
    const envContent = fs.readFileSync(envPath, 'utf-8');

    // Add new local-mode configuration
    const localModeConfig = `

# Local Mode Configuration (New)
AUTH_MODE=local
NODE_ENV=development
LOG_LEVEL=INFO
PORT=3000
APP_URL=http://localhost:3000

# AI Providers (migrated to local config)
# Your API keys are now stored securely in .agenttom/local-user.json
# Use the web UI or API endpoints to manage them`;

    // Only add if not already present
    if (!envContent.includes('# Local Mode Configuration')) {
      fs.appendFileSync(envPath, localModeConfig);
      this.report.migrated.push('Added local mode configuration to .env');
    }
  }

  private async migrateDatabaseSettings(): Promise<void> {
    console.log('\n💾 Checking database configuration...\n');

    const dbPath = path.join(process.cwd(), 'agi.db');
    if (!fs.existsSync(dbPath)) {
      this.report.skipped.push('No database found - local mode doesn\'t require database');
      return;
    }

    console.log('📊 Found existing database. In local mode, the database is optional.');
    console.log('   - You can keep it for conversation history and data');
    console.log('   - Or remove it if you want a completely fresh start');
    console.log('   - Local user configuration is now stored in .agenttom/local-user.json');

    this.report.warnings.push('Existing database found - review if you need it in local mode');
  }

  private async validateConfiguration(): Promise<void> {
    console.log('\n✅ Validating migrated configuration...\n');

    try {
      // Check if local user config was created properly
      const config = loadLocalUserConfig();

      if (config.name !== 'Local User') {
        this.report.migrated.push('Local user configuration loaded successfully');
      }

      // Check if API keys were migrated
      const apiKeyCount = Object.values(config.apiKeys).filter(key => key && key !== '').length;
      if (apiKeyCount > 0) {
        this.report.migrated.push(`Migrated ${apiKeyCount} API keys to local config`);
      }

      if (config.preferences.setupCompleted) {
        this.report.migrated.push('Setup marked as completed');
      }

    } catch (error) {
      this.report.errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private printReport(): void {
    console.log('\n📋 Migration Report\n');

    if (this.report.migrated.length > 0) {
      console.log('✅ Successfully migrated:');
      this.report.migrated.forEach(item => console.log(`   • ${item}`));
    }

    if (this.report.skipped.length > 0) {
      console.log('\n⏭️  Skipped:');
      this.report.skipped.forEach(item => console.log(`   • ${item}`));
    }

    if (this.report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.report.warnings.forEach(item => console.log(`   • ${item}`));
    }

    if (this.report.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.report.errors.forEach(item => console.log(`   • ${item}`));
    }

    console.log('\n🚀 Next Steps:');
    console.log('1. Review the backup in migration-backup/ directory');
    console.log('2. Start the server: bun run dev');
    console.log('3. Check that everything works: bun run validate:happy-path');
    console.log('4. If needed, restore from backup and try again');
  }
}

// Run the migration if this script is executed directly
if (import.meta.main) {
  const migrator = new LocalModeMigrator();
  await migrator.migrate();
}

export { LocalModeMigrator };
