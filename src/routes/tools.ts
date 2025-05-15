import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { tools } from '../schema/tools';
import { tool_executions } from '../schema/tool_executions';
import { eq, desc } from 'drizzle-orm';

const tools_router = new Hono();

// Validation schemas
const executeToolSchema = z.object({
  tool_id: z.string(),
  parameters: z.record(z.any()),
});

// List available tools
tools_router.get('/', async (c) => {
  const available_tools = await db.query.tools.findMany();
  return c.json({ tools: available_tools });
});

// Execute tool
tools_router.post('/execute', zValidator('json', executeToolSchema), async (c) => {
  const { tool_id, parameters } = c.req.valid('json');
  const user_id = c.get('jwtPayload').user_id;

  // Get tool
  const tool = await db.query.tools.findFirst({
    where: (tools, { eq }) => eq(tools.id, tool_id),
  });

  if (!tool) {
    return c.json({ error: 'Tool not found' }, 404);
  }

  // Create execution record
  const execution_id = uuidv4();
  await db.insert(tool_executions).values({
    id: execution_id,
    tool_id,
    user_id,
    parameters: JSON.stringify(parameters),
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  });

  try {
    // Execute tool (implement actual tool execution logic here)
    const result = await executeTool(tool, parameters);

    // Update execution record
    await db.update(tool_executions)
      .set({
        status: 'completed',
        result: JSON.stringify(result),
        updated_at: new Date(),
      })
      .where(eq(tool_executions.id, execution_id));

    return c.json({ result });
  } catch (error) {
    // Update execution record with error
    await db.update(tool_executions)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date(),
      })
      .where(eq(tool_executions.id, execution_id));

    return c.json({ error: 'Tool execution failed' }, 500);
  }
});

// Get execution history
tools_router.get('/executions', async (c) => {
  const user_id = c.get('jwtPayload').user_id;

  const executions = await db.query.tool_executions.findMany({
    where: (executions, { eq }) => eq(executions.user_id, user_id),
    orderBy: (executions, { desc }) => [desc(executions.created_at)],
  });

  return c.json({ executions });
});

// Helper function to execute tools
async function executeTool(tool: any, parameters: Record<string, any>) {
  // Implement actual tool execution logic here
  // This is a placeholder that should be replaced with real tool implementations
  return {
    success: true,
    message: `Executed ${tool.name} with parameters: ${JSON.stringify(parameters)}`,
  };
}

export { tools_router as toolRoutes };
