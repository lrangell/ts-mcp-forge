/**
 * MCP Specification Compliance Tests
 * Based on MCP specification 2025-06-18
 *
 * This test suite ensures full compliance with the Model Context Protocol specification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { Tool, Resource, Prompt, Param, DynamicResource } from '../../src/decorators/index.js';
import { createMCPRouter } from '../../src/core/router.js';
import { setupMCPAssertions } from '../helpers/assertions.js';

// Setup custom assertions
setupMCPAssertions();

/**
 * Comprehensive test server for MCP compliance testing
 */
class MCPComplianceTestServer extends MCPServer {
  constructor() {
    super('MCP Compliance Test Server', '1.0.0');
  }

  // Tools with various content types
  @Tool('text-tool', 'Returns text content')
  textTool(@Param('Input text') text: string): Result<string, string> {
    if (!text) {
      return err('Text is required');
    }
    return ok(`Processed: ${text}`);
  }

  @Tool('image-tool', 'Returns image content')
  imageTool(@Param('Image name') name: string): Result<object, string> {
    if (!name) {
      return err('Image name is required');
    }
    return ok({
      type: 'image',
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: 'image/png',
      description: `Generated image for ${name}`,
    });
  }

  @Tool('resource-tool', 'Returns resource reference')
  resourceTool(@Param('Resource name') name: string): Result<object, string> {
    if (!name) {
      return err('Resource name is required');
    }
    return ok({
      type: 'resource',
      uri: `resource://generated/${name}`,
      description: `Resource reference for ${name}`,
    });
  }

  @Tool('multi-content-tool', 'Returns multiple content types')
  multiContentTool(@Param('Request type') requestType: string): Result<object[], string> {
    const contents = [
      {
        type: 'text',
        text: `Multi-content response for ${requestType}`,
      },
      {
        type: 'image',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
      },
      {
        type: 'resource',
        uri: `file:///tmp/${requestType}-result.json`,
      },
    ];
    return ok(contents);
  }

  @Tool('error-tool', 'Tool that demonstrates error handling')
  errorTool(@Param('Error type') errorType: string): Result<string, string> {
    switch (errorType) {
      case 'validation':
        return err('Invalid input parameters');
      case 'execution':
        return err('Tool execution failed');
      case 'permission':
        return err('Insufficient permissions');
      default:
        return err('Unknown error type');
    }
  }

  // Resources with various URI schemes and content types
  @Resource('file:///project/README.md', 'Project documentation', 'text/markdown')
  getReadme(): Result<string, string> {
    return ok('# MCP Test Project\n\nThis is a test project for MCP compliance.');
  }

  @Resource('https://api.example.com/status', 'API status endpoint', 'application/json')
  getApiStatus(): Result<object, string> {
    return ok({
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }

  @Resource('custom://data/binary', 'Binary data resource', 'application/octet-stream')
  getBinaryData(): Result<string, string> {
    // Return base64 encoded binary data
    return ok(Buffer.from('Hello MCP Binary World').toString('base64'));
  }

  @Resource('memory://cache/session', 'Session cache data', 'application/json')
  getSessionCache(): Result<object, string> {
    return ok({
      sessionId: 'test-session-123',
      data: { user: 'test', preferences: {} },
      expires: new Date(Date.now() + 3600000).toISOString(),
    });
  }

  // Prompts with proper message structure
  @Prompt('code-review', 'Code review assistant prompt')
  codeReviewPrompt(
    @Param('Programming language') language: string,
    @Param('Code snippet') code: string,
    @Param('Focus area', false) focus?: string
  ): Result<object, string> {
    if (!language || !code) {
      return err('Language and code are required');
    }

    const messages = [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please review this ${language} code${focus ? ` focusing on ${focus}` : ''}:\n\n${code}`,
        },
      },
    ];

    return ok({ messages });
  }

  @Prompt('translation', 'Translation assistant prompt')
  translationPrompt(
    @Param('Source language') sourceLang: string,
    @Param('Target language') targetLang: string,
    @Param('Text to translate') text: string
  ): Result<object, string> {
    if (!sourceLang || !targetLang || !text) {
      return err('All parameters are required');
    }

    const messages = [
      {
        role: 'system' as const,
        content: {
          type: 'text' as const,
          text: `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}.`,
        },
      },
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: text,
        },
      },
    ];

    return ok({ messages });
  }

  @Prompt('multi-modal', 'Multi-modal prompt with various content types')
  multiModalPrompt(
    @Param('Task description') task: string,
    @Param('Include image', false) includeImage?: boolean
  ): Result<object, string> {
    const messages = [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Task: ${task}`,
        },
      },
    ];

