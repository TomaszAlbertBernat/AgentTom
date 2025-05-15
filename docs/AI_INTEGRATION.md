# AI Integration

This document describes the AI integration features and configuration in AliceAGI.

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