import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';

import { tool_executions } from '../schema/tool_executions';
import { eq } from 'drizzle-orm';
import { toolsMap, validateToolPayload } from '../config/tools.config';
import { createLogger } from '../services/common/logger.service';

const tools_router = new Hono();
const log = createLogger('Routes:Tools');

// Interface for JWT payload
interface JwtPayload {
  user_id: string;
  [key: string]: any;
}

// Extended Context type for JWT
interface AppContext {
  jwtPayload?: JwtPayload;
}

// Enhanced validation schemas
const executeToolSchema = z.object({
  tool_name: z.string().min(1, 'Tool name is required'),
  action: z.string().min(1, 'Action is required'),
  parameters: z.record(z.string(), z.any()).default({}),
  timeout: z.number().min(1000).max(300000).optional().default(30000), // 30s default, max 5min
});

// Error types for better error handling
enum ToolErrorType {
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  EXECUTION = 'execution',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_SERVICE = 'external_service'
}

interface ToolError extends Error {
  type: ToolErrorType;
  code: string;
  details?: Record<string, any>;
}

const createToolError = (type: ToolErrorType, message: string, code: string, details?: Record<string, any>): ToolError => {
  const error = new Error(message) as ToolError;
  error.type = type;
  error.code = code;
  error.details = details;
  return error;
};

