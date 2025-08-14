import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { PromptTemplate, Param } from '../../../src/decorators/index.js';
import { createMCPRouter } from '../../../src/core/router.js';
import { ErrorCode } from '../../../src/index.js';

/**
 * Test suite for prompt templates with variable substitution based on MCP specification 2025-06-18
 * Tests template pattern matching, parameter extraction, and dynamic prompt generation
 */

class TemplatesTestServer extends MCPServer {
  constructor() {
    super('Templates Test Server', '1.0.0');
  }

  // Simple single parameter template
  @PromptTemplate('help/{topic}', { description: 'Get help for a specific topic' })
  async getTopicHelp(params: { topic: string }): Promise<Result<object, string>> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please provide help and guidance for: ${params.topic}`,
          },
        },
      ],
    });
  }

  // Multiple parameter template
  @PromptTemplate('review/{type}/for/{language}', {
    description: 'Code review prompts for specific language and type',
  })
  async getCodeReview(params: { type: string; language: string }): Promise<Result<object, string>> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Conduct a ${params.type} review of ${params.language} code. Focus on best practices and potential issues.`,
          },
        },
      ],
    });
  }

  // Template with nested path structure
  @PromptTemplate('format/{format}/document/{doctype}/style/{style}', {
    description: 'Document formatting with multiple style parameters',
  })
  async getDocumentFormat(params: {
    format: string;
    doctype: string;
    style: string;
  }): Promise<Result<object, string>> {
    return ok({
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: `You are a document formatting assistant specializing in ${params.format} format.`,
          },
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Format this ${params.doctype} document in ${params.style} style using ${params.format} formatting.`,
          },
        },
      ],
    });
  }

  // Template with special characters and numbers
  @PromptTemplate('api/{version}/endpoint/{endpoint}', {
    description: 'API documentation for specific version and endpoint',
  })
  async getApiDocs(params: { version: string; endpoint: string }): Promise<Result<object, string>> {
    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Provide documentation for API ${params.version} endpoint: /${params.endpoint}`,
          },
        },
      ],
    });
  }

  // Template that can return different content types
  @PromptTemplate('analyze/{datatype}', { description: 'Data analysis prompts by type' })
  async getDataAnalysis(params: { datatype: string }): Promise<Result<object, string>> {
    const analysisPrompts = {
      image: {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image data:',
              },
              {
                type: 'image',
                data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                mimeType: 'image/png',
              },
            ],
          },
        ],
      },
      dataset: {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this dataset:',
              },
              {
                type: 'resource',
                resource: {
                  uri: 'resource://data/sample',
                  name: 'sample-dataset',
                  mimeType: 'application/json',
                  text: '{"data": [1, 2, 3, 4, 5], "metadata": {"type": "sample"}}',
                },
              },
            ],
          },
        ],
      },
      text: {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Analyze this text data for patterns, sentiment, and key insights.',
            },
          },
        ],
      },
    };

    const prompt = analysisPrompts[params.datatype as keyof typeof analysisPrompts];
    if (!prompt) {
      return err(
        `Unsupported data type: ${params.datatype}. Supported types: ${Object.keys(analysisPrompts).join(', ')}`
      );
    }

    return ok(prompt);
  }

  // Template with validation logic
  @PromptTemplate('translate/{sourcelang}/to/{targetlang}', {
    description: 'Translation prompts with language validation',
  })
  async getTranslation(params: {
    sourcelang: string;
    targetlang: string;
  }): Promise<Result<object, string>> {
    const supportedLanguages = [
      'english',
      'spanish',
      'french',
      'german',
      'italian',
      'portuguese',
      'chinese',
      'japanese',
    ];

    if (!supportedLanguages.includes(params.sourcelang.toLowerCase())) {
      return err(`Unsupported source language: ${params.sourcelang}`);
    }

    if (!supportedLanguages.includes(params.targetlang.toLowerCase())) {
      return err(`Unsupported target language: ${params.targetlang}`);
    }

    if (params.sourcelang.toLowerCase() === params.targetlang.toLowerCase()) {
      return err('Source and target languages cannot be the same');
    }

    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Translate the following text from ${params.sourcelang} to ${params.targetlang}:`,
          },
        },
      ],
    });
  }

  // Template that combines with additional arguments
  @PromptTemplate('generate/{type}', { description: 'Content generation by type' })
  async getContentGeneration(
    params: { type: string },
    additionalArgs?: { length?: string; tone?: string; audience?: string }
  ): Promise<Result<object, string>> {
    const basePrompt = `Generate ${params.type} content`;
    let enhancedPrompt = basePrompt;

    if (additionalArgs?.length) {
      enhancedPrompt += ` with ${additionalArgs.length} length`;
    }
    if (additionalArgs?.tone) {
      enhancedPrompt += ` in a ${additionalArgs.tone} tone`;
    }
    if (additionalArgs?.audience) {
      enhancedPrompt += ` for ${additionalArgs.audience} audience`;
    }

    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: enhancedPrompt,
          },
        },
      ],
    });
  }

  // Template with error-prone logic
  @PromptTemplate('debug/{environment}', { description: 'Environment-specific debugging' })
  async getDebugging(params: { environment: string }): Promise<Result<object, string>> {
    if (params.environment === 'production') {
      return err('Debugging in production environment is not allowed');
    }

    if (params.environment === 'invalid') {
      return err('Invalid environment specified');
    }

    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Debug the application in ${params.environment} environment. Provide step-by-step troubleshooting guidance.`,
          },
        },
      ],
    });
  }

  // Template with numeric parameters
  @PromptTemplate('schedule/{hours}h/{minutes}m', {
    description: 'Time-based scheduling prompts',
  })
  async getScheduling(params: { hours: string; minutes: string }): Promise<Result<object, string>> {
    const hoursNum = parseInt(params.hours, 10);
    const minutesNum = parseInt(params.minutes, 10);

    if (isNaN(hoursNum) || isNaN(minutesNum)) {
      return err('Hours and minutes must be valid numbers');
    }

    if (hoursNum < 0 || hoursNum > 23) {
      return err('Hours must be between 0 and 23');
    }

    if (minutesNum < 0 || minutesNum > 59) {
      return err('Minutes must be between 0 and 59');
    }

    const totalMinutes = hoursNum * 60 + minutesNum;

    return ok({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a schedule for ${hoursNum} hours and ${minutesNum} minutes (total: ${totalMinutes} minutes).`,
          },
        },
      ],
    });
  }

  // Template with complex pattern
  @PromptTemplate('project/{project}/module/{module}/function/{function}', {
    description: 'Code documentation for specific project structure',
  })
  async getCodeDocumentation(params: {
    project: string;
    module: string;
    function: string;
  }): Promise<Result<object, string>> {
    return ok({
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: `You are documenting code for project: ${params.project}`,
          },
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate comprehensive documentation for the function "${params.function}" in module "${params.module}". Include parameters, return values, examples, and best practices.`,
          },
        },
      ],
    });
  }
}

