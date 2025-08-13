import { Result, ok, err, ResultAsync } from 'neverthrow';
import { JsonRpcError, ErrorCodes } from '../core/jsonrpc.js';

const ErrorMessages = {
  EXECUTION_FAILED: 'Execution failed',
} as const;

export function extractErrorMessage(error: unknown, defaultMessage = 'Execution failed'): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return defaultMessage;
}

export function toJsonRpcError<T>(
  result: Result<T, unknown>,
  code = ErrorCodes.INTERNAL_ERROR,
  defaultMessage = ErrorMessages.EXECUTION_FAILED
): Result<T, JsonRpcError> {
  return result.mapErr(
    (error) => new JsonRpcError(code, extractErrorMessage(error, defaultMessage))
  );
}

export function createValidationError(field: string): JsonRpcError {
  return new JsonRpcError(ErrorCodes.INVALID_PARAMS, `${field} is required`);
}

export function createMethodNotFoundError(methodName: string): JsonRpcError {
  return new JsonRpcError(ErrorCodes.INTERNAL_ERROR, `Method '${methodName}' not found`);
}

export function getMethodOrError(
  target: unknown,
  methodName: string
): Result<Function, JsonRpcError> {
  const method = (target as Record<string, unknown>)[methodName];
  if (typeof method !== 'function') {
    return err(createMethodNotFoundError(methodName));
  }
  return ok(method as Function);
}

export function wrapAsync<T>(
  fn: () => Promise<T>,
  errorTransform?: (error: unknown) => Error
): ResultAsync<T, Error> {
  return ResultAsync.fromPromise(fn(), (error) =>
    errorTransform ? errorTransform(error) : new Error(extractErrorMessage(error))
  );
}

export function wrapSync<T>(
  fn: () => T,
  errorTransform?: (error: unknown) => Error
): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(errorTransform ? errorTransform(error) : new Error(extractErrorMessage(error)));
  }
}

export function jsonRpcErrorResponse(
  id: string | number | null,
  error: JsonRpcError | Error | string
): unknown {
  const errorObj =
    error instanceof JsonRpcError
      ? error
      : new JsonRpcError(ErrorCodes.INTERNAL_ERROR, extractErrorMessage(error));

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: errorObj.code,
      message: errorObj.message,
      data: errorObj.data,
    },
  };
}
