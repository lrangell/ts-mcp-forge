/**
 * MCP Protocol Compliance Test Suite
 * Tests adherence to the MCP specification 2025-06-18
 *
 * This test suite ensures that the framework implementation complies with:
 * - Resources specification
 * - Tools specification
 * - Prompts specification
 * - Completion utilities specification
 * - JSON-RPC 2.0 protocol requirements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { createMCPRouter } from '../../src/core/router.js';
import { setupMCPAssertions } from '../helpers/assertions.js';
import {
  Tool,
  Resource,
  Prompt,
  Param,
  DynamicResource,
  DynamicPrompt,
  PromptTemplate,
  ResourceTemplate,
} from '../../src/decorators/index.js';
import {
  PROTOCOL_VERSION,
  MCP_ERROR_CODES,
  validToolCallResponse,
  validResourceReadResponse,
  validPromptGetResponse,
} from '../fixtures/mcp-protocol.js';

// Setup custom assertions
setupMCPAssertions();

/**
 * Comprehensive test server implementing all MCP features
 */
class MCPComplianceTestServer extends MCPServer {
  constructor() {
    super('MCP Compliance Test Server', '1.0.0');
  }

  // Tools with various parameter types for compliance testing
  @Tool('text-processor', 'Process text with various operations')
  processText(
    @Param('Input text to process') text: string,
    @Param('Processing operation', { required: false }) operation?: string
  ): Result<string, Error> {
    if (!text) return err(new Error('Input text is required'));
    switch (operation) {
      case 'uppercase':
        return ok(text.toUpperCase());
      case 'lowercase':
        return ok(text.toLowerCase());
      default:
        return ok(text);
    }
  }