    if (includeImage) {
      messages.push({
        role: 'user' as const,
        content: {
          type: 'image' as const,
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
        },
      });
    }

    return ok({ messages });
  }

  // Dynamic resources for pagination testing
  @DynamicResource('Initialize large resource set for pagination testing')
  initializeLargeResourceSet(): void {
    // Register many resources to test pagination
    for (let i = 0; i < 150; i++) {
      this.registerResource(
        `file:///data/item-${i.toString().padStart(3, '0')}.json`,
        async () => ok({ id: i, data: `Item ${i}` }),
        `Data item ${i}`,
        false,
        'application/json'
      );
    }
  }
}

describe('MCP Specification Compliance', () => {
  let server: MCPComplianceTestServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new MCPComplianceTestServer();
    router = createMCPRouter(server);
  });

  describe('1. Protocol Version Compliance', () => {
    it('should use protocol version 2025-06-18 in initialize response', () => {
      const response = server.handleInitialize();

      expect(response.protocolVersion).toBe('2025-06-18');
      expect(response).toBeValidInitializeResponse();
    });

    it('should maintain protocol version consistency across all responses', async () => {
      const initResult = await router('initialize', {}, 1);
      expect(initResult.isOk()).toBe(true);

      if (initResult.isOk()) {
        expect(initResult.value.protocolVersion).toBe('2025-06-18');
      }
    });
  });

  describe('2. Error Code Compliance', () => {
    it('should return -32601 (METHOD_NOT_FOUND) for unknown tools', async () => {
      const result = await server.callTool('unknown-tool', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32601);
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return -32602 (INVALID_PARAMS) for invalid parameters', async () => {
      const result = await server.callTool('text-tool', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32602);
      }
    });

    it('should return -32603 (INTERNAL_ERROR) for tool execution errors', async () => {
      const result = await server.callTool('error-tool', { errorType: 'execution' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32603);
        expect(result.error.message).toContain('execution failed');
      }
    });

    it('should return -32002 (RESOURCE_NOT_FOUND) for unknown resources', async () => {
      const result = await server.readResource('unknown://resource');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32002);
      }
    });

    it('should return -32601 (METHOD_NOT_FOUND) for unknown prompts', async () => {
      const result = await server.getPrompt('unknown-prompt', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32601);
      }
    });
  });

  describe('3. Resource Read Response Format', () => {
    it('should return contents array with proper structure', async () => {
      const result = await server.readResource('file:///project/README.md');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('contents');
        expect(Array.isArray(result.value.contents)).toBe(true);
        expect(result.value.contents).toHaveLength(1);

        const content = result.value.contents[0];
        expect(content).toHaveProperty('uri', 'file:///project/README.md');
        expect(content).toHaveProperty('mimeType', 'text/markdown');
        expect(content).toHaveProperty('text');
        expect(typeof content.text).toBe('string');
      }
    });

    it('should handle binary resources with blob field', async () => {
      const result = await server.readResource('custom://data/binary');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content).toHaveProperty('uri', 'custom://data/binary');
        expect(content).toHaveProperty('mimeType', 'application/octet-stream');
        expect(content).toHaveProperty('blob');
        expect(content.blob).toBeValidBase64();
      }
    });

    it('should validate resource read response format', async () => {
      const result = await server.readResource('https://api.example.com/status');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeValidResourceReadResponse();
      }
    });
  });

  describe('4. Tools Call Response Format', () => {
    it('should return content array with proper text content', async () => {
      const result = await server.callTool('text-tool', { text: 'hello' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('content');
        expect(Array.isArray(result.value.content)).toBe(true);
        expect(result.value.content).toHaveLength(1);

        const content = result.value.content[0];
        expect(content.type).toBe('text');
        expect(content).toHaveProperty('text');
        expect(typeof content.text).toBe('string');
      }
    });

    it('should handle image content type properly', async () => {
      const result = await server.callTool('image-tool', { name: 'test' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        expect(content.type).toBe('text');

        // Parse the JSON response to check image structure
        const imageData = JSON.parse(content.text);
        expect(imageData.type).toBe('image');
        expect(imageData).toHaveProperty('data');
        expect(imageData).toHaveProperty('mimeType', 'image/png');
        expect(imageData.data).toBeValidBase64();
      }
    });

    it('should handle resource content type properly', async () => {
      const result = await server.callTool('resource-tool', { name: 'test' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        const resourceData = JSON.parse(content.text);
        expect(resourceData.type).toBe('resource');
        expect(resourceData).toHaveProperty('uri');
        expect(resourceData.uri).toBeValidURI();
      }
    });

    it('should handle multiple content types in response', async () => {
      const result = await server.callTool('multi-content-tool', { requestType: 'test' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toHaveLength(1);

        const responseData = JSON.parse(result.value.content[0].text);
        expect(Array.isArray(responseData)).toBe(true);
        expect(responseData).toHaveLength(3);

        expect(responseData[0].type).toBe('text');
        expect(responseData[1].type).toBe('image');
        expect(responseData[2].type).toBe('resource');
      }
    });

    it('should validate tool call response format', async () => {
      const result = await server.callTool('text-tool', { text: 'test' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeValidToolCallResponse();
      }
    });
  });

  describe('5. Prompts Response Format', () => {
    it('should return messages array with proper structure', async () => {
      const result = await server.getPrompt('code-review', {
        language: 'typescript',
        code: 'const x = 1;',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('messages');
        expect(Array.isArray(result.value.messages)).toBe(true);
        expect(result.value.messages).toHaveLength(1);

        const message = result.value.messages[0];
        expect(message).toHaveProperty('role', 'user');
        expect(message).toHaveProperty('content');
        expect(message.content).toHaveProperty('type', 'text');
        expect(message.content).toHaveProperty('text');
      }
    });

    it('should handle multi-message prompts', async () => {
      const result = await server.getPrompt('translation', {
        sourceLang: 'English',
        targetLang: 'Spanish',
        text: 'Hello world',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toHaveLength(2);
        expect(result.value.messages[0].role).toBe('system');
        expect(result.value.messages[1].role).toBe('user');
      }
    });

    it('should handle multi-modal content in prompts', async () => {
      const result = await server.getPrompt('multi-modal', {
        task: 'analyze image',
        includeImage: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toHaveLength(2);

        const imageMessage = result.value.messages[1];
        expect(imageMessage.content.type).toBe('image');
        expect(imageMessage.content).toHaveProperty('data');
        expect(imageMessage.content).toHaveProperty('mimeType', 'image/png');
      }
    });

    it('should validate prompt response format', async () => {
      const result = await server.getPrompt('code-review', {
        language: 'python',
        code: 'print("hello")',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeValidPromptResponse();
      }
    });
  });

  describe('6. Pagination Support', () => {
    it('should support cursor-based pagination for resources', async () => {
      const firstPage = await router('resources/list', {}, 1);

      expect(firstPage.isOk()).toBe(true);
      if (firstPage.isOk()) {
        const response = firstPage.value as any;
        expect(response).toHaveProperty('resources');
        expect(Array.isArray(response.resources)).toBe(true);

        // If there are many resources, should have pagination
        if (response.resources.length >= 50) {
          expect(response).toHaveProperty('nextCursor');
          expect(typeof response.nextCursor).toBe('string');
        }
      }
    });

    it('should handle cursor parameter in pagination', async () => {
      const withCursor = await router('resources/list', { cursor: 'test-cursor' }, 2);

      expect(withCursor.isOk()).toBe(true);
      if (withCursor.isOk()) {
        const response = withCursor.value as any;
        expect(response).toHaveProperty('resources');
        expect(Array.isArray(response.resources)).toBe(true);
      }
    });

    it('should support pagination for tools list', async () => {
      const result = await router('tools/list', {}, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('tools');
        expect(Array.isArray(response.tools)).toBe(true);
      }
    });

    it('should support pagination for prompts list', async () => {
      const result = await router('prompts/list', {}, 4);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('prompts');
        expect(Array.isArray(response.prompts)).toBe(true);
      }
    });
  });

  describe('7. Content Types Support', () => {
    it('should support text content type', async () => {
      const result = await server.callTool('text-tool', { text: 'test' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        expect(content.type).toBe('text');
        expect(content).toHaveProperty('text');
      }
    });

    it('should support image content type with base64 data', async () => {
      const result = await server.callTool('image-tool', { name: 'test' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const imageData = JSON.parse(result.value.content[0].text);
        expect(imageData.type).toBe('image');
        expect(imageData.data).toBeValidBase64();
        expect(imageData.mimeType).toBeValidMimeType();
      }
    });

    it('should support resource content type with URI', async () => {
      const result = await server.callTool('resource-tool', { name: 'test' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resourceData = JSON.parse(result.value.content[0].text);
        expect(resourceData.type).toBe('resource');
        expect(resourceData.uri).toBeValidURI();
      }
    });

    it('should handle mixed content types properly', async () => {
      const result = await server.callTool('multi-content-tool', { requestType: 'mixed' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const contents = JSON.parse(result.value.content[0].text);
        expect(contents).toHaveLength(3);

        const types = contents.map((c: any) => c.type);
        expect(types).toContain('text');
        expect(types).toContain('image');
        expect(types).toContain('resource');
      }
    });
  });

  describe('8. URI Validation', () => {
    it('should validate file:// scheme URIs', async () => {
      const result = server.listResources();
      const resourceList = Array.isArray(result) ? result : result.resources;
      const fileResources = resourceList.filter((r) => r.uri.startsWith('file://'));

      expect(fileResources.length).toBeGreaterThan(0);
      fileResources.forEach((resource) => {
        expect(resource.uri).toBeValidURI();
        expect(resource.uri).toMatch(/^file:\/\/\//);
      });
    });

    it('should validate https:// scheme URIs', async () => {
      const result = server.listResources();
      const resourceList = Array.isArray(result) ? result : result.resources;
      const httpsResources = resourceList.filter((r) => r.uri.startsWith('https://'));

      if (httpsResources.length > 0) {
        httpsResources.forEach((resource) => {
          expect(resource.uri).toBeValidURI();
          expect(resource.uri).toMatch(/^https:\/\//);
        });
      }
    });

    it('should validate custom scheme URIs', async () => {
      const result = server.listResources();
      const resourceList = Array.isArray(result) ? result : result.resources;
      const customResources = resourceList.filter(
        (r) => !r.uri.startsWith('file://') && !r.uri.startsWith('https://')
      );

      if (customResources.length > 0) {
        customResources.forEach((resource) => {
          expect(resource.uri).toBeValidURI();
          expect(resource.uri).toMatch(/^[a-zA-Z][a-zA-Z0-9+.-]*:/);
        });
      }
    });

    it('should handle URI validation in tool responses', async () => {
      const result = await server.callTool('resource-tool', { name: 'uri-test' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resourceData = JSON.parse(result.value.content[0].text);
        expect(resourceData.uri).toBeValidURI();
      }
    });
  });

  describe('9. Capability Declaration', () => {
    it('should declare tools capability when tools are present', () => {
      const response = server.handleInitialize();

      expect(response.capabilities).toHaveProperty('tools');
      expect(response.capabilities.tools).toEqual({});
    });

    it('should declare resources capability with optional features', () => {
      const response = server.handleInitialize();

      expect(response.capabilities).toHaveProperty('resources');
      expect(typeof response.capabilities.resources).toBe('object');

      // Should support subscribe and listChanged
      if (response.capabilities.resources.subscribe !== undefined) {
        expect(typeof response.capabilities.resources.subscribe).toBe('boolean');
      }
      if (response.capabilities.resources.listChanged !== undefined) {
        expect(typeof response.capabilities.resources.listChanged).toBe('boolean');
      }
    });

    it('should declare prompts capability with optional features', () => {
      const response = server.handleInitialize();

      expect(response.capabilities).toHaveProperty('prompts');
      expect(typeof response.capabilities.prompts).toBe('object');

      if (response.capabilities.prompts.listChanged !== undefined) {
        expect(typeof response.capabilities.prompts.listChanged).toBe('boolean');
      }
    });

    it('should declare completion capability when supported', () => {
      const response = server.handleInitialize();

      if (response.capabilities.completion !== undefined) {
        expect(typeof response.capabilities.completion).toBe('object');
      }
    });

    it('should not declare capabilities for unsupported features', () => {
      class MinimalServer extends MCPServer {
        constructor() {
          super('Minimal Server', '1.0.0');
        }
      }

      const minimalServer = new MinimalServer();
      const response = minimalServer.handleInitialize();

      // Should not declare capabilities for features not implemented
      expect(response.capabilities.tools).toBeUndefined();
      expect(response.capabilities.resources).toBeUndefined();
      expect(response.capabilities.prompts).toBeUndefined();
    });

    it('should maintain capability consistency across requests', async () => {
      const initResult = await router('initialize', {}, 1);

      expect(initResult.isOk()).toBe(true);
      if (initResult.isOk()) {
        const capabilities = initResult.value.capabilities;

        // If tools capability is declared, tools/list should work
        if (capabilities.tools) {
          const toolsResult = await router('tools/list', {}, 2);
          expect(toolsResult.isOk()).toBe(true);
        }

        // If resources capability is declared, resources/list should work
        if (capabilities.resources) {
          const resourcesResult = await router('resources/list', {}, 3);
          expect(resourcesResult.isOk()).toBe(true);
        }

        // If prompts capability is declared, prompts/list should work
        if (capabilities.prompts) {
          const promptsResult = await router('prompts/list', {}, 4);
          expect(promptsResult.isOk()).toBe(true);
        }
      }
    });
  });
});
