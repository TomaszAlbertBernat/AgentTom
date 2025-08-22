// Type declarations for optional langfuse dependency
// This allows the code to work whether langfuse is installed or not

export interface LangfuseSpanClient {
  event(event: {
    name: string;
    input?: any;
    output?: any;
    level?: 'DEFAULT' | 'DEBUG' | 'WARNING' | 'ERROR';
  }): void;
}

export interface LangfuseTraceClient {
  span(options: { name: string }): LangfuseSpanClient;
}

export interface LangfuseGenerationClient {
  // Add generation client types if needed
}

// Fallback implementations when langfuse is not available
export const createMockSpan = (): LangfuseSpanClient => ({
  event: () => {} // No-op implementation
});

export const createMockTrace = (): LangfuseTraceClient => ({
  span: () => createMockSpan()
});

// Types are already exported above 