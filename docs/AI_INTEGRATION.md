# AI Integration

This document describes the AI integration features and configuration in AliceAGI.

## Google Gemini (default) with OpenAI fallback

We use Google Gemini (AI Studio) as the default LLM provider with automatic fallback to OpenAI when Google returns rate-limit/quota errors. The integration is implemented via the Vercel AI SDK to keep a consistent API across providers.

### Setup
- Add environment variables (see `.env-example`):
  - `GOOGLE_API_KEY` — API key from Google AI Studio
  - `OPENAI_API_KEY` — used as fallback
  - `DEFAULT_LLM_PROVIDER=google`
  - `DEFAULT_TEXT_MODEL=gemini-2.5-flash`
  - `FALLBACK_TEXT_MODEL=gpt-4o-mini`

- Install providers if not present:
  ```bash
  bun add ai @ai-sdk/google @ai-sdk/openai
  ```

### Usage pattern (Vercel AI SDK)
Centralized in `src/services/common/llm.service.ts`. Example shape shown here for reference:

```ts
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';

// Try Google first, fallback to OpenAI on HTTP 429/quota
async function generateWithFallback(prompt: string) {
  try {
    const { text } = await generateText({ model: google('gemini-2.5-flash'), prompt });
    return text;
  } catch (err: any) {
    const status = err?.status || err?.response?.status;
    if (status === 429) {
      const { text } = await generateText({ model: openai('gpt-4o-mini'), prompt });
      return text;
    }
    throw err;
  }
}
```

### Embeddings
- Default: Gemini `text-embedding-004` when available
- Fallback: OpenAI `text-embedding-3-large`

### Multimodal (vision)
- Default: Gemini multimodal (e.g., `gemini-1.5-flash`)
- Image generation: default OpenAI DALL·E 3; optional Vertex Images (Imagen 3) behind env flag

#### Vertex Images (Imagen 3) – optional
- Set env to enable:
  - `IMAGE_PROVIDER=vertex`
  - `VERTEX_PROJECT_ID=<gcp-project-id>`
  - `VERTEX_LOCATION=us-central1` (or your region)
  - Provide Google credentials via ADC (`GOOGLE_APPLICATION_CREDENTIALS` or workload identity)
- The service will call Vertex AI Images `imagegeneration:generateImages` and store the returned image.

### Streaming
- Streaming uses the Vercel AI SDK `streamText`. If initial stream creation fails with 429, we retry with the fallback model.

### Rate limits & quotas
- Detect rate limits via HTTP 429 and provider-specific messages like “quota” or “resource exhausted”. On detection, we switch to the fallback model and can apply short TTL backoff.

### Audio transcription
- Default: Gemini via AI Studio using a multimodal model (`gemini-1.5-flash`) with inline audio content
- Fallback: OpenAI Whisper (`whisper-1`) if Gemini is unavailable or errors
- Configuration: set `GOOGLE_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`) for Gemini; `OPENAI_API_KEY` enables fallback
- Smoke tests: enable with `SMOKE_LLM=1` and at least one of the keys above

