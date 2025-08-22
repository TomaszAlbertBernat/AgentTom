/**
 * Memory Management Utilities
 * 
 * This module provides tools for detecting and preventing memory leaks,
 * including resource pooling, timer management, and memory usage tracking.
 */

import { logger } from '../services/common/logger.service';

const memoryLogger = logger.child('MEMORY');

/**
 * Interface for a resource in the pool
 */
interface PoolResource<T> {
  resource: T;
  lastUsed: number;
  inUse: boolean;
  id: string;
}

/**
 * Options for resource pool
 */
interface ResourcePoolOptions {
  /** Maximum number of resources in the pool */
  maxSize: number;
  /** Time in ms after which idle resources are cleaned up */
  idleTimeout: number;
  /** How often to run cleanup in ms */
  cleanupInterval: number;
  /** Whether to log detailed information about pool operations */
  debug?: boolean;
}

/**
 * Resource pool for expensive object reuse
 * Helps prevent memory leaks by properly managing resource lifecycle
 */
export class ResourcePool<T> {
  private resources: Map<string, PoolResource<T>> = new Map();
  private createFn: () => Promise<T>;
  private destroyFn: (resource: T) => Promise<void>;
  private validateFn: (resource: T) => Promise<boolean>;
  private options: Required<ResourcePoolOptions>;
  private cleanupTimer: NodeJS.Timer | null = null;
  
  /**
   * Creates a new resource pool
   * 
   * @param createFn - Function to create a new resource
   * @param destroyFn - Function to properly destroy a resource
   * @param validateFn - Function to validate if a resource is still usable
   * @param options - Pool configuration options
   */
  constructor(
    createFn: () => Promise<T>,
    destroyFn: (resource: T) => Promise<void>,
    validateFn: (resource: T) => Promise<boolean>,
    options: ResourcePoolOptions
  ) {
    this.createFn = createFn;
    this.destroyFn = destroyFn;
    this.validateFn = validateFn;
    this.options = {
      debug: false,
      ...options
    };
    
    this.startCleanupTimer();
  }
  
