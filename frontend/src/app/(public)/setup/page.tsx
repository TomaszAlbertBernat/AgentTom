'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SetupStatus {
  isComplete: boolean;
  completedSteps: string[];
  requiredSteps: string[];
  recommendations: string[];
}

interface SetupGuide {
  steps: Array<{
    id: string;
    title: string;
    description: string;
    required: boolean;
    fields?: string[];
    providers?: Array<{
      id: string;
      name: string;
      description: string;
      url: string;
      recommended?: boolean;
    }>;
  }>;
  tips: string[];
}

interface Model {
  id: string;
  name: string;
  provider: string;
  recommended?: boolean;
}

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [setupGuide, setSetupGuide] = useState<SetupGuide | null>(null);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [preferences, setPreferences] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'en',
    model: 'gemini-2.5-flash', // Default to gemini-2.5-flash as required
  });

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup/status');
      if (response.ok) {
        const data = await response.json();
        setSetupStatus(data.status);
        setSetupGuide(data.guide);
        setAvailableModels(data.availableModels);
        
        // If setup is complete, redirect to main app
        if (data.status.isComplete) {
          router.push('/');
          return;
        }
      } else {
        setError('Failed to get setup status');
      }
    } catch (err) {
      setError('Failed to connect to setup service');
    } finally {
      setLoading(false);
    }
  };

  const handleUserInfoSubmit = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/setup/user-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userInfo),
      });

      if (response.ok) {
        await fetchSetupStatus();
        setCurrentStep(1);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save user information');
      }
    } catch (err) {
      setError('Failed to save user information');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeySubmit = async (service: string, key: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/setup/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, key, testKey: true }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setApiKeys({ ...apiKeys, [service]: key });
          await fetchSetupStatus();
        } else {
          setError(data.error || 'Failed to save API key');
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save API key');
      }
    } catch (err) {
      setError('Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/setup/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        await fetchSetupStatus();
        setCurrentStep(3);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save preferences');
      }
    } catch (err) {
      setError('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          router.push('/');
        } else {
          setError(data.error || 'Failed to complete setup');
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to complete setup');
      }
    } catch (err) {
      setError('Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !setupStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading setup...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Setup Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const steps = setupGuide?.steps || [];
  const isCurrentStepComplete = setupStatus?.completedSteps.includes(steps[currentStep]?.id);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to AgentTom</h1>
          <p className="text-gray-600 mb-2">Local Mode Setup</p>
          <p className="text-sm text-gray-500">Just a few quick steps to get you chatting with AI</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${index <= currentStep 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {setupStatus?.completedSteps.includes(step.id) ? '✓' : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      w-12 h-0.5 mx-2
                      ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-2 text-sm text-gray-600">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        {/* Current step content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {currentStep === 0 && (
            <UserInfoStep
              userInfo={userInfo}
              setUserInfo={setUserInfo}
              onSubmit={handleUserInfoSubmit}
              loading={loading}
              isComplete={isCurrentStepComplete}
            />
          )}

          {currentStep === 1 && (
            <ApiKeyStep
              providers={setupGuide?.steps[1]?.providers || []}
              onSubmit={handleApiKeySubmit}
              loading={loading}
              isComplete={isCurrentStepComplete}
              setupStatus={setupStatus}
            />
          )}

          {currentStep === 2 && (
            <PreferencesStep
              preferences={preferences}
              setPreferences={setPreferences}
              models={availableModels}
              onSubmit={handlePreferencesSubmit}
              loading={loading}
              isComplete={isCurrentStepComplete}
            />
          )}

          {currentStep === 3 && (
            <CompletionStep
              setupStatus={setupStatus}
              onComplete={completeSetup}
              loading={loading}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-800"
          >
            ← Previous
          </button>
          
          {currentStep < steps.length - 1 && isCurrentStepComplete && (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Next →
            </button>
          )}
        </div>

        {/* Tips */}
        {setupGuide?.tips && (
          <div className="mt-8 bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">💡 Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              {setupGuide.tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Step components
function UserInfoStep({ userInfo, setUserInfo, onSubmit, loading, isComplete }: any) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">User Information</h2>
      <p className="text-gray-600 mb-6">Tell us a bit about yourself to personalize your experience.</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={userInfo.name}
            onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your name"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
          <input
            type="email"
            value={userInfo.email}
            onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
          <input
            type="text"
            value={userInfo.timezone}
            onChange={(e) => setUserInfo({ ...userInfo, timezone: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Auto-detected"
          />
        </div>
      </div>

      {!isComplete && (
        <button
          onClick={onSubmit}
          disabled={loading || !userInfo.name}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Information'}
        </button>
      )}

      {isComplete && (
        <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✓</span>
            <span className="text-green-800">User information saved</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ApiKeyStep({ providers, onSubmit, loading, isComplete, setupStatus }: any) {
  const [selectedProvider, setSelectedProvider] = useState('google'); // Default to Google
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);

  const hasApiKeys = setupStatus?.completedSteps.includes('api_keys');

  const handleSubmit = async () => {
    if (!selectedProvider || !apiKey) return;
    await onSubmit(selectedProvider, apiKey);
    setApiKey('');
  };

  const testApiKey = async () => {
    if (!selectedProvider || !apiKey) return;

    setTesting(true);
    try {
      const response = await fetch('/api/setup/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: selectedProvider, key: apiKey }),
      });

      const data = await response.json();
      alert(data.valid ? 'API key is valid!' : `API key test failed: ${data.error}`);
    } catch (err) {
      alert('Failed to test API key');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">AI Provider Setup</h2>
      <p className="text-gray-600 mb-6">
        Choose your AI provider to start chatting. We recommend Google AI Studio for its generous free tier and excellent performance.
      </p>
      
      {hasApiKeys && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✓</span>
            <span className="text-green-800">You have API keys configured! You can add more below.</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a provider...</option>
            {providers.map((provider: any) => (
              <option key={provider.id} value={provider.id}>
                {provider.name} {provider.recommended ? '(Recommended)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedProvider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <div className="space-y-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your API key"
              />
              
              <div className="flex space-x-2">
                <button
                  onClick={testApiKey}
                  disabled={!apiKey || testing}
                  className="bg-gray-600 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test Key'}
                </button>
                
                <button
                  onClick={handleSubmit}
                  disabled={loading || !apiKey}
                  className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Key'}
                </button>
              </div>
            </div>

            {providers.find((p: any) => p.id === selectedProvider) && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <p className="text-blue-800">
                  {providers.find((p: any) => p.id === selectedProvider).description}
                </p>
                <a
                  href={providers.find((p: any) => p.id === selectedProvider).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Get your API key →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PreferencesStep({ preferences, setPreferences, models, onSubmit, loading, isComplete }: any) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Preferences</h2>
      <p className="text-gray-600 mb-6">Customize your AgentTom experience.</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
          <select
            value={preferences.theme}
            onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="system">System (Auto)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select
            value={preferences.language}
            onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="pl">Polski</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default AI Model</label>
          <select
            value={preferences.model}
            onChange={(e) => setPreferences({ ...preferences, model: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {models.map((model: Model) => (
              <option key={model.id} value={model.id}>
                {model.name} {model.recommended ? '(Recommended)' : ''} - {model.provider}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isComplete && (
        <button
          onClick={onSubmit}
          disabled={loading}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      )}

      {isComplete && (
        <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✓</span>
            <span className="text-green-800">Preferences saved</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CompletionStep({ setupStatus, onComplete, loading }: any) {
  const canComplete = setupStatus?.isComplete;

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="text-green-600 text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-semibold mb-2">Setup Complete!</h2>
        <p className="text-gray-600">
          AgentTom is now configured and ready to use.
        </p>
      </div>

      <div className="mb-6 text-left">
        <h3 className="font-medium mb-2">What's configured:</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          {setupStatus?.completedSteps.map((step: string) => (
            <li key={step} className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              {step.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </li>
          ))}
        </ul>
      </div>

      {setupStatus?.recommendations?.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-left">
          <h3 className="font-medium text-yellow-800 mb-2">Recommendations:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {setupStatus.recommendations.map((rec: string, index: number) => (
              <li key={index}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={loading || !canComplete}
        className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Finishing...' : 'Start Using AgentTom'}
      </button>
    </div>
  );
}
