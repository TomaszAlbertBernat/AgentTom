import { z } from 'zod';

// Define the simplified environment schema for local-first usage
const envSchema = z.object({
  // Basic app configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']).default('INFO'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.string().default('http://localhost:3000'),

  // Authentication - simplified for local-first
  AUTH_MODE: z.enum(['local', 'multiuser']).default('local'),

  // AI Providers - simplified to essentials
  GOOGLE_API_KEY: z.string().optional(), // Required: Primary AI provider
  OPENAI_API_KEY: z.string().min(1).optional(), // Optional: Fallback AI provider

  // Optional overrides for advanced users
  DEFAULT_LLM_PROVIDER: z.string().optional(), // Default: 'google'
  DEFAULT_TEXT_MODEL: z.string().optional(), // Default: 'gemini-2.5-flash'
});

export type EnvConfig = z.infer<typeof envSchema>;

// Validate environment variables with simplified local-first approach
export const validateEnv = (): EnvConfig => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .filter((issue) => issue.code === 'invalid_type' && (issue as any).received === 'undefined')
        .map((issue) => issue.path.join('.'));

      const invalidVars = error.issues
        .filter((issue) => !(issue.code === 'invalid_type' && (issue as any).received === 'undefined'))
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`);

      console.error('❌ Environment validation failed:');

      if (missingVars.length > 0) {
        console.error('\n🔴 Missing environment variables:');
        missingVars.forEach((varName) => console.error(`  - ${varName}`));
      }

      if (invalidVars.length > 0) {
        console.error('\n🟡 Invalid environment variables:');
        invalidVars.forEach((issueMsg) => console.error(`  - ${issueMsg}`));
      }

      console.error('\n💡 For local-first usage, only GOOGLE_API_KEY is required.');
      console.error('📄 Please copy .env-example to .env and add your API keys');
      console.error('📋 API keys are read directly from the .env file on startup');

      // In development and test modes, provide safe defaults for local-first usage
      const nodeEnv = process.env.NODE_ENV || 'development';
      if (nodeEnv !== 'development' && nodeEnv !== 'test') {
        process.exit(1);
      } else {
        console.warn('⚠️  Using default configuration for local-first development.');

        // Provide a best-effort config with safe defaults for local mode
        const devConfig = {
          ...process.env,
          NODE_ENV: nodeEnv,
          LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
          PORT: process.env.PORT || '3000',
          APP_URL: process.env.APP_URL || 'http://localhost:3000',
          AUTH_MODE: process.env.AUTH_MODE || 'local',
          DEFAULT_LLM_PROVIDER: process.env.DEFAULT_LLM_PROVIDER || 'google',
          DEFAULT_TEXT_MODEL: process.env.DEFAULT_TEXT_MODEL || 'gemini-2.5-flash',
        };

        // Parse with the safe config - this should not throw
        return envSchema.parse(devConfig);
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

// Simplified service availability for local-first usage
export const isServiceEnabled = {
  google: () => !!env.GOOGLE_API_KEY, // Primary AI provider
  openai: () => !!env.OPENAI_API_KEY, // Optional fallback AI provider
};

// Simplified service status logging for local-first usage
export const logServiceStatus = () => {
  console.log('\n🔧 Configuration Status:');
  console.log('================================');
  console.log(`🎯 Auth Mode: ${env.AUTH_MODE === 'local' ? 'LOCAL (single-user)' : 'MULTI-USER'}`);
  console.log('================================');

  const services = [
    { name: 'Google Gemini', enabled: isServiceEnabled.google(), required: true },
    { name: 'OpenAI', enabled: isServiceEnabled.openai(), required: false },
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
  console.log(`📊 ${enabledCount}/${services.length} AI providers configured`);
  console.log(`🔑 ${requiredCount}/${totalRequired} required providers enabled`);

  if (requiredCount < totalRequired) {
    console.log('⚠️  Google API key is required for local-first usage!');
  }

  console.log('');
}; 

/**
 * Returns simplified service configuration status for local-first usage
 */
export const getServiceStatus = () => {
  const services = [
    { name: 'Google Gemini', enabled: isServiceEnabled.google(), required: true },
    { name: 'OpenAI', enabled: isServiceEnabled.openai(), required: false },
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