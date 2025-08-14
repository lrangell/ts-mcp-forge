/**
 * Tests for MCP resource templates (resources/templates/list)
 * Based on MCP specification 2025-06-18
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComprehensiveTestServer, MinimalTestServer } from '../../fixtures/test-servers.js';
import { createTestClient } from '../../helpers/test-client.js';
import { setupMCPAssertions, AssertionHelpers } from '../../helpers/assertions.js';
import { ResultTestUtils, ProtocolTestUtils, TestUtils } from '../../helpers/test-utilities.js';
import {
  validResourceTemplatesListRequest,
  validResourceTemplatesListResponse,
} from '../../fixtures/mcp-protocol.js';

// Setup custom assertions
setupMCPAssertions();

describe('Resource Templates (resources/templates/list)', () => {
  let server: ComprehensiveTestServer;
  let client: ReturnType<typeof createTestClient>;

  beforeEach(async () => {
    server = new ComprehensiveTestServer();
    client = createTestClient(server);
    await client.initialize();
  });

  describe('Basic Functionality', () => {
    it('should list all available resource templates', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      expect(response).toHaveProperty('resourceTemplates');
      expect(Array.isArray(response.resourceTemplates)).toBe(true);
      expect(response.resourceTemplates.length).toBeGreaterThan(0);

      // Validate each template definition
      response.resourceTemplates.forEach((template: any) => {
        expect(template).toHaveProperty('uriTemplate');
        expect(template).toHaveProperty('name');
        expect(typeof template.uriTemplate).toBe('string');
        expect(typeof template.name).toBe('string');

        // uriTemplate should contain parameter placeholders
        expect(template.uriTemplate).toMatch(/\{[^}]+\}/);

        // Optional fields
        if (template.description !== undefined) {
          expect(typeof template.description).toBe('string');
        }
        if (template.mimeType !== undefined) {
          expect(template.mimeType).toBeValidMimeType();
        }
      });
    });

    it('should include log file templates', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      const logTemplate = response.resourceTemplates.find((t: any) =>
        t.uriTemplate.includes('/logs/{date}')
      );

      expect(logTemplate).toBeDefined();
      expect(logTemplate.uriTemplate).toBe('file:///logs/{date}');
      expect(logTemplate.name).toBe('Daily Logs');
      expect(logTemplate.description).toBeDefined();
      expect(logTemplate.mimeType).toBe('text/plain');
    });

    it('should include user profile templates', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      const userTemplate = response.resourceTemplates.find((t: any) =>
        t.uriTemplate.includes('/users/{userId}')
      );

      expect(userTemplate).toBeDefined();
      expect(userTemplate.uriTemplate).toBe('https://api.example.com/users/{userId}');
      expect(userTemplate.name).toBe('User Profile');
      expect(userTemplate.description).toBeDefined();
      expect(userTemplate.mimeType).toBe('application/json');
    });

    it('should include git commit templates', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      const gitTemplate = response.resourceTemplates.find((t: any) =>
        t.uriTemplate.includes('/commit/{hash}')
      );

      expect(gitTemplate).toBeDefined();
      expect(gitTemplate.uriTemplate).toBe('git://repo/commit/{hash}');
      expect(gitTemplate.name).toBe('Git Commit');
      expect(gitTemplate.description).toBeDefined();
    });

    it('should handle servers without templates', async () => {
      const minimalServer = new MinimalTestServer();
      const minimalClient = createTestClient(minimalServer);
      await minimalClient.initialize();

      const result = await minimalClient.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      expect(response).toHaveProperty('resourceTemplates');
      expect(Array.isArray(response.resourceTemplates)).toBe(true);
      expect(response.resourceTemplates.length).toBe(0);

      await minimalClient.close();
    });
  });

  describe('Template URI Format Validation', () => {
    it('should have valid URI templates with parameter placeholders', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      response.resourceTemplates.forEach((template: any) => {
        // Should be a valid URI format
        const baseUri = template.uriTemplate.split('{')[0];
        expect(baseUri).toBeValidURI();

        // Should contain at least one parameter
        const paramMatches = template.uriTemplate.match(/\{([^}]+)\}/g);
        expect(paramMatches).toBeDefined();
        expect(paramMatches!.length).toBeGreaterThan(0);

        // Parameter names should be valid
        paramMatches!.forEach((param: string) => {
          const paramName = param.slice(1, -1); // Remove { }
          expect(paramName).toMatch(/^[a-zA-Z][a-zA-Z0-9_]*$/); // Valid identifier
        });
      });
    });

    it('should support multiple parameters in templates', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      // Check if any templates have multiple parameters
      const multiParamTemplates = response.resourceTemplates.filter((template: any) => {
        const paramMatches = template.uriTemplate.match(/\{([^}]+)\}/g);
        return paramMatches && paramMatches.length > 1;
      });

      // This is optional - not all servers need multi-param templates
      if (multiParamTemplates.length > 0) {
        multiParamTemplates.forEach((template: any) => {
          const paramMatches = template.uriTemplate.match(/\{([^}]+)\}/g);
          expect(paramMatches!.length).toBeGreaterThan(1);

          // All parameter names should be unique
          const paramNames = paramMatches!.map((p: string) => p.slice(1, -1));
          AssertionHelpers.expectUniqueItems(paramNames);
        });
      }
    });

    it('should support different URI schemes in templates', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      const schemes = new Set<string>();

      response.resourceTemplates.forEach((template: any) => {
        const schemeMatch = template.uriTemplate.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
        if (schemeMatch) {
          schemes.add(schemeMatch[1]);
        }
      });

      // Should support multiple schemes
      expect(schemes.size).toBeGreaterThan(1);

      // Should include common schemes
      const schemeArray = Array.from(schemes);
      expect(schemeArray.some((s) => ['file', 'https', 'git'].includes(s))).toBe(true);
    });
  });

  describe('Template Metadata', () => {
    it('should provide meaningful names for templates', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      response.resourceTemplates.forEach((template: any) => {
        expect(template.name.length).toBeGreaterThan(0);
        expect(template.name).not.toBe(template.uriTemplate); // Name should be human-readable

        // Should be properly capitalized
        expect(template.name).toMatch(/^[A-Z]/);
      });
    });

    it('should provide helpful descriptions', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      response.resourceTemplates.forEach((template: any) => {
        if (template.description) {
          expect(template.description.length).toBeGreaterThan(10); // Meaningful description
          expect(template.description).not.toBe(template.name); // Different from name
        }
      });
    });

    it('should specify appropriate MIME types', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      response.resourceTemplates.forEach((template: any) => {
        if (template.mimeType) {
          expect(template.mimeType).toBeValidMimeType();

          // Should be appropriate for the resource type
          if (template.uriTemplate.includes('.log') || template.uriTemplate.includes('/logs/')) {
            expect(template.mimeType).toMatch(/text\//);
          }
          if (template.uriTemplate.includes('/users/') || template.uriTemplate.includes('api.')) {
            expect(template.mimeType).toBe('application/json');
          }
        }
      });
    });
  });

  describe('Template Functionality Integration', () => {
    it('should be able to read resources using templates', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      // Test log template
      const logTemplate = response.resourceTemplates.find((t: any) =>
        t.uriTemplate.includes('/logs/{date}')
      );

      if (logTemplate) {
        // Try to read a log file using the template pattern
        const logUri = logTemplate.uriTemplate.replace('{date}', '2025-01-01');
        const readResult = await client.readResource(logUri);

        if (readResult.isOk()) {
          const readResponse = readResult.value;
          expect(readResponse.contents).toHaveLength(1);
          expect(readResponse.contents[0].uri).toBe(logUri);
        }
      }
    });

    it('should work with completion for template parameters', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      // Test completion for log template
      const logTemplate = response.resourceTemplates.find((t: any) =>
        t.uriTemplate.includes('/logs/{date}')
      );

      if (logTemplate) {
        const completionResult = await client.getCompletion(
          { type: 'ref/resource', uri: 'file:///logs/' },
          { name: 'date', value: '2025' }
        );

        if (completionResult.isOk()) {
          const completion = completionResult.value;
          expect(completion.completion.values).toBeDefined();
          expect(Array.isArray(completion.completion.values)).toBe(true);
        }
      }
    });
  });

  describe('Performance', () => {
    it('should list templates quickly', async () => {
      const { result, timeMs } = await TestUtils.measureTime(async () => {
        return await client.listResourceTemplates();
      });

      ResultTestUtils.expectOk(result);
      expect(timeMs).toBeLessThan(100); // Should be very fast
    });

    it('should handle concurrent template list requests', async () => {
      const concurrentRequests = 10;
      const promises = Array(concurrentRequests)
        .fill(0)
        .map(() => client.listResourceTemplates());

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should succeed
      results.forEach((result) => {
        ResultTestUtils.expectOk(result);
      });

      // Should complete quickly even with concurrent requests
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(500);
    });
  });

  describe('Protocol Compliance', () => {
    it('should return response in correct format', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      // Should follow the MCP specification format
      expect(response).toHaveProperty('resourceTemplates');
      expect(Array.isArray(response.resourceTemplates)).toBe(true);

      // Should not have extra fields at root level
      const expectedKeys = ['resourceTemplates'];
      const actualKeys = Object.keys(response);
      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });

    it('should use correct method name', async () => {
      // Implicit test - if method name is wrong, request would fail
      const result = await client.listResourceTemplates();
      expect(result.isOk()).toBe(true);
    });

    it('should not require parameters', async () => {
      // The method should work without any parameters
      const result = await client.sendRequest('resources/templates/list', {});
      const response = ResultTestUtils.expectOk(result);

      expect(response).toHaveProperty('resourceTemplates');
    });

    it('should handle empty parameters object', async () => {
      const result = await client.sendRequest('resources/templates/list', {});
      const response = ResultTestUtils.expectOk(result);

      expect(response).toHaveProperty('resourceTemplates');
      expect(Array.isArray(response.resourceTemplates)).toBe(true);
    });
  });

  describe('Template Uniqueness and Consistency', () => {
    it('should not return duplicate templates', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      const uriTemplates = response.resourceTemplates.map((t: any) => t.uriTemplate);
      AssertionHelpers.expectUniqueItems(uriTemplates);
    });

    it('should maintain consistent template ordering', async () => {
      const firstResult = await client.listResourceTemplates();
      const firstResponse = ResultTestUtils.expectOk(firstResult);

      const secondResult = await client.listResourceTemplates();
      const secondResponse = ResultTestUtils.expectOk(secondResult);

      // Templates should be in the same order
      expect(firstResponse.resourceTemplates).toEqual(secondResponse.resourceTemplates);
    });

    it('should have consistent template names', async () => {
      const result = await client.listResourceTemplates();
      const response = ResultTestUtils.expectOk(result);

      response.resourceTemplates.forEach((template: any) => {
        // Name should be consistent with URI template pattern
        if (template.uriTemplate.includes('/logs/')) {
          expect(template.name.toLowerCase()).toContain('log');
        }
        if (template.uriTemplate.includes('/users/')) {
          expect(template.name.toLowerCase()).toContain('user');
        }
        if (template.uriTemplate.includes('/commit/')) {
          expect(template.name.toLowerCase()).toContain('commit');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Simulate server error
      const originalList = server.listResourceTemplates;
      server.listResourceTemplates = () => {
        throw new Error('Template listing failed');
      };

      const result = await client.listResourceTemplates();

      if (result.isErr()) {
        expect(result.error.code).toBe(-32603); // Internal error
        expect(typeof result.error.message).toBe('string');
      }

      // Restore original method
      server.listResourceTemplates = originalList;
    });

    it('should reject invalid method calls', async () => {
      const result = await client.sendRequest('resources/templates/invalid', {});

      const error = ResultTestUtils.expectErr(result);
      expect(error.code).toBe(-32601); // Method not found
    });
  });

  afterEach(async () => {
    await client.close();
  });
});
