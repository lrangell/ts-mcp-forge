/**
 * Custom assertions for MCP protocol testing
 */

import { expect } from 'vitest';

/**
 * Custom matchers for MCP protocol compliance
 */
export const MCPAssertions = {
  /**
   * Assert that an object is a valid JSON-RPC 2.0 request
   */
  toBeValidJsonRpcRequest(received: any): { pass: boolean; message: () => string } {
    const pass =
      received &&
      received.jsonrpc === '2.0' &&
      typeof received.method === 'string' &&
      (received.id === undefined ||
        typeof received.id === 'string' ||
        typeof received.id === 'number');

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid JSON-RPC request`
          : `Expected to be a valid JSON-RPC request but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid JSON-RPC 2.0 response
   */
  toBeValidJsonRpcResponse(received: any): { pass: boolean; message: () => string } {
    const hasValidStructure =
      received &&
      received.jsonrpc === '2.0' &&
      (typeof received.id === 'string' || typeof received.id === 'number');

    const hasValidContent =
      (received.result !== undefined && received.error === undefined) ||
      (received.error !== undefined && received.result === undefined);

    const hasValidError =
      !received.error ||
      (typeof received.error.code === 'number' && typeof received.error.message === 'string');

    const pass = hasValidStructure && hasValidContent && hasValidError;

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid JSON-RPC response`
          : `Expected to be a valid JSON-RPC response but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid MCP initialize response
   */
  toBeValidInitializeResponse(received: any): { pass: boolean; message: () => string } {
    const pass =
      received &&
      received.protocolVersion === '2025-06-18' &&
      received.capabilities &&
      received.serverInfo &&
      typeof received.serverInfo.name === 'string';

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid initialize response`
          : `Expected to be a valid initialize response but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid MCP tool definition
   */
  toBeValidToolDefinition(received: any): { pass: boolean; message: () => string } {
    const pass =
      received &&
      typeof received.name === 'string' &&
      received.name.length > 0 &&
      (received.description === undefined || typeof received.description === 'string') &&
      (received.inputSchema === undefined ||
        (received.inputSchema &&
          typeof received.inputSchema === 'object' &&
          received.inputSchema.type));

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid tool definition`
          : `Expected to be a valid tool definition but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid MCP tool call response
   */
  toBeValidToolCallResponse(received: any): { pass: boolean; message: () => string } {
    const hasValidContent =
      received &&
      Array.isArray(received.content) &&
      received.content.every(
        (item: any) =>
          item &&
          ['text', 'image', 'resource'].includes(item.type) &&
          (item.type !== 'text' || typeof item.text === 'string') &&
          (item.type !== 'image' ||
            (typeof item.data === 'string' && typeof item.mimeType === 'string')) &&
          (item.type !== 'resource' || typeof item.uri === 'string')
      );

    const hasValidIsError = received.isError === undefined || typeof received.isError === 'boolean';

    const pass = hasValidContent && hasValidIsError;

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid tool call response`
          : `Expected to be a valid tool call response but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid MCP resource definition
   */
  toBeValidResourceDefinition(received: any): { pass: boolean; message: () => string } {
    const hasValidUri = received && typeof received.uri === 'string' && received.uri.length > 0;

    const hasValidName = typeof received.name === 'string' && received.name.length > 0;

    const hasValidMimeType =
      received.mimeType === undefined ||
      (typeof received.mimeType === 'string' &&
        /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*$/.test(
          received.mimeType
        ));

    const pass = hasValidUri && hasValidName && hasValidMimeType;

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid resource definition`
          : `Expected to be a valid resource definition but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid MCP resource read response
   */
  toBeValidResourceReadResponse(received: any): { pass: boolean; message: () => string } {
    const hasValidContents =
      received &&
      Array.isArray(received.contents) &&
      received.contents.length > 0 &&
      received.contents.every(
        (item: any) =>
          item &&
          typeof item.uri === 'string' &&
          typeof item.mimeType === 'string' &&
          (typeof item.text === 'string' || typeof item.blob === 'string') &&
          !(item.text && item.blob) // Can't have both text and blob
      );

    const pass = hasValidContents;

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid resource read response`
          : `Expected to be a valid resource read response but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid MCP prompt definition
   */
  toBeValidPromptDefinition(received: any): { pass: boolean; message: () => string } {
    const hasValidName = received && typeof received.name === 'string' && received.name.length > 0;

    const hasValidArguments =
      received.arguments === undefined ||
      (Array.isArray(received.arguments) &&
        received.arguments.every(
          (arg: any) =>
            arg &&
            typeof arg.name === 'string' &&
            (arg.description === undefined || typeof arg.description === 'string') &&
            (arg.required === undefined || typeof arg.required === 'boolean')
        ));

    const pass = hasValidName && hasValidArguments;

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid prompt definition`
          : `Expected to be a valid prompt definition but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid MCP prompt response
   */
  toBeValidPromptResponse(received: any): { pass: boolean; message: () => string } {
    const hasValidMessages =
      received &&
      Array.isArray(received.messages) &&
      received.messages.length > 0 &&
      received.messages.every(
        (message: any) =>
          message &&
          ['user', 'assistant', 'system'].includes(message.role) &&
          message.content &&
          (typeof message.content === 'string' ||
            (typeof message.content === 'object' &&
              message.content.type &&
              ((message.content.type === 'text' && typeof message.content.text === 'string') ||
                (message.content.type === 'image' &&
                  typeof message.content.data === 'string' &&
                  typeof message.content.mimeType === 'string') ||
                (message.content.type === 'resource' && typeof message.content.uri === 'string'))))
      );

    const pass = hasValidMessages;

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid prompt response`
          : `Expected to be a valid prompt response but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid MCP completion response
   */
  toBeValidCompletionResponse(received: any): { pass: boolean; message: () => string } {
    const hasValidCompletion =
      received &&
      received.completion &&
      Array.isArray(received.completion.values) &&
      received.completion.values.length <= 100 &&
      received.completion.values.every((value: any) => typeof value === 'string');

    const hasValidOptionalFields =
      (received.completion.total === undefined || typeof received.completion.total === 'number') &&
      (received.completion.hasMore === undefined ||
        typeof received.completion.hasMore === 'boolean');

    const pass = hasValidCompletion && hasValidOptionalFields;

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid completion response`
          : `Expected to be a valid completion response but got: ${JSON.stringify(received)}`,
    };
  },

  /**
   * Assert that an object is a valid URI
   */
  toBeValidURI(received: any): { pass: boolean; message: () => string } {
    let pass = false;

    if (typeof received === 'string') {
      try {
        new URL(received);
        pass = true;
      } catch {
        // Check for custom schemes
        const schemePattern = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
        pass = schemePattern.test(received);
      }
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" not to be a valid URI`
          : `Expected "${received}" to be a valid URI`,
    };
  },

  /**
   * Assert that an object is a valid MIME type
   */
  toBeValidMimeType(received: any): { pass: boolean; message: () => string } {
    const pass =
      typeof received === 'string' &&
      /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*$/.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" not to be a valid MIME type`
          : `Expected "${received}" to be a valid MIME type`,
    };
  },

  /**
   * Assert that a string is valid base64
   */
  toBeValidBase64(received: any): { pass: boolean; message: () => string } {
    let pass = false;

    if (typeof received === 'string') {
      try {
        pass = btoa(atob(received)) === received;
      } catch {
        pass = false;
      }
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" not to be valid base64`
          : `Expected "${received}" to be valid base64`,
    };
  },
};

/**
 * Extend Vitest's expect with custom matchers
 */
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidJsonRpcRequest(): T;
    toBeValidJsonRpcResponse(): T;
    toBeValidInitializeResponse(): T;
    toBeValidToolDefinition(): T;
    toBeValidToolCallResponse(): T;
    toBeValidResourceDefinition(): T;
    toBeValidResourceReadResponse(): T;
    toBeValidPromptDefinition(): T;
    toBeValidPromptResponse(): T;
    toBeValidCompletionResponse(): T;
    toBeValidURI(): T;
    toBeValidMimeType(): T;
    toBeValidBase64(): T;
  }
}

/**
 * Setup function to register custom matchers
 */
export function setupMCPAssertions() {
  expect.extend(MCPAssertions);
}

/**
 * Additional assertion helpers
 */
export const AssertionHelpers = {
  /**
   * Assert that an array contains unique items
   */
  expectUniqueItems<T>(array: T[], keyFn?: (item: T) => any): void {
    const keys = keyFn ? array.map(keyFn) : array;
    const uniqueKeys = [...new Set(keys)];
    expect(uniqueKeys).toHaveLength(keys.length);
  },

  /**
   * Assert that an object has exactly the specified keys
   */
  expectExactKeys(obj: any, expectedKeys: string[]): void {
    const actualKeys = Object.keys(obj).sort();
    const sortedExpectedKeys = [...expectedKeys].sort();
    expect(actualKeys).toEqual(sortedExpectedKeys);
  },

  /**
   * Assert that an array is sorted
   */
  expectSorted<T>(array: T[], compareFn?: (a: T, b: T) => number): void {
    const sorted = [...array].sort(compareFn);
    expect(array).toEqual(sorted);
  },

  /**
   * Assert that a value is within a range
   */
  expectInRange(value: number, min: number, max: number): void {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  },

  /**
   * Assert that a timestamp is recent (within specified seconds)
   */
  expectRecentTimestamp(timestamp: string | number, maxAgeSeconds: number = 60): void {
    const now = Date.now();
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    const ageMs = now - ts;
    const maxAgeMs = maxAgeSeconds * 1000;

    expect(ageMs).toBeLessThanOrEqual(maxAgeMs);
    expect(ageMs).toBeGreaterThanOrEqual(0);
  },

  /**
   * Assert that an error has expected properties
   */
  expectErrorWithCode(error: any, expectedCode: number, expectedMessage?: string): void {
    expect(error).toHaveProperty('code', expectedCode);
    expect(error).toHaveProperty('message');
    expect(typeof error.message).toBe('string');

    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage);
    }
  },

  /**
   * Assert that pagination response is valid
   */
  expectValidPagination(response: any, hasItems: boolean = true): void {
    if (hasItems) {
      // Should have an array of items
      const itemsKey = Object.keys(response).find(
        (key) => Array.isArray(response[key]) && key !== 'errors'
      );
      expect(itemsKey).toBeDefined();
      expect(Array.isArray(response[itemsKey!])).toBe(true);
    }

    // nextCursor should be a string if present
    if (response.nextCursor !== undefined) {
      expect(typeof response.nextCursor).toBe('string');
    }
  },

  /**
   * Assert that content type is properly structured
   */
  expectValidContentType(content: any, expectedType: 'text' | 'image' | 'resource'): void {
    expect(content).toHaveProperty('type', expectedType);

    switch (expectedType) {
      case 'text':
        expect(content).toHaveProperty('text');
        expect(typeof content.text).toBe('string');
        break;
      case 'image':
        expect(content).toHaveProperty('data');
        expect(content).toHaveProperty('mimeType');
        expect(typeof content.data).toBe('string');
        expect(typeof content.mimeType).toBe('string');
        expect(content.mimeType).toBeValidMimeType();
        break;
      case 'resource':
        expect(content).toHaveProperty('uri');
        expect(typeof content.uri).toBe('string');
        expect(content.uri).toBeValidURI();
        break;
    }
  },
};
