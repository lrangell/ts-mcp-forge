import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Prompt, DynamicPrompt, PromptTemplate, Param } from '../../../src/decorators/index.js';
import { createMCPRouter } from '../../../src/core/router.js';
import { ErrorCode } from '../../../src/index.js';

/**
 * Test suite for prompts/get method based on MCP specification 2025-06-18
 * Tests getting prompts with various content types, argument handling, and error cases
 */

class PromptsGetTestServer extends MCPServer {
  constructor() {
    super('Prompts Get Test Server', '1.0.0');
  }

  // Text content prompts
  @Prompt('simple-text', 'Simple text content prompt')
  getSimpleText(@Param('Subject') subject: string): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please analyze the following subject: ${subject}`,
          },
        },
      ],
    });
  }

  // No arguments prompt
  @Prompt('no-args', 'Prompt with no arguments')
  getNoArgs(): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Please provide a general response.',
          },
        },
      ],
    });
  }

  // Error-producing prompt
  @Prompt('error-prompt', 'Prompt that produces errors')
  getErrorPrompt(@Param('Will fail') willFail: boolean): Result<object, Error> {
    if (willFail) {
      return err(new Error('Prompt execution failed'));
    }
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Success response',
          },
        },
      ],
    });
  }

  // Complex argument types
  @Prompt('complex-args', 'Prompt with complex argument types')
  getComplexArgs(
    @Param('String value') stringVal: string,
    @Param('Number value') numberVal: number,
    @Param('Boolean value') boolVal: boolean
  ): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `String: ${stringVal}, Number: ${numberVal}, Boolean: ${boolVal}`,
          },
        },
      ],
    });
  }

  // Dynamic prompts
  @DynamicPrompt('Initialize dynamic prompts with various content types')
  initializeDynamicPrompts(): void {
    // Dynamic prompt returning text
    this.registerPrompt(
      'dynamic-text',
      async (message: string) =>
        ok({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Dynamic: ${message}`,
              },
            },
          ],
        }),
      'Dynamic text prompt',
      [{ index: 0, name: 'message', description: 'Message to include' }]
    );

    // Dynamic prompt that can error
    this.registerPrompt(
      'dynamic-error',
      async (shouldError: string) => {
        if (shouldError === 'true') {
          return err('Dynamic prompt error');
        }
        return ok({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Dynamic success',
              },
            },
          ],
        });
      },
      'Dynamic error-prone prompt',
      [{ index: 0, name: 'shouldError', description: 'Whether to produce an error' }]
    );
  }

  // Prompt templates
  @PromptTemplate('language/{lang}/help', { description: 'Language-specific help' })
  async getLanguageHelp(params: { lang: string }): Promise<Result<object, string>> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Provide help for ${params.lang} programming language`,
          },
        },
      ],
    });
  }
}

describe('Prompts Get (prompts/get)', () => {
  let server: PromptsGetTestServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new PromptsGetTestServer();
    router = createMCPRouter(server);
  });

  describe('Text content prompts', () => {
    it('should handle simple text content', async () => {
      const result = await server.getPrompt('simple-text', { subject: 'TypeScript' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages).toHaveLength(1);
        expect(response.messages[0].role).toBe('user');
        expect(response.messages[0].content.type).toBe('text');
        expect(response.messages[0].content.text).toContain('TypeScript');
      }
    });

    it('should handle prompts with no arguments', async () => {
      const result = await server.getPrompt('no-args', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages).toHaveLength(1);
        expect(response.messages[0].content.type).toBe('text');
        expect(response.messages[0].content.text).toBe('Please provide a general response.');
      }
    });
  });

  describe('Argument validation and types', () => {
    it('should handle complex argument types', async () => {
      const result = await server.getPrompt('complex-args', {
        stringVal: 'test string',
        numberVal: 42,
        boolVal: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('test string');
        expect(response.messages[0].content.text).toContain('42');
        expect(response.messages[0].content.text).toContain('true');
      }
    });

    it('should validate required arguments', async () => {
      const result = await server.getPrompt('simple-text', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InvalidParams);
        expect(result.error.message).toContain('Invalid arguments');
      }
    });

    it('should validate argument types', async () => {
      const result = await server.getPrompt('complex-args', {
        stringVal: 'test',
        numberVal: 'not a number', // Wrong type
        boolVal: true,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InvalidParams);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle prompt execution errors', async () => {
      const result = await server.getPrompt('error-prompt', { willFail: true });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InternalError);
        expect(result.error.message).toContain('failed');
      }
    });

    it('should handle successful prompt after potential error', async () => {
      const result = await server.getPrompt('error-prompt', { willFail: false });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toBe('Success response');
      }
    });

    it('should return error for unknown prompt', async () => {
      const result = await server.getPrompt('non-existent-prompt', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.MethodNotFound);
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('Dynamic prompts', () => {
    it('should handle dynamic text prompts', async () => {
      const result = await server.getPrompt('dynamic-text', { message: 'Hello dynamic' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toBe('Dynamic: Hello dynamic');
      }
    });

    it('should handle dynamic prompt errors', async () => {
      const result = await server.getPrompt('dynamic-error', { shouldError: 'true' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InternalError);
      }
    });
  });

  describe('Prompt templates', () => {
    it('should handle simple prompt templates', async () => {
      const result = await server.getPrompt('language/python/help', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('python');
      }
    });

    it('should handle non-matching template patterns', async () => {
      const result = await server.getPrompt('invalid/template/pattern', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.MethodNotFound);
      }
    });
  });

  describe('JSON-RPC router integration', () => {
    it('should handle prompts/get request with correct response format', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'simple-text',
          arguments: { subject: 'Testing' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages).toBeDefined();
        expect(response.messages[0].content.text).toContain('Testing');
      }
    });

    it('should validate required name parameter', async () => {
      const result = await router(
        'prompts/get',
        {
          arguments: { subject: 'test' },
        },
        3
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InvalidParams);
        expect(result.error.message).toContain('name is required');
      }
    });
  });
});
