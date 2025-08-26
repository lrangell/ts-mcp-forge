/**
 * Utility functions for MCP testing
 */

import { expect } from 'vitest';
import { Result } from 'neverthrow';
import { McpError } from '../../src/index.js';

/**
 * Test utilities for common testing patterns
 */
export class TestUtils {
  /**
   * Create a delay for testing async operations
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a random string for testing
   */
  static randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a random integer within a range
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Create a large string for testing payload limits
   */
  static createLargeString(sizeInMB: number): string {
    const chunkSize = 1024 * 1024; // 1MB
    const chunks: string[] = [];

    for (let i = 0; i < sizeInMB; i++) {
      chunks.push('A'.repeat(chunkSize));
    }

    return chunks.join('');
  }

  /**
   * Validate that a URI follows RFC 3986
   */
  static isValidURI(uri: string): boolean {
    try {
      new URL(uri);
      return true;
    } catch {
      // Check for custom schemes like git:// or custom://
      const schemePattern = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
      return schemePattern.test(uri);
    }
  }

  /**
   * Validate MIME type format
   */
  static isValidMimeType(mimeType: string): boolean {
    const mimePattern = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*$/;
    return mimePattern.test(mimeType);
  }

  /**
   * Validate base64 encoded data
   */
  static isValidBase64(data: string): boolean {
    try {
      return btoa(atob(data)) === data;
    } catch {
      return false;
    }
  }

  /**
   * Check if a JSON schema is valid
   */
  static isValidJSONSchema(schema: any): boolean {
    if (!schema || typeof schema !== 'object') {
      return false;
    }

    // Basic schema validation
    const requiredFields = ['type'];
    return requiredFields.every((field) => field in schema);
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = Date.now();
    const result = await fn();
    const timeMs = Date.now() - start;
    return { result, timeMs };
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 100
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          break;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await TestUtils.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Create a timeout promise that rejects after a specified time
   */
  static timeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Check if two objects are deeply equal
   */
  static deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Flatten a nested object for easier testing
   */
  static flatten(obj: any, prefix: string = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, TestUtils.flatten(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }

  /**
   * Create mock data for testing
   */
  static createMockData(type: 'user' | 'file' | 'api', count: number = 1): any[] {
    const data: any[] = [];

    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'user':
          data.push({
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            createdAt: new Date().toISOString(),
          });
          break;
        case 'file':
          data.push({
            path: `/files/test-${i + 1}.txt`,
            content: `Test file content ${i + 1}`,
            size: TestUtils.randomInt(100, 10000),
            mimeType: 'text/plain',
          });
          break;
        case 'api':
          data.push({
            endpoint: `/api/resource/${i + 1}`,
            method: ['GET', 'POST', 'PUT', 'DELETE'][i % 4],
            response: { id: i + 1, data: `Resource ${i + 1}` },
          });
          break;
      }
    }

    return data;
  }
}

/**
 * Result testing utilities for neverthrow Result types
 */
export class ResultTestUtils {
  /**
   * Assert that a Result is Ok and return the value
   */
  static expectOk<T, E>(result: Result<T, E>): T {
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      return result.value;
    }
    throw new Error('Expected Ok result but got Err');
  }

  /**
   * Assert that a Result is Err and return the error
   */
  static expectErr<T, E>(result: Result<T, E>): E {
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      return result.error;
    }
    throw new Error('Expected Err result but got Ok');
  }

  /**
   * Assert that a Result is Ok with a specific value
   */
  static expectOkValue<T, E>(result: Result<T, E>, expectedValue: T): void {
    const value = ResultTestUtils.expectOk(result);
    expect(value).toEqual(expectedValue);
  }

  /**
   * Assert that a Result is Err with a specific error
   */
  static expectErrValue<T, E>(result: Result<T, E>, expectedError: E): void {
    const error = ResultTestUtils.expectErr(result);
    expect(error).toEqual(expectedError);
  }

  /**
   * Assert that a Result is Err with an McpError of specific code
   */
  static expectJsonRpcError<T>(result: Result<T, McpError>, expectedCode: number): McpError {
    const error = ResultTestUtils.expectErr(result);
    expect(error).toBeInstanceOf(McpError);
    expect(error.code).toBe(expectedCode);
    return error;
  }
}

/**
 * Protocol compliance test utilities
 */
export class ProtocolTestUtils {
  /**
   * Validate JSON-RPC 2.0 request format
   */
  static validateJsonRpcRequest(request: any): void {
    expect(request).toHaveProperty('jsonrpc', '2.0');
    expect(request).toHaveProperty('method');
    expect(typeof request.method).toBe('string');

    if ('id' in request) {
      expect(['string', 'number'].includes(typeof request.id)).toBe(true);
    }
  }

  /**
   * Validate JSON-RPC 2.0 response format
   */
  static validateJsonRpcResponse(response: any, expectedId?: number | string): void {
    expect(response).toHaveProperty('jsonrpc', '2.0');

    if (expectedId !== undefined) {
      expect(response).toHaveProperty('id', expectedId);
    }

    if ('result' in response) {
      expect('error' in response).toBe(false);
    } else if ('error' in response) {
      expect('result' in response).toBe(false);
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(typeof response.error.code).toBe('number');
      expect(typeof response.error.message).toBe('string');
    } else {
      throw new Error('Response must have either result or error');
    }
  }

  /**
   * Validate MCP initialize response
   */
  static validateInitializeResponse(response: any): void {
    expect(response).toHaveProperty('protocolVersion', '2025-06-18');
    expect(response).toHaveProperty('capabilities');
    expect(response).toHaveProperty('serverInfo');

    expect(response.serverInfo).toHaveProperty('name');
    expect(typeof response.serverInfo.name).toBe('string');
  }

