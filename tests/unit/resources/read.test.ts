/**
 * Tests for MCP resources/read endpoint
 * Based on MCP specification 2025-06-18
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ComprehensiveTestServer,
  MinimalTestServer,
  ErrorTestServer,
} from '../../fixtures/test-servers.js';
import { createTestClient } from '../../helpers/test-client.js';
import { setupMCPAssertions, AssertionHelpers } from '../../helpers/assertions.js';
import { ResultTestUtils, ProtocolTestUtils, TestUtils } from '../../helpers/test-utilities.js';
import {
  validResourceReadRequest,
  validResourceReadResponse,
  validResourceReadResponseBinary,
} from '../../fixtures/mcp-protocol.js';
import { ErrorCode, RESOURCE_NOT_FOUND_CODE } from '../../../src/index.js';

// Setup custom assertions
setupMCPAssertions();

describe('Resource Read (resources/read)', () => {
  let server: ComprehensiveTestServer;
  let client: ReturnType<typeof createTestClient>;

  beforeEach(async () => {
    server = new ComprehensiveTestServer();
    client = createTestClient(server);
    await client.initialize();
  });

  describe('Basic Functionality', () => {
    it('should read a text resource successfully', async () => {
      const result = await client.readResource('file:///project/README.md');
      const response = ResultTestUtils.expectOk(result);

      expect(response).toBeValidResourceReadResponse();
      expect(response.contents).toHaveLength(1);

      const content = response.contents[0];
      expect(content.uri).toBe('file:///project/README.md');
      expect(content.mimeType).toBe('text/markdown'); // Detected from .md extension
      expect(content.text).toBeDefined();
      expect(typeof content.text).toBe('string');
      expect(content.blob).toBeUndefined();
    });

    it('should read a JSON resource and parse it correctly', async () => {
      const result = await client.readResource('file:///project/package.json');
      const response = ResultTestUtils.expectOk(result);

      expect(response).toBeValidResourceReadResponse();
      expect(response.contents).toHaveLength(1);

      const content = response.contents[0];
      expect(content.uri).toBe('file:///project/package.json');
      expect(content.text).toBeDefined();

      // Should be valid JSON
      expect(() => JSON.parse(content.text)).not.toThrow();
      const parsed = JSON.parse(content.text);
      expect(parsed).toHaveProperty('name');
      expect(parsed).toHaveProperty('version');
    });

    it('should read dynamic resources correctly', async () => {
      const result = await client.readResource('memory://cache');
      const response = ResultTestUtils.expectOk(result);

      expect(response).toBeValidResourceReadResponse();
      expect(response.contents).toHaveLength(1);

      const content = response.contents[0];
      expect(content.uri).toBe('memory://cache');
      expect(content.text).toBeDefined();

      const parsed = JSON.parse(content.text);
      expect(parsed).toHaveProperty('entries');
      expect(parsed).toHaveProperty('size');
      expect(parsed).toHaveProperty('lastAccess');
    });

    it('should read live data resources', async () => {
      const result = await client.readResource('live://random-data');
      const response = ResultTestUtils.expectOk(result);

      expect(response).toBeValidResourceReadResponse();
      expect(response.contents).toHaveLength(1);

      const content = response.contents[0];
      expect(content.uri).toBe('live://random-data');
      expect(content.text).toBeDefined();

      const parsed = JSON.parse(content.text);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('randomValue');
      expect(parsed).toHaveProperty('counter');
      expect(typeof parsed.timestamp).toBe('number');
      expect(typeof parsed.randomValue).toBe('number');
      expect(typeof parsed.counter).toBe('number');
    });
  });

  describe('Resource Templates', () => {
    it('should read resources using URI templates with parameters', async () => {
      const result = await client.readResource('file:///logs/2025-01-01');
      const response = ResultTestUtils.expectOk(result);

      expect(response).toBeValidResourceReadResponse();
      expect(response.contents).toHaveLength(1);

      const content = response.contents[0];
      expect(content.uri).toBe('file:///logs/2025-01-01');
      expect(content.text).toBeDefined();
      expect(content.text).toContain('[INFO]');
    });

    it('should handle different template parameters', async () => {
      const dates = ['2025-01-01', '2025-01-02'];

      for (const date of dates) {
        const result = await client.readResource(`file:///logs/${date}`);
        const response = ResultTestUtils.expectOk(result);

        expect(response.contents).toHaveLength(1);
        expect(response.contents[0].uri).toBe(`file:///logs/${date}`);
        expect(response.contents[0].text).toBeDefined();
      }
    });

    it('should read user profile templates', async () => {
      const userIds = ['1', '2'];

      for (const userId of userIds) {
        const result = await client.readResource(`https://api.example.com/users/${userId}`);
        const response = ResultTestUtils.expectOk(result);

        expect(response.contents).toHaveLength(1);

        const content = response.contents[0];
        expect(content.uri).toBe(`https://api.example.com/users/${userId}`);
        expect(content.text).toBeDefined();

        const userData = JSON.parse(content.text);
        expect(userData).toHaveProperty('id', parseInt(userId));
        expect(userData).toHaveProperty('name');
        expect(userData).toHaveProperty('email');
      }
    });

    it('should handle git commit templates', async () => {
      const commitHash = 'abc123def456';
      const result = await client.readResource(`git://repo/commit/${commitHash}`);
      const response = ResultTestUtils.expectOk(result);

      expect(response.contents).toHaveLength(1);

      const content = response.contents[0];
      expect(content.uri).toBe(`git://repo/commit/${commitHash}`);
      expect(content.text).toBeDefined();

      const commitData = JSON.parse(content.text);
      expect(commitData).toHaveProperty('hash', commitHash);
      expect(commitData).toHaveProperty('author');
      expect(commitData).toHaveProperty('date');
      expect(commitData).toHaveProperty('message');
      expect(commitData).toHaveProperty('files');
    });
  });

  describe('Content Types and Encoding', () => {
    it('should return text content with correct MIME type', async () => {
      const result = await client.readResource('file:///project/README.md');
      const response = ResultTestUtils.expectOk(result);

      const content = response.contents[0];
      expect(content.mimeType).toBeValidMimeType();
      expect(content.text).toBeDefined();
      expect(content.blob).toBeUndefined();
    });

    it('should handle JSON content with application/json MIME type', async () => {
      const result = await client.readResource('file:///project/package.json');
      const response = ResultTestUtils.expectOk(result);

      const content = response.contents[0];
      expect(content.mimeType).toBe('application/json');
      expect(content.text).toBeDefined();

      // Should be valid JSON
      expect(() => JSON.parse(content.text)).not.toThrow();
    });

    it('should handle large text content', async () => {
      // Add a large file to the server
      const largeContent = TestUtils.createLargeString(1); // 1MB
      server.addFileToFileSystem('/large-file.txt', largeContent);

      const result = await client.readResource('file:///large-file.txt');
      const response = ResultTestUtils.expectOk(result);

      const content = response.contents[0];
      expect(content.text).toBeDefined();
      expect(content.text.length).toBeGreaterThan(1000000); // 1MB
    });

    it('should include proper annotations when available', async () => {
      const result = await client.readResource('https://api.example.com/status');
      const response = ResultTestUtils.expectOk(result);

      const content = response.contents[0];

      // Check if annotations are included
      if (content.annotations) {
        expect(typeof content.annotations).toBe('object');
      }
    });
  });

  describe('Error Handling', () => {
    it('should return not found error for non-existent resources', async () => {
      const result = await client.readResource('file:///does-not-exist.txt');

      const error = ResultTestUtils.expectErr(result);
      expect(error.code).toBe(RESOURCE_NOT_FOUND_CODE);
      expect(error.message).toContain('not found');
    });

    it('should return not found error for invalid template parameters', async () => {
      const result = await client.readResource('file:///logs/invalid-date');

      const error = ResultTestUtils.expectErr(result);
      expect(error.code).toBe(RESOURCE_NOT_FOUND_CODE);
    });

    it('should return not found error for non-existent user in template', async () => {
      const result = await client.readResource('https://api.example.com/users/999');

      const error = ResultTestUtils.expectErr(result);
      expect(error.code).toBe(RESOURCE_NOT_FOUND_CODE);
      expect(error.message).toContain('Resource not found');
    });

    it('should validate URI parameter', async () => {
      const result = await client.sendRequest('resources/read', {
        // Missing uri parameter
      });

      const error = ResultTestUtils.expectErr(result);
      expect(error.code).toBe(ErrorCode.InvalidParams);
    });

    it('should validate URI format', async () => {
      const result = await client.readResource('invalid-uri-format');

      // Should either reject invalid URI or return not found
      const error = ResultTestUtils.expectErr(result);
      expect([ErrorCode.InvalidParams, RESOURCE_NOT_FOUND_CODE]).toContain(error.code);
    });

    it('should handle server errors during resource read', async () => {
      const errorServer = new ErrorTestServer();
      const errorClient = createTestClient(errorServer);
      await errorClient.initialize();

      const result = await errorClient.readResource('error://internal');
      const error = ResultTestUtils.expectErr(result);

      expect(error.code).toBe(ErrorCode.InternalError);

      await errorClient.close();
    });
  });

  describe('Performance', () => {
    it('should read small resources quickly', async () => {
      const { result, timeMs } = await TestUtils.measureTime(async () => {
        return await client.readResource('file:///project/README.md');
      });

      ResultTestUtils.expectOk(result);
      expect(timeMs).toBeLessThan(100); // Should be very fast for small resources
    });

    it('should handle concurrent reads efficiently', async () => {
      const uris = [
        'file:///project/README.md',
        'file:///project/package.json',
        'memory://cache',
        'https://api.example.com/status',
      ];

      const startTime = Date.now();
      const promises = uris.map((uri) => client.readResource(uri));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should succeed
      results.forEach((result) => {
        ResultTestUtils.expectOk(result);
      });

      // Concurrent reads should be efficient
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle repeated reads efficiently (caching test)', async () => {
      const uri = 'live://random-data';

      // First read
      const firstRead = await TestUtils.measureTime(async () => {
        return await client.readResource(uri);
      });

      // Second read (might be cached)
      const secondRead = await TestUtils.measureTime(async () => {
        return await client.readResource(uri);
      });

      ResultTestUtils.expectOk(firstRead.result);
      ResultTestUtils.expectOk(secondRead.result);

      // Both should be reasonably fast
      expect(firstRead.timeMs).toBeLessThan(500);
      expect(secondRead.timeMs).toBeLessThan(500);
    });
  });

  describe('URI Scheme Support', () => {
    it('should support file:// scheme', async () => {
      const result = await client.readResource('file:///project/README.md');
      const response = ResultTestUtils.expectOk(result);

      expect(response.contents[0].uri).toMatch(/^file:\/\//);
    });

    it('should support https:// scheme', async () => {
      const result = await client.readResource('https://api.example.com/status');
      const response = ResultTestUtils.expectOk(result);

      expect(response.contents[0].uri).toMatch(/^https:\/\//);
    });

    it('should support custom schemes', async () => {
      const result = await client.readResource('memory://cache');
      const response = ResultTestUtils.expectOk(result);

      expect(response.contents[0].uri).toMatch(/^memory:\/\//);
    });

    it('should support git:// scheme for version control', async () => {
      const result = await client.readResource('git://repo/commit/abc123');
      const response = ResultTestUtils.expectOk(result);

      expect(response.contents[0].uri).toMatch(/^git:\/\//);
    });
  });

  describe('Protocol Compliance', () => {
    it('should return response in correct format', async () => {
      const result = await client.readResource('file:///project/README.md');
      const response = ResultTestUtils.expectOk(result);

      expect(response).toBeValidResourceReadResponse();
    });

    it('should include URI in response content', async () => {
      const uri = 'file:///project/README.md';
      const result = await client.readResource(uri);
      const response = ResultTestUtils.expectOk(result);

      expect(response.contents[0].uri).toBe(uri);
    });

    it('should not include both text and blob in content', async () => {
      const result = await client.readResource('file:///project/README.md');
      const response = ResultTestUtils.expectOk(result);

      const content = response.contents[0];

      // Should have either text or blob, but not both
      const hasText = content.text !== undefined;
      const hasBlob = content.blob !== undefined;

      expect(hasText || hasBlob).toBe(true); // Must have one
      expect(hasText && hasBlob).toBe(false); // Cannot have both
    });

    it('should use correct method name', async () => {
      // Test by calling the method - if wrong method name, would get method not found
      const result = await client.readResource('file:///project/README.md');
      expect(result.isOk()).toBe(true);
    });
  });

  describe('Resource State Consistency', () => {
    it('should reflect changes when resource is modified', async () => {
      const uri = 'file:///test-file.txt';
      const originalContent = 'Original content';
      const modifiedContent = 'Modified content';

      // Add initial file
      server.addFileToFileSystem('/test-file.txt', originalContent);

      // Read initial content
      const firstResult = await client.readResource(uri);
      const firstResponse = ResultTestUtils.expectOk(firstResult);
      expect(firstResponse.contents[0].text).toContain(originalContent);

      // Modify file
      server.addFileToFileSystem('/test-file.txt', modifiedContent);

      // Read modified content
      const secondResult = await client.readResource(uri);
      const secondResponse = ResultTestUtils.expectOk(secondResult);
      expect(secondResponse.contents[0].text).toContain(modifiedContent);
      expect(secondResponse.contents[0].text).not.toContain(originalContent);
    });

    it('should handle resource deletion', async () => {
      const uri = 'file:///temp-file.txt';

      // Add file
      server.addFileToFileSystem('/temp-file.txt', 'Temporary content');

      // Verify it can be read
      const readResult = await client.readResource(uri);
      ResultTestUtils.expectOk(readResult);

      // Remove file
      server.removeFileFromFileSystem('/temp-file.txt');

      // Should now return not found
      const deletedResult = await client.readResource(uri);
      const error = ResultTestUtils.expectErr(deletedResult);
      expect(error.code).toBe(RESOURCE_NOT_FOUND_CODE);
    });
  });

  afterEach(async () => {
    await client.close();
  });
});
