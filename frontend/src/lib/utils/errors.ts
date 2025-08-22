/**
 * Centralized error handling utilities for AgentTom frontend
 */

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  statusCode?: number;
}

export interface NormalizedError {
  code: string;
  message: string;
  details?: unknown;
  statusCode?: number;
  isRetryable: boolean;
  userMessage: string;
}

/**
 * Error codes used throughout the application
 */
export const ERROR_CODES = {
  // Authentication errors
  AUTH_UNAUTHORIZED: 'auth/unauthorized',
  AUTH_FORBIDDEN: 'auth/forbidden',
  AUTH_TOKEN_EXPIRED: 'auth/token_expired',
  AUTH_INVALID_CREDENTIALS: 'auth/invalid_credentials',

  // Network errors
  NETWORK_TIMEOUT: 'network/timeout',
  NETWORK_OFFLINE: 'network/offline',
  NETWORK_SERVER_ERROR: 'network/server_error',

  // Validation errors
  VALIDATION_REQUIRED: 'validation/required',
  VALIDATION_FORMAT: 'validation/format',
  VALIDATION_SIZE: 'validation/size',

  // API errors
  API_NOT_FOUND: 'api/not_found',
  API_RATE_LIMITED: 'api/rate_limited',
  API_SERVER_ERROR: 'api/server_error',

  // Tool errors
  TOOL_EXECUTION_FAILED: 'tool/execution_failed',
  TOOL_NOT_AVAILABLE: 'tool/not_available',
  TOOL_INVALID_PARAMS: 'tool/invalid_params',

  // File errors
  FILE_UPLOAD_FAILED: 'file/upload_failed',
  FILE_TOO_LARGE: 'file/too_large',
  FILE_INVALID_TYPE: 'file/invalid_type',
  FILE_NOT_FOUND: 'file/not_found',

  // Chat errors
  CHAT_MESSAGE_FAILED: 'chat/message_failed',
  CHAT_STREAM_FAILED: 'chat/stream_failed',

  // Generic errors
  UNKNOWN_ERROR: 'unknown/error',
} as const;

/**
 * Maps HTTP status codes to error codes
 */
const STATUS_CODE_MAP: Record<number, string> = {
  400: ERROR_CODES.VALIDATION_FORMAT,
  401: ERROR_CODES.AUTH_UNAUTHORIZED,
  403: ERROR_CODES.AUTH_FORBIDDEN,
  404: ERROR_CODES.API_NOT_FOUND,
  413: ERROR_CODES.FILE_TOO_LARGE,
  429: ERROR_CODES.API_RATE_LIMITED,
  500: ERROR_CODES.API_SERVER_ERROR,
  502: ERROR_CODES.NETWORK_SERVER_ERROR,
  503: ERROR_CODES.NETWORK_SERVER_ERROR,
  504: ERROR_CODES.NETWORK_TIMEOUT,
};

/**
 * User-friendly error messages
 */
const USER_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTH_UNAUTHORIZED]: 'Please log in to continue',
  [ERROR_CODES.AUTH_FORBIDDEN]: 'You don\'t have permission to access this resource',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',

  [ERROR_CODES.NETWORK_TIMEOUT]: 'Request timed out. Please try again',
  [ERROR_CODES.NETWORK_OFFLINE]: 'You appear to be offline. Please check your connection',
  [ERROR_CODES.NETWORK_SERVER_ERROR]: 'Server is temporarily unavailable. Please try again later',

  [ERROR_CODES.VALIDATION_REQUIRED]: 'This field is required',
  [ERROR_CODES.VALIDATION_FORMAT]: 'Please check your input format',
  [ERROR_CODES.VALIDATION_SIZE]: 'File size is too large',

  [ERROR_CODES.API_NOT_FOUND]: 'The requested resource was not found',
  [ERROR_CODES.API_RATE_LIMITED]: 'Too many requests. Please wait a moment and try again',
  [ERROR_CODES.API_SERVER_ERROR]: 'Something went wrong on our end. Please try again',

  [ERROR_CODES.TOOL_EXECUTION_FAILED]: 'Tool execution failed. Please try again',
  [ERROR_CODES.TOOL_NOT_AVAILABLE]: 'This tool is currently unavailable',
  [ERROR_CODES.TOOL_INVALID_PARAMS]: 'Invalid tool parameters provided',

  [ERROR_CODES.FILE_UPLOAD_FAILED]: 'Failed to upload file. Please try again',
  [ERROR_CODES.FILE_TOO_LARGE]: 'File is too large. Please choose a smaller file',
  [ERROR_CODES.FILE_INVALID_TYPE]: 'File type is not supported',
  [ERROR_CODES.FILE_NOT_FOUND]: 'File not found',

  [ERROR_CODES.CHAT_MESSAGE_FAILED]: 'Failed to send message. Please try again',
  [ERROR_CODES.CHAT_STREAM_FAILED]: 'Connection lost. Please refresh and try again',

  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again',
};

/**
 * Determines if an error is retryable
 */
function isRetryableError(code: string, statusCode?: number): boolean {
  const retryableCodes = [
    ERROR_CODES.NETWORK_TIMEOUT,
    ERROR_CODES.NETWORK_SERVER_ERROR,
    ERROR_CODES.API_SERVER_ERROR,
    ERROR_CODES.API_RATE_LIMITED,
  ];

  // 5xx errors are generally retryable
  if (statusCode && statusCode >= 500) {
    return true;
  }

  return retryableCodes.includes(code);
}

/**
 * Normalizes various error types into a consistent format
 */
export function normalizeError(error: unknown): NormalizedError {
  // Handle API errors from openapi-fetch
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = error as AppError;
    const code = STATUS_CODE_MAP[apiError.statusCode || 0] || ERROR_CODES.UNKNOWN_ERROR;
    return {
      code,
      message: apiError.message,
      details: apiError.details,
      statusCode: apiError.statusCode,
      isRetryable: isRetryableError(code, apiError.statusCode),
      userMessage: USER_MESSAGES[code] || apiError.message,
    };
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: ERROR_CODES.NETWORK_SERVER_ERROR,
      message: error.message,
      isRetryable: true,
      userMessage: USER_MESSAGES[ERROR_CODES.NETWORK_SERVER_ERROR],
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error.message,
      isRetryable: false,
      userMessage: USER_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error,
      isRetryable: false,
      userMessage: error,
    };
  }

  // Fallback for unknown error types
  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'An unknown error occurred',
    isRetryable: false,
    userMessage: USER_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
  };
}

/**
 * Creates a user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  const normalized = normalizeError(error);
  return normalized.userMessage;
}

/**
 * Checks if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
  const normalized = normalizeError(error);
  return normalized.isRetryable;
}
