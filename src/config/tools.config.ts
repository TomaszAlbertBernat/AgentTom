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