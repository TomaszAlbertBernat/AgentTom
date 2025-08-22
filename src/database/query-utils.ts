/**
 * Query Optimization Utilities
 * 
 * This module provides helper functions for optimizing database queries,
 * implementing best practices for Drizzle ORM to improve performance.
 */

import { SQL, SQLWrapper } from 'drizzle-orm';
import { logger } from '../services/common/logger.service';

const queryLogger = logger.child('DB_QUERY');

/**
 * Options for paginated queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Format SQL condition for selective column selection
 * Helps avoid SELECT * performance issues
 * 
 * @param table - The database table
 * @param columns - The columns to select
 * @returns SQL select expression
 */
export function selectColumns<T extends Record<string, any>>(
  table: T,
  columns: (keyof T)[]
): Record<string, SQL<unknown>> {
  const result: Record<string, SQL<unknown>> = {};
  
  for (const column of columns) {
    if (column in table) {
      result[column as string] = table[column as string] as SQL<unknown>;
    }
  }
  
  return result;
}

/**
 * Create optimized pagination query parameters
 * 
 * @param options - Pagination options
 * @returns Validated pagination parameters
 */
export function getPaginationParams(options?: PaginationOptions) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const offset = (page - 1) * limit;
  
  return {
    limit,
    offset,
    page,
    orderDir: options?.orderDir || 'desc',
    orderBy: options?.orderBy || 'createdAt'
  };
}

/**
 * Log query execution time for performance monitoring
 * 
 * @param queryName - Name of the query for identification
 * @param callback - The query execution function
 * @returns Query result
 */
export async function measureQueryTime<T>(
  queryName: string,
  callback: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await callback();
    const executionTime = performance.now() - startTime;
    
    queryLogger.debug(`Query execution time: ${executionTime.toFixed(2)}ms`, {
      queryName,
      executionTime
    });
    
    return result;
  } catch (error) {
    const executionTime = performance.now() - startTime;
    queryLogger.error(
      `Query failed after ${executionTime.toFixed(2)}ms`,
      error instanceof Error ? error : undefined,
      {
        queryName,
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      }
    );
    throw error;
  }
}

/**
 * Execute queries in transaction batches for better performance
 * 
 * @param db - Database instance
 * @param queries - Array of query functions to execute in transaction
 * @returns Combined result array
 */
export async function batchTransaction<T>(
  db: any,
  queries: (() => Promise<T>)[]
): Promise<T[]> {
  return await db.transaction(async (tx: any) => {
    const results: T[] = [];
    
    for (const query of queries) {
      const result = await query();
      results.push(result);
    }
    
    return results;
  });
} 