  /**
   * Acquires a resource from the pool or creates a new one
   * 
   * @returns Promise resolving to the acquired resource
   */
  async acquire(): Promise<{ resource: T; release: () => Promise<void> }> {
    // Find an available resource
    for (const [id, poolResource] of this.resources.entries()) {
      if (!poolResource.inUse) {
        try {
          // Validate the resource is still usable
          const isValid = await this.validateFn(poolResource.resource);
          
          if (isValid) {
            poolResource.inUse = true;
            poolResource.lastUsed = Date.now();
            
            if (this.options.debug) {
              memoryLogger.debug(`Resource acquired from pool: ${id}`);
            }
            
            // Return the resource with its release function
            return {
              resource: poolResource.resource,
              release: async () => {
                await this.release(id);
              }
            };
          } else {
            // Resource is invalid, remove and destroy it
            this.resources.delete(id);
            await this.destroyFn(poolResource.resource);
            
            if (this.options.debug) {
              memoryLogger.debug(`Invalid resource removed from pool: ${id}`);
            }
          }
        } catch (error) {
          // Error during validation, remove and destroy the resource
          this.resources.delete(id);
          await this.destroyFn(poolResource.resource).catch(e => {
            memoryLogger.error(`Error destroying resource: ${id}`, e as Error);
          });
          
          memoryLogger.warn(`Error validating resource: ${id}`, error as Error);
        }
      }
    }
    
    // No available resources, create a new one if under max size
    if (this.resources.size < this.options.maxSize) {
      try {
        const resource = await this.createFn();
        const id = `resource-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        this.resources.set(id, {
          resource,
          lastUsed: Date.now(),
          inUse: true,
          id
        });
        
        if (this.options.debug) {
          memoryLogger.debug(`New resource created: ${id}`);
        }
        
        return {
          resource,
          release: async () => {
            await this.release(id);
          }
        };
      } catch (error) {
        memoryLogger.error('Error creating new resource', error as Error);
        throw new Error('Failed to create resource');
      }
    }
    
    // Pool is at capacity and no resources are available
    throw new Error('Resource pool exhausted');
  }
  
  /**
   * Releases a resource back to the pool
   * 
   * @param id - ID of the resource to release
   */
  private async release(id: string): Promise<void> {
    const poolResource = this.resources.get(id);
    
    if (poolResource) {
      poolResource.inUse = false;
      poolResource.lastUsed = Date.now();
      
      if (this.options.debug) {
        memoryLogger.debug(`Resource released back to pool: ${id}`);
      }
    }
  }
  
  /**
   * Starts the cleanup timer for idle resources
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
    
    // Ensure the timer doesn't prevent the process from exiting
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }
  
  /**
   * Cleans up idle resources that have exceeded the idle timeout
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const idleThreshold = now - this.options.idleTimeout;
    
    for (const [id, poolResource] of this.resources.entries()) {
      // Only clean up resources that are not in use and have been idle for too long
      if (!poolResource.inUse && poolResource.lastUsed < idleThreshold) {
        this.resources.delete(id);
        
        try {
          await this.destroyFn(poolResource.resource);
          
          if (this.options.debug) {
            memoryLogger.debug(`Idle resource cleaned up: ${id}`);
          }
        } catch (error) {
          memoryLogger.error(`Error destroying idle resource: ${id}`, error as Error);
        }
      }
    }
    
    if (this.options.debug) {
      memoryLogger.debug(`Cleanup complete. Pool size: ${this.resources.size}`);
    }
  }
  
  /**
   * Destroys all resources and stops the cleanup timer
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    const destroyPromises: Promise<void>[] = [];
    
    for (const [id, poolResource] of this.resources.entries()) {
      this.resources.delete(id);
      destroyPromises.push(
        this.destroyFn(poolResource.resource).catch(error => {
          memoryLogger.error(`Error destroying resource during shutdown: ${id}`, error as Error);
        })
      );
    }
    
    await Promise.all(destroyPromises);
    memoryLogger.info('Resource pool shutdown complete');
  }
  
  /**
   * Returns the current pool size
   */
  get size(): number {
    return this.resources.size;
  }
  
  /**
   * Returns the number of in-use resources
   */
  get inUseCount(): number {
    let count = 0;
    for (const resource of this.resources.values()) {
      if (resource.inUse) {
        count++;
      }
    }
    return count;
  }
}

/**
 * Registry for tracking timers to prevent memory leaks
 */
export class TimerRegistry {
  private timers: Map<string, NodeJS.Timer> = new Map();
  
  /**
   * Registers a setTimeout and returns the timeout ID
   * 
   * @param callback - Function to execute after delay
   * @param delay - Delay in milliseconds
   * @param id - Optional custom ID for the timer
   * @returns Timer ID
   */
  setTimeout(
    callback: (...args: any[]) => void,
    delay: number,
    id = `timer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  ): string {
    const timer = setTimeout(() => {
      this.timers.delete(id);
      callback();
    }, delay);
    
    this.timers.set(id, timer as NodeJS.Timer);
    return id;
  }
  
  /**
   * Registers an interval and returns the interval ID
   * 
   * @param callback - Function to execute repeatedly
   * @param delay - Delay between executions in milliseconds
   * @param id - Optional custom ID for the interval
   * @returns Interval ID
   */
  setInterval(
    callback: (...args: any[]) => void,
    delay: number,
    id = `interval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  ): string {
    const timer = setInterval(callback, delay);
    this.timers.set(id, timer as NodeJS.Timer);
    return id;
  }
  
  /**
   * Clears a specific timer by ID
   * 
   * @param id - ID of the timer to clear
   * @returns Whether the timer was found and cleared
   */
  clear(id: string): boolean {
    const timer = this.timers.get(id);
    
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
      return true;
    }
    
    return false;
  }
  
  /**
   * Clears all registered timers
   */
  clearAll(): void {
    for (const [id, timer] of this.timers.entries()) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    
    memoryLogger.debug(`Cleared all timers: ${this.timers.size}`);
  }
  
  /**
   * Returns the number of active timers
   */
  get size(): number {
    return this.timers.size;
  }
}

/**
 * Tracks memory usage of the application
 */
export class MemoryTracker {
  private lastUsage: NodeJS.MemoryUsage | null = null;
  private peakUsage: NodeJS.MemoryUsage | null = null;
  private startTime: number = Date.now();
  
  /**
   * Gets the current memory usage
   * 
   * @returns Memory usage statistics
   */
  getCurrentUsage(): NodeJS.MemoryUsage {
    const usage = process.memoryUsage();
    this.lastUsage = usage;
    
    // Update peak usage
    if (!this.peakUsage) {
      this.peakUsage = { ...usage };
    } else {
      for (const key of Object.keys(usage) as Array<keyof NodeJS.MemoryUsage>) {
        if (usage[key] > (this.peakUsage[key] || 0)) {
          this.peakUsage[key] = usage[key];
        }
      }
    }
    
    return usage;
  }
  
  /**
   * Gets the memory difference since the last check
   * 
   * @returns Memory difference or null if this is the first check
   */
  getMemoryDelta(): { [key: string]: number } | null {
    const currentUsage = this.getCurrentUsage();
    
    if (!this.lastUsage) {
      return null;
    }
    
    const delta: { [key: string]: number } = {};
    for (const key of Object.keys(currentUsage) as Array<keyof NodeJS.MemoryUsage>) {
      delta[key] = currentUsage[key] - (this.lastUsage[key] || 0);
    }
    
    return delta;
  }
  
  /**
   * Gets the peak memory usage since tracking began
   * 
   * @returns Peak memory usage
   */
  getPeakUsage(): NodeJS.MemoryUsage | null {
    return this.peakUsage;
  }
  
  /**
   * Logs the current memory usage
   */
  logMemoryUsage(): void {
    const usage = this.getCurrentUsage();
    memoryLogger.info('Memory usage', {
      heapUsed: formatBytes(usage.heapUsed),
      heapTotal: formatBytes(usage.heapTotal),
      rss: formatBytes(usage.rss),
      external: formatBytes(usage.external),
      arrayBuffers: formatBytes(usage.arrayBuffers),
      uptime: formatDuration(Date.now() - this.startTime)
    });
  }
  
  /**
   * Logs detailed memory usage including delta and peak
   */
  logDetailedMemoryUsage(): void {
    const usage = this.getCurrentUsage();
    const delta = this.getMemoryDelta();
    const peak = this.getPeakUsage();
    
    memoryLogger.info('Detailed memory usage', {
      current: {
        heapUsed: formatBytes(usage.heapUsed),
        heapTotal: formatBytes(usage.heapTotal),
        rss: formatBytes(usage.rss),
        external: formatBytes(usage.external),
        arrayBuffers: formatBytes(usage.arrayBuffers)
      },
      delta: delta ? {
        heapUsed: formatBytes(delta.heapUsed),
        heapTotal: formatBytes(delta.heapTotal),
        rss: formatBytes(delta.rss),
        external: formatBytes(delta.external),
        arrayBuffers: formatBytes(delta.arrayBuffers)
      } : 'No previous measurement',
      peak: peak ? {
        heapUsed: formatBytes(peak.heapUsed),
        heapTotal: formatBytes(peak.heapTotal),
        rss: formatBytes(peak.rss),
        external: formatBytes(peak.external),
        arrayBuffers: formatBytes(peak.arrayBuffers)
      } : 'No peak measurement',
      uptime: formatDuration(Date.now() - this.startTime)
    });
  }
  
  /**
   * Resets the tracking data
   */
  reset(): void {
    this.lastUsage = null;
    this.peakUsage = null;
    this.startTime = Date.now();
  }
}

/**
 * Formats bytes into a human-readable string
 * 
 * @param bytes - Number of bytes to format
 * @returns Formatted string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Formats duration in milliseconds into a human-readable string
 * 
 * @param duration - Duration in milliseconds
 * @returns Formatted string
 */
function formatDuration(duration: number): string {
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Create global memory tracker instance
export const memoryTracker = new MemoryTracker();

// Create global timer registry
export const timerRegistry = new TimerRegistry(); 