// List available tools with enhanced error handling
tools_router.get('/', async (c) => {
  try {
    const available_tools = await db.query.tools.findMany();
    
    // Include tool availability status
    const toolsWithStatus = available_tools.map(tool => ({
      ...tool,
      available: toolsMap[tool.name] ? true : false,
      last_execution: null // Could be enhanced to show last execution time
    }));
    
    return c.json({ 
      success: true,
      tools: toolsWithStatus,
      count: toolsWithStatus.length 
    });
  } catch (error) {
    log.error('Error fetching tools', error as Error);
    return c.json({ 
      success: false,
      error: 'Failed to fetch tools',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Execute tool with comprehensive error handling
tools_router.post('/execute', zValidator('json', executeToolSchema), async (c) => {
  const { tool_name, action, parameters, timeout } = c.req.valid('json');
  
  // Create execution record immediately
  const execution_id = uuidv4();
  const start_time = Date.now();
  
  try {
    // Get tool from database
    const tool = await db.query.tools.findFirst({
      where: (tools, { eq }) => eq(tools.name, tool_name),
    });

    if (!tool) {
      const error = createToolError(
        ToolErrorType.NOT_FOUND, 
        `Tool '${tool_name}' not found`, 
        'TOOL_NOT_FOUND',
        { tool_name, available_tools: Object.keys(toolsMap) }
      );
      
      await logExecution(execution_id, tool_name, parameters, 'failed', error, start_time);
      return c.json({ 
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        details: error.details 
      }, 404);
    }

    // Get tool implementation
    const toolImplementation = toolsMap[tool_name];
    if (!toolImplementation) {
      const error = createToolError(
        ToolErrorType.NOT_FOUND, 
        `Tool '${tool_name}' implementation not found`, 
        'TOOL_IMPL_NOT_FOUND',
        { tool_name, database_tool: tool.uuid }
      );
      
      await logExecution(execution_id, tool_name, parameters, 'failed', error, start_time);
      return c.json({ 
        success: false,
        error: error.message,
        type: error.type,
        code: error.code,
        details: error.details 
      }, 404);
    }

    // Validate payload against schema
    const validatedPayload = validateToolPayload(tool_name as keyof typeof toolsMap, action, parameters);

    // Log execution start
    await logExecution(execution_id, tool_name, parameters, 'pending', null, start_time);

    // Execute tool with timeout
    const result = await executeToolWithTimeout(toolImplementation, tool_name, action, validatedPayload as any, timeout);
    const execution_time = Date.now() - start_time;

    // Log successful execution
    await logExecution(execution_id, tool_name, parameters, 'completed', null, start_time, result, execution_time);

    return c.json({
      success: true,
      result,
      execution_id,
      execution_time_ms: execution_time,
      tool_name
    });

  } catch (error) {
    const execution_time = Date.now() - start_time;
    const toolError = error as ToolError;
    
    // Log failed execution
    await logExecution(execution_id, tool_name, parameters, 'failed', toolError, start_time, null, execution_time);

    // Return appropriate error response
    const statusCode = getErrorStatusCode(toolError.type);
    return c.json({
      success: false,
      error: toolError.message,
      type: toolError.type,
      code: toolError.code,
      execution_id,
      execution_time_ms: execution_time,
      details: toolError.details
    }, statusCode as import('hono/utils/http-status').StatusCode);
  }
});

// Get execution history with enhanced error handling
tools_router.get('/executions', async (c) => {
  try {
    const executions = await db.query.tool_executions.findMany({
      orderBy: (executions, { desc }) => [desc(executions.created_at)],
      limit: 50 // Limit to recent executions
    });

    return c.json({ 
      success: true,
      executions,
      count: executions.length 
    });
  } catch (error) {
    log.error('Error fetching executions', error as Error);
    return c.json({ 
      success: false,
      error: 'Failed to fetch execution history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Test endpoint for error handling validation
tools_router.post('/test-error-handling', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const testType = body.test_type || 'success';
    
    switch (testType) {
      case 'timeout':
        await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate timeout
        return c.json({ success: true, result: 'Should not reach here' });
        
      case 'validation_error':
        throw createToolError(
          ToolErrorType.VALIDATION,
          'Invalid parameters provided',
          'VALIDATION_FAILED',
          { provided: body, expected: 'valid parameters' }
        );
        
      case 'execution_error':
        throw createToolError(
          ToolErrorType.EXECUTION,
          'Tool execution failed during processing',
          'EXECUTION_FAILED',
          { step: 'data_processing', error_details: 'Mock execution error' }
        );
        
      case 'not_found':
        throw createToolError(
          ToolErrorType.NOT_FOUND,
          'Requested resource not found',
          'RESOURCE_NOT_FOUND',
          { resource_type: 'tool', resource_id: 'test_tool' }
        );
        
      case 'external_service':
        throw createToolError(
          ToolErrorType.EXTERNAL_SERVICE,
          'External service unavailable',
          'SERVICE_UNAVAILABLE',
          { service: 'test_api', status: 503 }
        );
        
      default:
        return c.json({
          success: true,
          message: 'Error handling test endpoint working correctly',
          available_tests: ['timeout', 'validation_error', 'execution_error', 'not_found', 'external_service']
        });
    }
  } catch (error) {
    const toolError = error as ToolError;
    const statusCode = getErrorStatusCode(toolError.type);
    
    return c.json({
      success: false,
      error: toolError.message,
      type: toolError.type,
      code: toolError.code,
      details: toolError.details,
      test_result: 'Error handling working correctly'
    }, statusCode as import('hono/utils/http-status').StatusCode);
  }
});

// Helper function to execute tools with timeout
async function executeToolWithTimeout(
  toolImplementation: any,
  toolName: string,
  action: string,
  parameters: Record<string, any>,
  timeoutMs: number
) {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createToolError(
        ToolErrorType.TIMEOUT,
        `Tool execution timed out after ${timeoutMs}ms`,
        'EXECUTION_TIMEOUT',
        { tool_name: toolName, timeout_ms: timeoutMs, parameters }
      ));
    }, timeoutMs);

    try {
      // Execute the tool
      const result = await toolImplementation.execute(action, parameters);
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Wrap in tool error if not already one
      if (!(error as ToolError).type) {
        const toolError = createToolError(
          ToolErrorType.EXECUTION,
          error instanceof Error ? error.message : 'Tool execution failed',
          'EXECUTION_ERROR',
          { tool_name: toolName, parameters, original_error: error }
        );
        reject(toolError);
      } else {
        reject(error);
      }
    }
  });
}

// Helper function to log execution
async function logExecution(
  execution_id: string, 
  tool_name: string, 
  parameters: Record<string, any>, 
  status: 'pending' | 'completed' | 'failed',
  error?: ToolError | null,
  start_time?: number,
  result?: any,
  _execution_time?: number
) {
  try {
    const execution_data = {
      id: execution_id,
      tool_name: tool_name,
      user_uuid: 'system',
      parameters: JSON.stringify(parameters),
      status,
      created_at: new Date(start_time || Date.now()).toISOString(),
      updated_at: new Date().toISOString(),
      ...(result && { result: JSON.stringify(result) }),
      ...(error && { 
        error: JSON.stringify({
          message: error.message,
          type: error.type,
          code: error.code,
          details: error.details
        })
      })
    };

    // Check if execution record exists
    const existing = await db.query.tool_executions.findFirst({
      where: (executions, { eq }) => eq(executions.id, execution_id),
    });

    if (existing) {
      // Update existing record
      await db.update(tool_executions)
        .set({
          status,
          updated_at: new Date().toISOString(),
          ...(result && { result: JSON.stringify(result) }),
          ...(error && { 
            error: JSON.stringify({
              message: error.message,
              type: error.type,
              code: error.code,
              details: error.details
            })
          })
        })
        .where(eq(tool_executions.id, execution_id));
    } else {
      // Create new record
      await db.insert(tool_executions).values(execution_data);
    }
  } catch (logError) {
    log.error('Failed to log execution', logError as Error);
    // Don't throw here to avoid breaking the main execution flow
  }
}

// Helper function to get appropriate HTTP status code for error type
function getErrorStatusCode(errorType: ToolErrorType): number {
  switch (errorType) {
    case ToolErrorType.NOT_FOUND:
      return 404;
    case ToolErrorType.VALIDATION:
      return 400;
    case ToolErrorType.TIMEOUT:
      return 408;
    case ToolErrorType.RATE_LIMIT:
      return 429;
    case ToolErrorType.EXTERNAL_SERVICE:
      return 502;
    case ToolErrorType.EXECUTION:
    default:
      return 500;
  }
}

export { tools_router as toolRoutes };