### References
- Google Gemini API
  - [Overview and docs](https://ai.google.dev/gemini-api/docs)
  - [Node quickstart](https://ai.google.dev/gemini-api/docs/get-started/node)
  - [Embeddings guide](https://ai.google.dev/gemini-api/docs/embeddings)
  - [Multimodal / vision](https://ai.google.dev/gemini-api/docs/vision)
  - [Rate limits and quotas](https://ai.google.dev/gemini-api/docs/quotas)
- Vercel AI SDK
  - [Google provider](https://sdk.vercel.ai/providers/google)
  - [Introduction](https://sdk.vercel.ai/docs/introduction)
- OpenAI
  - [Rate limits](https://platform.openai.com/docs/guides/rate-limits)
  - [Embeddings: text-embedding-3](https://platform.openai.com/docs/guides/embeddings)
- Image generation (future option)
  - [Vertex AI Images API (Imagen 3)](https://cloud.google.com/vertex-ai/generative-ai/docs/image)
- Speech-to-Text (replacement options for Whisper)
  - [Google Cloud Speech-to-Text v2](https://cloud.google.com/speech-to-text/v2/docs)

## 🤖 OpenAI Integration

### Configuration

```typescript
// Configuration in .env
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

// Usage in code
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL,
  temperature: Number(process.env.OPENAI_TEMPERATURE),
  maxTokens: Number(process.env.OPENAI_MAX_TOKENS)
});
```

### Model Configuration

```typescript
interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

const defaultConfig: ModelConfig = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0
};
```

## 📝 Prompt Management

### Directory Structure

```
prompts/
├── chat/           # Chat-related prompts
│   ├── weather.ts
│   ├── general.ts
│   └── tools.ts
├── tools/          # Tool-specific prompts
│   ├── weather.ts
│   ├── calendar.ts
│   └── music.ts
└── system/         # System-level prompts
    ├── context.ts
    └── personality.ts
```

### Prompt Structure

```typescript
interface Prompt {
  system: string;
  user: string;
  context?: Record<string, any>;
  examples?: Array<{
    input: string;
    output: string;
  }>;
}

export const weatherPrompt: Prompt = {
  system: `You are a weather assistant. Provide weather information based on the user's location and preferences.`,
  user: `What's the weather like in {location}?`,
  context: {
    units: 'metric',
    format: 'detailed'
  },
  examples: [
    {
      input: "What's the weather in London?",
      output: "The weather in London is currently cloudy with a temperature of 18°C. There's a 20% chance of rain."
    }
  ]
};
```

## 🔍 Vector Search Integration

### Configuration

```typescript
// Configuration in .env
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_api_key
QDRANT_COLLECTION=conversations

// Vector service configuration
const vectorConfig = {
  collection: 'conversations',
  dimensions: 1536,
  distance: 'cosine'
};
```

### Usage

```typescript
// Search implementation
const searchResults = await vectorService.search({
  query: 'weather in New York',
  limit: 5,
  filter: {
    type: 'weather',
    date: { $gte: new Date() }
  }
});

// Store vectors
await vectorService.store({
  id: 'uuid',
  vector: embedding,
  metadata: {
    type: 'weather',
    location: 'New York',
    date: new Date()
  }
});
```

## 🧠 AI Processing Pipeline

### 1. Input Processing
```typescript
interface ProcessedInput {
  text: string;
  context: Record<string, any>;
  metadata: {
    source: string;
    timestamp: Date;
    user: string;
  };
}
```

### 2. Context Building
```typescript
interface Context {
  conversation: {
    history: Message[];
    summary: string;
  };
  user: {
    preferences: Record<string, any>;
    history: Record<string, any>;
  };
  tools: {
    available: string[];
    state: Record<string, any>;
  };
}
```

### 3. Response Generation
```typescript
interface GeneratedResponse {
  text: string;
  metadata: {
    model: string;
    tokens: number;
    processing_time: number;
  };
  actions: Array<{
    type: string;
    params: Record<string, any>;
  }>;
}
```

## 🔄 Memory Management

### Short-term Memory
```typescript
interface ShortTermMemory {
  conversation: Message[];
  context: Context;
  tools: ToolState[];
}
```

### Long-term Memory
```typescript
interface LongTermMemory {
  user: {
    preferences: Record<string, any>;
    history: Record<string, any>;
  };
  knowledge: {
    facts: Record<string, any>;
    relationships: Record<string, any>;
  };
}
```

## 📊 AI Monitoring

### Performance Metrics
```typescript
interface AIMetrics {
  response_time: number;
  token_usage: {
    prompt: number;
    completion: number;
    total: number;
  };
  model_performance: {
    latency: number;
    throughput: number;
    error_rate: number;
  };
}
```

### Quality Metrics
```typescript
interface QualityMetrics {
  relevance: number;
  coherence: number;
  helpfulness: number;
  safety: number;
}
```

## 🔧 Error Handling

### AI-specific Errors
```typescript
interface AIError extends Error {
  type: 'model_error' | 'token_limit' | 'content_filter' | 'rate_limit';
  details: {
    model: string;
    code: string;
    message: string;
  };
  context: {
    prompt: string;
    parameters: Record<string, any>;
  };
}
```

### Error Recovery
```typescript
const handleAIError = async (error: AIError) => {
  switch (error.type) {
    case 'token_limit':
      return await retryWithShorterContext(error);
    case 'rate_limit':
      return await retryWithBackoff(error);
    case 'content_filter':
      return await handleContentFilter(error);
    default:
      return await fallbackResponse(error);
  }
};
``` 