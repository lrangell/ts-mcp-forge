import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Tool, Param } from '../../../src/decorators/index.js';
import { ErrorCode } from '../../../src/index.js';

// Test server class for error handling testing
class ErrorTestServer extends MCPServer {
  constructor() {
    super('Error Test Server', '1.0.0');
  }

  @Tool('divide', 'Divide two numbers')
  divide(@Param('Dividend') a: number, @Param('Divisor') b: number): Result<number, string> {
    if (typeof a !== 'number' || typeof b !== 'number') {
      return err('Both parameters must be numbers');
    }
    if (b === 0) {
      return err('Division by zero is not allowed');
    }
    return ok(a / b);
  }

  @Tool('validate-email', 'Validate email address format')
  validateEmail(@Param('Email address to validate') email: string): Result<boolean, string> {
    if (!email || typeof email !== 'string') {
      return err('Email is required and must be a string');
    }
    if (!email.includes('@')) {
      return err('Invalid email format: missing @ symbol');
    }
    return ok(true);
  }

  @Tool('process-array', 'Process an array of items')
  processArray(
    @Param('Array of items to process') items: any[],
    @Param('Processing mode (validate, count, sum)') mode: string
  ): Result<any, string> {
    if (!Array.isArray(items)) {
      return err('Items parameter must be an array');
    }

    switch (mode) {
      case 'validate':
        if (items.length === 0) {
          return err('Array cannot be empty for validation');
        }
        return ok({ valid: true, count: items.length });

      case 'count':
        return ok(items.length);

      case 'sum':
        if (!items.every((item) => typeof item === 'number')) {
          return err('All items must be numbers for sum operation');
        }
        return ok(items.reduce((acc, item) => acc + item, 0));

      default:
        return err(`Unsupported mode: ${mode}`);
    }
  }

  @Tool('async-failing-tool', 'Tool that fails asynchronously')
  async asyncFailingTool(
    @Param('Failure mode (timeout, network, validation)') mode: string
  ): Promise<Result<string, string>> {
    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay

    switch (mode) {
      case 'timeout':
        return err('Operation timed out after 30 seconds');
      case 'network':
        return err('Network connection failed: Unable to reach remote server');
      case 'validation':
        return err('Validation failed: Invalid input format detected');
      default:
        return ok('Success');
    }
  }

  @Tool('throw-exception', 'Tool that throws JavaScript exceptions')
  throwException(
    @Param('Exception type (error, type, reference)') type: string
  ): Result<string, string> {
    switch (type) {
      case 'error':
        throw new Error('This is a thrown Error object');
      case 'type':
        throw new TypeError('This is a thrown TypeError');
      case 'reference':
        throw new ReferenceError('This is a thrown ReferenceError');
      case 'string':
        throw 'This is a thrown string';
      case 'object':
        throw { message: 'This is a thrown object', code: 500 };
      default:
        return ok('No exception thrown');
    }
  }

  @Tool('required-params', 'Tool with multiple required parameters')
  requiredParams(
    @Param('First required parameter') param1: string,
    @Param('Second required parameter') param2: number,
    @Param('Third required parameter') param3: boolean
  ): Result<object, string> {
    return ok({
      param1,
      param2,
      param3,
      allPresent: true,
    });
  }

  @Tool('complex-validation', 'Tool with complex parameter validation')
  complexValidation(
    @Param('User object with name and age') user: { name: string; age: number },
    @Param('Settings array', false) settings?: string[]
  ): Result<object, string> {
    if (!user || typeof user !== 'object') {
      return err('User parameter must be an object');
    }

    if (!user.name || typeof user.name !== 'string') {
      return err('User must have a valid name (string)');
    }

    if (typeof user.age !== 'number' || user.age < 0) {
      return err('User must have a valid age (non-negative number)');
    }

    if (settings !== undefined && !Array.isArray(settings)) {
      return err('Settings must be an array if provided');
    }

    return ok({
      user,
      settings: settings || [],
      validated: true,
    });
  }

