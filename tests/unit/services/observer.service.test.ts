// Type declarations for Bun test functions
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

// We will mock the 'langfuse' module before importing the observer
type CreatedState = {
  instances: any[];
  traces: any[];
  spans: any[];
  generations: any[];
  events: Array<{ parent: 'trace' | 'span'; name: string; metadata?: any }>;
  shutdownCalls: number;
};

const created: CreatedState = {
  instances: [],
  traces: [],
  spans: [],
  generations: [],
  events: [],
  shutdownCalls: 0
};

// Simple ID helpers for readability
let spanCounter = 0;
let generationCounter = 0;

mock.module('langfuse', () => {
  class FakeSpan {
    id: string;
    name: string;
    metadata: any;
    ended: boolean = false;
    output: any;

    constructor(opts: { name: string; metadata?: any }) {
      this.id = `span-${++spanCounter}`;
      this.name = opts.name;
      this.metadata = opts.metadata || {};
      created.spans.push(this);
    }

    event({ name, metadata }: { name: string; metadata?: any }) {
      created.events.push({ parent: 'span', name, metadata });
    }

    generation(opts: any) {
      const gen = new FakeGeneration(opts);
      // annotate for parent checks if needed
      (gen as any).parent = 'span';
      return gen;
    }

    end({ output }: { output?: any } = {}) {
      this.ended = true;
      this.output = output;
    }
  }

  class FakeGeneration {
    id: string;
    name: string;
    input: any;
    model?: string;
    output?: any;
    metadata?: any;
    level?: string;
    statusMessage?: string;
    ended: boolean = false;

    constructor(opts: any) {
      this.id = `gen-${++generationCounter}`;
      this.name = opts.name;
      this.input = opts.input;
      this.model = opts.model;
      this.output = opts.output;
      this.metadata = opts.metadata;
      this.level = opts.level;
      this.statusMessage = opts.statusMessage;
      created.generations.push(this);
    }

    end({ output }: { output?: any } = {}) {
      this.ended = true;
      if (output !== undefined) this.output = output;
    }
  }

  class FakeTrace {
    id: string;
    name: string;
    userId?: string | null;
    sessionId?: string | null;
    metadata?: any;
    updated?: any;

    constructor(opts: { id?: string; name: string; userId?: string | null; sessionId?: string | null; metadata?: any }) {
      this.id = opts.id || 'trace-1';
      this.name = opts.name;
      this.userId = opts.userId;
      this.sessionId = opts.sessionId;
      this.metadata = opts.metadata;
      created.traces.push(this);
    }

    span(opts: { name: string; metadata?: any }) {
      return new FakeSpan(opts);
    }

    generation(opts: any) {
      const gen = new FakeGeneration(opts);
      (gen as any).parent = 'trace';
      return gen;
    }

    event({ name, metadata }: { name: string; metadata?: any }) {
      created.events.push({ parent: 'trace', name, metadata });
    }

    async update(data: any) {
      this.updated = data;
    }
  }

  class FakeLangfuse {
    options: any;
    listeners: Record<string, Function[]> = {};
    constructor(options: any) {
      this.options = options;
      created.instances.push(this);
    }
    on(event: string, handler: Function) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(handler);
    }
    trace(opts: any) {
      return new FakeTrace(opts);
    }
    async shutdownAsync() {
      created.shutdownCalls += 1;
    }
  }

  // Export the named bindings used by the code
  // Expose on global for code under test to pick up (observer uses global injection)
  (globalThis as any).__Langfuse = FakeLangfuse;

  return {
    Langfuse: FakeLangfuse,
    LangfuseTraceClient: class {},
    LangfuseSpanClient: class {},
    LangfuseGenerationClient: class {}
  } as any;
});

// Utilities
const resetCreated = () => {
  created.instances.length = 0;
  created.traces.length = 0;
  created.spans.length = 0;
  created.generations.length = 0;
  created.events.length = 0;
  created.shutdownCalls = 0;
  spanCounter = 0;
  generationCounter = 0;
};

