import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Prompt, DynamicPrompt, PromptTemplate, Param } from '../../../src/decorators/index.js';
import { createMCPRouter } from '../../../src/core/router.js';

/**
 * Test suite for prompts/list method based on MCP specification 2025-06-18
 * Tests listing of static prompts, dynamic prompts, and prompt templates
 */

class PromptsListTestServer extends MCPServer {
  constructor() {
    super('Prompts List Test Server', '1.0.0');
  }

  // Static prompts with various argument configurations
  @Prompt('code-generation', 'Generate code in specified language')
  generateCode(
    @Param('Programming language') language: string,
    @Param('Description of what to generate') description: string,
    @Param('Include comments (optional)') includeComments?: boolean
  ): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate ${language} code for: ${description}${includeComments ? ' (with comments)' : ''}`,
          },
        },
      ],
    });
  }

  @Prompt('data-analysis', 'Analyze datasets with specific focus')
  analyzeData(
    @Param('Dataset type') datasetType: string,
    @Param('Analysis focus') focus: string
  ): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze ${datasetType} data focusing on ${focus}`,
          },
        },
      ],
    });
  }

  @Prompt('qa-prompt', 'Question and answer prompt')
  qaPrompt(@Param('Question') question: string): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please answer this question: ${question}`,
          },
        },
      ],
    });
  }

  @Prompt('no-args-prompt', 'Simple prompt with no arguments')
  noArgsPrompt(): Result<object, Error> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'This is a simple prompt with no arguments',
          },
        },
      ],
    });
  }

  // Dynamic prompts
  @DynamicPrompt('Initialize custom prompts for different domains')
  initializeCustomPrompts(): void {
    // Marketing prompts
    this.registerPrompt(
      'marketing-copy',
      async (product: string, audience: string, tone: string) =>
        ok({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Create marketing copy for ${product} targeting ${audience} with a ${tone} tone`,
              },
            },
          ],
        }),
      'Generate marketing copy for products',
      [
        { index: 0, name: 'product', description: 'Product or service name' },
        { index: 1, name: 'audience', description: 'Target audience' },
        { index: 2, name: 'tone', description: 'Tone of voice (formal, casual, etc.)' },
      ]
    );

    // Translation prompts
    this.registerPrompt(
      'translate-text',
      async (text: string, sourceLang: string, targetLang: string) =>
        ok({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Translate from ${sourceLang} to ${targetLang}: "${text}"`,
              },
            },
          ],
        }),
      'Translate text between languages',
      [
        { index: 0, name: 'text', description: 'Text to translate' },
        { index: 1, name: 'sourceLang', description: 'Source language' },
        { index: 2, name: 'targetLang', description: 'Target language' },
      ]
    );

    // Simple dynamic prompt with no arguments
    this.registerPrompt(
      'daily-inspiration',
      async () =>
        ok({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Provide a daily inspirational quote and reflection',
              },
            },
          ],
        }),
      'Get daily inspiration',
      []
    );
  }

  // Prompt templates
  @PromptTemplate('review/{type}', { description: 'Review prompts by type' })
  async getReviewPrompt(params: { type: string }): Promise<Result<object, string>> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Conduct a ${params.type} review`,
          },
        },
      ],
    });
  }
}

describe('Prompts List (prompts/list)', () => {
  let server: PromptsListTestServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new PromptsListTestServer();
    router = createMCPRouter(server);
  });

  describe('Server capability declaration', () => {
    it('should declare prompts capability during initialization', () => {
      const initResponse = server.handleInitialize();

      expect(initResponse.capabilities.prompts).toBeDefined();
      expect(initResponse.capabilities.prompts).toEqual({});
      expect(initResponse.protocolVersion).toBe('2025-06-18');
    });
  });

  describe('Direct server method', () => {
    it('should list all static prompts with correct structure', () => {
      const prompts = server.listPrompts();

      expect(prompts).toBeInstanceOf(Array);
      expect(prompts.length).toBeGreaterThanOrEqual(4);

      // Check structure matches MCP specification
      prompts.forEach((prompt) => {
        expect(prompt).toHaveProperty('name');
        expect(prompt).toHaveProperty('description');
        expect(typeof prompt.name).toBe('string');
        expect(typeof prompt.description).toBe('string');

        if (prompt.arguments) {
          expect(prompt.arguments).toBeInstanceOf(Array);
          prompt.arguments.forEach((arg) => {
            expect(arg).toHaveProperty('name');
            expect(arg).toHaveProperty('description');
            expect(arg).toHaveProperty('required');
            expect(typeof arg.name).toBe('string');
            expect(typeof arg.description).toBe('string');
            expect(typeof arg.required).toBe('boolean');
          });
        }
      });
    });

    it('should include static prompts with correct names and descriptions', () => {
      const prompts = server.listPrompts();
      const promptNames = prompts.map((p) => p.name);
      const promptDescriptions = prompts.map((p) => p.description);

      expect(promptNames).toContain('code-generation');
      expect(promptNames).toContain('data-analysis');
      expect(promptNames).toContain('qa-prompt');
      expect(promptNames).toContain('no-args-prompt');

      expect(promptDescriptions).toContain('Generate code in specified language');
      expect(promptDescriptions).toContain('Analyze datasets with specific focus');
      expect(promptDescriptions).toContain('Question and answer prompt');
      expect(promptDescriptions).toContain('Simple prompt with no arguments');
    });

    it('should include dynamic prompts', () => {
      const prompts = server.listPrompts();
      const promptNames = prompts.map((p) => p.name);

      expect(promptNames).toContain('marketing-copy');
      expect(promptNames).toContain('translate-text');
      expect(promptNames).toContain('daily-inspiration');

      // Check marketing-copy prompt structure
      const marketingPrompt = prompts.find((p) => p.name === 'marketing-copy');
      expect(marketingPrompt).toBeDefined();
      expect(marketingPrompt?.description).toBe('Generate marketing copy for products');
      expect(marketingPrompt?.arguments).toHaveLength(3);
    });

    it('should handle empty prompt list gracefully', () => {
      class EmptyPromptsServer extends MCPServer {
        constructor() {
          super('Empty Server', '1.0.0');
        }
      }

      const emptyServer = new EmptyPromptsServer();
      const prompts = emptyServer.listPrompts();

      expect(prompts).toBeInstanceOf(Array);
      expect(prompts).toHaveLength(0);
    });
  });

  describe('JSON-RPC router integration', () => {
    it('should handle prompts/list request with correct response format', async () => {
      const result = await router('prompts/list', {}, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as { prompts: unknown[] };
        expect(response).toHaveProperty('prompts');
        expect(response.prompts).toBeInstanceOf(Array);
        expect(response.prompts.length).toBeGreaterThan(0);

        // Verify response matches MCP specification format
        response.prompts.forEach((prompt: any) => {
          expect(prompt).toHaveProperty('name');
          expect(prompt).toHaveProperty('description');
          expect(typeof prompt.name).toBe('string');
          expect(typeof prompt.description).toBe('string');
        });
      }
    });
  });
});
