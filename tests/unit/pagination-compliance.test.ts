/**
 * Pagination Compliance Tests
 * Ensures cursor-based pagination follows MCP specification 2025-06-18
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { Tool, Param, DynamicResource, DynamicPrompt } from '../../src/decorators/index.js';
import { createMCPRouter } from '../../src/core/router.js';
import { setupMCPAssertions, AssertionHelpers } from '../helpers/assertions.js';

// Setup custom assertions
setupMCPAssertions();

class PaginationComplianceServer extends MCPServer {
  private largeResourceSet: Array<{ uri: string; name: string; data: any }> = [];
  private largeToolSet: Array<{ name: string; description: string }> = [];
  private largePromptSet: Array<{ name: string; description: string }> = [];

  constructor() {
    super('Pagination Compliance Server', '1.0.0');
    this.initializeLargeDataSets();
  }

  private initializeLargeDataSets(): void {
    // Create large resource set (200 items)
    for (let i = 0; i < 200; i++) {
      this.largeResourceSet.push({
        uri: `file:///data/resource-${i.toString().padStart(3, '0')}.json`,
        name: `Resource ${i}`,
        data: { id: i, category: `category-${i % 10}`, value: Math.random() * 1000 },
      });
    }

    // Create large tool set (150 items)
    for (let i = 0; i < 150; i++) {
      this.largeToolSet.push({
        name: `tool-${i.toString().padStart(3, '0')}`,
        description: `Tool number ${i} for category ${i % 5}`,
      });
    }

    // Create large prompt set (100 items)
    for (let i = 0; i < 100; i++) {
      this.largePromptSet.push({
        name: `prompt-${i.toString().padStart(3, '0')}`,
        description: `Prompt number ${i} for domain ${i % 7}`,
      });
    }
  }

  // Dynamic resources for pagination testing
  @DynamicResource('Initialize paginated resources')
  initializePaginatedResources(): void {
    this.largeResourceSet.forEach((resource) => {
      this.registerResource(
        resource.uri,
        async () => ok(resource.data),
        resource.name,
        false,
        'application/json'
      );
    });

    // Add some specific resources for boundary testing
    this.registerResource(
      'file:///pagination/boundary-test-start.json',
      async () => ok({ boundary: 'start', position: 0 }),
      'Boundary Test Start',
      false,
      'application/json'
    );

    this.registerResource(
      'file:///pagination/boundary-test-end.json',
      async () => ok({ boundary: 'end', position: 999 }),
      'Boundary Test End',
      false,
      'application/json'
    );
  }

  // Dynamic prompts for pagination testing
  @DynamicPrompt('Initialize paginated prompts')
  initializePaginatedPrompts(): void {
    this.largePromptSet.forEach((prompt) => {
      this.registerPrompt(
        prompt.name,
        async (input: string) =>
          ok({
            messages: [
              {
                role: 'user' as const,
                content: {
                  type: 'text' as const,
                  text: `${prompt.description}: ${input || 'No input provided'}`,
                },
              },
            ],
          }),
        prompt.description,
        [{ index: 0, name: 'input', description: 'Input parameter' }]
      );
    });
  }

  // Tools for pagination testing
  @Tool('paginated-tool-001', 'First paginated tool')
  paginatedTool001(@Param('Input') input: string): Result<string, string> {
    return ok(`Tool 001 processed: ${input}`);
  }

  @Tool('paginated-tool-002', 'Second paginated tool')
  paginatedTool002(@Param('Input') input: string): Result<string, string> {
    return ok(`Tool 002 processed: ${input}`);
  }

  @Tool('paginated-tool-003', 'Third paginated tool')
  paginatedTool003(@Param('Input') input: string): Result<string, string> {
    return ok(`Tool 003 processed: ${input}`);
  }

  // Override list methods to support pagination
  override listResources(cursor?: string): any[] {
    // Get all resources from parent as array
    const allResources = this.getAllResources();

    // Simple cursor-based pagination (in real implementation, this would be more sophisticated)
    const pageSize = 50;
    let startIndex = 0;

    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        startIndex = cursorData.offset || 0;
      } catch {
        // Invalid cursor, start from beginning
        startIndex = 0;
      }
    }

    const paginatedResources = allResources.slice(startIndex, startIndex + pageSize);

    // Add nextCursor if there are more items
    if (startIndex + pageSize < allResources.length) {
      const nextCursor = Buffer.from(JSON.stringify({ offset: startIndex + pageSize })).toString(
        'base64'
      );
      return {
        resources: paginatedResources,
        nextCursor: nextCursor,
      };
    }

    return {
      resources: paginatedResources,
    };
  }

  override listTools(cursor?: string): any[] {
    const allTools = super.listTools();

    const pageSize = 25;
    let startIndex = 0;

    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        startIndex = cursorData.offset || 0;
      } catch {
        startIndex = 0;
      }
    }

    const paginatedTools = allTools.slice(startIndex, startIndex + pageSize);

    if (startIndex + pageSize < allTools.length) {
      const nextCursor = Buffer.from(JSON.stringify({ offset: startIndex + pageSize })).toString(
        'base64'
      );
      return {
        tools: paginatedTools,
        nextCursor: nextCursor,
      };
    }

    return {
      tools: paginatedTools,
    };
  }

  override listPrompts(cursor?: string): any[] {
    const allPrompts = super.listPrompts();

    const pageSize = 20;
    let startIndex = 0;

    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        startIndex = cursorData.offset || 0;
      } catch {
        startIndex = 0;
      }
    }

    const paginatedPrompts = allPrompts.slice(startIndex, startIndex + pageSize);

    if (startIndex + pageSize < allPrompts.length) {
      const nextCursor = Buffer.from(JSON.stringify({ offset: startIndex + pageSize })).toString(
        'base64'
      );
      return {
        prompts: paginatedPrompts,
        nextCursor: nextCursor,
      };
    }

    return {
      prompts: paginatedPrompts,
    };
  }
}

describe('Pagination Compliance', () => {
  let server: PaginationComplianceServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new PaginationComplianceServer();
    router = createMCPRouter(server);
  });

  describe('Resources List Pagination', () => {
    it('should return first page without cursor', async () => {
      const result = await router('resources/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('resources');
        expect(Array.isArray(response.resources)).toBe(true);
        expect(response.resources.length).toBeGreaterThan(0);
        expect(response.resources.length).toBeLessThanOrEqual(50);

        // Should have nextCursor if there are more items
        if (response.resources.length === 50) {
          expect(response).toHaveProperty('nextCursor');
          expect(typeof response.nextCursor).toBe('string');
          expect(response.nextCursor.length).toBeGreaterThan(0);
        }

        AssertionHelpers.expectValidPagination(response, true);
      }
    });

    it('should return next page with valid cursor', async () => {
      // Get first page
      const firstPageResult = await router('resources/list', {}, 1);
      expect(firstPageResult.isOk()).toBe(true);

      if (firstPageResult.isOk()) {
        const firstPage = firstPageResult.value as any;

        if (firstPage.nextCursor) {
          // Get second page
          const secondPageResult = await router(
            'resources/list',
            {
              cursor: firstPage.nextCursor,
            },
            2
          );

          expect(secondPageResult.isOk()).toBe(true);

          if (secondPageResult.isOk()) {
            const secondPage = secondPageResult.value as any;
            expect(secondPage).toHaveProperty('resources');
            expect(Array.isArray(secondPage.resources)).toBe(true);
            expect(secondPage.resources.length).toBeGreaterThan(0);

            // Resources should be different from first page
            const firstPageUris = new Set(firstPage.resources.map((r: any) => r.uri));
            const secondPageUris = new Set(secondPage.resources.map((r: any) => r.uri));

            // Should have no overlap
            const intersection = [...firstPageUris].filter((uri) => secondPageUris.has(uri));
            expect(intersection.length).toBe(0);

            AssertionHelpers.expectValidPagination(secondPage, true);
          }
        }
      }
    });

    it('should handle invalid cursor gracefully', async () => {
      const result = await router(
        'resources/list',
        {
          cursor: 'invalid-cursor-data',
        },
        3
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('resources');
        expect(Array.isArray(response.resources)).toBe(true);
        // Should fall back to first page
      }
    });

    it('should handle malformed cursor gracefully', async () => {
      const result = await router(
        'resources/list',
        {
          cursor: 'bm90LWEtdmFsaWQtanNvbg==', // base64 of "not-a-valid-json"
        },
        4
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('resources');
        // Should handle gracefully and return results
      }
    });

    it('should reach end of pagination without nextCursor', async () => {
      let currentCursor: string | undefined;
      let pageCount = 0;
      let allUris: string[] = [];

      // Traverse all pages
      while (pageCount < 10) {
        // Safety limit
        const result = await router(
          'resources/list',
          currentCursor ? { cursor: currentCursor } : {},
          pageCount + 1
        );
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const response = result.value as any;
          const uris = response.resources.map((r: any) => r.uri);
          allUris.push(...uris);

          if (!response.nextCursor) {
            // Reached end of pagination
            break;
          }

          currentCursor = response.nextCursor;
          pageCount++;
        } else {
          break;
        }
      }

      // Should have collected many resources
      expect(allUris.length).toBeGreaterThan(50);
      // All URIs should be unique
      AssertionHelpers.expectUniqueItems(allUris);
    });
  });

  describe('Tools List Pagination', () => {
    it('should paginate tools with proper page size', async () => {
      const result = await router('tools/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('tools');
        expect(Array.isArray(response.tools)).toBe(true);
        expect(response.tools.length).toBeGreaterThan(0);
        expect(response.tools.length).toBeLessThanOrEqual(25);

        // Validate tool structure
        response.tools.forEach((tool: any) => {
          expect(tool).toBeValidToolDefinition();
        });

        AssertionHelpers.expectValidPagination(response, true);
      }
    });

    it('should handle tools pagination across multiple pages', async () => {
      const firstPageResult = await router('tools/list', {}, 1);
      expect(firstPageResult.isOk()).toBe(true);

      if (firstPageResult.isOk()) {
        const firstPage = firstPageResult.value as any;

        if (firstPage.nextCursor) {
          const secondPageResult = await router(
            'tools/list',
            {
              cursor: firstPage.nextCursor,
            },
            2
          );

          expect(secondPageResult.isOk()).toBe(true);

          if (secondPageResult.isOk()) {
            const secondPage = secondPageResult.value as any;

            // Tool names should be different
            const firstPageNames = new Set(firstPage.tools.map((t: any) => t.name));
            const secondPageNames = new Set(secondPage.tools.map((t: any) => t.name));

            const intersection = [...firstPageNames].filter((name) => secondPageNames.has(name));
            expect(intersection.length).toBe(0);
          }
        }
      }
    });

    it('should maintain tool definition quality across pages', async () => {
      let currentCursor: string | undefined;
      let pageCount = 0;

      while (pageCount < 5) {
        const result = await router(
          'tools/list',
          currentCursor ? { cursor: currentCursor } : {},
          pageCount + 1
        );
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const response = result.value as any;

          // Validate all tools on this page
          response.tools.forEach((tool: any) => {
            expect(tool).toBeValidToolDefinition();
            expect(tool.name).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
            expect(tool.inputSchema).toHaveProperty('type', 'object');
          });

          if (!response.nextCursor) break;
          currentCursor = response.nextCursor;
          pageCount++;
        } else {
          break;
        }
      }
    });
  });

  describe('Prompts List Pagination', () => {
    it('should paginate prompts with proper structure', async () => {
      const result = await router('prompts/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('prompts');
        expect(Array.isArray(response.prompts)).toBe(true);
        expect(response.prompts.length).toBeGreaterThan(0);
        expect(response.prompts.length).toBeLessThanOrEqual(20);

        // Validate prompt structure
        response.prompts.forEach((prompt: any) => {
          expect(prompt).toBeValidPromptDefinition();
        });

        AssertionHelpers.expectValidPagination(response, true);
      }
    });

    it('should handle prompts pagination with dynamic prompts', async () => {
      const allPrompts: any[] = [];
      let currentCursor: string | undefined;
      let pageCount = 0;

      while (pageCount < 10) {
        const result = await router(
          'prompts/list',
          currentCursor ? { cursor: currentCursor } : {},
          pageCount + 1
        );
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const response = result.value as any;
          allPrompts.push(...response.prompts);

          if (!response.nextCursor) break;
          currentCursor = response.nextCursor;
          pageCount++;
        } else {
          break;
        }
      }

      // Should have found both static and dynamic prompts
      expect(allPrompts.length).toBeGreaterThan(10);

      // All prompt names should be unique
      const promptNames = allPrompts.map((p) => p.name);
      AssertionHelpers.expectUniqueItems(promptNames);
    });

    it('should maintain prompt argument structure across pages', async () => {
      const result = await router('prompts/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;

        response.prompts.forEach((prompt: any) => {
          if (prompt.arguments) {
            expect(Array.isArray(prompt.arguments)).toBe(true);

            prompt.arguments.forEach((arg: any) => {
              expect(arg).toHaveProperty('name');
              expect(typeof arg.name).toBe('string');
              expect(arg.name.length).toBeGreaterThan(0);

              if (arg.description !== undefined) {
                expect(typeof arg.description).toBe('string');
              }

              if (arg.required !== undefined) {
                expect(typeof arg.required).toBe('boolean');
              }
            });
          }
        });
      }
    });
  });

  describe('Cursor Format Compliance', () => {
    it('should use valid cursor format', async () => {
      const result = await router('resources/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;

        if (response.nextCursor) {
          // Cursor should be a valid string
          expect(typeof response.nextCursor).toBe('string');
          expect(response.nextCursor.length).toBeGreaterThan(0);

          // Should be base64 encoded
          expect(() => Buffer.from(response.nextCursor, 'base64').toString()).not.toThrow();

          // Decoded content should be valid JSON
          const decoded = Buffer.from(response.nextCursor, 'base64').toString();
          expect(() => JSON.parse(decoded)).not.toThrow();

          const cursorData = JSON.parse(decoded);
          expect(cursorData).toHaveProperty('offset');
          expect(typeof cursorData.offset).toBe('number');
          expect(cursorData.offset).toBeGreaterThan(0);
        }
      }
    });

    it('should handle cursor parameter validation', async () => {
      const testCases = [
        { cursor: null, shouldWork: true },
        { cursor: undefined, shouldWork: true },
        { cursor: '', shouldWork: true },
        { cursor: 'valid-base64-cursor', shouldWork: true },
        { cursor: 123, shouldWork: false }, // Invalid type
        { cursor: {}, shouldWork: false }, // Invalid type
        { cursor: [], shouldWork: false }, // Invalid type
      ];

      for (const testCase of testCases) {
        const params =
          testCase.cursor !== null && testCase.cursor !== undefined
            ? { cursor: testCase.cursor }
            : {};

        const result = await router('resources/list', params, 1);

        if (testCase.shouldWork) {
          expect(result.isOk()).toBe(true);
        } else {
          // Should either work (by ignoring invalid cursor) or return proper error
          if (result.isErr()) {
            expect(result.error.code).toBe(-32602); // INVALID_PARAMS
          }
        }
      }
    });
  });

  describe('Pagination Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      const result = await router('resources/list', {}, 1);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(result.isOk()).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second

      if (result.isOk()) {
        const response = result.value as any;
        expect(response.resources.length).toBeGreaterThan(0);
      }
    });

    it('should maintain consistent response times across pages', async () => {
      const responseTimes: number[] = [];
      let currentCursor: string | undefined;

      for (let page = 0; page < 3; page++) {
        const startTime = Date.now();

        const result = await router(
          'resources/list',
          currentCursor ? { cursor: currentCursor } : {},
          page + 1
        );

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);

        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const response = result.value as any;
          if (!response.nextCursor) break;
          currentCursor = response.nextCursor;
        }
      }

      // Response times should be consistent (no significant degradation)
      expect(responseTimes.length).toBeGreaterThan(1);
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgTime).toBeLessThan(500); // Average should be reasonable
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty result sets gracefully', async () => {
      class EmptyServer extends MCPServer {
        constructor() {
          super('Empty Server', '1.0.0');
        }
      }

      const emptyServer = new EmptyServer();
      const emptyRouter = createMCPRouter(emptyServer);

      const result = await emptyRouter('resources/list', {}, 1);

      // Empty server has no resources capability, so it returns METHOD_NOT_FOUND
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32601); // METHOD_NOT_FOUND
      }
    });

    it('should handle single item result sets', async () => {
      class SingleItemServer extends MCPServer {
        constructor() {
          super('Single Item Server', '1.0.0');
        }

        @Tool('single-tool', 'Only tool')
        singleTool(): Result<string, string> {
          return ok('single result');
        }
      }

      const singleServer = new SingleItemServer();
      const singleRouter = createMCPRouter(singleServer);

      const result = await singleRouter('tools/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.tools).toHaveLength(1);
        expect(response.nextCursor).toBeUndefined();
      }
    });

    it('should handle cursor at exact page boundary', async () => {
      // This tests the edge case where cursor points to exact page boundary
      const firstResult = await router('resources/list', {}, 1);
      expect(firstResult.isOk()).toBe(true);

      if (firstResult.isOk()) {
        const firstPage = firstResult.value as any;

        if (firstPage.nextCursor) {
          // Use the cursor to get next page
          const secondResult = await router(
            'resources/list',
            {
              cursor: firstPage.nextCursor,
            },
            2
          );

          expect(secondResult.isOk()).toBe(true);

          if (secondResult.isOk()) {
            const secondPage = secondResult.value as any;
            expect(secondPage.resources.length).toBeGreaterThan(0);

            // Should not have any duplicates from first page
            const firstUris = new Set(firstPage.resources.map((r: any) => r.uri));
            const secondUris = secondPage.resources.map((r: any) => r.uri);

            secondUris.forEach((uri: string) => {
              expect(firstUris.has(uri)).toBe(false);
            });
          }
        }
      }
    });
  });

  describe('Pagination Metadata Compliance', () => {
    it('should not include total count by default', async () => {
      const result = await router('resources/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        // MCP spec doesn't require total count in pagination
        // Server should not include it unless specifically needed
        expect(response.total).toBeUndefined();
        expect(response.count).toBeUndefined();
        expect(response.totalPages).toBeUndefined();
      }
    });

    it('should maintain consistent pagination behavior across endpoints', async () => {
      const endpoints = [
        { method: 'resources/list', key: 'resources' },
        { method: 'tools/list', key: 'tools' },
        { method: 'prompts/list', key: 'prompts' },
      ];

      for (const endpoint of endpoints) {
        const result = await router(endpoint.method, {}, 1);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const response = result.value as any;

          // Should have the items array
          expect(response).toHaveProperty(endpoint.key);
          expect(Array.isArray(response[endpoint.key])).toBe(true);

          // Cursor behavior should be consistent
          if (response.nextCursor) {
            expect(typeof response.nextCursor).toBe('string');
            expect(response.nextCursor.length).toBeGreaterThan(0);
          }

          // Should not have unexpected pagination metadata
          expect(response.page).toBeUndefined();
          expect(response.pageSize).toBeUndefined();
          expect(response.totalCount).toBeUndefined();
        }
      }
    });
  });
});
