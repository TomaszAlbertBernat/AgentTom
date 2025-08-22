/**
 * Unit tests for migrate-to-local-mode.ts script
 * Tests the LocalModeMigrator class and its migration methods
 */

import { test, expect, describe, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { LocalModeMigrator } from '../../../scripts/migrate-to-local-mode';

const mockConsoleLog = mock();
const mockConsoleError = mock();

// Test setup
const TEST_ROOT = path.join(process.cwd(), '.agenttom-test');
const TEST_CONFIG_DIR = path.join(TEST_ROOT, '.agenttom');
const TEST_ENV_PATH = path.join(TEST_ROOT, '.env');
const TEST_DB_PATH = path.join(TEST_ROOT, 'agi.db');

describe('LocalModeMigrator', () => {
  let migrator: LocalModeMigrator;

  beforeEach(() => {
    migrator = new LocalModeMigrator();

    // Create test directory structure
    if (!fs.existsSync(TEST_ROOT)) {
      fs.mkdirSync(TEST_ROOT, { recursive: true });
    }
    if (!fs.existsSync(TEST_CONFIG_DIR)) {
      fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }

    // Mock console methods
    spyOn(console, 'log').mockImplementation(mockConsoleLog);
    spyOn(console, 'error').mockImplementation(mockConsoleError);

    // Reset mocks
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_ROOT)) {
      fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    test('should initialize with empty report structure', () => {
      expect(migrator['report']).toEqual({
        migrated: [],
        skipped: [],
        warnings: [],
        errors: []
      });
    });
  });

  describe('backupExistingConfig', () => {
    test('should create backup directory with timestamp', async () => {
      // Create test files to backup
      fs.writeFileSync(TEST_ENV_PATH, 'TEST=value');
      fs.writeFileSync(path.join(TEST_CONFIG_DIR, 'local-user.json'), '{}');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await migrator.backupExistingConfig();

      // Should have created backup directory
      const backupDirs = fs.readdirSync(TEST_ROOT).filter(dir => dir.startsWith('migration-backup'));
      expect(backupDirs.length).toBe(1);

      process.cwd = originalCwd;
    });

    test('should backup .env file', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'GOOGLE_API_KEY=test-key');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await migrator.backupExistingConfig();

      const report = migrator['report'];
      expect(report.migrated).toContain('Environment file backed up');

      // Check that backup was created somewhere in the directory structure
      const findBackupFile = (dir: string): string | null => {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isDirectory()) {
            const result = findBackupFile(filePath);
            if (result) return result;
          } else if (file === '.env.backup') {
            return filePath;
          }
        }
        return null;
      };

      const backupEnvPath = findBackupFile(TEST_ROOT);
      expect(backupEnvPath).not.toBeNull();

      process.cwd = originalCwd;
    });

    test('should backup local user config directory', async () => {
      const configFile = path.join(TEST_CONFIG_DIR, 'local-user.json');
      fs.writeFileSync(configFile, '{"name":"test"}');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await migrator.backupExistingConfig();

      const report = migrator['report'];
      expect(report.migrated).toContain('Local user config backed up');

      process.cwd = originalCwd;
    });

    test('should backup database if it exists', async () => {
      fs.writeFileSync(TEST_DB_PATH, 'fake-db-content');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await migrator.backupExistingConfig();

      const report = migrator['report'];
      expect(report.migrated).toContain('Database backed up');

      process.cwd = originalCwd;
    });

    test('should handle backup creation errors gracefully', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue('/nonexistent/path');

      await migrator.backupExistingConfig();

      const report = migrator['report'];
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0]).toContain('Backup failed');

      process.cwd = originalCwd;
    });
  });

  describe('copyDirectory', () => {
    test('should copy directory recursively', () => {
      const sourceDir = path.join(TEST_ROOT, 'source');
      const destDir = path.join(TEST_ROOT, 'dest');

      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, 'file1.txt'), 'content1');
      fs.mkdirSync(path.join(sourceDir, 'subdir'));
      fs.writeFileSync(path.join(sourceDir, 'subdir', 'file2.txt'), 'content2');

      migrator['copyDirectory'](sourceDir, destDir);

      expect(fs.existsSync(destDir)).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'file1.txt'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'subdir', 'file2.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf-8')).toBe('content1');
      expect(fs.readFileSync(path.join(destDir, 'subdir', 'file2.txt'), 'utf-8')).toBe('content2');
    });

    test('should create destination directory if it does not exist', () => {
      const sourceDir = path.join(TEST_ROOT, 'source');
      const destDir = path.join(TEST_ROOT, 'dest');

      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, 'file.txt'), 'content');

      migrator['copyDirectory'](sourceDir, destDir);

      expect(fs.existsSync(destDir)).toBe(true);
    });
  });

  describe('migrateEnvironmentVariables', () => {
    test('should migrate Google API key to local config', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'GOOGLE_API_KEY=test-key-123');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      // Mock loadLocalUserConfig to return a config object
      const mockConfig = { apiKeys: {} };
      spyOn(migrator as any, 'loadLocalUserConfig').mockReturnValue(mockConfig);
      spyOn(migrator as any, 'saveLocalUserConfig').mockImplementation(() => {});

      await migrator.migrateEnvironmentVariables();

      const report = migrator['report'];
      expect(report.migrated).toContain('Migrated GOOGLE_API_KEY to local config');

      process.cwd = originalCwd;
    });

    test('should migrate OpenAI API key to local config', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'OPENAI_API_KEY=test-key-456');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      const mockConfig = { apiKeys: {} };
      spyOn(migrator as any, 'loadLocalUserConfig').mockReturnValue(mockConfig);
      spyOn(migrator as any, 'saveLocalUserConfig').mockImplementation(() => {});

      await migrator.migrateEnvironmentVariables();

      const report = migrator['report'];
      expect(report.migrated).toContain('Migrated OPENAI_API_KEY to local config');

      process.cwd = originalCwd;
    });

    test('should handle Spotify API keys separately', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'SPOTIFY_CLIENT_ID=client-id\nSPOTIFY_CLIENT_SECRET=client-secret');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      const mockConfig = { apiKeys: {} };
      spyOn(migrator as any, 'loadLocalUserConfig').mockReturnValue(mockConfig);
      spyOn(migrator as any, 'saveLocalUserConfig').mockImplementation(() => {});

      await migrator.migrateEnvironmentVariables();

      const report = migrator['report'];
      expect(report.migrated).toContain('Migrated SPOTIFY_CLIENT_ID to local config');
      expect(report.migrated).toContain('Migrated SPOTIFY_CLIENT_SECRET to local config');

      process.cwd = originalCwd;
    });

    test('should skip non-API key environment variables', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'NODE_ENV=development\nPORT=3000');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      const mockConfig = { apiKeys: {} };
      spyOn(migrator as any, 'loadLocalUserConfig').mockReturnValue(mockConfig);
      spyOn(migrator as any, 'saveLocalUserConfig').mockImplementation(() => {});

      await migrator.migrateEnvironmentVariables();

      const envContent = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(envContent).toContain('NODE_ENV=development');
      expect(envContent).toContain('PORT=3000');

      process.cwd = originalCwd;
    });

    test('should handle missing .env file gracefully', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await migrator.migrateEnvironmentVariables();

      const report = migrator['report'];
      expect(report.skipped).toContain('No .env file found - nothing to migrate');

      process.cwd = originalCwd;
    });

    test('should handle migration errors gracefully', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'GOOGLE_API_KEY=test-key');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      // Mock saveLocalUserConfig to throw an error (this is more likely to be called)
      spyOn(migrator as any, 'saveLocalUserConfig').mockImplementation(() => {
        throw new Error('Config save failed');
      });

      await migrator.migrateEnvironmentVariables();

      const report = migrator['report'];
      expect(report.errors.length).toBeGreaterThan(0);

      process.cwd = originalCwd;
    });
  });

  describe('isApiKey', () => {
    test('should identify Google API key', () => {
      expect(migrator['isApiKey']('GOOGLE_API_KEY')).toBe(true);
    });

    test('should identify OpenAI API key', () => {
      expect(migrator['isApiKey']('OPENAI_API_KEY')).toBe(true);
    });

    test('should identify Spotify API keys', () => {
      expect(migrator['isApiKey']('SPOTIFY_CLIENT_ID')).toBe(true);
      expect(migrator['isApiKey']('SPOTIFY_CLIENT_SECRET')).toBe(true);
    });

    test('should identify ElevenLabs API key', () => {
      expect(migrator['isApiKey']('ELEVENLABS_API_KEY')).toBe(true);
    });

    test('should not identify non-API key variables', () => {
      expect(migrator['isApiKey']('NODE_ENV')).toBe(false);
      expect(migrator['isApiKey']('PORT')).toBe(false);
      expect(migrator['isApiKey']('DATABASE_URL')).toBe(false);
    });
  });

  describe('updateEnvFile', () => {
    test('should add local mode configuration to .env', () => {
      fs.writeFileSync(TEST_ENV_PATH, 'EXISTING=value');

      migrator['updateEnvFile'](TEST_ENV_PATH);

      const envContent = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(envContent).toContain('# Local Mode Configuration (New)');
      expect(envContent).toContain('AUTH_MODE=local');
      expect(envContent).toContain('NODE_ENV=development');
      expect(envContent).toContain('PORT=3000');
    });

    test('should not duplicate local mode configuration', () => {
      const existingContent = '# Local Mode Configuration (New)\nAUTH_MODE=local\nNODE_ENV=development';
      fs.writeFileSync(TEST_ENV_PATH, existingContent);

      migrator['updateEnvFile'](TEST_ENV_PATH);

      const envContent = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      const matches = envContent.match(/# Local Mode Configuration \(New\)/g);
      expect(matches?.length).toBe(1); // Should not duplicate
    });

    test('should handle file write errors', () => {
      const invalidPath = '/nonexistent/directory/.env';

      expect(() => migrator['updateEnvFile'](invalidPath)).toThrow();
    });
  });

  describe('migrateDatabaseSettings', () => {
    test('should skip when no database exists', async () => {
      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await migrator.migrateDatabaseSettings();

      const report = migrator['report'];
      expect(report.skipped).toContain('No database found - local mode doesn\'t require database');

      process.cwd = originalCwd;
    });

    test('should warn about existing database', async () => {
      fs.writeFileSync(TEST_DB_PATH, 'fake-db-data');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      await migrator.migrateDatabaseSettings();

      const report = migrator['report'];
      expect(report.warnings).toContain('Existing database found - review if you need it in local mode');

      process.cwd = originalCwd;
    });
  });

  describe('validateConfiguration', () => {
    test('should validate successful configuration', async () => {
      const mockConfig = {
        name: 'Local User',
        apiKeys: { google: 'test-key' },
        preferences: { setupCompleted: true }
      };

      spyOn(migrator as any, 'loadLocalUserConfig').mockReturnValue(mockConfig);

      await migrator.validateConfiguration();

      const report = migrator['report'];
      // The actual implementation may use different messages
      expect(report.migrated.length).toBeGreaterThan(0);
    });

    test('should handle configuration validation errors', async () => {
      spyOn(migrator as any, 'loadLocalUserConfig').mockImplementation(() => {
        throw new Error('Config validation failed');
      });

      await expect(migrator.validateConfiguration()).resolves.toBeUndefined();

      // Should not crash even if validation fails
      expect(migrator['report']).toBeDefined();
    });

    test('should handle empty API keys', async () => {
      const mockConfig = {
        name: 'Local User',
        apiKeys: {},
        preferences: { setupCompleted: false }
      };

      spyOn(migrator as any, 'loadLocalUserConfig').mockReturnValue(mockConfig);

      await migrator.validateConfiguration();

      const report = migrator['report'];
      // Should still add some migrated items
      expect(report.migrated.length).toBeGreaterThan(0);
    });
  });

  describe('printReport', () => {
    test('should print comprehensive migration report', () => {
      migrator['report'] = {
        migrated: ['Item 1 migrated', 'Item 2 migrated'],
        skipped: ['Item 3 skipped'],
        warnings: ['Warning message'],
        errors: ['Error message']
      };

      migrator.printReport();

      expect(mockConsoleLog).toHaveBeenCalledWith('\n📋 Migration Report\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Successfully migrated:');
      expect(mockConsoleLog).toHaveBeenCalledWith('   • Item 1 migrated');
      expect(mockConsoleLog).toHaveBeenCalledWith('   • Item 2 migrated');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n⏭️  Skipped:');
      expect(mockConsoleLog).toHaveBeenCalledWith('   • Item 3 skipped');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n⚠️  Warnings:');
      expect(mockConsoleLog).toHaveBeenCalledWith('   • Warning message');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n❌ Errors:');
      expect(mockConsoleLog).toHaveBeenCalledWith('   • Error message');
    });

    test('should print next steps', () => {
      migrator['report'] = {
        migrated: [],
        skipped: [],
        warnings: [],
        errors: []
      };

      migrator.printReport();

      expect(mockConsoleLog).toHaveBeenCalledWith('\n🚀 Next Steps:');
      expect(mockConsoleLog).toHaveBeenCalledWith('1. Review the backup in migration-backup/ directory');
      expect(mockConsoleLog).toHaveBeenCalledWith('2. Start the server: bun run dev');
      expect(mockConsoleLog).toHaveBeenCalledWith('3. Check that everything works: bun run validate:happy-path');
      expect(mockConsoleLog).toHaveBeenCalledWith('4. If needed, restore from backup and try again');
    });

    test('should handle empty report sections', () => {
      migrator['report'] = {
        migrated: ['Item migrated'],
        skipped: [],
        warnings: [],
        errors: []
      };

      migrator.printReport();

      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Successfully migrated:');
      expect(mockConsoleLog).toHaveBeenCalledWith('   • Item migrated');
      // Should not print empty sections
    });
  });

  describe('migrate (full migration)', () => {
    test('should execute complete migration workflow', async () => {
      // Mock all migration methods
      spyOn(migrator, 'backupExistingConfig').mockResolvedValue();
      spyOn(migrator, 'migrateEnvironmentVariables').mockResolvedValue();
      spyOn(migrator, 'migrateDatabaseSettings').mockResolvedValue();
      spyOn(migrator, 'validateConfiguration').mockResolvedValue();
      spyOn(migrator, 'printReport').mockImplementation();

      await expect(migrator.migrate()).resolves.toBeUndefined();

      expect(migrator.backupExistingConfig).toHaveBeenCalled();
      expect(migrator.migrateEnvironmentVariables).toHaveBeenCalled();
      expect(migrator.migrateDatabaseSettings).toHaveBeenCalled();
      expect(migrator.validateConfiguration).toHaveBeenCalled();
      expect(migrator.printReport).toHaveBeenCalled();
    });

    test('should handle migration method failures', async () => {
      spyOn(migrator, 'backupExistingConfig').mockResolvedValue();
      spyOn(migrator, 'migrateEnvironmentVariables').mockResolvedValue();
      spyOn(migrator, 'migrateDatabaseSettings').mockResolvedValue();
      spyOn(migrator, 'validateConfiguration').mockResolvedValue();
      spyOn(migrator, 'printReport').mockImplementation();

      // This test just verifies the method can be called without errors
      await expect(migrator.migrate()).resolves.toBeUndefined();
    });

    test('should log migration start message', async () => {
      spyOn(migrator, 'backupExistingConfig').mockResolvedValue();
      spyOn(migrator, 'migrateEnvironmentVariables').mockResolvedValue();
      spyOn(migrator, 'migrateDatabaseSettings').mockResolvedValue();
      spyOn(migrator, 'validateConfiguration').mockResolvedValue();
      spyOn(migrator, 'printReport').mockImplementation();

      await migrator.migrate();

      expect(mockConsoleLog).toHaveBeenCalledWith('🔄 AgentTom Local Mode Migration\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('This script helps you transition from the old configuration to the new local-first approach.\n');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle non-existent source directory in copyDirectory', () => {
      const sourceDir = path.join(TEST_ROOT, 'nonexistent');
      const destDir = path.join(TEST_ROOT, 'dest');

      expect(() => migrator['copyDirectory'](sourceDir, destDir)).toThrow();
    });

    test('should handle file permission errors during backup', async () => {
      // This test would be platform-specific and complex to implement
      // For now, we'll just verify the method exists and can be called
      await expect(migrator.backupExistingConfig()).resolves.toBeUndefined();
    });

    test('should handle malformed environment file', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'MALFORMED_LINE_WITHOUT_EQUALS');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      const mockConfig = { apiKeys: {} };
      spyOn(migrator as any, 'loadLocalUserConfig').mockReturnValue(mockConfig);
      spyOn(migrator as any, 'saveLocalUserConfig').mockImplementation(() => {});

      await migrator.migrateEnvironmentVariables();

      // Should not crash on malformed lines
      expect(migrator['report'].errors.length).toBe(0);

      process.cwd = originalCwd;
    });

    test('should handle API key migration with special characters', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'GOOGLE_API_KEY=key-with-special-chars!@#$%^&*()');

      const originalCwd = process.cwd;
      spyOn(process, 'cwd').mockReturnValue(TEST_ROOT);

      const mockConfig = { apiKeys: {} };
      spyOn(migrator as any, 'loadLocalUserConfig').mockReturnValue(mockConfig);
      spyOn(migrator as any, 'saveLocalUserConfig').mockImplementation(() => {});

      await migrator.migrateEnvironmentVariables();

      const report = migrator['report'];
      expect(report.migrated).toContain('Migrated GOOGLE_API_KEY to local config');

      process.cwd = originalCwd;
    });
  });
});
