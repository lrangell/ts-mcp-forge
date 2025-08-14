import { Result, ok, err, ResultAsync } from 'neverthrow';
import { McpError, GeneralErrors } from '../core/mcp-errors.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

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

export function toMcpError<T>(
  result: Result<T, unknown>,
  code = ErrorCode.InternalError,
  defaultMessage = ErrorMessages.EXECUTION_FAILED
): Result<T, McpError> {
  return result.mapErr((error) => new McpError(code, extractErrorMessage(error, defaultMessage)));
}

export function createValidationError(field: string): McpError {
  return GeneralErrors.invalidParams(`${field} is required`);
}

export function createMethodNotFoundError(methodName: string): McpError {
  return GeneralErrors.methodNotFound(`Method '${methodName}' not found`);
}

export function getMethodOrError(target: unknown, methodName: string): Result<Function, McpError> {
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

export function mcpErrorResponse(
  id: string | number | null,
  error: McpError | Error | string
): unknown {
  const errorObj =
    error instanceof McpError ? error : GeneralErrors.internalError(extractErrorMessage(error));

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
