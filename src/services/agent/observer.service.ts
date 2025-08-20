import {Langfuse as LangfuseDefault, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient} from 'langfuse';
import {z} from 'zod';
import {stateManager} from './state.service';
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

interface ObserverService {
  trace: LangfuseTraceClient | null;
  activeSpans: Map<string, LangfuseSpanClient>;
  activeGenerations: Map<string, LangfuseGenerationClient>;
}

export const createObserver = () => {
  // Allow tests to inject a fake Langfuse via globalThis.__Langfuse
  const LangfuseImpl = (globalThis as any).__Langfuse || LangfuseDefault;

  const langfuse = new LangfuseImpl({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_HOST,
    requestTimeout: 10000
  });

  langfuse.on('error', (error: Error) => {
    // Avoid noisy console error in observers; consider integrating with logger if needed
  });

  const observer: ObserverService = {
    trace: null,
    activeSpans: new Map(),
    activeGenerations: new Map()
  };

  return {
    initializeTrace: (name: string) => {
      const state = stateManager.getState();

      observer.trace = langfuse.trace({
        id: uuidv4(),
        name,
        userId: state.config.user_uuid,
        sessionId: state.config.conversation_uuid,
        metadata: {
          ai_name: state.profile.ai_name,
          user_name: state.profile.user_name
        }
      });

      return observer.trace;
    },

    startSpan: (name: string, metadata?: Record<string, unknown>) => {
      if (!observer.trace) throw new ValidationError('Trace not initialized');

      const span = observer.trace.span({
        name,
        metadata: {
          ...metadata,
          ...stateManager.getState().config,
          timestamp: new Date().toISOString()
        }
      });

      observer.activeSpans.set(span.id, span);
      return span;
    },

    endSpan: (spanId: string, output?: unknown) => {
      const span = observer.activeSpans.get(spanId);
      if (!span) throw new NotFoundError(`Span with id ${spanId}`);

      span.end({output});
      observer.activeSpans.delete(spanId);
    },

    startGeneration: (params: GenerationInput, parentId?: string) => {
      if (!observer.trace) throw new ValidationError('Trace not initialized');

      const parentSpan = parentId ? observer.activeSpans.get(parentId) : null;
      if (!parentSpan && parentId) {
        throw new NotFoundError(`Parent span with id ${parentId}`);
      }

      const state = stateManager.getState();
      const validated = GenerationInputSchema.parse(params);

      const generation = (parentSpan || observer.trace).generation({
        name: validated.name,
        input: validated.input,
        model: state.config.model,
        output: validated.output,
        metadata: validated.metadata,
        level: validated.level,
        statusMessage: validated.statusMessage
      });

      observer.activeGenerations.set(generation.id, generation);
      return generation;
    },

    endGeneration: (generationId: string, output?: unknown) => {
      const generation = observer.activeGenerations.get(generationId);
      if (!generation) throw new NotFoundError(`Generation with id ${generationId}`);

      generation.end({output});
      observer.activeGenerations.delete(generationId);
    },

    recordEvent: (name: string, data?: Record<string, unknown>, parentId?: string) => {
      let parent: LangfuseTraceClient | LangfuseSpanClient;

      if (parentId) {
        const parentSpan = observer.activeSpans.get(parentId);
        if (!parentSpan) throw new NotFoundError(`Parent span with id ${parentId}`);
        parent = parentSpan;
      } else {
        if (!observer.trace) throw new ValidationError('Trace not initialized');
        parent = observer.trace;
      }

      return parent.event({
        name,
        metadata: data
      });
    },

    finalizeTrace: async (traceId: string, messages: CoreMessage[], completions: unknown[]) => {
      if (!observer.trace) throw new ValidationError('Trace not initialized');

      await observer.trace.update({
        input: messages,
        output: completions,
        metadata: {
          ...stateManager.getState().config,
          completed_at: new Date().toISOString()
        }
      });

      observer.trace = null;
    },

    async shutdown() {
      await langfuse.shutdownAsync();
    }
  };
};

export const observer = createObserver();