describe('observer.service Langfuse integration', () => {
  let instance: ReturnType<import('../../../src/services/agent/observer.service').createObserver>;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    resetCreated();
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_HOST = 'https://cloud.langfuse.com';

    // Import after mocking
    const mod = await import('../../../src/services/agent/observer.service');
    instance = mod.createObserver();

    // Seed state used in observer metadata
    const { stateManager } = await import('../../../src/services/agent/state.service');
    stateManager.updateConfig({ user_uuid: 'user-123', conversation_uuid: 'conv-456', model: 'gemini-2.5-flash' });
    stateManager.updateProfile({ ai_name: 'AgentTom', user_name: 'Tester' });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('initializeTrace creates a Langfuse trace with metadata', async () => {
    const trace = instance.initializeTrace('unit-trace');
    expect(trace).toBeTruthy();
    expect(created.traces.length).toBe(1);
    expect(created.traces[0].name).toBe('unit-trace');
    expect(created.traces[0].userId).toBe('user-123');
    expect(created.traces[0].sessionId).toBe('conv-456');
    expect(created.traces[0].metadata.ai_name).toBe('AgentTom');
    expect(created.traces[0].metadata.user_name).toBe('Tester');
  });

  test('span lifecycle: startSpan -> event -> endSpan', async () => {
    instance.initializeTrace('span-test');

    const span = instance.startSpan('work-span', { step: 1 });
    expect(span).toBeTruthy();
    expect(created.spans.length).toBe(1);
    expect(created.spans[0].name).toBe('work-span');

    instance.recordEvent('processing', { ok: true }, span.id);
    expect(created.events.length).toBe(1);
    expect(created.events[0]).toEqual({ parent: 'span', name: 'processing', metadata: { ok: true } });

    instance.endSpan(span.id, { result: 'done' });
    expect(created.spans[0].ended).toBe(true);
    expect(created.spans[0].output).toEqual({ result: 'done' });
  });

  test('generation lifecycle: startGeneration under trace and under span, then end', async () => {
    instance.initializeTrace('gen-test');

    // Generation directly under trace
    const gen1 = instance.startGeneration({ name: 'gen-1', input: { q: 'hello' } });
    expect(gen1).toBeTruthy();
    expect(created.generations.length).toBe(1);
    expect(created.generations[0].name).toBe('gen-1');
    expect((created.generations[0] as any).parent).toBe('trace');

    // Generation under a span
    const span = instance.startSpan('parent-span');
    const gen2 = instance.startGeneration({ name: 'gen-2', input: { q: 'world' } }, span.id);
    expect(gen2).toBeTruthy();
    expect(created.generations.length).toBe(2);
    expect((created.generations[1] as any).parent).toBe('span');

    // End the second generation
    instance.endGeneration(created.generations[1].id, { text: 'ok' });
    expect(created.generations[1].ended).toBe(true);
    expect(created.generations[1].output).toEqual({ text: 'ok' });
  });

  test('recordEvent on trace without parentId', async () => {
    instance.initializeTrace('evt-test');
    instance.recordEvent('trace-event', { meta: 1 });
    expect(created.events.length).toBe(1);
    expect(created.events[0]).toEqual({ parent: 'trace', name: 'trace-event', metadata: { meta: 1 } });
  });

  test('finalizeTrace updates trace IO and clears current trace', async () => {
    instance.initializeTrace('finalize-test');
    await instance.finalizeTrace('ignored', [{ role: 'user', content: 'hi' } as any], [{ text: 'hello' }]);

    expect(created.traces[0].updated).toBeTruthy();
    expect(created.traces[0].updated.input).toBeTruthy();
    expect(created.traces[0].updated.output).toBeTruthy();
  });

  test('shutdown delegates to Langfuse.shutdownAsync', async () => {
    instance.initializeTrace('shutdown-test');
    await instance.shutdown();
    expect(created.shutdownCalls).toBe(1);
  });

  test('error paths: using APIs before initialization or with invalid ids throws', async () => {
    // startSpan without trace
    expect(() => instance.startSpan('no-trace')).toThrow('Trace not initialized');

    instance.initializeTrace('error-test');
    // endSpan with invalid id
    expect(() => instance.endSpan('missing')).toThrow('Span with id missing not found');
    // startGeneration with missing parent
    expect(() => instance.startGeneration({ name: 'bad', input: {} }, 'not-found')).toThrow('Parent span with id not-found not found');
    // endGeneration with invalid id
    expect(() => instance.endGeneration('missing')).toThrow('Generation with id missing not found');
  });
});


