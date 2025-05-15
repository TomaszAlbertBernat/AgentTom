# Monitoring and Logging

This document describes the monitoring and logging capabilities in AliceAGI.

## 📊 Monitoring Overview

### Key Metrics
- Response times
- Error rates
- Resource usage
- API call volumes
- AI model performance
- Tool execution metrics

### Monitoring Tools
- Sentry for error tracking
- Langfuse for AI observability
- Custom logging system
- Health check endpoints

## 🔍 Sentry Integration

### Configuration
```typescript
// Configuration in .env
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0

// Usage in code
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE),
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express()
  ]
});
```

### Error Tracking
```typescript
// Basic error tracking
try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
  throw error;
}

// Custom error tracking
Sentry.withScope((scope) => {
  scope.setTag('feature', 'weather');
  scope.setUser({ id: 'user_id' });
  scope.setExtra('context', { location: 'New York' });
  Sentry.captureException(error);
});
```

### Performance Monitoring
```typescript
// Transaction tracking
const transaction = Sentry.startTransaction({
  name: 'weather-request',
  op: 'http.server'
});

try {
  // Your code
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('error');
  throw error;
} finally {
  transaction.finish();
}
```

## 📈 Langfuse Integration

### Configuration
```typescript
// Configuration in .env
LANGFUSE_API_KEY=your_langfuse_key
LANGFUSE_HOST=https://cloud.langfuse.com

// Usage in code
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  apiKey: process.env.LANGFUSE_API_KEY,
  host: process.env.LANGFUSE_HOST
});
```

### AI Interaction Tracking
```typescript
// Track AI interactions
const trace = await langfuse.trace({
  name: 'weather-query',
  metadata: {
    location: 'New York',
    units: 'metric'
  }
});

await trace.span({
  name: 'openai-completion',
  input: { prompt: 'What is the weather?' },
  output: { response: 'Sunny, 25°C' }
});
```

### Performance Metrics
```typescript
// Track model performance
await trace.metrics({
  name: 'model-performance',
  value: {
    latency: 150,
    tokens: 100,
    cost: 0.002
  }
});
```

## 📝 Logging System

### Configuration
```typescript
// Configuration in .env
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=logs/app.log

// Logger configuration
import { logger } from './utils/logger';

logger.configure({
  level: process.env.LOG_LEVEL,
  format: process.env.LOG_FORMAT,
  file: process.env.LOG_FILE
});
```

### Logging Levels
```typescript
// Different logging levels
logger.error('Critical error occurred', {
  error: error.message,
  stack: error.stack
});

logger.warn('Warning message', {
  context: { userId, action }
});

logger.info('Information message', {
  metadata: { version, environment }
});

logger.debug('Debug information', {
  details: { request, response }
});
```

### Structured Logging
```typescript
// Structured logging
logger.info('API request', {
  method: 'POST',
  path: '/api/weather',
  duration: 150,
  status: 200,
  user: {
    id: 'user_id',
    role: 'user'
  }
});
```

## 🏥 Health Checks

### Endpoints
```typescript
// Health check endpoints
app.get('/api/health', async (c) => {
  const health = await healthCheck.checkAll();
  return c.json(health);
});

app.get('/api/health/openai', async (c) => {
  const health = await healthCheck.checkOpenAI();
  return c.json(health);
});

app.get('/api/health/database', async (c) => {
  const health = await healthCheck.checkDatabase();
  return c.json(health);
});
```

### Health Check Implementation
```typescript
interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
  };
}

const healthCheck = {
  async checkAll(): Promise<HealthCheck> {
    const checks = await Promise.all([
      this.checkOpenAI(),
      this.checkDatabase(),
      this.checkVectorStore()
    ]);
    
    return {
      status: this.determineOverallStatus(checks),
      checks: this.formatChecks(checks)
    };
  }
};
```

## 📊 Metrics Collection

### Custom Metrics
```typescript
interface Metrics {
  timestamp: Date;
  type: string;
  value: number;
  labels: Record<string, string>;
}

const metrics = {
  async record(metric: Metrics) {
    // Store metric
    await this.store(metric);
    
    // Alert if threshold exceeded
    if (this.shouldAlert(metric)) {
      await this.alert(metric);
    }
  }
};
```

### Performance Metrics
```typescript
interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

const performance = {
  async collect(): Promise<PerformanceMetrics> {
    return {
      responseTime: await this.measureResponseTime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: await this.getActiveConnections()
    };
  }
};
```

## 🔔 Alerting

### Alert Configuration
```typescript
interface AlertConfig {
  metric: string;
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high';
  channels: string[];
}

const alerts = {
  configs: new Map<string, AlertConfig>(),
  
  async check(metric: Metrics) {
    const config = this.configs.get(metric.type);
    if (config && this.shouldAlert(metric, config)) {
      await this.sendAlert(metric, config);
    }
  }
};
```

### Alert Channels
```typescript
interface AlertChannel {
  type: 'email' | 'slack' | 'webhook';
  config: Record<string, any>;
}

const alertChannels = {
  async send(channel: AlertChannel, alert: Alert) {
    switch (channel.type) {
      case 'email':
        return await this.sendEmail(channel.config, alert);
      case 'slack':
        return await this.sendSlack(channel.config, alert);
      case 'webhook':
        return await this.sendWebhook(channel.config, alert);
    }
  }
};
``` 