  @Tool('resource-access', 'Tool that simulates resource access errors')
  resourceAccess(
    @Param('Resource path') path: string,
    @Param('Access mode (read, write, execute)') mode: string
  ): Result<string, string> {
    if (!path) {
      return err('Resource path is required');
    }

    // Simulate various resource access errors
    if (path.includes('forbidden')) {
      return err('Access denied: insufficient permissions to access resource');
    }

    if (path.includes('notfound')) {
      return err('Resource not found: the specified path does not exist');
    }

    if (path.includes('locked') && mode === 'write') {
      return err('Resource locked: another process is currently using this resource');
    }

    if (path.includes('readonly') && mode === 'write') {
      return err('Permission denied: resource is read-only');
    }

    return ok(`Successfully accessed ${path} in ${mode} mode`);
  }
}

describe('Tools Error Handling (tools/call errors)', () => {
  let server: ErrorTestServer;

  beforeEach(() => {
    server = new ErrorTestServer();
  });

  describe('JSON-RPC Error Codes', () => {
    it('should return METHOD_NOT_FOUND for non-existent tools', async () => {
      const result = await server.callTool('non-existent-tool', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.MethodNotFound);
        expect(result.error.message).toContain('Tool not found');
      }
    });

    it('should return INVALID_PARAMS for missing required parameters', async () => {
      const result = await server.callTool('required-params', {
        param1: 'test',
        // missing param2 and param3
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InvalidParams);
        expect(result.error.message).toContain('Invalid tool arguments');
        expect(result.error.data).toBeDefined(); // Should include validation details
      }
    });

    it('should return INVALID_PARAMS for wrong parameter types', async () => {
      const result = await server.callTool('required-params', {
        param1: 123, // should be string
        param2: 'not a number', // should be number
        param3: 'not a boolean', // should be boolean
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InvalidParams);
        expect(result.error.message).toContain('Invalid tool arguments');
      }
    });

    it('should return INTERNAL_ERROR for tool execution failures', async () => {
      const result = await server.callTool('divide', {
        a: 10,
        b: 0,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InternalError);
        expect(result.error.message).toContain('Division by zero is not allowed');
      }
    });

    it('should return INTERNAL_ERROR for thrown exceptions', async () => {
      const result = await server.callTool('throw-exception', {
        type: 'error',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InternalError);
        expect(result.error.message).toContain('This is a thrown Error object');
      }
    });
  });

  describe('Parameter Validation Errors', () => {
    it('should handle null parameters for required fields', async () => {
      const result = await server.callTool('validate-email', {
        email: null,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InternalError);
        expect(result.error.message).toContain('Email is required');
      }
    });

    it('should handle undefined parameters for required fields', async () => {
      const result = await server.callTool('validate-email', {
        email: undefined,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // Validation catches undefined required params and returns INVALID_PARAMS
        expect(result.error.code).toBe(ErrorCode.InvalidParams);
        expect(result.error.message).toContain('Invalid tool arguments');
      }
    });

    it('should handle empty string parameters', async () => {
      const result = await server.callTool('validate-email', {
        email: '',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Email is required');
      }
    });

    it('should handle wrong array types', async () => {
      const result = await server.callTool('process-array', {
        items: 'not an array',
        mode: 'count',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Items parameter must be an array');
      }
    });

    it('should handle complex object validation errors', async () => {
      const result = await server.callTool('complex-validation', {
        user: {
          name: 123, // should be string
          age: 'twenty', // should be number
        },
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('User must have a valid name (string)');
      }
    });

    it('should handle missing required object properties', async () => {
      const result = await server.callTool('complex-validation', {
        user: {
          name: 'John',
          // missing age property
        },
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('User must have a valid age');
      }
    });
  });

  describe('Business Logic Errors', () => {
    it('should handle domain-specific validation errors', async () => {
      const result = await server.callTool('validate-email', {
        email: 'invalid-email',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid email format: missing @ symbol');
      }
    });

    it('should handle empty array validation', async () => {
      const result = await server.callTool('process-array', {
        items: [],
        mode: 'validate',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Array cannot be empty for validation');
      }
    });

    it('should handle incompatible data for operations', async () => {
      const result = await server.callTool('process-array', {
        items: ['a', 'b', 'c'],
        mode: 'sum',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('All items must be numbers for sum operation');
      }
    });

    it('should handle unsupported operation modes', async () => {
      const result = await server.callTool('process-array', {
        items: [1, 2, 3],
        mode: 'unsupported-mode',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Unsupported mode: unsupported-mode');
      }
    });
  });

  describe('Async Tool Errors', () => {
    it('should handle async timeout errors', async () => {
      const result = await server.callTool('async-failing-tool', {
        mode: 'timeout',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Operation timed out');
      }
    });

    it('should handle async network errors', async () => {
      const result = await server.callTool('async-failing-tool', {
        mode: 'network',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Network connection failed');
      }
    });

    it('should handle async validation errors', async () => {
      const result = await server.callTool('async-failing-tool', {
        mode: 'validation',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Validation failed');
      }
    });
  });

  describe('Exception Handling', () => {
    it('should handle Error object exceptions', async () => {
      const result = await server.callTool('throw-exception', {
        type: 'error',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InternalError);
        expect(result.error.message).toContain('This is a thrown Error object');
      }
    });

    it('should handle TypeError exceptions', async () => {
      const result = await server.callTool('throw-exception', {
        type: 'type',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('This is a thrown TypeError');
      }
    });

    it('should handle ReferenceError exceptions', async () => {
      const result = await server.callTool('throw-exception', {
        type: 'reference',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('This is a thrown ReferenceError');
      }
    });

    it('should handle string exceptions', async () => {
      const result = await server.callTool('throw-exception', {
        type: 'string',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('This is a thrown string');
      }
    });

    it('should handle object exceptions', async () => {
      const result = await server.callTool('throw-exception', {
        type: 'object',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('object Object');
      }
    });
  });

  describe('Resource Access Errors', () => {
    it('should handle permission denied errors', async () => {
      const result = await server.callTool('resource-access', {
        path: '/forbidden/file.txt',
        mode: 'read',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Access denied: insufficient permissions');
      }
    });

    it('should handle resource not found errors', async () => {
      const result = await server.callTool('resource-access', {
        path: '/notfound/file.txt',
        mode: 'read',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Resource not found: the specified path does not exist'
        );
      }
    });

    it('should handle resource locked errors', async () => {
      const result = await server.callTool('resource-access', {
        path: '/locked/file.txt',
        mode: 'write',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'Resource locked: another process is currently using'
        );
      }
    });

    it('should handle read-only resource errors', async () => {
      const result = await server.callTool('resource-access', {
        path: '/readonly/file.txt',
        mode: 'write',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Permission denied: resource is read-only');
      }
    });
  });

  describe('Error Message Quality', () => {
    it('should provide descriptive error messages', async () => {
      const result = await server.callTool('divide', {
        a: 'not a number',
        b: 5,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // Error message now includes MCP error prefix
        expect(result.error.message).toMatch(
          /Invalid tool arguments|Both parameters must be numbers/
        );
      }
    });

    it('should include context in error messages', async () => {
      const result = await server.callTool('complex-validation', {
        user: {
          name: 'John',
          age: -5,
        },
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('User must have a valid age (non-negative number)');
      }
    });

    it('should provide specific validation error details', async () => {
      const result = await server.callTool('required-params', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InvalidParams);
        expect(result.error.data).toBeDefined();
        // Validation error details should be in the data field
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely large numbers gracefully', async () => {
      const result = await server.callTool('divide', {
        a: Number.MAX_VALUE,
        b: Number.MIN_VALUE,
      });

      expect(result.isOk()).toBe(true);
      // Should not throw an error, even with extreme values
    });

    it('should handle special float values', async () => {
      const result = await server.callTool('divide', {
        a: Infinity,
        b: 1,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('Infinity');
      }
    });

    it('should handle NaN values', async () => {
      const result = await server.callTool('divide', {
        a: NaN,
        b: 1,
      });

      // NaN is not valid JSON, so it should fail validation
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InvalidParams);
      }
    });

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(10000);
      const result = await server.callTool('validate-email', {
        email: longString + '@example.com',
      });

      expect(result.isOk()).toBe(true);
      // Should handle large inputs gracefully
    });
  });
});
