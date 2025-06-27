/**
 * Bundle Optimization Utilities
 * 
 * This module provides helpers for optimizing application bundle size
 * through dynamic imports, lazy loading, and conditional loading patterns.
 */

import { logger } from '../services/common/logger.service';

const bundleLogger = logger.child('BUNDLE');

/**
 * Type for a dynamic import function
 */
type ImportFunction<T> = () => Promise<T>;

/**
 * Interface for a lazy-loaded module
 */
interface LazyModule<T> {
  /** Function to load the module when needed */
  load: () => Promise<T>;
  /** Whether the module has been loaded */
  isLoaded: boolean;
  /** Get the module if already loaded, or throw error */
  get: () => T;
}

/**
 * Creates a lazy-loaded module wrapper that loads only when needed
 * 
 * @param importFn - Dynamic import function
 * @param moduleName - Name of the module for logging
 * @returns LazyModule instance
 */
export function createLazyModule<T>(
  importFn: ImportFunction<{ default: T }>,
  moduleName: string
): LazyModule<T> {
  let moduleInstance: T | null = null;
  let isLoaded = false;

  return {
    async load(): Promise<T> {
      try {
        if (!isLoaded) {
          bundleLogger.debug(`Loading module: ${moduleName}`);
          const startTime = performance.now();
          
          const module = await importFn();
          moduleInstance = module.default;
          isLoaded = true;
          
          const loadTime = performance.now() - startTime;
          bundleLogger.debug(`Module loaded in ${loadTime.toFixed(2)}ms: ${moduleName}`);
        }
        
        return moduleInstance as T;
      } catch (error) {
        bundleLogger.error(`Failed to load module: ${moduleName}`, error as Error);
        throw new Error(`Failed to load module: ${moduleName}`);
      }
    },
    
    get isLoaded(): boolean {
      return isLoaded;
    },
    
    get(): T {
      if (!isLoaded || !moduleInstance) {
        throw new Error(`Module not loaded: ${moduleName}. Call load() first.`);
      }
      return moduleInstance;
    }
  };
}

/**
 * Dynamically loads a dependency only when needed and only once
 * 
 * @param importFn - Dynamic import function
 * @param dependencyName - Name of the dependency for logging
 * @returns Promise resolving to the loaded dependency
 */
export async function loadDependencyOnce<T>(
  importFn: ImportFunction<{ default: T }>,
  dependencyName: string
): Promise<T> {
  const moduleCache = new Map<string, any>();
  
  if (moduleCache.has(dependencyName)) {
    return moduleCache.get(dependencyName);
  }
  
  try {
    bundleLogger.debug(`Loading dependency: ${dependencyName}`);
    const module = await importFn();
    moduleCache.set(dependencyName, module.default);
    return module.default;
  } catch (error) {
    bundleLogger.error(`Failed to load dependency: ${dependencyName}`, error as Error);
    throw error;
  }
}

/**
 * Conditionally loads a feature module based on environment or feature flags
 * 
 * @param condition - Boolean condition determining if module should load
 * @param importFn - Dynamic import function
 * @param featureName - Name of the feature for logging
 * @returns Promise resolving to the module or null if condition is false
 */
export async function loadFeatureConditionally<T>(
  condition: boolean,
  importFn: ImportFunction<{ default: T }>,
  featureName: string
): Promise<T | null> {
  if (!condition) {
    bundleLogger.debug(`Feature disabled, skipping import: ${featureName}`);
    return null;
  }
  
  try {
    bundleLogger.debug(`Loading feature: ${featureName}`);
    const module = await importFn();
    return module.default;
  } catch (error) {
    bundleLogger.error(`Failed to load feature: ${featureName}`, error as Error);
    throw error;
  }
}

/**
 * Preloads modules in the background during idle time
 * 
 * @param imports - Array of import functions with names
 */
export function preloadModulesInBackground(
  imports: Array<{ importFn: ImportFunction<any>; name: string }>
): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      imports.forEach(async ({ importFn, name }) => {
        try {
          bundleLogger.debug(`Preloading module in background: ${name}`);
          await importFn();
        } catch (error) {
          bundleLogger.warn(`Background preload failed for ${name}`, error as Error);
        }
      });
    });
  } else {
    // Fallback for environments without requestIdleCallback
    setTimeout(() => {
      imports.forEach(async ({ importFn, name }) => {
        try {
          bundleLogger.debug(`Preloading module in background: ${name}`);
          await importFn();
        } catch (error) {
          bundleLogger.warn(`Background preload failed for ${name}`, error as Error);
        }
      });
    }, 1000);
  }
} 