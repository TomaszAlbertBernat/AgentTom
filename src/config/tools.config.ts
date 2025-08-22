import { spotifyService } from '../services/tools/spotify.service';
import { memoryService } from '../services/agent/memory.service';
import { resendService } from '../services/tools/resend.service';
import { fileService } from '../services/tools/file.service';
import { speakService } from '../services/tools/speak.service';
import { linearService } from '../services/tools/linear.service';
import { mapService } from '../services/tools/map.service';
import { cryptoService } from '../services/tools/crypto.service';
import { webService } from '../services/tools/web.service';
import { imageService } from '../services/tools/image.service';
import { calendarService } from '../services/agent/calendar.service';
import type { DocumentType } from '../services/agent/document.service';
import { toolSchemas } from './tool-schemas';
import { z } from 'zod';

interface ToolService {
  execute: (action: string, payload: unknown, span?: any) => Promise<DocumentType>;
}

export const toolsMap: Record<string, ToolService> = {
  spotify: spotifyService,
  memory: memoryService,
  resend: resendService,
  file: fileService,
  speak: speakService,
  linear: linearService,
  map: mapService,
  crypto: cryptoService,
  web: webService,
  image: imageService,
  calendar: calendarService
} as const;

export type ToolName = keyof typeof toolsMap;

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