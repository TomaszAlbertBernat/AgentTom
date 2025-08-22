'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Key,
  CheckCircle,
  ArrowRight,
  FileText,
  Copy,
  Terminal,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function SetupPage() {
  const router = useRouter();
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Auto-redirect countdown
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRedirect = () => {
    setIsRedirecting(true);
    router.push('/chat');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Settings className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to AgentTom</h1>
          <p className="text-lg text-gray-600">Your local-first AI assistant</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Key className="h-6 w-6 text-blue-600" />
              Setup Required
            </CardTitle>
            <CardDescription className="text-base">
              Configure your API keys to get started with AgentTom
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Security Notice */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Security First:</strong> AgentTom uses local-first configuration to keep your API keys secure and under your control.
                No web-based setup means your keys never leave your machine.
              </AlertDescription>
            </Alert>

            {/* Setup Steps */}
            <div className="grid gap-4">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-blue-900 mb-2">Copy Environment Template</h3>
                  <p className="text-blue-800 mb-3">
                    Create your .env file from the provided template:
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-white rounded border font-mono text-sm">
                    <code className="flex-grow">cp .env-example .env</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('cp .env-example .env')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-green-900 mb-2">Add Your API Keys</h3>
                  <p className="text-green-800 mb-3">
                    Edit the .env file and add your API keys:
                  </p>
                  <div className="bg-white rounded border p-3 font-mono text-sm">
                    <div className="text-gray-600"># Required: Google AI Studio API Key</div>
                    <div><span className="text-blue-600">GOOGLE_API_KEY</span>=your_google_api_key_here</div>
                    <div className="text-gray-600 mt-2"># Optional: OpenAI API Key (fallback)</div>
                    <div><span className="text-green-600">OPENAI_API_KEY</span>=your_openai_api_key_here</div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-purple-900 mb-2">Restart the Server</h3>
                  <p className="text-purple-800 mb-3">
                    Restart your development server to load the new configuration:
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-white rounded border font-mono text-sm">
                    <Terminal className="h-4 w-4 text-gray-400" />
                    <code className="flex-grow">npm run dev</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('npm run dev')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Success Indicator */}
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Auto-Detection:</strong> Once you have valid API keys in your .env file,
                AgentTom will automatically detect the configuration and mark setup as complete.
                You'll be redirected to the chat interface immediately.
              </AlertDescription>
            </Alert>

            {/* API Key Status */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Required API Keys
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Google AI Studio (Primary)</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">Required</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">OpenAI (Fallback)</span>
                  <Badge variant="outline">Optional</Badge>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                onClick={handleRedirect}
                disabled={isRedirecting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isRedirecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    Continue to Chat
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
                className="flex-1"
              >
                <Key className="mr-2 h-4 w-4" />
                Get Google API Key
              </Button>
            </div>

            {/* Auto-redirect notice */}
            <div className="text-center text-sm text-gray-500">
              {redirectCountdown > 0 ? (
                <p>Auto-redirecting to chat in {redirectCountdown} seconds...</p>
              ) : (
                <p>Setup complete! Taking you to the chat interface...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