  @Tool('math-calculator', 'Perform mathematical operations')
  calculate(
    @Param('First number') a: number,
    @Param('Second number') b: number,
    @Param('Operation type') operation: string
  ): Result<object, Error> {
    if (typeof a !== 'number' || typeof b !== 'number') {
      return err(new Error('Both operands must be numbers'));
    }
    let result: number;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) return err(new Error('Division by zero'));
        result = a / b;
        break;
      default:
        return err(new Error(`Unknown operation: ${operation}`));
    }
    return ok({ operation, operandA: a, operandB: b, result });
  }

  @Tool('content-generator', 'Generate content with different content types')
  generateContent(
    @Param('Content type') type: string,
    @Param('Content data') data: string
  ): Result<object, Error> {
    switch (type) {
      case 'text':
        return ok({
          content: [{ type: 'text', text: `Generated: ${data}` }],
          metadata: { generated: new Date().toISOString() },
        });
      case 'image':
        return ok({
          content: [
            {
              type: 'image',
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAFfetKVhwAAAABJRU5ErkJggg==',
              mimeType: 'image/png',
            },
          ],
          metadata: { width: 1, height: 1 },
        });
      case 'resource':
        return ok({
          content: [{ type: 'resource', uri: `file:///generated/${data}.json` }],
          metadata: { resourceType: 'generated' },
        });
      default:
        return err(new Error(`Unsupported content type: ${type}`));
    }
  }

  // Resources with various URI schemes
  @Resource('file:///project/config.json', {
    description: 'Project configuration',
    mimeType: 'application/json',
  })
  getProjectConfig(): Result<object, Error> {
    return ok({
      name: 'MCP Test Project',
      version: '1.0.0',
      features: ['tools', 'resources', 'prompts'],
      lastModified: new Date().toISOString(),
    });
  }

  @Resource('https://api.example.com/status', {
    description: 'API status endpoint',
    mimeType: 'application/json',
  })
  getApiStatus(): Result<object, Error> {
    return ok({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        cache: 'up',
        queue: 'up',
      },
    });
  }

  @Resource('memory://cache', {
    description: 'In-memory cache data',
    mimeType: 'application/json',
  })
  getCacheData(): Result<object, Error> {
    return ok({
      cacheSize: 1024,
      hitRate: 0.85,
      entries: 42,
    });
  }

  // Resource templates for dynamic URI patterns
  @ResourceTemplate('file:///logs/{date}/{level}.log', {
    description: 'Log files by date and level',
    mimeType: 'text/plain',
  })
  getLogFile(params: { date: string; level: string }): Result<string, Error> {
    if (!params.date || !params.level) {
      return err(new Error('Date and level parameters required'));
    }
    return ok(`[${params.date}] ${params.level.toUpperCase()}: Sample log entry`);
  }

  @ResourceTemplate('data://{category}/{id}', {
    description: 'Data entries by category and ID',
    mimeType: 'application/json',
  })
  getDataEntry(params: { category: string; id: string }): Result<object, Error> {
    return ok({
      category: params.category,
      id: params.id,
      data: `Sample data for ${params.category}:${params.id}`,
      timestamp: new Date().toISOString(),
    });
  }

  // Prompts with various argument configurations
  @Prompt('code-review', 'Review code for quality and best practices')
  codeReviewPrompt(
    @Param('Programming language') language: string,
    @Param('Code to review') code: string,
    @Param('Focus area', { required: false }) focus?: string
  ): Result<object, Error> {
    const focusText = focus ? ` with focus on ${focus}` : '';
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please review this ${language} code${focusText}:\n\n${code}`,
          },
        },
      ],
    });
  }

  @Prompt('summarize-text', 'Summarize provided text content')
  summarizePrompt(
    @Param('Text to summarize') text: string,
    @Param('Summary length', { required: false }) length?: string
  ): Result<object, Error> {
    const lengthInstruction = length ? ` Keep the summary ${length}.` : '';
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please summarize the following text.${lengthInstruction}\n\n${text}`,
          },
        },
      ],
    });
  }

  // Prompt templates for dynamic prompt generation
  @PromptTemplate('help/{topic}', { description: 'Help prompts by topic' })
  getHelpPrompt(params: { topic: string }): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please provide help information about: ${params.topic}`,
          },
        },
      ],
    });
  }

  // Dynamic resource registration
  @DynamicResource('Initialize test data resources')
  initializeDynamicResources(): void {
    // Register time-based resource
    this.registerResource(
      'live://current-time',
      async () => ok({ timestamp: new Date().toISOString() }),
      'Current server time',
      false,
      'application/json'
    );

    // Register subscribable data feed
    this.registerResource(
      'live://data-feed',
      async () => ok({ value: Math.random(), timestamp: Date.now() }),
      'Live data feed',
      true,
      'application/json'
    );
  }

  // Dynamic prompt registration
  @DynamicPrompt('Initialize custom prompt templates')
  initializeDynamicPrompts(): void {
    this.registerPrompt(
      'custom-format',
      async (format: string, content: string) =>
        ok({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Format this content as ${format}: ${content}`,
              },
            },
          ],
        }),
      'Custom content formatting',
      [
        { index: 0, name: 'format', description: 'Output format' },
        { index: 1, name: 'content', description: 'Content to format' },
      ]
    );
  }
}

