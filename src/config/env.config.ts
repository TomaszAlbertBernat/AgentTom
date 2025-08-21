import { z } from 'zod';

// Define the environment schema
const envSchema = z.object({
  // Basic app configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']).default('INFO'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_KEY: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1).default('dev-secret'),
  APP_TIMEZONE: z.string().default('Europe/Warsaw'),
  DISABLE_API_KEY: z.enum(['true', 'false']).default((process.env.NODE_ENV || 'development') === 'production' ? 'false' : 'true'),

  // Authentication mode
  AUTH_MODE: z.enum(['local', 'multiuser']).default('local'),

  // AI Providers
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  // Images provider selection (default: OpenAI DALL·E). Set to 'vertex' to use Vertex Images.
  IMAGE_PROVIDER: z.string().optional(),
  VERTEX_PROJECT_ID: z.string().optional(),
  VERTEX_LOCATION: z.string().optional(),

  // LLM defaults (optional overrides)
  DEFAULT_LLM_PROVIDER: z.string().optional(),
  DEFAULT_TEXT_MODEL: z.string().optional(),
  FALLBACK_TEXT_MODEL: z.string().optional(),

  // Langfuse
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_BASEURL: z.string().url().optional(),

  // Vector Database
  QDRANT_INDEX: z.string().optional(),
  QDRANT_URL: z.string().url().optional(),
  QDRANT_API_KEY: z.string().optional(),

  // Search
  ALGOLIA_INDEX: z.string().optional(),
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_API_KEY: z.string().optional(),

  // Google Services
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_ACCESS_TOKEN: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_TOKEN_EXPIRY: z.string().optional(),

  // Calendar (separate Google project)
  CALENDAR_CLIENT_ID: z.string().optional(),
  CALENDAR_CLIENT_SECRET: z.string().optional(),

  // External Services
  FIRECRAWL_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SMS_PHONE_NUMBER: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  USER_EMAIL: z.string().email().optional(),

  // Linear
  LINEAR_API_KEY: z.string().optional(),
  LINEAR_DEFAULT_TEAM_ID: z.string().optional(),
  LINEAR_DEFAULT_ASSIGNEE_ID: z.string().optional(),
  LINEAR_WEBHOOK_SECRET: z.string().optional(),

  // Spotify
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),

  // Hardware
  ELGATO_LIGHTS_ON: z.string().optional(),
  ELGATO_LIGHTS_OFF: z.string().optional(),

  // Crypto
  COIN_MARKET_CAP_API_KEY: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Validate environment variables
export const validateEnv = (): EnvConfig => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .filter((issue) => issue.code === 'invalid_type' && (issue as any).received === 'undefined')
        .map((issue) => issue.path.join('.'))
        // In development, ignore missing optional keys like API_KEY
        .filter((name) => (process.env.NODE_ENV || 'development') === 'production' ? true : name !== 'API_KEY');

      const invalidVars = error.issues
        .filter((issue) => !(issue.code === 'invalid_type' && (issue as any).received === 'undefined'))
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`);

      console.error('❌ Environment validation failed:');

      if (missingVars.length > 0) {
        console.error('\n🔴 Missing required environment variables:');
        missingVars.forEach((varName) => console.error(`  - ${varName}`));
      }

      if (invalidVars.length > 0) {
        console.error('\n🟡 Invalid environment variables:');
        invalidVars.forEach((issueMsg) => console.error(`  - ${issueMsg}`));
      }

      console.error('\n💡 Please check your .env file and ensure all required variables are set.');
      console.error('📋 You can use .env-example as a template.\n');

      // In development and test modes, do not hard exit to improve DX and allow tests to run
      const nodeEnv = process.env.NODE_ENV || 'development';
      if (nodeEnv !== 'development' && nodeEnv !== 'test') {
        process.exit(1);
      } else {
        console.warn('Continuing in development despite env validation warnings.');
        // Provide a best-effort config by merging defaults
        return envSchema.parse({
          NODE_ENV: nodeEnv,
          LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
          PORT: process.env.PORT || '3000',
          APP_URL: process.env.APP_URL || 'http://localhost:3000',
          API_KEY: process.env.API_KEY,
          JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
          APP_TIMEZONE: process.env.APP_TIMEZONE || 'Europe/Warsaw',
          DISABLE_API_KEY: process.env.DISABLE_API_KEY || 'true',
          AUTH_MODE: process.env.AUTH_MODE || 'local',
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test-openai-key',
          GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
          IMAGE_PROVIDER: process.env.IMAGE_PROVIDER,
          VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
          VERTEX_LOCATION: process.env.VERTEX_LOCATION,
          DEFAULT_LLM_PROVIDER: process.env.DEFAULT_LLM_PROVIDER || 'google',
          // NOTE: Never use 'gemini-2.0-flash'.
          DEFAULT_TEXT_MODEL: process.env.DEFAULT_TEXT_MODEL || 'gemini-2.5-flash',
          FALLBACK_TEXT_MODEL: process.env.FALLBACK_TEXT_MODEL || 'gpt-4o-mini',
        });
      }
    }
    throw error;
  }
};

// Get validated environment configuration
export const env = validateEnv();

// Provider env compatibility shims
// Vercel AI SDK Google provider expects GOOGLE_GENERATIVE_AI_API_KEY; we allow GOOGLE_API_KEY too.
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && env.GOOGLE_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = env.GOOGLE_API_KEY;
}

// Helper functions to check service availability
export const isServiceEnabled = {
  langfuse: () => !!(env.LANGFUSE_SECRET_KEY && env.LANGFUSE_PUBLIC_KEY),
  qdrant: () => !!(env.QDRANT_URL && env.QDRANT_API_KEY && env.QDRANT_INDEX),
  algolia: () => !!(env.ALGOLIA_APP_ID && env.ALGOLIA_API_KEY && env.ALGOLIA_INDEX),
  google: () => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  calendar: () => !!(env.CALENDAR_CLIENT_ID && env.CALENDAR_CLIENT_SECRET),
  firecrawl: () => !!env.FIRECRAWL_API_KEY,
  elevenlabs: () => !!env.ELEVENLABS_API_KEY,
  resend: () => !!env.RESEND_API_KEY,
  linear: () => !!env.LINEAR_API_KEY,
  spotify: () => !!(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET),
  anthropic: () => !!env.ANTHROPIC_API_KEY,
  xai: () => !!env.XAI_API_KEY,
  coinMarketCap: () => !!env.COIN_MARKET_CAP_API_KEY,
};

// Log service availability on startup
export const logServiceStatus = () => {
  console.log('\n🔧 Service Configuration Status:');
  console.log('================================');
  console.log(`🎯 Auth Mode: ${env.AUTH_MODE === 'local' ? 'LOCAL (single-user)' : 'MULTI-USER'}`);
  console.log('================================');
  
  const services = [
    { name: 'Google Gemini', enabled: !!env.GOOGLE_API_KEY, required: true },
    { name: 'OpenAI', enabled: !!env.OPENAI_API_KEY, required: false },
    { name: 'Anthropic', enabled: isServiceEnabled.anthropic(), required: false },
    { name: 'XAI', enabled: isServiceEnabled.xai(), required: false },
    { name: 'Langfuse', enabled: isServiceEnabled.langfuse(), required: false },
    { name: 'Qdrant', enabled: isServiceEnabled.qdrant(), required: false },
    { name: 'Algolia', enabled: isServiceEnabled.algolia(), required: false },
    { name: 'Google Services', enabled: isServiceEnabled.google(), required: false },
    { name: 'Calendar', enabled: isServiceEnabled.calendar(), required: false },
    { name: 'Firecrawl', enabled: isServiceEnabled.firecrawl(), required: false },
    { name: 'ElevenLabs', enabled: isServiceEnabled.elevenlabs(), required: false },
    { name: 'Resend', enabled: isServiceEnabled.resend(), required: false },
    { name: 'Linear', enabled: isServiceEnabled.linear(), required: false },
    { name: 'Spotify', enabled: isServiceEnabled.spotify(), required: false },
    { name: 'CoinMarketCap', enabled: isServiceEnabled.coinMarketCap(), required: false },
  ];

  services.forEach(service => {
    const status = service.enabled ? '✅' : (service.required ? '❌' : '⚪');
    const label = service.required ? '(required)' : '(optional)';
    console.log(`${status} ${service.name.padEnd(15)} ${label}`);
  });

  const enabledCount = services.filter(s => s.enabled).length;
  const requiredCount = services.filter(s => s.required && s.enabled).length;
  const totalRequired = services.filter(s => s.required).length;

  console.log('================================');
  console.log(`📊 ${enabledCount}/${services.length} services configured`);
  console.log(`🔑 ${requiredCount}/${totalRequired} required services enabled`);
  
  if (requiredCount < totalRequired) {
    console.log('⚠️  Some required services are not configured!');
  }
  
  console.log('');
}; 

/**
 * Returns structured service configuration status for health endpoints
 */
export const getServiceStatus = () => {
  const services = [
    { name: 'Google Gemini', enabled: !!env.GOOGLE_API_KEY, required: true },
    { name: 'OpenAI', enabled: !!env.OPENAI_API_KEY, required: false },
    { name: 'Anthropic', enabled: isServiceEnabled.anthropic(), required: false },
    { name: 'XAI', enabled: isServiceEnabled.xai(), required: false },
    { name: 'Langfuse', enabled: isServiceEnabled.langfuse(), required: false },
    { name: 'Qdrant', enabled: isServiceEnabled.qdrant(), required: false },
    { name: 'Algolia', enabled: isServiceEnabled.algolia(), required: false },
    { name: 'Google Services', enabled: isServiceEnabled.google(), required: false },
    { name: 'Calendar', enabled: isServiceEnabled.calendar(), required: false },
    { name: 'Firecrawl', enabled: isServiceEnabled.firecrawl(), required: false },
    { name: 'ElevenLabs', enabled: isServiceEnabled.elevenlabs(), required: false },
    { name: 'Resend', enabled: isServiceEnabled.resend(), required: false },
    { name: 'Linear', enabled: isServiceEnabled.linear(), required: false },
    { name: 'Spotify', enabled: isServiceEnabled.spotify(), required: false },
    { name: 'CoinMarketCap', enabled: isServiceEnabled.coinMarketCap(), required: false },
  ];

  const enabledCount = services.filter(s => s.enabled).length;
  const requiredCount = services.filter(s => s.required && s.enabled).length;
  const totalRequired = services.filter(s => s.required).length;

  return {
    services,
    counts: {
      enabled: enabledCount,
      requiredEnabled: requiredCount,
      totalRequired,
      total: services.length
    }
  };
};