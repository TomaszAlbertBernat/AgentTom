import {z} from 'zod';
import {v4 as uuidv4} from 'uuid';
import {CoreMessage} from 'ai';
import { ValidationError, NotFoundError } from '../../utils/errors';

const GenerationInputSchema = z.object({
  name: z.string(),
  input: z.unknown(),
  output: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  level: z.enum(['DEBUG', 'DEFAULT', 'WARNING', 'ERROR']).optional(),
  statusMessage: z.string().optional()
});

type GenerationInput = z.infer<typeof GenerationInputSchema>;

// Simplified span interface for local-first usage
export interface SimpleSpan {
  id: string;
  name: string;
  end?: (output?: unknown) => void;
  generation?: (params: any) => SimpleGeneration;
  event?: (params: any) => void;
}

// Simplified generation interface for local-first usage
export interface SimpleGeneration {
  id: string;
  name: string;
  end?: (output?: unknown) => void;
}

interface ObserverService {
  trace: null; // Simplified for local-first usage
  activeSpans: Map<string, SimpleSpan>;
  activeGenerations: Map<string, SimpleGeneration>;
}

export const createObserver = () => {
  const observer: ObserverService = {
    trace: null,
    activeSpans: new Map(),
    activeGenerations: new Map()
  };

  return {
    initializeTrace: (name: string) => {
      // Simplified: no-op for local-first usage
      return null;
    },

    startSpan: (name: string, metadata?: Record<string, unknown>) => {
      // Simplified: return a simple span for local-first usage
      const span: SimpleSpan = {
        id: uuidv4(),
        name,
        end: (output?: unknown) => {
          observer.activeSpans.delete(span.id);
        },
        generation: (params: any): SimpleGeneration => {
          // Return a mock generation for compatibility
          const generation: SimpleGeneration = {
            id: uuidv4(),
            name: params.name || 'generation',
            end: (output?: unknown) => {
              // No-op for local-first usage
            }
          };
          observer.activeGenerations.set(generation.id, generation);
          return generation;
        },
        event: (params: any) => {
          // No-op for local-first usage
        }
      };
      observer.activeSpans.set(span.id;
      return span;
    },

    endSpan: (spanId: string, output?: unknown) => {
      const span = observer.activeSpans.get(spanId);
      if (!span) throw new NotFoundError(`Span with id ${spanId}`);
      observer.activeSpans.delete(spanId);
    },

    startGeneration: (params: GenerationInput, parentId?: string) => {
      // Simplified: return a simple generation for local-first usage
      const validated = GenerationInputSchema.parse(params);
      const generation: SimpleGeneration = {
        id: uuidv4(),
        name: validated.name,
        end: (output?: unknown) => {
          observer.activeGenerations.delete(generation.id);
        }
      };
      observer.activeGenerations.set(generation.id, generation);
      return generation;
    },

    endGeneration: (generationId: string, output?: unknown) => {
      const generation = observer.activeGenerations.get(generationId);
      if (!generation) throw new NotFoundError(`Generation with id ${generationId}`);
      observer.activeGenerations.delete(generationId);
    },

    recordEvent: (name: string, data?: Record<string, unknown>, parentId?: string) => {
      // Simplified: no-op for local-first usage
      return { id: uuidv4(), name };
    },

    finalizeTrace: async (traceId: string, messages: CoreMessage[], completions: unknown[]) => {
      // Simplified: no-op for local-first usage
      observer.trace = null;
    },

    async shutdown() {
      // Simplified: no-op for local-first usage
    }
  };
};

export const observer = createObserver();
