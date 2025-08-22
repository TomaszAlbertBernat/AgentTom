import createClient from 'openapi-fetch';
import type { paths } from './types';
import { API_BASE_URL } from '../config';
import { normalizeError, getUserErrorMessage } from '../utils/errors';
import { showErrorToast } from '../hooks/useToast';

const baseClient = createClient<paths>({ baseUrl: API_BASE_URL });

export interface ApiWrapperOptions {
  showToastOnError?: boolean;
  toastMessage?: string;
}

/**
 * Enhanced API wrapper with error handling and toast notifications
 */
export const api = {
  GET: async <TPath extends keyof paths>(
    path: TPath,
    options?: {
      params?: paths[TPath] extends { get: { parameters: any } }
        ? paths[TPath]['get']['parameters']
        : never;
      showToastOnError?: boolean;
      toastMessage?: string;
    }
  ) => {
    try {
      const result = await baseClient.GET(path, {
        params: options?.params as any,
      });

      if (result.error) {
        const normalizedError = normalizeError(result.error);

        if (options?.showToastOnError !== false) {
          showErrorToast(result.error, {
            description: options?.toastMessage,
          });
        }

        return {
          data: null,
          error: normalizedError,
          response: result.response,
        };
      }

      return {
        data: result.data,
        error: null,
        response: result.response,
      };
    } catch (error) {
      const normalizedError = normalizeError(error);

      if (options?.showToastOnError !== false) {
        showErrorToast(error, {
          description: options?.toastMessage,
        });
      }

      return {
        data: null,
        error: normalizedError,
        response: null,
      };
    }
  },

  POST: async <TPath extends keyof paths>(
    path: TPath,
    options?: {
      body?: paths[TPath] extends { post: { requestBody: any } }
        ? paths[TPath]['post']['requestBody']['content']['application/json']
        : never;
      params?: paths[TPath] extends { post: { parameters: any } }
        ? paths[TPath]['post']['parameters']
        : never;
      showToastOnError?: boolean;
      toastMessage?: string;
    }
  ) => {
    try {
      const result = await baseClient.POST(path, {
        body: options?.body as any,
        params: options?.params as any,
      });

      if (result.error) {
        const normalizedError = normalizeError(result.error);

        if (options?.showToastOnError !== false) {
          showErrorToast(result.error, {
            description: options?.toastMessage,
          });
        }

        return {
          data: null,
          error: normalizedError,
          response: result.response,
        };
      }

      return {
        data: result.data,
        error: null,
        response: result.response,
      };
    } catch (error) {
      const normalizedError = normalizeError(error);

      if (options?.showToastOnError !== false) {
        showErrorToast(error, {
          description: options?.toastMessage,
        });
      }

      return {
        data: null,
        error: normalizedError,
        response: null,
      };
    }
  },

  PUT: async <TPath extends keyof paths>(
    path: TPath,
    options?: {
      body?: paths[TPath] extends { put: { requestBody: any } }
        ? paths[TPath]['put']['requestBody']['content']['application/json']
        : never;
      params?: paths[TPath] extends { put: { parameters: any } }
        ? paths[TPath]['put']['parameters']
        : never;
      showToastOnError?: boolean;
      toastMessage?: string;
    }
  ) => {
    try {
      const result = await baseClient.PUT(path, {
        body: options?.body as any,
        params: options?.params as any,
      });

      if (result.error) {
        const normalizedError = normalizeError(result.error);

        if (options?.showToastOnError !== false) {
          showErrorToast(result.error, {
            description: options?.toastMessage,
          });
        }

        return {
          data: null,
          error: normalizedError,
          response: result.response,
        };
      }

      return {
        data: result.data,
        error: null,
        response: result.response,
      };
    } catch (error) {
      const normalizedError = normalizeError(error);

      if (options?.showToastOnError !== false) {
        showErrorToast(error, {
          description: options?.toastMessage,
        });
      }

      return {
        data: null,
        error: normalizedError,
        response: null,
      };
    }
  },

  DELETE: async <TPath extends keyof paths>(
    path: TPath,
    options?: {
      params?: paths[TPath] extends { delete: { parameters: any } }
        ? paths[TPath]['delete']['parameters']
        : never;
      showToastOnError?: boolean;
      toastMessage?: string;
    }
  ) => {
    try {
      const result = await baseClient.DELETE(path, {
        params: options?.params as any,
      });

      if (result.error) {
        const normalizedError = normalizeError(result.error);

        if (options?.showToastOnError !== false) {
          showErrorToast(result.error, {
            description: options?.toastMessage,
          });
        }

        return {
          data: null,
          error: normalizedError,
          response: result.response,
        };
      }

      return {
        data: result.data,
        error: null,
        response: result.response,
      };
    } catch (error) {
      const normalizedError = normalizeError(error);

      if (options?.showToastOnError !== false) {
        showErrorToast(error, {
          description: options?.toastMessage,
        });
      }

      return {
        data: null,
        error: normalizedError,
        response: null,
      };
    }
  },
};

/**
 * Utility function to handle API errors in a consistent way
 */
export function handleApiError(error: unknown, customMessage?: string) {
  const normalizedError = normalizeError(error);

  if (customMessage) {
    showErrorToast(error, { description: customMessage });
  } else {
    showErrorToast(error);
  }

  return normalizedError;
}

/**
 * Hook for using API with automatic error handling
 */
export function useApi() {
  return {
    api,
    handleApiError,
  };
}
