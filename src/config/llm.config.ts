interface ModelSpecs {
  id: string;
  contextWindow: number;
  maxOutput: number;
  knowledgeCutoff: string;
}

export const providers: Record<string, Record<string, ModelSpecs>> = {
  openai: {
    // OpenAI models retained for fallback only
    'gpt-4o': {
      id: 'gpt-4o',
      contextWindow: 128_000,
      maxOutput: 16_384,
      knowledgeCutoff: '2023-10'
    },
    'gpt-4o-mini': {
      id: 'gpt-4o-mini',
      contextWindow: 128_000,
      maxOutput: 16_384,
      knowledgeCutoff: '2023-10'
    },
    'o1-preview': {
      id: 'o1-preview',
      contextWindow: 128_000,
      maxOutput: 32_768,
      knowledgeCutoff: '2023-10'
    },
    'o1-mini': {
      id: 'o1-mini',
      contextWindow: 128_000,
      maxOutput: 65_536,
      knowledgeCutoff: '2023-10'
    }
  },
  google: {
    // Gemini latest fast multimodal
    'gemini-2.5-flash': {
      id: 'gemini-2.5-flash',
      contextWindow: 1_000_000,
      maxOutput: 8_192,
      knowledgeCutoff: '2024-07'
    },
    // NOTE: 'gemini-2.0-flash' is intentionally omitted from defaults; prefer 2.5.
    'gemini-1.5-flash': {
      id: 'gemini-1.5-flash',
      contextWindow: 1_000_000,
      maxOutput: 8_192,
      knowledgeCutoff: '2024-07'
    }
  }
};
