import { Result, ok, err } from 'neverthrow';
import { JsonRpcError, ErrorCodes } from './jsonrpc.js';

/**
 * Configuration for a field validation
 */
interface FieldValidation {
  field: string;
  errorMessage: string;
  optional?: boolean;
  validator?: (value: any) => boolean;
}

/**
 * Creates a validation function for a specific parameter type using Railway Oriented Programming
 * @param validations Array of field validations to perform
 * @returns A validation function that returns Result<T, JsonRpcError>
 */
export function createValidator<T>(
  validations: FieldValidation[]
): (params: unknown) => Result<T, JsonRpcError> {
  return (params: unknown): Result<T, JsonRpcError> => {
    if (!params || typeof params !== 'object') {
      return err(new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Parameters must be an object'));
    }

    const typedParams = params as Record<string, any>;

    // Check each validation rule
    for (const validation of validations) {
      const value = typedParams[validation.field];

      // Check required fields
      if (!validation.optional && (value === undefined || value === null || value === '')) {
        return err(new JsonRpcError(ErrorCodes.INVALID_PARAMS, validation.errorMessage));
      }

      // Run custom validator if provided
      if (value !== undefined && value !== null && validation.validator) {
        if (!validation.validator(value)) {
          return err(new JsonRpcError(ErrorCodes.INVALID_PARAMS, validation.errorMessage));
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
): (params: unknown) => Result<T, JsonRpcError> {
  return createValidator<T>([
    {
      field: fieldName,
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
): (params: unknown) => Result<T, JsonRpcError> {
  const validations: FieldValidation[] = Object.entries(requiredFields).map(
    ([field, errorMessage]) => ({
      field,
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
  ...validators: Array<(params: unknown) => Result<T, JsonRpcError>>
): (params: unknown) => Result<T, JsonRpcError> {
  return (params: unknown): Result<T, JsonRpcError> => {
    for (const validator of validators) {
      const result = validator(params);
      if (result.isErr()) {
        return result;
      }
    }
    return ok(params as T);
  };
}