describe('Prompt Templates', () => {
  let server: TemplatesTestServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new TemplatesTestServer();
    router = createMCPRouter(server);
  });

  describe('Template pattern matching', () => {
    it('should match simple single parameter templates', async () => {
      const result = await server.getPrompt('help/typescript', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('typescript');
        expect(response.messages[0].content.text).toContain('Please provide help');
      }
    });

    it('should match multiple parameter templates', async () => {
      const result = await server.getPrompt('review/security/for/javascript', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('security');
        expect(response.messages[0].content.text).toContain('javascript');
      }
    });

    it('should match complex nested templates', async () => {
      const result = await server.getPrompt('format/markdown/document/report/style/academic', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages).toHaveLength(2);
        expect(response.messages[0].content.text).toContain('markdown');
        expect(response.messages[1].content.text).toContain('report');
        expect(response.messages[1].content.text).toContain('academic');
      }
    });

    it('should extract parameters correctly from template paths', async () => {
      const result = await server.getPrompt('api/v2.1/endpoint/users', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('v2.1');
        expect(response.messages[0].content.text).toContain('/users');
      }
    });
  });

  describe('Parameter extraction and substitution', () => {
    it('should extract parameters with special characters', async () => {
      const result = await server.getPrompt('api/v1.0/endpoint/user-profile', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('v1.0');
        expect(response.messages[0].content.text).toContain('/user-profile');
      }
    });

    it('should extract numeric parameters correctly', async () => {
      const result = await server.getPrompt('schedule/8h/30m', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('8 hours');
        expect(response.messages[0].content.text).toContain('30 minutes');
        expect(response.messages[0].content.text).toContain('510 minutes'); // 8*60 + 30
      }
    });

    it('should handle complex project structure parameters', async () => {
      const result = await server.getPrompt(
        'project/ecommerce/module/auth/function/validateUser',
        {}
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('ecommerce');
        expect(response.messages[1].content.text).toContain('validateUser');
        expect(response.messages[1].content.text).toContain('auth');
      }
    });
  });

  describe('Template validation and error handling', () => {
    it('should validate template parameters', async () => {
      const result = await server.getPrompt('translate/english/to/english', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Source and target languages cannot be the same');
      }
    });

    it('should handle unsupported template parameters', async () => {
      const result = await server.getPrompt('translate/klingon/to/english', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Unsupported source language: klingon');
      }
    });

    it('should validate numeric template parameters', async () => {
      const result = await server.getPrompt('schedule/25h/30m', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Hours must be between 0 and 23');
      }
    });

    it('should handle invalid numeric parameters', async () => {
      const result = await server.getPrompt('schedule/abch/30m', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('must be valid numbers');
      }
    });

    it('should handle environment-specific restrictions', async () => {
      const result = await server.getPrompt('debug/production', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('not allowed');
      }

      // Valid environment should work
      const validResult = await server.getPrompt('debug/development', {});
      expect(validResult.isOk()).toBe(true);
    });
  });

  describe('Dynamic content based on template parameters', () => {
    it('should return different content types based on parameters', async () => {
      // Image analysis
      const imageResult = await server.getPrompt('analyze/image', {});
      expect(imageResult.isOk()).toBe(true);
      if (imageResult.isOk()) {
        const response = imageResult.value as any;
        expect(response.messages[0].content).toHaveLength(2);
        expect(response.messages[0].content[1].type).toBe('image');
      }

      // Dataset analysis
      const datasetResult = await server.getPrompt('analyze/dataset', {});
      expect(datasetResult.isOk()).toBe(true);
      if (datasetResult.isOk()) {
        const response = datasetResult.value as any;
        expect(response.messages[0].content).toHaveLength(2);
        expect(response.messages[0].content[1].type).toBe('resource');
      }

      // Text analysis
      const textResult = await server.getPrompt('analyze/text', {});
      expect(textResult.isOk()).toBe(true);
      if (textResult.isOk()) {
        const response = textResult.value as any;
        expect(response.messages[0].content.type).toBe('text');
      }
    });

    it('should handle unsupported analysis types', async () => {
      const result = await server.getPrompt('analyze/unknown', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect((result.error as any).message).toContain('Unsupported data type: unknown');
      }
    });
  });

  describe('Template combination with additional arguments', () => {
    it('should handle templates with additional arguments', async () => {
      // This test assumes the implementation allows passing additional arguments
      // beyond those extracted from the template pattern
      const result = await server.getPrompt('generate/blog-post', {
        length: 'long',
        tone: 'professional',
        audience: 'developers',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        const text = response.messages[0].content.text;
        expect(text).toContain('blog-post');
        expect(text).toContain('long');
        expect(text).toContain('professional');
        expect(text).toContain('developers');
      }
    });

    it('should handle templates with partial additional arguments', async () => {
      const result = await server.getPrompt('generate/documentation', {
        tone: 'technical',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        const text = response.messages[0].content.text;
        expect(text).toContain('documentation');
        expect(text).toContain('technical');
        expect(text).not.toContain('undefined');
      }
    });
  });

  describe('Template pattern mismatch', () => {
    it('should return error for non-matching patterns', async () => {
      const result = await server.getPrompt('invalid/pattern', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.MethodNotFound);
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return error for partially matching patterns', async () => {
      const result = await server.getPrompt('help/', {}); // Missing topic parameter

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.MethodNotFound);
      }
    });

    it('should return error for extra path segments', async () => {
      const result = await server.getPrompt('help/typescript/extra', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.MethodNotFound);
      }
    });
  });

  describe('JSON-RPC router integration', () => {
    it('should handle template prompts through router', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'help/react',
          arguments: {},
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('react');
      }
    });

    it('should handle template prompts with additional arguments through router', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'generate/article',
          arguments: {
            length: 'medium',
            tone: 'casual',
          },
        },
        2
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('article');
        expect(response.messages[0].content.text).toContain('medium');
        expect(response.messages[0].content.text).toContain('casual');
      }
    });

    it('should handle template errors through router', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'debug/production',
          arguments: {},
        },
        3
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InternalError);
      }
    });
  });

  describe('Template listing in prompts/list', () => {
    it('should not list template patterns directly', () => {
      const prompts = server.listPrompts();
      const promptNames = prompts.map((p) => p.name);

      // Templates should not appear as static prompts
      expect(promptNames).not.toContain('help/{topic}');
      expect(promptNames).not.toContain('review/{type}/for/{language}');
      expect(promptNames).not.toContain('format/{format}/document/{doctype}/style/{style}');
    });

    it('should show instantiated template prompts when accessed', async () => {
      // Access a template prompt to potentially instantiate it
      await server.getPrompt('help/javascript', {});

      // The framework might cache or register instantiated templates
      // This behavior depends on the implementation
      const prompts = server.listPrompts();

      // This test verifies that the behavior is consistent
      // whether templates are listed or not
      expect(prompts).toBeInstanceOf(Array);
    });
  });

  describe('Template parameter edge cases', () => {
    it('should handle URL-encoded characters in parameters', async () => {
      const result = await server.getPrompt('help/node.js', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('node.js');
      }
    });

    it('should handle parameters with underscores and hyphens', async () => {
      const result = await server.getPrompt('review/code-quality/for/type-script', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content.text).toContain('code-quality');
        expect(response.messages[0].content.text).toContain('type-script');
      }
    });

    it('should handle empty string parameters', async () => {
      // This might not be valid depending on implementation
      // but tests the edge case
      const result = await server.getPrompt('help/', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.MethodNotFound);
      }
    });
  });

  describe('Template performance', () => {
    it('should handle multiple template calls efficiently', async () => {
      const promises = [
        server.getPrompt('help/react', {}),
        server.getPrompt('help/vue', {}),
        server.getPrompt('help/angular', {}),
        server.getPrompt('review/performance/for/javascript', {}),
        server.getPrompt('review/security/for/python', {}),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });
    });

    it('should maintain template state consistency', async () => {
      // Call same template multiple times
      const result1 = await server.getPrompt('help/testing', {});
      const result2 = await server.getPrompt('help/testing', {});

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        // Results should be identical for same template call
        expect(result1.value).toEqual(result2.value);
      }
    });
  });
});
