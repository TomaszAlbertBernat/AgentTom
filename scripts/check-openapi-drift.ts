#!/usr/bin/env bun

/**
 * OpenAPI Codegen Drift Check
 * Ensures frontend types match backend OpenAPI specification
 * @module check-openapi-drift
 */

import * as fs from 'fs';
import * as path from 'path';
import { $ } from 'bun';

interface DriftCheckResult {
  hasDrift: boolean;
  issues: string[];
  recommendations: string[];
}

class OpenAPIDriftChecker {
  private results: DriftCheckResult = {
    hasDrift: false,
    issues: [],
    recommendations: [],
  };

  async checkDrift(): Promise<void> {
    console.log('🔍 Checking OpenAPI codegen drift...\n');

    await this.checkGeneratedTypesExist();
    await this.checkTypeScriptCompilation();
    await this.checkOpenAPISpecConsistency();
    await this.checkFrontendClientUsage();

    this.printReport();

    if (this.results.hasDrift) {
      console.log('\n❌ OpenAPI drift detected! Please regenerate types.');
      process.exit(1);
    } else {
      console.log('\n✅ No OpenAPI drift detected. Types are up to date.');
      process.exit(0);
    }
  }

  private async checkGeneratedTypesExist(): Promise<void> {
    const typesPath = path.join(process.cwd(), 'frontend/src/lib/api/types.d.ts');

    if (!fs.existsSync(typesPath)) {
      this.results.hasDrift = true;
      this.results.issues.push('Generated types file does not exist');
      this.results.recommendations.push('Run: bun run generate:types');
      return;
    }

    const stats = fs.statSync(typesPath);
    const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceModified > 7) {
      this.results.issues.push('Generated types are older than 7 days');
      this.results.recommendations.push('Consider regenerating types to ensure they are current');
    } else {
      console.log('✅ Generated types file exists and is recent');
    }
  }

  private async checkTypeScriptCompilation(): Promise<void> {
    console.log('🔧 Checking TypeScript compilation...');

    try {
      const result = await $`cd frontend && bun run build`.quiet();

      if (result.exitCode === 0) {
        console.log('✅ TypeScript compilation successful');
      } else {
        this.results.hasDrift = true;
        this.results.issues.push('TypeScript compilation failed');
        this.results.recommendations.push('Fix TypeScript errors in frontend');
        console.log('❌ TypeScript compilation failed');
      }
    } catch (error) {
      this.results.hasDrift = true;
      this.results.issues.push('TypeScript compilation check failed');
      this.results.recommendations.push('Check frontend build process');
      console.log('❌ TypeScript compilation check failed');
    }
  }

  private async checkOpenAPISpecConsistency(): Promise<void> {
    console.log('📋 Checking OpenAPI specification consistency...');

    try {
      // Check if the OpenAPI config file exists and is valid
      const openapiConfigPath = path.join(process.cwd(), 'src/config/openapi.config.ts');

      if (!fs.existsSync(openapiConfigPath)) {
        this.results.hasDrift = true;
        this.results.issues.push('OpenAPI configuration file missing');
        return;
      }

      // Try to import and validate the OpenAPI config
      const { openApiConfig } = await import(openapiConfigPath);

      if (!openApiConfig || !openApiConfig.openapi || !openApiConfig.info || !openApiConfig.paths) {
        this.results.hasDrift = true;
        this.results.issues.push('OpenAPI configuration is invalid');
        this.results.recommendations.push('Fix OpenAPI configuration structure');
        return;
      }

      console.log('✅ OpenAPI specification is well-formed');

      // Check for common issues in the spec
      await this.checkSpecIssues(openApiConfig);

    } catch (error) {
      this.results.hasDrift = true;
      this.results.issues.push('OpenAPI specification validation failed');
      this.results.recommendations.push('Fix OpenAPI configuration');
      console.log('❌ OpenAPI specification validation failed');
    }
  }

  private async checkSpecIssues(spec: any): Promise<void> {
    // Check for endpoints with missing schemas
    const paths = Object.keys(spec.paths || {});
    let endpointsWithIssues = 0;

    for (const path of paths) {
      const methods = Object.keys(spec.paths[path]);

      for (const method of methods) {
        const operation = spec.paths[path][method];

        if (!operation.responses || Object.keys(operation.responses).length === 0) {
          endpointsWithIssues++;
          this.results.issues.push(`Endpoint ${method.toUpperCase()} ${path} has no responses defined`);
        }
      }
    }

    if (endpointsWithIssues > 0) {
      this.results.recommendations.push(`Fix ${endpointsWithIssues} endpoint(s) with missing response schemas`);
    }
  }

  private async checkFrontendClientUsage(): Promise<void> {
    console.log('🔗 Checking frontend client usage...');

    try {
      // Check if the frontend client wrapper uses the generated types
      const clientWrapperPath = path.join(process.cwd(), 'frontend/src/lib/api/client-wrapper.ts');

      if (!fs.existsSync(clientWrapperPath)) {
        this.results.hasDrift = true;
        this.results.issues.push('Frontend client wrapper missing');
        return;
      }

      const clientContent = fs.readFileSync(clientWrapperPath, 'utf-8');

      if (!clientContent.includes('import type { paths } from \'./types\'')) {
        this.results.hasDrift = true;
        this.results.issues.push('Frontend client does not import generated types');
        this.results.recommendations.push('Ensure client-wrapper imports generated types');
        return;
      }

      console.log('✅ Frontend client properly uses generated types');

    } catch (error) {
      this.results.hasDrift = true;
      this.results.issues.push('Frontend client usage check failed');
      console.log('❌ Frontend client usage check failed');
    }
  }

  private printReport(): void> {
    console.log('\n📊 OpenAPI Drift Check Report\n');

    if (this.results.issues.length > 0) {
      console.log('Issues found:');
      this.results.issues.forEach(issue => console.log(`  • ${issue}`));
    } else {
      console.log('No issues found.');
    }

    if (this.results.recommendations.length > 0) {
      console.log('\nRecommendations:');
      this.results.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
  }
}

// Run the drift check if this script is executed directly
if (import.meta.main) {
  const checker = new OpenAPIDriftChecker();
  await checker.checkDrift();
}

export { OpenAPIDriftChecker };
