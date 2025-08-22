import { Hono } from 'hono';
import { AppEnv } from '../types/hono';
import { webService } from '../services/tools/web.service';
import { validateBody } from '../middleware/validation';
import { CommonSchemas } from '../validation/schemas';
import { z } from 'zod';
import { getServiceStatus } from '../config/env.config';
import { isLocalMode } from '../config/local-user.config';

// Extend Hono context for validated data access
declare module 'hono' {
  interface ContextVariableMap {
    validatedData?: any;
    validatedQuery?: any;
    validatedParams?: any;
  }
}

// Additional validation schemas specific to web routes
const WebContentSchema = z.object({
  url: CommonSchemas.url,
  conversation_uuid: CommonSchemas.uuid.default('default'),
  include_html: z.boolean().default(false),
  include_raw_html: z.boolean().default(false),
  max_timeout: z.number().int().min(1000).max(30000).default(10000)
});

const WebSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  conversation_uuid: CommonSchemas.uuid.default('default'),
  limit: z.number().int().min(1).max(50).default(10),
  include_images: z.boolean().default(false),
  include_videos: z.boolean().default(false)
});

const web = new Hono<AppEnv>()
  .post('/get-contents', validateBody(WebContentSchema), async c => {
    try {
      const validatedData = c.get('validatedData') as any;
      const { url, conversation_uuid } = validatedData;

      const result = await webService.getContents(url, conversation_uuid);
      
      return c.json({ 
        success: true, 
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          url_processed: url
        }
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        meta: {
          timestamp: new Date().toISOString()
        }
      }, 500);
    }
  })
  .post('/search', validateBody(WebSearchSchema), async c => {
    try {
      const validatedData = c.get('validatedData') as any;
      const { query, conversation_uuid } = validatedData;

      const result = await webService.execute('search', {
        query,
        conversation_uuid
      });

      return c.json({ 
        success: true, 
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          query_processed: query,
          results_count: Array.isArray(result) ? result.length : 1
        }
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        meta: {
          timestamp: new Date().toISOString()
        }
      }, 500);
    }
  })
  .get('/health', c => {
    const isLocal = isLocalMode();
    return c.json({
      status: 'ok',
      mode: isLocal ? 'local' : 'multi-user',
      message: isLocal ? 'Local mode: No authentication required' : 'Multi-user mode: Authentication required'
    });
  })
  .get('/health/details', c => {
    const status = getServiceStatus();
    const isLocal = isLocalMode();
    return c.json({
      status: 'ok',
      mode: isLocal ? 'local' : 'multi-user',
      auth_mode: isLocal ? 'local' : 'multi-user', // For frontend compatibility
      auth: {
        required: !isLocal,
        message: isLocal ? 'No authentication required - local mode' : 'Authentication required - multi-user mode'
      },
      ...status
    });
  });

export default web; 