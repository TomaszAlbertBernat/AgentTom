# Tools

This document describes the available tools and their configuration in AliceAGI.

## 🛠️ Available Tools

### 1. Weather Tool
```typescript
interface WeatherTool {
  id: 'weather';
  name: 'Weather Tool';
  description: 'Get weather information for a location';
  parameters: {
    location: string;
    units: 'metric' | 'imperial';
  };
  response: {
    temperature: number;
    condition: string;
    humidity: number;
    wind: {
      speed: number;
      direction: string;
    };
  };
}
```

### 2. Calendar Tool
```typescript
interface CalendarTool {
  id: 'calendar';
  name: 'Calendar Tool';
  description: 'Manage calendar events';
  parameters: {
    action: 'create' | 'read' | 'update' | 'delete';
    event?: {
      title: string;
      start: Date;
      end: Date;
      description?: string;
    };
    eventId?: string;
  };
  response: {
    success: boolean;
    event?: CalendarEvent;
  };
}
```

### 3. Music Tool
```typescript
interface MusicTool {
  id: 'music';
  name: 'Music Tool';
  description: 'Control music playback';
  parameters: {
    action: 'play' | 'pause' | 'next' | 'previous' | 'search';
    query?: string;
  };
  response: {
    success: boolean;
    track?: {
      name: string;
      artist: string;
      album: string;
      duration: number;
    };
  };
}
```

## 🔧 Tool Configuration

### Tool Registration
```typescript
interface ToolConfig {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, ParameterConfig>;
  handler: ToolHandler;
  enabled: boolean;
}

interface ParameterConfig {
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  description: string;
  default?: any;
  validation?: (value: any) => boolean;
}

// Example tool registration
const weatherTool: ToolConfig = {
  id: 'weather',
  name: 'Weather Tool',
  description: 'Get weather information',
  parameters: {
    location: {
      type: 'string',
      required: true,
      description: 'Location to get weather for'
    },
    units: {
      type: 'string',
      required: false,
      description: 'Units to use (metric/imperial)',
      default: 'metric',
      validation: (value) => ['metric', 'imperial'].includes(value)
    }
  },
  handler: async (params) => {
    // Tool implementation
  },
  enabled: true
};
```

### Tool State Management
```typescript
interface ToolState {
  toolId: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  lastUsed: Date;
  usageCount: number;
  errorCount: number;
  metadata: Record<string, any>;
}

// State management
const toolState = new Map<string, ToolState>();

const updateToolState = (toolId: string, update: Partial<ToolState>) => {
  const currentState = toolState.get(toolId) || {
    toolId,
    status: 'idle',
    lastUsed: new Date(),
    usageCount: 0,
    errorCount: 0,
    metadata: {}
  };
  
  toolState.set(toolId, {
    ...currentState,
    ...update,
    lastUsed: new Date()
  });
};
```

## 🔄 Tool Execution Flow

### 1. Tool Selection
```typescript
interface ToolSelection {
  toolId: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    toolId: string;
    confidence: number;
  }>;
}

const selectTool = async (query: string): Promise<ToolSelection> => {
  // Tool selection logic
};
```

### 2. Parameter Extraction
```typescript
interface ParameterExtraction {
  parameters: Record<string, any>;
  confidence: number;
  missing: string[];
  invalid: Array<{
    parameter: string;
    reason: string;
  }>;
}

const extractParameters = async (
  query: string,
  toolConfig: ToolConfig
): Promise<ParameterExtraction> => {
  // Parameter extraction logic
};
```

### 3. Tool Execution
```typescript
interface ToolExecution {
  toolId: string;
  parameters: Record<string, any>;
  result: any;
  executionTime: number;
  error?: Error;
}

const executeTool = async (
  toolId: string,
  parameters: Record<string, any>
): Promise<ToolExecution> => {
  // Tool execution logic
};
```

## 📊 Tool Monitoring

### Usage Metrics
```typescript
interface ToolMetrics {
  toolId: string;
  usage: {
    total: number;
    successful: number;
    failed: number;
  };
  performance: {
    averageExecutionTime: number;
    maxExecutionTime: number;
    minExecutionTime: number;
  };
  errors: {
    count: number;
    types: Record<string, number>;
  };
}
```

### Health Checks
```typescript
interface ToolHealth {
  toolId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  issues: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}
```

## 🔧 Error Handling

### Tool-specific Errors
```typescript
interface ToolError extends Error {
  toolId: string;
  type: 'validation' | 'execution' | 'timeout' | 'external';
  details: {
    parameters?: Record<string, any>;
    externalError?: any;
  };
}
```

### Error Recovery
```typescript
const handleToolError = async (error: ToolError) => {
  switch (error.type) {
    case 'validation':
      return await retryWithValidatedParameters(error);
    case 'timeout':
      return await retryWithTimeout(error);
    case 'external':
      return await handleExternalError(error);
    default:
      return await fallbackTool(error);
  }
};
``` 