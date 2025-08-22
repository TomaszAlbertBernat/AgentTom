import { memoryService } from '../services/agent/memory.service';
import { fileService } from '../services/tools/file.service';
import { speakService } from '../services/tools/speak.service';
import { cryptoService } from '../services/tools/crypto.service';
import { imageService } from '../services/tools/image.service';
import type { DocumentType } from '../services/agent/document.service';
import { toolSchemas } from './tool-schemas';
import { z } from 'zod';
import { createLogger } from '../services/common/logger.service';

const logger = createLogger('ToolsConfig');

// Service availability detection functions
const isServiceAvailable = {
  spotify: () => {
    // Require explicit Spotify credentials
    return !!process.env.SPOTIFY_CLIENT_ID && !!process.env.SPOTIFY_CLIENT_SECRET;
  },
  linear: () => {
    // Require explicit Linear API key
    return !!process.env.LINEAR_API_KEY;
  },
  resend: () => {
    // Require explicit Resend API key
    return !!process.env.RESEND_API_KEY;
  },
  map: () => {
    // Google Maps requires Google API key
    return !!process.env.GOOGLE_API_KEY;
  },
  web: () => {
    // Web service uses Firecrawl API; do not fall back to Google key here
    return !!process.env.FIRECRAWL_API_KEY;
  },
  calendar: () => {
    // Calendar requires Google API key
    return !!process.env.GOOGLE_API_KEY;
  },
  youtube: () => {
    // YouTube transcripts do not require API key for basic functionality
    return true;
  }
};

interface ToolService {
  execute: (action: string, payload: unknown, span?: any) => Promise<DocumentType>;
}

// Lazy-loaded external services with error handling
const createExternalServiceLoader = (serviceName: string, importFn: () => Promise<any>) => {
  let cachedService: any = null;
  let loadAttempted = false;

  return async (): Promise<ToolService | null> => {
    if (cachedService) return cachedService;
    if (loadAttempted) return null;

    try {
      loadAttempted = true;
      const module = await importFn();
      cachedService = module.default || module[serviceName + 'Service'];
      logger.info(`External service loaded: ${serviceName}`);
      return cachedService;
    } catch (error) {
      logger.warn(`Failed to load external service: ${serviceName}`, error);
      return null;
    }
  };
};

// Core services - always available
const coreToolsMap: Record<string, ToolService> = {
  memory: memoryService,
  file: fileService,
  speak: speakService,
  crypto: cryptoService,
  image: imageService
};

// External services - loaded dynamically based on availability
const externalToolsLoaders: Record<string, () => Promise<ToolService | null>> = {
  spotify: createExternalServiceLoader('spotify', () => import('../services/tools/spotify.service')),
  linear: createExternalServiceLoader('linear', () => import('../services/tools/linear.service')),
  resend: createExternalServiceLoader('resend', () => import('../services/tools/resend.service')),
  map: createExternalServiceLoader('map', () => import('../services/tools/map.service')),
  web: createExternalServiceLoader('web', () => import('../services/tools/web.service')),
  calendar: createExternalServiceLoader('calendar', () => import('../services/agent/calendar.service'))
};

// Build the final tools map dynamically
export const buildToolsMap = async (): Promise<Record<string, ToolService>> => {
  const toolsMap: Record<string, ToolService> = { ...coreToolsMap };

  // Load external services that are available
  for (const [serviceName, loader] of Object.entries(externalToolsLoaders)) {
    if (isServiceAvailable[serviceName as keyof typeof isServiceAvailable]?.()) {
      const service = await loader();
      if (service) {
        toolsMap[serviceName] = service;
        logger.info(`External service available: ${serviceName}`);
      }
    } else {
      logger.info(`External service not available: ${serviceName}`);
    }
  }

  return toolsMap;
};

// For backward compatibility, provide a static toolsMap that loads on demand
let cachedToolsMap: Record<string, ToolService> | null = null;

export const getToolsMap = async (): Promise<Record<string, ToolService>> => {
  if (!cachedToolsMap) {
    cachedToolsMap = await buildToolsMap();
  }
  return cachedToolsMap;
};

// Legacy export for backward compatibility
export const toolsMap: Record<string, ToolService> = coreToolsMap;

// Define all possible tool names including external ones
export type ToolName = 'memory' | 'file' | 'speak' | 'crypto' | 'image' | 'spotify' | 'linear' | 'resend' | 'map' | 'web' | 'calendar';

type ToolSchema = {
  [K in ToolName]: {
    [key: string]: z.ZodType<any, any, any>;
  };
};

/**
 * Validates tool action payload against its schema
 * @param tool - Name of the tool
 * @param action - Action to perform
 * @param payload - Payload to validate
 * @returns Validated payload or throws error
 */
export const validateToolPayload = <T extends ToolName>(
  tool: T,
  action: string,
  payload: unknown
): unknown => {
  const schemas = toolSchemas as ToolSchema;
  const schema = schemas[tool][action];
  if (!schema) {
    throw new Error(`Invalid action '${action}' for tool '${tool}'`);
  }
  return schema.parse(payload);
}; 