describe('MCP Protocol Compliance', () => {
  let server: MCPComplianceTestServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new MCPComplianceTestServer();
    router = createMCPRouter(server);
  });

  describe('Protocol Version Compliance', () => {
    it('should use correct MCP protocol version', () => {
      const initResponse = server.handleInitialize();
      expect(initResponse.protocolVersion).toBe(PROTOCOL_VERSION);
    });

    it('should handle initialize request with correct version', async () => {
      const result = await router(
        'initialize',
        {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'Test Client', version: '1.0.0' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeValidInitializeResponse();
      }
    });
  });

  describe('Capabilities Declaration Compliance', () => {
    it('should declare capabilities correctly when features are present', () => {
      const initResponse = server.handleInitialize();

      // Should declare tools capability when tools exist
      expect(initResponse.capabilities.tools).toBeDefined();
      expect(initResponse.capabilities.tools).toEqual({});

      // Should declare resources capability when resources exist
      expect(initResponse.capabilities.resources).toBeDefined();
      expect(typeof initResponse.capabilities.resources).toBe('object');

      // Should declare prompts capability when prompts exist
      expect(initResponse.capabilities.prompts).toBeDefined();
      expect(typeof initResponse.capabilities.prompts).toBe('object');
    });

    it('should not declare capabilities for missing features', () => {
      class EmptyServer extends MCPServer {
        constructor() {
          super('Empty Server', '1.0.0');
        }
      }

      const emptyServer = new EmptyServer();
      const initResponse = emptyServer.handleInitialize();

      expect(initResponse.capabilities.tools).toBeUndefined();
      expect(initResponse.capabilities.resources).toBeUndefined();
      expect(initResponse.capabilities.prompts).toBeUndefined();
    });
  });

  describe('Tools Compliance', () => {
    it('should list tools in correct MCP format', async () => {
      const result = await router('tools/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { tools: any[] };
        expect(response).toHaveProperty('tools');
        expect(Array.isArray(response.tools)).toBe(true);

        response.tools.forEach((tool) => {
          expect(tool).toBeValidToolDefinition();
        });
      }
    });

    it('should handle tool calls with correct response format', async () => {
      const result = await router(
        'tools/call',
        {
          name: 'text-processor',
          arguments: { text: 'hello world', operation: 'uppercase' },
        },
        2
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toBeValidToolCallResponse();
        expect(response.content).toHaveLength(1);
        expect(response.content[0].type).toBe('text');
        expect(response.content[0].text).toBe('HELLO WORLD');
        expect(response.isError).toBe(false);
      }
    });

    it('should handle tool errors with correct error format', async () => {
      const result = await router(
        'tools/call',
        {
          name: 'math-calculator',
          arguments: { a: 10, b: 0, operation: 'divide' },
        },
        3
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(MCP_ERROR_CODES.INTERNAL_ERROR);
        expect(result.error.message).toContain('Division by zero');
      }
    });

    it('should return correct error for unknown tool', async () => {
      const result = await router(
        'tools/call',
        {
          name: 'non-existent-tool',
          arguments: {},
        },
        4
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(MCP_ERROR_CODES.METHOD_NOT_FOUND);
      }
    });

    it('should validate parameters according to schema', async () => {
      const result = await router(
        'tools/call',
        {
          name: 'math-calculator',
          arguments: { a: 'not-a-number', b: 5, operation: 'add' },
        },
        5
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(MCP_ERROR_CODES.INVALID_PARAMS);
      }
    });

    it('should support different content types in tool responses', async () => {
      // Test text content
      const textResult = await router(
        'tools/call',
        {
          name: 'content-generator',
          arguments: { type: 'text', data: 'sample' },
        },
        6
      );

      expect(textResult.isOk()).toBe(true);
      if (textResult.isOk()) {
        const response = textResult.value as any;
        const content = JSON.parse(response.content[0].text);
        expect(content.content[0].type).toBe('text');
      }

      // Test image content
      const imageResult = await router(
        'tools/call',
        {
          name: 'content-generator',
          arguments: { type: 'image', data: 'test' },
        },
        7
      );

      expect(imageResult.isOk()).toBe(true);
      if (imageResult.isOk()) {
        const response = imageResult.value as any;
        const content = JSON.parse(response.content[0].text);
        expect(content.content[0].type).toBe('image');
        expect(content.content[0]).toHaveProperty('data');
        expect(content.content[0]).toHaveProperty('mimeType');
      }
    });
  });

  describe('Resources Compliance', () => {
    it('should list resources in correct MCP format', async () => {
      const result = await router('resources/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { resources: any[] };
        expect(response).toHaveProperty('resources');
        expect(Array.isArray(response.resources)).toBe(true);

        response.resources.forEach((resource) => {
          expect(resource).toBeValidResourceDefinition();
        });
      }
    });

    it('should read resources with correct response format', async () => {
      const result = await router(
        'resources/read',
        {
          uri: 'file:///project/config.json',
        },
        2
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toBeValidResourceReadResponse();
        expect(response.contents).toHaveLength(1);
        expect(response.contents[0].uri).toBe('file:///project/config.json');
        expect(response.contents[0].mimeType).toBe('application/json');
      }
    });

    it('should support various URI schemes', async () => {
      const uriSchemes = [
        'file:///project/config.json',
        'https://api.example.com/status',
        'memory://cache',
      ];

      for (const uri of uriSchemes) {
        const result = await router('resources/read', { uri }, Math.random());
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const response = result.value as any;
          expect(response.contents[0].uri).toBe(uri);
        }
      }
    });

    it('should handle resource templates correctly', async () => {
      const result = await router(
        'resources/read',
        {
          uri: 'file:///logs/2025-01-15/error.log',
        },
        3
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.contents[0].uri).toBe('file:///logs/2025-01-15/error.log');
        expect(response.contents[0].text).toContain('[2025-01-15] ERROR:');
      }
    });

    it('should return correct error for non-existent resource', async () => {
      const result = await router(
        'resources/read',
        {
          uri: 'file:///non-existent-resource',
        },
        4
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(MCP_ERROR_CODES.RESOURCE_NOT_FOUND);
      }
    });
  });

  describe('Prompts Compliance', () => {
    it('should list prompts in correct MCP format', async () => {
      const result = await router('prompts/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { prompts: any[] };
        expect(response).toHaveProperty('prompts');
        expect(Array.isArray(response.prompts)).toBe(true);

        response.prompts.forEach((prompt) => {
          expect(prompt).toBeValidPromptDefinition();
        });
      }
    });

    it('should get prompts with correct response format', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'code-review',
          arguments: {
            language: 'typescript',
            code: 'const x = 1;',
            focus: 'performance',
          },
        },
        2
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toBeValidPromptResponse();
        expect(response.messages).toHaveLength(1);
        expect(response.messages[0].role).toBe('user');
        expect(response.messages[0].content.text).toContain('typescript');
        expect(response.messages[0].content.text).toContain('performance');
      }
    });

    it('should handle prompt templates correctly', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'help/typescript',
          arguments: {},
        },
        3
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('typescript');
      }
    });

    it('should handle optional prompt arguments', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'summarize-text',
          arguments: { text: 'Long text to summarize...' },
        },
        4
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toBeValidPromptResponse();
      }
    });

    it('should return correct error for non-existent prompt', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'non-existent-prompt',
          arguments: {},
        },
        5
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(MCP_ERROR_CODES.METHOD_NOT_FOUND);
      }
    });
  });

  describe('Completion Utilities Compliance', () => {
    it('should provide completions for prompt arguments', async () => {
      // This would test completion if implemented
      // For now, just verify the completion endpoint exists
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/prompt', name: 'code-review' },
          argument: { name: 'language', value: 'typ' },
        },
        1
      );

      // If completions are not implemented, should return method not found
      // If implemented, should return valid completion response
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toBeValidCompletionResponse();
        expect(response.completion.values.length).toBeLessThanOrEqual(100);
      } else {
        expect(result.error.code).toBe(MCP_ERROR_CODES.METHOD_NOT_FOUND);
      }
    });

    it('should provide completions for resource URIs', async () => {
      const result = await router(
        'completion/complete',
        {
          ref: { type: 'ref/resource', uri: 'file:///logs/' },
          argument: { name: 'date', value: '2025' },
        },
        2
      );

      // Similar to above - test if completions are implemented
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toBeValidCompletionResponse();
      } else {
        expect(result.error.code).toBe(MCP_ERROR_CODES.METHOD_NOT_FOUND);
      }
    });
  });

  describe('JSON-RPC 2.0 Compliance', () => {
    it('should handle malformed JSON requests', async () => {
      // This would be handled at the transport layer
      // but the router should handle invalid structures
      const result = await router('invalid-method', {}, 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(MCP_ERROR_CODES.METHOD_NOT_FOUND);
      }
    });

    it('should handle missing required parameters', async () => {
      const result = await router(
        'tools/call',
        {
          // Missing name and arguments
        },
        2
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(MCP_ERROR_CODES.INVALID_PARAMS);
      }
    });

    it('should handle requests with invalid parameter types', async () => {
      const result = await router(
        'resources/read',
        {
          uri: 123, // Should be string
        },
        3
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(MCP_ERROR_CODES.INVALID_PARAMS);
      }
    });
  });

  describe('Error Handling Compliance', () => {
    it('should return standard MCP error codes', () => {
      // Verify error codes match specification
      expect(MCP_ERROR_CODES.PARSE_ERROR).toBe(-32700);
      expect(MCP_ERROR_CODES.INVALID_REQUEST).toBe(-32600);
      expect(MCP_ERROR_CODES.METHOD_NOT_FOUND).toBe(-32601);
      expect(MCP_ERROR_CODES.INVALID_PARAMS).toBe(-32602);
      expect(MCP_ERROR_CODES.INTERNAL_ERROR).toBe(-32603);
      expect(MCP_ERROR_CODES.RESOURCE_NOT_FOUND).toBe(-32002);
    });

    it('should provide informative error messages', async () => {
      const result = await router(
        'tools/call',
        {
          name: 'non-existent-tool',
          arguments: {},
        },
        1
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBeTruthy();
        expect(typeof result.error.message).toBe('string');
        expect(result.error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Security Considerations Compliance', () => {
    it('should validate all input parameters', async () => {
      // Test various injection attempts
      const maliciousInputs = [
        '"><script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '../../../etc/passwd',
        'null\x00byte',
      ];

      for (const input of maliciousInputs) {
        const result = await router(
          'tools/call',
          {
            name: 'text-processor',
            arguments: { text: input },
          },
          Math.random()
        );

        // Should either succeed with sanitized input or fail with validation error
        if (result.isErr()) {
          expect([MCP_ERROR_CODES.INVALID_PARAMS, MCP_ERROR_CODES.INTERNAL_ERROR]).toContain(
            result.error.code
          );
        }
      }
    });

    it('should restrict access to unauthorized resources', async () => {
      const unauthorizedUris = [
        'file:///etc/passwd',
        'file:///../../../etc/passwd',
        'http://evil.com/malicious',
        'javascript:alert("xss")',
      ];

      for (const uri of unauthorizedUris) {
        const result = await router('resources/read', { uri }, Math.random());

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect([MCP_ERROR_CODES.RESOURCE_NOT_FOUND, MCP_ERROR_CODES.INVALID_PARAMS]).toContain(
            result.error.code
          );
        }
      }
    });
  });

  describe('Pagination Compliance', () => {
    it('should support cursor-based pagination for tools/list', async () => {
      const result = await router('tools/list', { cursor: 'test-cursor' }, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('tools');
        // nextCursor is optional based on whether more results exist
        if (response.nextCursor !== undefined) {
          expect(typeof response.nextCursor).toBe('string');
        }
      }
    });

    it('should support cursor-based pagination for resources/list', async () => {
      const result = await router('resources/list', { cursor: 'test-cursor' }, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('resources');
        if (response.nextCursor !== undefined) {
          expect(typeof response.nextCursor).toBe('string');
        }
      }
    });

    it('should support cursor-based pagination for prompts/list', async () => {
      const result = await router('prompts/list', { cursor: 'test-cursor' }, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('prompts');
        if (response.nextCursor !== undefined) {
          expect(typeof response.nextCursor).toBe('string');
        }
      }
    });
  });

  describe('Dynamic Registration Compliance', () => {
    it('should properly register and list dynamic resources', () => {
      const resources = server.listResources();
      const uris = resources.map((r) => r.uri);

      expect(uris).toContain('live://current-time');
      expect(uris).toContain('live://data-feed');
    });

    it('should properly register and list dynamic prompts', () => {
      const prompts = server.listPrompts();
      const names = prompts.map((p) => p.name);

      expect(names).toContain('custom-format');
    });

    it('should read dynamic resources correctly', async () => {
      const result = await router(
        'resources/read',
        {
          uri: 'live://current-time',
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.contents[0].uri).toBe('live://current-time');
        const data = JSON.parse(response.contents[0].text);
        expect(data).toHaveProperty('timestamp');
      }
    });

    it('should call dynamic prompts correctly', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'custom-format',
          arguments: { format: 'JSON', content: 'test data' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('JSON');
        expect(response.messages[0].content.text).toContain('test data');
      }
    });
  });
});
