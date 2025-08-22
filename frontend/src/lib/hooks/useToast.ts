'use client';

import { toast } from 'sonner';
import { normalizeError, type NormalizedError } from '@/lib/utils/errors';

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Custom hook for showing toast notifications
 */
export function useToast() {
  const showError = (error: unknown, options?: ToastOptions) => {
    const normalizedError = normalizeError(error);
    toast.error(normalizedError.userMessage, {
      description: options?.description || getErrorDescription(normalizedError),
      duration: options?.duration || getDuration(normalizedError),
      action: getRetryAction(normalizedError, options?.action),
    });
  };

  const showSuccess = (message: string, options?: ToastOptions) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
    });
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
    });
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      action: options?.action,
    });
  };

  return {
    showError,
    showSuccess,
    showInfo,
    showWarning,
    toast, // Expose the original toast function for advanced usage
  };
}

/**
 * Get a description for the error based on its type
 */
function getErrorDescription(error: NormalizedError): string | undefined {
  // Add specific descriptions for certain error types
  switch (error.code) {
    case 'auth/unauthorized':
      return 'Please check your login status and try again';
    case 'network/timeout':
      return 'The request took too long to complete';
    case 'network/server_error':
      return 'Our servers are experiencing issues';
    case 'api/rate_limited':
      return 'You\'ve made too many requests recently';
    case 'tool/execution_failed':
      return 'The tool failed to execute properly';
    case 'file/too_large':
      return 'Try using a smaller file';
    case 'file/invalid_type':
      return 'Please check the supported file formats';
    default:
      return undefined;
  }
}

/**
 * Get appropriate duration for different error types
 */
function getDuration(error: NormalizedError): number {
  // Retryable errors should stay visible longer
  if (error.isRetryable) {
    return 8000; // 8 seconds
  }

  // Critical errors should also stay visible longer
  if (error.code.startsWith('auth/')) {
    return 6000; // 6 seconds
  }

  return 5000; // 5 seconds default
}

/**
 * Get retry action for retryable errors
 */
function getRetryAction(
  error: NormalizedError,
  customAction?: ToastOptions['action']
) {
  if (customAction) {
    return customAction;
  }

  if (error.isRetryable) {
    return {
      label: 'Retry',
      onClick: () => {
        // This will be handled by the calling component
        // The component should provide its own retry logic
        window.location.reload();
      },
    };
  }

  return undefined;
}

/**
 * Utility function to show error toast without hook
 */
export function showErrorToast(error: unknown, options?: ToastOptions) {
  const normalizedError = normalizeError(error);
  toast.error(normalizedError.userMessage, {
    description: options?.description || getErrorDescription(normalizedError),
    duration: options?.duration || getDuration(normalizedError),
    action: getRetryAction(normalizedError, options?.action),
  });
}

/**
 * Utility function to show success toast without hook
 */
export function showSuccessToast(message: string, options?: ToastOptions) {
  toast.success(message, {
    description: options?.description,
    duration: options?.duration || 4000,
    action: options?.action,
  });
}
