import { Result, ok, err } from 'neverthrow';
import { McpError } from './mcp-errors.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Configuration for a field validation
 */
interface FieldValidation {
  fieldName: string;
  errorMessage: string;
  optional?: boolean;
  validator?: (value: unknown) => boolean;
}

/**
 * Creates a validation function for a specific parameter type using Railway Oriented Programming
 * @param validations Array of field validations to perform
 * @returns A validation function that returns Result<T, McpError>
 */
export function createValidator<T>(
  validations: FieldValidation[]
): (params: unknown) => Result<T, McpError> {
  return (params: unknown): Result<T, McpError> => {
    // Handle case where params is null/undefined but all fields are optional
    if (!params || typeof params !== 'object') {
      const hasRequiredFields = validations.some((v) => !v.optional);
      if (hasRequiredFields) {
        return err(new McpError(ErrorCode.InvalidParams, 'Parameters must be an object'));
      } else {
        // All fields are optional, return empty object
        return ok({} as T);
      }
    }

    const typedParams = params as Record<string, unknown>;

    for (const validation of validations) {
      const value = typedParams[validation.fieldName];

      if (!validation.optional && (value === undefined || value === null || value === '')) {
        return err(new McpError(ErrorCode.InvalidParams, validation.errorMessage));
      }

      if (value !== undefined && value !== null && validation.validator) {
        if (!validation.validator(value)) {
          return err(new McpError(ErrorCode.InvalidParams, validation.errorMessage));
        }
      }
    }

    return ok(typedParams as T);
  };
}

/**
 * Creates a validator that checks for a single required field
 * @param fieldName The name of the required field
 * @param errorMessage The error message if the field is missing
 * @returns A validation function
 */
export function createRequiredFieldValidator<T>(
  fieldName: string,
  errorMessage?: string
): (params: unknown) => Result<T, McpError> {
  return createValidator<T>([
    {
      fieldName,
      errorMessage: errorMessage || `${fieldName} is required`,
    },
  ]);
}

/**
 * Creates a validator for an object with multiple required fields
 * @param requiredFields Map of field names to error messages
 * @returns A validation function
 */
export function createMultiFieldValidator<T>(
  requiredFields: Record<string, string>
): (params: unknown) => Result<T, McpError> {
  const validations: FieldValidation[] = Object.entries(requiredFields).map(
    ([fieldName, errorMessage]) => ({
      fieldName,
      errorMessage,
    })
  );

  return createValidator<T>(validations);
}

/**
 * Chains multiple validators together using Railway Oriented Programming
 * @param validators Array of validation functions
 * @returns A combined validation function
 */
export function chainValidators<T>(
  ...validators: Array<(params: unknown) => Result<T, McpError>>
): (params: unknown) => Result<T, McpError> {
  return (params: unknown): Result<T, McpError> => {
    let result: Result<T, McpError> = ok(params as T);

    for (const validator of validators) {
      result = result.andThen(() => validator(params));
    }

    return result;
  };
}
