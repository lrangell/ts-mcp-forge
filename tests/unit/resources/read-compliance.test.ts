/**
 * Resource Read Compliance Tests
 * Ensures resources/read responses follow MCP specification 2025-06-18
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Resource, ResourceTemplate } from '../../../src/decorators/index.js';
import { createMCPRouter } from '../../../src/core/router.js';
import { setupMCPAssertions } from '../../helpers/assertions.js';

// Setup custom assertions
setupMCPAssertions();

class ResourceReadComplianceServer extends MCPServer {
  constructor() {
    super('Resource Read Compliance Server', '1.0.0');
  }

  @Resource('file:///project/text-file.txt', 'Text file resource', 'text/plain')
  getTextFile(): Result<string, string> {
    return ok('This is a plain text file content.\nWith multiple lines.');
  }

  @Resource('file:///project/json-data.json', 'JSON data resource', 'application/json')
  getJsonData(): Result<object, string> {
    return ok({
      id: 'test-data',
      name: 'Test Resource',
      data: {
        values: [1, 2, 3],
        metadata: { created: '2025-01-01T00:00:00Z' },
      },
    });
  }

  @Resource('file:///project/image.png', 'Binary image resource', 'image/png')
  getBinaryImage(): Result<string, string> {
    // Return base64 encoded PNG data
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return ok(pngBase64);
  }

  @Resource('file:///project/large-file.dat', 'Large binary data', 'application/octet-stream')
  getLargeBinaryFile(): Result<string, string> {
    // Simulate larger binary content
    const binaryData = Buffer.from('Large binary file content with special characters: àáâãäå');
    return ok(binaryData.toString('base64'));
  }

  @Resource('https://api.example.com/xml-data', 'XML API response', 'application/xml')
  getXmlData(): Result<string, string> {
    return ok(
      '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <data>XML content</data>\n</root>'
    );
  }

  @Resource('custom://scheme/resource', 'Custom scheme resource', 'application/custom')
  getCustomResource(): Result<object, string> {
    return ok({
      scheme: 'custom',
      type: 'specialized-data',
      content: 'Custom protocol resource content',
    });
  }

  @ResourceTemplate('logs://{date}/{level}.log', {
    description: 'Log files by date and level',
    mimeType: 'text/plain',
  })
  async getLogFile(params: { date: string; level: string }): Promise<Result<string, string>> {
    if (!params.date || !params.level) {
      return err('Date and level parameters are required');
    }

    const logContent = `[${params.date}] ${params.level.toUpperCase()}: Log entry\n[${params.date}] ${params.level.toUpperCase()}: Another log entry`;
    return ok(logContent);
  }

  @Resource('file:///project/error-resource', 'Resource that fails', 'text/plain')
  getErrorResource(): Result<string, string> {
    return err('Resource access failed due to permission error');
  }
}

describe('Resource Read Response Compliance', () => {
  let server: ResourceReadComplianceServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new ResourceReadComplianceServer();
    router = createMCPRouter(server);
  });

  describe('Response Structure Compliance', () => {
    it('should return contents array for text resources', async () => {
      const result = await server.readResource('file:///project/text-file.txt');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Must have contents array
        expect(result.value).toHaveProperty('contents');
        expect(Array.isArray(result.value.contents)).toBe(true);
        expect(result.value.contents).toHaveLength(1);

        const content = result.value.contents[0];
        // Required fields per MCP spec
        expect(content).toHaveProperty('uri', 'file:///project/text-file.txt');
        expect(content).toHaveProperty('mimeType', 'text/plain');
        expect(content).toHaveProperty('text');
        expect(typeof content.text).toBe('string');

        // Should not have blob field for text content
        expect(content).not.toHaveProperty('blob');

        // Validate full response structure
        expect(result.value).toBeValidResourceReadResponse();
      }
    });

    it('should return contents array for JSON resources', async () => {
      const result = await server.readResource('file:///project/json-data.json');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('contents');
        expect(Array.isArray(result.value.contents)).toBe(true);
        expect(result.value.contents).toHaveLength(1);

        const content = result.value.contents[0];
        expect(content).toHaveProperty('uri', 'file:///project/json-data.json');
        expect(content).toHaveProperty('mimeType', 'application/json');
        expect(content).toHaveProperty('text');

        // Should be valid JSON
        expect(() => JSON.parse(content.text)).not.toThrow();
        const parsedData = JSON.parse(content.text);
        expect(parsedData).toHaveProperty('id', 'test-data');

        expect(result.value).toBeValidResourceReadResponse();
      }
    });

    it('should return contents array with blob for binary resources', async () => {
      const result = await server.readResource('file:///project/image.png');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('contents');
        expect(Array.isArray(result.value.contents)).toBe(true);
        expect(result.value.contents).toHaveLength(1);

        const content = result.value.contents[0];
        expect(content).toHaveProperty('uri', 'file:///project/image.png');
        expect(content).toHaveProperty('mimeType', 'image/png');
        expect(content).toHaveProperty('blob');
        expect(typeof content.blob).toBe('string');

        // Should be valid base64
        expect(content.blob).toBeValidBase64();

        // Should not have text field for binary content
        expect(content).not.toHaveProperty('text');

        expect(result.value).toBeValidResourceReadResponse();
      }
    });

    it('should handle large binary files correctly', async () => {
      const result = await server.readResource('file:///project/large-file.dat');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content).toHaveProperty('uri', 'file:///project/large-file.dat');
        expect(content).toHaveProperty('mimeType', 'application/octet-stream');
        expect(content).toHaveProperty('blob');
        expect(content.blob).toBeValidBase64();

        // Verify base64 can be decoded
        const decoded = Buffer.from(content.blob, 'base64').toString('utf8');
        expect(decoded).toContain('Large binary file content');
      }
    });
  });

  describe('MIME Type Compliance', () => {
    it('should include proper MIME types for different file types', async () => {
      const testCases = [
        { uri: 'file:///project/text-file.txt', expectedMimeType: 'text/plain' },
        { uri: 'file:///project/json-data.json', expectedMimeType: 'application/json' },
        { uri: 'file:///project/image.png', expectedMimeType: 'image/png' },
        { uri: 'file:///project/large-file.dat', expectedMimeType: 'application/octet-stream' },
        { uri: 'https://api.example.com/xml-data', expectedMimeType: 'application/xml' },
        { uri: 'custom://scheme/resource', expectedMimeType: 'application/custom' },
      ];

      for (const testCase of testCases) {
        const result = await server.readResource(testCase.uri);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const content = result.value.contents[0];
          expect(content.mimeType).toBe(testCase.expectedMimeType);
          expect(content.mimeType).toBeValidMimeType();
        }
      }
    });

    it('should handle XML content with proper MIME type', async () => {
      const result = await server.readResource('https://api.example.com/xml-data');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.mimeType).toBe('application/xml');
        expect(content.text).toContain('<?xml version="1.0"');
        expect(content.text).toContain('<root>');
      }
    });

    it('should handle custom MIME types', async () => {
      const result = await server.readResource('custom://scheme/resource');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.mimeType).toBe('application/custom');
        expect(content.mimeType).toBeValidMimeType();
      }
    });
  });

  describe('URI Scheme Compliance', () => {
    it('should handle file:// scheme resources', async () => {
      const result = await server.readResource('file:///project/text-file.txt');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.uri).toBe('file:///project/text-file.txt');
        expect(content.uri).toBeValidURI();
        expect(content.uri).toMatch(/^file:\/\/\//);
      }
    });

    it('should handle https:// scheme resources', async () => {
      const result = await server.readResource('https://api.example.com/xml-data');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.uri).toBe('https://api.example.com/xml-data');
        expect(content.uri).toBeValidURI();
        expect(content.uri).toMatch(/^https:\/\//);
      }
    });

    it('should handle custom scheme resources', async () => {
      const result = await server.readResource('custom://scheme/resource');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.uri).toBe('custom://scheme/resource');
        expect(content.uri).toBeValidURI();
        expect(content.uri).toMatch(/^custom:/);
      }
    });
  });

  describe('Resource Template Compliance', () => {
    it('should return contents array for template resources', async () => {
      const result = await server.readResource('logs://2025-01-15/error.log');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('contents');
        expect(Array.isArray(result.value.contents)).toBe(true);
        expect(result.value.contents).toHaveLength(1);

        const content = result.value.contents[0];
        expect(content).toHaveProperty('uri', 'logs://2025-01-15/error.log');
        expect(content).toHaveProperty('mimeType', 'text/plain');
        expect(content).toHaveProperty('text');
        expect(content.text).toContain('[2025-01-15] ERROR:');

        expect(result.value).toBeValidResourceReadResponse();
      }
    });

    it('should handle different template parameters', async () => {
      const testCases = [
        { uri: 'logs://2025-01-01/info.log', expectedContent: '[2025-01-01] INFO:' },
        { uri: 'logs://2025-12-31/debug.log', expectedContent: '[2025-12-31] DEBUG:' },
        { uri: 'logs://2025-06-15/warn.log', expectedContent: '[2025-06-15] WARN:' },
      ];

      for (const testCase of testCases) {
        const result = await server.readResource(testCase.uri);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const content = result.value.contents[0];
          expect(content.uri).toBe(testCase.uri);
          expect(content.text).toContain(testCase.expectedContent);
        }
      }
    });
  });

  describe('Error Handling Compliance', () => {
    it('should return proper error for non-existent resources', async () => {
      const result = await server.readResource('file:///nonexistent/resource.txt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32002); // RESOURCE_NOT_FOUND
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return proper error for resource access failures', async () => {
      const result = await server.readResource('file:///project/error-resource');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32603); // INTERNAL_ERROR for access failures
        expect(result.error.message).toContain('permission error');
      }
    });

    it('should return proper error for invalid template parameters', async () => {
      const result = await server.readResource('logs:///invalid.log'); // Missing required parameters

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // Invalid URI format returns INTERNAL_ERROR
        expect(result.error.code).toBe(-32603); // INTERNAL_ERROR for invalid URIs
      }
    });

    it('should handle malformed URIs gracefully', async () => {
      const result = await server.readResource('not-a-valid-uri');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32602); // INVALID_PARAMS for malformed URI
      }
    });
  });

  describe('Content Encoding Compliance', () => {
    it('should not double-encode text content', async () => {
      const result = await server.readResource('file:///project/text-file.txt');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.text).toBe('This is a plain text file content.\nWith multiple lines.');
        // Should be plain text, not base64 encoded
        expect(() => Buffer.from(content.text, 'base64').toString()).not.toThrow();
      }
    });

    it('should properly encode binary content as base64', async () => {
      const result = await server.readResource('file:///project/image.png');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.blob).toBeValidBase64();

        // Should be able to decode back to original
        expect(() => Buffer.from(content.blob, 'base64')).not.toThrow();
      }
    });

    it('should handle UTF-8 text content correctly', async () => {
      const result = await server.readResource('file:///project/large-file.dat');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        const decoded = Buffer.from(content.blob, 'base64').toString('utf8');
        expect(decoded).toContain('àáâãäå'); // Unicode characters should be preserved
      }
    });
  });

  describe('JSON-RPC Integration Compliance', () => {
    it('should return proper response format via JSON-RPC', async () => {
      const result = await router(
        'resources/read',
        {
          uri: 'file:///project/text-file.txt',
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('contents');
        expect(Array.isArray(response.contents)).toBe(true);
        expect(response.contents).toHaveLength(1);

        const content = response.contents[0];
        expect(content).toHaveProperty('uri');
        expect(content).toHaveProperty('mimeType');
        expect(content).toHaveProperty('text');
      }
    });

    it('should handle binary resources via JSON-RPC', async () => {
      const result = await router(
        'resources/read',
        {
          uri: 'file:///project/image.png',
        },
        2
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        const content = response.contents[0];
        expect(content).toHaveProperty('blob');
        expect(content.blob).toBeValidBase64();
      }
    });

    it('should return proper JSON-RPC errors for failures', async () => {
      const result = await router(
        'resources/read',
        {
          uri: 'file:///nonexistent/resource.txt',
        },
        3
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32002); // RESOURCE_NOT_FOUND
        expect(result.error).toHaveProperty('message');
      }
    });
  });
});