  /**
   * Validate MCP tool definition
   */
  static validateToolDefinition(tool: any): void {
    expect(tool).toHaveProperty('name');
    expect(typeof tool.name).toBe('string');

    if (tool.description) {
      expect(typeof tool.description).toBe('string');
    }

    if (tool.inputSchema) {
      expect(TestUtils.isValidJSONSchema(tool.inputSchema)).toBe(true);
    }
  }

  /**
   * Validate MCP resource definition
   */
  static validateResourceDefinition(resource: any): void {
    expect(resource).toHaveProperty('uri');
    expect(typeof resource.uri).toBe('string');
    expect(TestUtils.isValidURI(resource.uri)).toBe(true);

    expect(resource).toHaveProperty('name');
    expect(typeof resource.name).toBe('string');

    if (resource.mimeType) {
      expect(TestUtils.isValidMimeType(resource.mimeType)).toBe(true);
    }
  }

  /**
   * Validate MCP prompt definition
   */
  static validatePromptDefinition(prompt: any): void {
    expect(prompt).toHaveProperty('name');
    expect(typeof prompt.name).toBe('string');

    if (prompt.arguments) {
      expect(Array.isArray(prompt.arguments)).toBe(true);
      prompt.arguments.forEach((arg: any) => {
        expect(arg).toHaveProperty('name');
        expect(typeof arg.name).toBe('string');

        if (arg.required !== undefined) {
          expect(typeof arg.required).toBe('boolean');
        }
      });
    }
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Benchmark a function execution time
   */
  static async benchmark(
    fn: () => Promise<any>,
    iterations: number = 100
  ): Promise<{ avgMs: number; minMs: number; maxMs: number; totalMs: number }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { timeMs } = await TestUtils.measureTime(fn);
      times.push(timeMs);
    }

    const totalMs = times.reduce((sum, time) => sum + time, 0);
    const avgMs = totalMs / iterations;
    const minMs = Math.min(...times);
    const maxMs = Math.max(...times);

    return { avgMs, minMs, maxMs, totalMs };
  }

  /**
   * Test memory usage during function execution
   */
  static async measureMemory<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; memoryDeltaMB: number }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const beforeMemory = process.memoryUsage().heapUsed;
    const result = await fn();
    const afterMemory = process.memoryUsage().heapUsed;

    const memoryDeltaMB = (afterMemory - beforeMemory) / (1024 * 1024);

    return { result, memoryDeltaMB };
  }

  /**
   * Test function with increasing load
   */
  static async loadTest(
    fn: (load: number) => Promise<any>,
    maxLoad: number = 100,
    step: number = 10
  ): Promise<Array<{ load: number; timeMs: number; success: boolean }>> {
    const results: Array<{ load: number; timeMs: number; success: boolean }> = [];

    for (let load = step; load <= maxLoad; load += step) {
      try {
        const { timeMs } = await TestUtils.measureTime(() => fn(load));
        results.push({ load, timeMs, success: true });
      } catch (error) {
        results.push({ load, timeMs: 0, success: false });
      }
    }

    return results;
  }
}

/**
 * Security testing utilities
 */
export class SecurityTestUtils {
  /**
   * Common injection attack patterns
   */
  static readonly INJECTION_PATTERNS = {
    sql: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      '1; DELETE FROM table',
      'UNION SELECT * FROM passwords',
    ],
    xss: [
      "<script>alert('xss')</script>",
      "javascript:alert('xss')",
      "<img src=x onerror=alert('xss')>",
      "';alert('xss');//",
    ],
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/passwd',
      'C:\\windows\\system32\\config\\sam',
    ],
    commandInjection: ['; ls -la', '&& cat /etc/passwd', '| whoami', '`cat /etc/passwd`'],
  };

  /**
   * Test for injection vulnerabilities
   */
  static async testInjection(
    testFn: (input: string) => Promise<any>,
    patterns: string[] = SecurityTestUtils.INJECTION_PATTERNS.sql
  ): Promise<{ pattern: string; vulnerable: boolean; response?: any }[]> {
    const results: { pattern: string; vulnerable: boolean; response?: any }[] = [];

    for (const pattern of patterns) {
      try {
        const response = await testFn(pattern);

        // Check if the response indicates successful injection
        const responseStr = JSON.stringify(response).toLowerCase();
        const vulnerable =
          responseStr.includes('error') ||
          responseStr.includes('exception') ||
          responseStr.includes('syntax');

        results.push({ pattern, vulnerable, response });
      } catch (error) {
        // Errors might indicate injection was caught
        results.push({ pattern, vulnerable: false });
      }
    }

    return results;
  }

  /**
   * Test for DoS vulnerabilities with large payloads
   */
  static async testDoS(
    testFn: (payload: string) => Promise<any>,
    maxSizeMB: number = 10
  ): Promise<{ sizeMB: number; timeMs: number; success: boolean }[]> {
    const results: { sizeMB: number; timeMs: number; success: boolean }[] = [];

    for (let sizeMB = 1; sizeMB <= maxSizeMB; sizeMB++) {
      try {
        const payload = TestUtils.createLargeString(sizeMB);
        const { timeMs } = await TestUtils.measureTime(() => testFn(payload));
        results.push({ sizeMB, timeMs, success: true });
      } catch (error) {
        results.push({ sizeMB, timeMs: 0, success: false });
      }
    }

    return results;
  }
}
