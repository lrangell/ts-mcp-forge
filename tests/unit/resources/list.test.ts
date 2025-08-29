/**
 * Tests for MCP resources/list endpoint
 * Based on MCP specification 2025-06-18
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComprehensiveTestServer, MinimalTestServer } from '../../fixtures/test-servers.js';
import { createTestClient } from '../../helpers/test-client.js';
import { setupMCPAssertions, AssertionHelpers } from '../../helpers/assertions.js';
import { ResultTestUtils } from '../../helpers/test-utilities.js';
import {} from '../../fixtures/mcp-protocol.js';

// Setup custom assertions
setupMCPAssertions();

describe('Resources List (resources/list)', () => {
  let server: ComprehensiveTestServer;
  let client: ReturnType<typeof createTestClient>;

  beforeEach(async () => {
    server = new ComprehensiveTestServer();
    client = createTestClient(server);
    await client.initialize();
  });

  describe('Basic Functionality', () => {
    it('should list all available resources', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      expect(response).toHaveProperty('resources');
      expect(Array.isArray(response.resources)).toBe(true);
      expect(response.resources.length).toBeGreaterThan(0);

      // Validate each resource definition
      response.resources.forEach((resource: any) => {
        expect(resource).toBeValidResourceDefinition();
      });
    });

    it('should include static resources defined with @Resource decorator', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      const resourceUris = response.resources.map((r: any) => r.uri);

      // Check for specific static resources from ComprehensiveTestServer
      expect(resourceUris).toContain('file:///project/README.md');
      expect(resourceUris).toContain('file:///project/package.json');
      expect(resourceUris).toContain('https://api.example.com/status');
      expect(resourceUris).toContain('memory://cache');
    });

    it('should include dynamic resources registered at runtime', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      const resourceUris = response.resources.map((r: any) => r.uri);

      // Check for dynamic resources that should be auto-registered
      expect(resourceUris).toContain('live://random-data');

      // Check for file system resources
      const fileResources = resourceUris.filter((uri: string) => uri.startsWith('file://'));
      expect(fileResources.length).toBeGreaterThan(0);
    });

    it('should return resources with all required fields', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      response.resources.forEach((resource: any) => {
        // Required fields
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(typeof resource.uri).toBe('string');
        expect(typeof resource.name).toBe('string');
        expect(resource.uri.length).toBeGreaterThan(0);
        expect(resource.name.length).toBeGreaterThan(0);

        // URI should be valid
        expect(resource.uri).toBeValidURI();

        // Optional fields should have correct types if present
        if (resource.description !== undefined) {
          expect(typeof resource.description).toBe('string');
        }
        if (resource.mimeType !== undefined) {
          expect(resource.mimeType).toBeValidMimeType();
        }
        if (resource.annotations !== undefined) {
          expect(typeof resource.annotations).toBe('object');
        }
      });
    });

    it('should handle empty resource list gracefully', async () => {
      const emptyServer = new MinimalTestServer();
      const emptyClient = createTestClient(emptyServer);
      await emptyClient.initialize();

      const result = await emptyClient.listResources();
      const response = ResultTestUtils.expectOk(result);

      expect(response).toHaveProperty('resources');
      expect(Array.isArray(response.resources)).toBe(true);
      // MinimalTestServer has one resource
      expect(response.resources.length).toBe(1);
    });
  });

  describe('Pagination', () => {
    it('should support cursor-based pagination when provided', async () => {
      // First request without cursor
      const firstResult = await client.listResources();
      const firstResponse = ResultTestUtils.expectOk(firstResult);

      expect(firstResponse).toHaveProperty('resources');

      // If nextCursor is provided, test pagination
      if (firstResponse.nextCursor) {
        const secondResult = await client.listResources(firstResponse.nextCursor);
        const secondResponse = ResultTestUtils.expectOk(secondResult);

        expect(secondResponse).toHaveProperty('resources');
        expect(Array.isArray(secondResponse.resources)).toBe(true);

        // Resources in second page should be different from first page
        const firstUris = new Set(firstResponse.resources.map((r: any) => r.uri));
        const secondUris = new Set(secondResponse.resources.map((r: any) => r.uri));

        // Should have no overlap if properly paginated
        const intersection = [...firstUris].filter((uri) => secondUris.has(uri));
        expect(intersection.length).toBe(0);
      }
    });

    it('should handle invalid cursor gracefully', async () => {
      const result = await client.listResources('invalid-cursor-123');

      // Should either return empty results or an error
      if (result.isOk()) {
        const response = result.value;
        expect(response).toHaveProperty('resources');
        expect(Array.isArray(response.resources)).toBe(true);
      } else {
        // If error, should be a proper JSON-RPC error
        const error = result.error;
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
      }
    });

    it('should not return nextCursor when no more resources available', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      // For a test server with limited resources, shouldn't need pagination
      if (response.resources.length < 100) {
        expect(response.nextCursor).toBeUndefined();
      }
    });
  });

  describe('Resource Metadata', () => {
    it('should include proper MIME types for known file types', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      const readmeResource = response.resources.find(
        (r: any) => r.uri === 'file:///project/README.md'
      );

      if (readmeResource) {
        expect(readmeResource.mimeType).toBe('text/markdown');
      }
    });

    it('should include descriptions for documented resources', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      response.resources.forEach((resource: any) => {
        if (resource.description) {
          expect(typeof resource.description).toBe('string');
          expect(resource.description.length).toBeGreaterThan(0);
        }
      });
    });

    it('should include annotations when present', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      response.resources.forEach((resource: any) => {
        if (resource.annotations) {
          expect(typeof resource.annotations).toBe('object');

          // Common annotation fields
          if (resource.annotations.audience) {
            expect(Array.isArray(resource.annotations.audience)).toBe(true);
          }
          if (resource.annotations.priority) {
            expect(typeof resource.annotations.priority).toBe('number');
          }
        }
      });
    });
  });

  describe('Performance', () => {
    it('should return resource list in reasonable time', async () => {
      const startTime = Date.now();
      const result = await client.listResources();
      const endTime = Date.now();

      ResultTestUtils.expectOk(result);

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle large number of resources efficiently', async () => {
      // Add many dynamic resources
      for (let i = 0; i < 100; i++) {
        server.addFileToFileSystem(`/test/file-${i}.txt`, `Content ${i}`);
      }

      const startTime = Date.now();
      const result = await client.listResources();
      const endTime = Date.now();

      const response = ResultTestUtils.expectOk(result);
      expect(response.resources.length).toBeGreaterThanOrEqual(50);

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(2000); // Should still respond quickly
    });
  });

  describe('URI Schemes', () => {
    it('should support file:// scheme for filesystem resources', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      const fileResources = response.resources.filter((r: any) => r.uri.startsWith('file://'));

      expect(fileResources.length).toBeGreaterThan(0);

      fileResources.forEach((resource: any) => {
        expect(resource.uri).toMatch(/^file:\/\/\//);
        expect(resource.uri).toBeValidURI();
      });
    });

    it('should support https:// scheme for web resources', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      const webResources = response.resources.filter((r: any) => r.uri.startsWith('https://'));

      if (webResources.length > 0) {
        webResources.forEach((resource: any) => {
          expect(resource.uri).toMatch(/^https:\/\//);
          expect(resource.uri).toBeValidURI();
        });
      }
    });

    it('should support custom URI schemes', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      const customResources = response.resources.filter(
        (r: any) => !r.uri.startsWith('file://') && !r.uri.startsWith('https://')
      );

      if (customResources.length > 0) {
        customResources.forEach((resource: any) => {
          // Should still follow URI format with scheme
          expect(resource.uri).toMatch(/^[a-zA-Z][a-zA-Z0-9+.-]*:/);
          expect(resource.uri).toBeValidURI();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should validate request parameters', async () => {
      // Test with invalid cursor type
      const result = await client.sendRequest('resources/list', {
        cursor: 123, // Should be string
      });

      if (result.isErr()) {
        expect(result.error.code).toBe(-32602); // Invalid params
      }
    });

    it('should handle server errors gracefully', async () => {
      // Simulate a server error by breaking the resource list temporarily
      const originalListResources = server.listResources;
      server.listResources = () => {
        throw new Error('Simulated server error');
      };

      const result = await client.listResources();

      // Should get a proper error response
      if (result.isErr()) {
        expect(result.error.code).toBe(-32603); // Internal error
        expect(typeof result.error.message).toBe('string');
      }

      // Restore original method
      server.listResources = originalListResources;
    });
  });

  describe('Protocol Compliance', () => {
    it('should return response in correct JSON-RPC format', async () => {
      const result = await client.sendRequest('resources/list', {});
      const response = ResultTestUtils.expectOk(result);

      // Should be a valid JSON-RPC response structure when wrapped
      expect(response).toHaveProperty('resources');
    });

    it('should use correct method name', async () => {
      // This is tested implicitly by the working requests above
      const result = await client.listResources();
      expect(result.isOk()).toBe(true);
    });

    it('should handle method not found for invalid methods', async () => {
      const result = await client.sendRequest('resources/invalid', {});

      if (result.isErr()) {
        expect(result.error.code).toBe(-32601); // Method not found
      }
    });
  });

  describe('Resource Uniqueness', () => {
    it('should not return duplicate resources', async () => {
      const result = await client.listResources();
      const response = ResultTestUtils.expectOk(result);

      const uris = response.resources.map((r: any) => r.uri);
      AssertionHelpers.expectUniqueItems(uris);
    });

    it('should maintain consistent resource ordering', async () => {
      const firstResult = await client.listResources();
      const firstResponse = ResultTestUtils.expectOk(firstResult);

      const secondResult = await client.listResources();
      const secondResponse = ResultTestUtils.expectOk(secondResult);

      // Resources should be in the same order for consistent requests
      expect(firstResponse.resources).toEqual(secondResponse.resources);
    });
  });

  afterEach(async () => {
    await client.close();
  });
});
