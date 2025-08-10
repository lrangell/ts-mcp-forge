import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import {
  parseJsonRpcMessage,
  createSuccessResponse,
  createErrorResponse,
  handleJsonRpcMessage,
  handleJsonRpcBatch,
  JsonRpcError,
  ErrorCodes,
} from '../../src/core/jsonrpc.js';

describe('JSON-RPC Handler', () => {
  describe('parseJsonRpcMessage', () => {
    it('should parse valid JSON-RPC request', () => {
      const message = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
        params: { foo: 'bar' },
      });

      const result = parseJsonRpcMessage(message);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.method).toBe('test');
        expect(result.value.id).toBe(1);
        expect(result.value.params).toEqual({ foo: 'bar' });
      }
    });

    it('should handle request without params', () => {
      const message = JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-id',
        method: 'test',
      });

      const result = parseJsonRpcMessage(message);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.params).toBeUndefined();
      }
    });

    it('should return error for invalid JSON', () => {
      const result = parseJsonRpcMessage('invalid json');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCodes.PARSE_ERROR);
      }
    });

    it('should return error for invalid request format', () => {
      const message = JSON.stringify({
        id: 1,
        method: 'test',
      });

      const result = parseJsonRpcMessage(message);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCodes.INVALID_REQUEST);
      }
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with result', () => {
      const response = createSuccessResponse(123, { data: 'test' });
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 123,
        result: { data: 'test' },
      });
    });

    it('should handle string id', () => {
      const response = createSuccessResponse('abc', 'result');
      expect(response.id).toBe('abc');
      expect(response.result).toBe('result');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response', () => {
      const error = new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, 'Method not found', {
        method: 'unknown',
      });
      const response = createErrorResponse(1, error);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: ErrorCodes.METHOD_NOT_FOUND,
          message: 'Method not found',
          data: { method: 'unknown' },
        },
      });
    });
  });

  describe('handleJsonRpcMessage', () => {
    it('should handle valid request and return success', async () => {
      const handler = async (method: string, params: unknown, id: string | number) => {
        expect(method).toBe('test');
        expect(params).toEqual({ value: 42 });
        expect(id).toBe(1);
        return ok({ success: true });
      };

      const message = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
        params: { value: 42 },
      });

      const response = await handleJsonRpcMessage(message, handler);
      const parsed = JSON.parse(response);

      expect(parsed.jsonrpc).toBe('2.0');
      expect(parsed.id).toBe(1);
      expect(parsed.result).toEqual({ success: true });
      expect(parsed.error).toBeUndefined();
    });

    it('should handle handler error', async () => {
      const handler = async () => {
        return err(new JsonRpcError(ErrorCodes.INTERNAL_ERROR, 'Something went wrong'));
      };

      const message = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      });

      const response = await handleJsonRpcMessage(message, handler);
      const parsed = JSON.parse(response);

      expect(parsed.error).toBeDefined();
      expect(parsed.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(parsed.error.message).toBe('Something went wrong');
    });

    it('should handle parse error', async () => {
      const handler = async () => ok('never called');

      const response = await handleJsonRpcMessage('invalid json', handler);
      const parsed = JSON.parse(response);

      expect(parsed.id).toBe(0); // Default id for parse errors
      expect(parsed.error.code).toBe(ErrorCodes.PARSE_ERROR);
    });
  });

  describe('handleJsonRpcBatch', () => {
    it('should handle batch of messages', async () => {
      const handler = async (method: string) => {
        if (method === 'method1') return ok('result1');
        if (method === 'method2') return ok('result2');
        return err(new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, 'Unknown method'));
      };

      const messages = [
        JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'method1' }),
        JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'method2' }),
      ];

      const responses = await handleJsonRpcBatch(messages, handler);
      expect(responses).toHaveLength(2);

      const parsed1 = JSON.parse(responses[0]);
      expect(parsed1.result).toBe('result1');

      const parsed2 = JSON.parse(responses[1]);
      expect(parsed2.result).toBe('result2');
    });

    it('should handle mixed success and error in batch', async () => {
      const handler = async (method: string) => {
        if (method === 'valid') return ok('success');
        return err(new JsonRpcError(ErrorCodes.METHOD_NOT_FOUND, 'Not found'));
      };

      const messages = [
        JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'valid' }),
        JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'invalid' }),
      ];

      const responses = await handleJsonRpcBatch(messages, handler);

      const parsed1 = JSON.parse(responses[0]);
      expect(parsed1.result).toBe('success');
      expect(parsed1.error).toBeUndefined();

      const parsed2 = JSON.parse(responses[1]);
      expect(parsed2.error).toBeDefined();
      expect(parsed2.error.code).toBe(ErrorCodes.METHOD_NOT_FOUND);
    });
  });

  describe('JsonRpcError', () => {
    it('should create error with all properties', () => {
      const error = new JsonRpcError(-32000, 'Custom error', { detail: 'info' });

      expect(error.code).toBe(-32000);
      expect(error.message).toBe('Custom error');
      expect(error.data).toEqual({ detail: 'info' });
      expect(error.name).toBe('JsonRpcError');
    });

    it('should work without data', () => {
      const error = new JsonRpcError(ErrorCodes.INVALID_PARAMS, 'Invalid params');

      expect(error.code).toBe(ErrorCodes.INVALID_PARAMS);
      expect(error.message).toBe('Invalid params');
      expect(error.data).toBeUndefined();
    });
  });
});
