/**
 * Setup wizard service
 * Handles first-run configuration and setup process
 * @module setup.service
 */

import { z } from 'zod';
import { 
  loadLocalUserConfig, 
  saveLocalUserConfig, 
  setApiKey, 
  getApiKey, 
  testApiKey,
  isLocalMode 
} from '../../config/local-user.config';

// Setup step schemas
const userInfoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required').optional(),
  timezone: z.string().optional(),
});

const apiKeySetupSchema = z.object({
  service: z.enum(['google', 'openai', 'xai']),
  key: z.string().min(10, 'API key must be at least 10 characters'),
  testKey: z.boolean().optional().default(false),
});

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  model: z.string().optional(),
});

// Setup completion status
interface SetupStatus {
  isComplete: boolean;
  completedSteps: string[];
  requiredSteps: string[];
  recommendations: string[];
}

/**
 * Setup wizard service
 */
export const setupService = {
  /**
   * Check if initial setup is complete
   */
  getSetupStatus(): SetupStatus {
    const config = loadLocalUserConfig();
    const completedSteps: string[] = [];
    const recommendations: string[] = [];

    // Check if setup is already marked as completed
    if (config.preferences.setupCompleted) {
      return {
        isComplete: true,
        completedSteps: ['user_info', 'api_keys', 'preferences'],
        requiredSteps: ['user_info', 'api_keys'],
        recommendations: [],
      };
    }

    // Check basic user info - completed if user has provided a name
    if (config.name && config.name.trim() !== '' && config.name !== 'Local User') {
      completedSteps.push('user_info');
    }

    // Check API keys - completed if at least one AI provider key is present in environment
    const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const hasAnyAIKey = hasGoogleKey || hasOpenAIKey;

    if (hasAnyAIKey) {
      completedSteps.push('api_keys');
    }

    // Check preferences - completed if user has made any preference changes
    const hasCustomPreferences = config.preferences.theme !== 'system' ||
        config.preferences.language !== 'en' ||
        config.preferences.model !== 'gemini-2.5-flash';

    if (hasCustomPreferences) {
      completedSteps.push('preferences');
    }

    // Required steps for basic functionality
    const requiredSteps = ['user_info', 'api_keys'];

    // Recommendations
    if (!hasGoogleKey && !hasOpenAIKey) {
      recommendations.push('Add at least one AI provider API key to your .env file (GOOGLE_API_KEY or OPENAI_API_KEY)');
    }
    if (!config.email) {
      recommendations.push('Add email for better user experience (optional)');
    }
    if (!hasGoogleKey && hasOpenAIKey) {
      recommendations.push('Consider adding GOOGLE_API_KEY to your .env file for primary AI service');
    }
    if (config.name === 'Local User') {
      recommendations.push('Set your name to personalize your experience (optional)');
    }

    const isComplete = requiredSteps.every(step => completedSteps.includes(step));

    return {
      isComplete,
      completedSteps,
      requiredSteps,
      recommendations,
    };
  },

  /**
   * Setup user information
   */
  async setupUserInfo(data: z.infer<typeof userInfoSchema>) {
    const validatedData = userInfoSchema.parse(data);
    
    const updates: Partial<typeof validatedData> & { 
      preferences?: Partial<{ timezone: string }> 
    } = {
      name: validatedData.name,
      email: validatedData.email,
    };

    if (validatedData.timezone) {
      updates.preferences = { timezone: validatedData.timezone };
    }

    const updatedConfig = saveLocalUserConfig(updates);

    return {
      success: true,
      message: 'User information updated successfully',
      user: {
        name: updatedConfig.name,
        email: updatedConfig.email,
        timezone: updatedConfig.preferences.timezone,
      },
    };
  },

  /**
   * Setup API key for a service (DISABLED - use .env file only)
   * @deprecated API keys must be configured in .env file
   */
  async setupApiKey(data: z.infer<typeof apiKeySetupSchema>) {
    throw new Error(`Web-based API key setup is disabled. Please configure ${data.service.toUpperCase()}_API_KEY in your .env file.`);
  },

  /**
   * Setup user preferences
   */
  async setupPreferences(data: z.infer<typeof preferencesSchema>) {
    const validatedData = preferencesSchema.parse(data);
    
    const config = loadLocalUserConfig();
    const updatedPreferences = {
      ...config.preferences,
      ...validatedData,
    };

    const updatedConfig = saveLocalUserConfig({ preferences: updatedPreferences });

    return {
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedConfig.preferences,
    };
  },

  /**
   * Complete setup process
   */
  async completeSetup() {
    const status = this.getSetupStatus();
    
    if (!status.isComplete) {
      return {
        success: false,
        error: 'Setup is not complete',
        missingSteps: status.requiredSteps.filter(step => 
          !status.completedSteps.includes(step)
        ),
        status,
      };
    }

    // Mark setup as completed in config
    const config = loadLocalUserConfig();
    const updatedConfig = saveLocalUserConfig({
      preferences: {
        ...config.preferences,
        setupCompleted: true,
      },
    });

    return {
      success: true,
      message: 'Setup completed successfully! AgentTom is ready to use.',
      config: {
        user: {
          name: updatedConfig.name,
          email: updatedConfig.email,
        },
        preferences: updatedConfig.preferences,
        hasApiKeys: Object.keys(config.apiKeys).length > 0,
      },
    };
  },

  /**
   * Reset setup (for development/testing)
   */
  async resetSetup() {
    if (!isLocalMode()) {
      throw new Error('Setup reset is only available in local mode');
    }

    const config = loadLocalUserConfig();
    const resetConfig = saveLocalUserConfig({
      name: 'Local User',
      email: undefined,
      preferences: {
        theme: 'system',
        language: 'en',
        timezone: 'Europe/Warsaw',
        model: 'gemini-2.5-flash',
        setupCompleted: false,
      },
      // Keep API keys but reset other settings
    });

    return {
      success: true,
      message: 'Setup reset successfully',
      config: resetConfig,
    };
  },

  /**
   * Get available AI models for setup
   */
  getAvailableModels() {
    return [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', recommended: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },

      { id: 'grok-2', name: 'Grok 2', provider: 'xai' },
    ];
  },

  /**
   * Get setup guide/instructions
   */
  getSetupGuide() {
    return {
      steps: [
        {
          id: 'user_info',
          title: 'User Information',
          description: 'Set your name and basic information',
          required: true,
          fields: ['name', 'email', 'timezone'],
        },
        {
          id: 'api_keys',
          title: 'AI Provider Setup',
          description: 'Configure at least one AI provider for chat functionality',
          required: true,
          providers: [
            {
              id: 'google',
              name: 'Google AI Studio',
              description: 'Recommended - Free tier available, fast responses',
              url: 'https://makersuite.google.com/app/apikey',
              recommended: true,
            },
            {
              id: 'openai',
              name: 'OpenAI',
              description: 'Fallback option - Requires paid account',
              url: 'https://platform.openai.com/api-keys',
            },
          ],
        },
        {
          id: 'preferences',
          title: 'Preferences',
          description: 'Customize your AgentTom experience',
          required: false,
          fields: ['theme', 'language', 'model'],
        },
      ],
      tips: [
        'You only need one AI provider to get started',
        'Google AI Studio offers a generous free tier',
        'You can always add more API keys later',
        'Setup takes less than 5 minutes',
      ],
    };
  },
};
