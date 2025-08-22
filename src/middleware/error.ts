import { MiddlewareHandler} from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import {HTTPException} from 'hono/http-exception';
import {z} from 'zod';
import { ValidationError, NotFoundError, DatabaseError, UniqueConstraintError, ForeignKeyError } from '../utils/errors';
import { createLogger } from '../services/common/logger.service';

type ErrorResponse = {
  success: false;
  message: string;
  details?: unknown;
};

export const errorHandler = (): MiddlewareHandler => async (c, next) => {
  try {
    await next();
  } catch (error: any) {
    const log = createLogger('ErrorMiddleware');
    log.error('Unhandled error', error as Error);

    const response: ErrorResponse = {
      success: false,
      message: 'Internal Server Error'
    };
    let status: StatusCode = 500;

    if (error instanceof z.ZodError) {
      response.message = 'Validation Error';
      response.details = error.issues;
      status = 400;
      return c.json(response, status);
    }

    if (error instanceof HTTPException) {
      response.message = error.message;
      status = error.status;
      return c.json(response, status);
    }

    // Typed application errors
    if (error instanceof ValidationError) {
      response.message = error.message;
      response.details = error.context ?? error.cause;
      status = 400;
      return c.json(response, status);
    }

    if (error instanceof NotFoundError) {
      response.message = error.message;
      response.details = error.context ?? error.cause;
      status = 404;
      return c.json(response, status);
    }

    if (error instanceof UniqueConstraintError) {
      response.message = error.message;
      response.details = error.context ?? error.cause;
      status = 409;
      return c.json(response, status);
    }

    if (error instanceof ForeignKeyError) {
      response.message = error.message;
      response.details = error.context ?? error.cause;
      status = 409;
      return c.json(response, status);
    }

    if (error instanceof DatabaseError) {
      response.message = error.message;
      response.details = error.context ?? error.cause;
      status = 500;
      return c.json(response, status as any);
    }

    // Fallback
    response.message = (error?.message as string) || response.message;
    return c.json(response, status);
  }
};
