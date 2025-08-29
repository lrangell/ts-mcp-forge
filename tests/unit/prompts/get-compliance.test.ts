/**
 * Prompts Get Response Compliance Tests
 * Ensures prompts/get responses follow MCP specification 2025-06-18
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Prompt, Param, DynamicPrompt, PromptTemplate } from '../../../src/decorators/index.js';
import { createMCPRouter } from '../../../src/core/router.js';
import { setupMCPAssertions } from '../../helpers/assertions.js';

// Setup custom assertions
setupMCPAssertions();

class PromptsGetComplianceServer extends MCPServer {
  constructor() {
    super('Prompts Get Compliance Server', '1.0.0');
  }

  @Prompt('simple-text', 'Simple text prompt')
  simpleTextPrompt(@Param('Topic') topic: string): Result<object, string> {
    if (!topic) {
      return err('Topic is required');
    }

    return ok({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please provide information about ${topic}.`,
          },
        },
      ],
    });
  }

  @Prompt('multi-message', 'Multi-message conversation prompt')
  multiMessagePrompt(
    @Param('Context') context: string,
    @Param('Question') question: string
  ): Result<object, string> {
    if (!context || !question) {
      return err('Context and question are required');
    }

    return ok({
      messages: [
        {
          role: 'system' as const,
          content: {
            type: 'text' as const,
            text: `You are an expert assistant. Use this context: ${context}`,
          },
        },
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: question,
          },
        },
        {
          role: 'assistant' as const,
          content: {
            type: 'text' as const,
            text: 'I understand the context and am ready to help with your question.',
          },
        },
      ],
    });
  }

  @Prompt('multi-modal', 'Multi-modal prompt with different content types')
  multiModalPrompt(
    @Param('Text content') textContent: string,
    @Param('Include image', false) includeImage?: boolean,
    @Param('Include resource', false) includeResource?: boolean
  ): Result<object, string> {
    if (!textContent) {
      return err('Text content is required');
    }

    const messages: any[] = [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: textContent,
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

    if (includeResource) {
      messages.push({
        role: 'user' as const,
        content: {
          type: 'resource' as const,
          uri: 'file:///example/referenced-document.pdf',
        },
      });
    }

    return ok({ messages });
  }

  @Prompt('code-assistant', 'Code analysis and generation assistant')
  codeAssistantPrompt(
    @Param('Programming language') language: string,
    @Param('Task type') taskType: string,
    @Param('Code context', false) codeContext?: string,
    @Param('Requirements', false) requirements?: string[]
  ): Result<object, string> {
    if (!language || !taskType) {
      return err('Language and task type are required');
    }

    const messages: any[] = [
      {
        role: 'system' as const,
        content: {
          type: 'text' as const,
          text: `You are an expert ${language} programmer. You will help with ${taskType} tasks.`,
        },
      },
    ];

    if (codeContext) {
      messages.push({
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Here's the current code context:\n\n${codeContext}`,
        },
      });
    }

    if (requirements && requirements.length > 0) {
      const requirementsList = requirements.map((req) => `- ${req}`).join('\n');
      messages.push({
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please follow these requirements:\n${requirementsList}`,
        },
      });
    }

    messages.push({
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Please help me with this ${taskType} task in ${language}.`,
      },
    });

    return ok({ messages });
  }

  @Prompt('data-analysis', 'Data analysis prompt with structured input')
  dataAnalysisPrompt(
    @Param('Dataset description') datasetDescription: string,
    @Param('Analysis goals') analysisGoals: string[],
    @Param('Data sample', false) dataSample?: object
  ): Result<object, string> {
    if (!datasetDescription || !analysisGoals || analysisGoals.length === 0) {
      return err('Dataset description and analysis goals are required');
    }

    const messages: any[] = [
      {
        role: 'system' as const,
        content: {
          type: 'text' as const,
          text: 'You are a data analysis expert. Provide thorough and accurate analysis.',
        },
      },
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Dataset: ${datasetDescription}`,
        },
      },
    ];

    const goalsList = analysisGoals.map((goal) => `- ${goal}`).join('\n');
    messages.push({
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Analysis goals:\n${goalsList}`,
      },
    });

    if (dataSample) {
      messages.push({
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Sample data:\n${JSON.stringify(dataSample, null, 2)}`,
        },
      });
    }

    return ok({ messages });
  }

  @Prompt('translation', 'Translation prompt with language pairs')
  translationPrompt(
    @Param('Source language') sourceLang: string,
    @Param('Target language') targetLang: string,
    @Param('Text to translate') text: string,
    @Param('Translation style', false) style?: string
  ): Result<object, string> {
    if (!sourceLang || !targetLang || !text) {
      return err('Source language, target language, and text are required');
    }

    const styleInstruction = style ? ` Use a ${style} style.` : '';

    return ok({
      messages: [
        {
          role: 'system' as const,
          content: {
            type: 'text' as const,
            text: `You are a professional translator specializing in ${sourceLang} to ${targetLang} translation.${styleInstruction}`,
          },
        },
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please translate the following ${sourceLang} text to ${targetLang}: "${text}"`,
          },
        },
      ],
    });
  }

  @Prompt('creative-writing', 'Creative writing prompt with style options')
  creativeWritingPrompt(
    @Param('Genre') genre: string,
    @Param('Theme') theme: string,
    @Param('Length') length: string,
    @Param('Character details', false) characterDetails?: object,
    @Param('Setting', false) setting?: string
  ): Result<object, string> {
    if (!genre || !theme || !length) {
      return err('Genre, theme, and length are required');
    }

    const messages: any[] = [
      {
        role: 'system' as const,
        content: {
          type: 'text' as const,
          text: `You are a creative writing assistant specializing in ${genre} fiction.`,
        },
      },
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please write a ${length} ${genre} story with the theme: ${theme}`,
        },
      },
    ];

    if (setting) {
      messages.push({
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Setting: ${setting}`,
        },
      });
    }

    if (characterDetails) {
      messages.push({
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Character details: ${JSON.stringify(characterDetails, null, 2)}`,
        },
      });
    }

    return ok({ messages });
  }

  @Prompt('error-prompt', 'Prompt that demonstrates error handling')
  errorPrompt(@Param('Error type') errorType: string): Result<object, string> {
    switch (errorType) {
      case 'validation':
        return err('Validation error: Invalid prompt parameters');
      case 'generation':
        return err('Generation error: Failed to create prompt');
      case 'permission':
        return err('Permission error: Insufficient access to prompt');
      default:
        return err(`Unknown error type: ${errorType}`);
    }
  }

  // Dynamic prompts
  @DynamicPrompt('Initialize dynamic prompts for various domains')
  initializeDynamicPrompts(): void {
    // Research prompts
    this.registerPrompt(
      'research-query',
      async (topic: string, depth: string, sources?: string[]) => {
        if (!topic || !depth) {
          return err('Topic and depth are required');
        }

        const messages: any[] = [
          {
            role: 'system',
            content: {
              type: 'text',
              text: `You are a research assistant. Provide ${depth} research on the given topic.`,
            },
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Research topic: ${topic}`,
            },
          },
        ];

        if (sources && sources.length > 0) {
          messages.push({
            role: 'user',
            content: {
              type: 'text',
              text: `Focus on these sources: ${sources.join(', ')}`,
            },
          });
        }

        return ok({ messages });
      },
      'Research assistant prompt',
      [
        { index: 0, name: 'topic', description: 'Research topic' },
        { index: 1, name: 'depth', description: 'Research depth (basic, detailed, comprehensive)' },
        { index: 2, name: 'sources', description: 'Preferred sources (optional)' },
      ]
    );

    // Meeting summary prompts
    this.registerPrompt(
      'meeting-summary',
      async (meetingType: string, participants: string[], duration: number) => {
        const messages = [
          {
            role: 'system',
            content: {
              type: 'text',
              text: `You are a meeting assistant. Summarize ${meetingType} meetings effectively.`,
            },
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Meeting type: ${meetingType}\nParticipants: ${participants.join(', ')}\nDuration: ${duration} minutes`,
            },
          },
        ];

        return ok({ messages });
      },
      'Meeting summary prompt',
      [
        { index: 0, name: 'meetingType', description: 'Type of meeting' },
        { index: 1, name: 'participants', description: 'Meeting participants' },
        { index: 2, name: 'duration', description: 'Meeting duration in minutes' },
      ]
    );
  }

  // Prompt templates
  @PromptTemplate('help/{category}', { description: 'Help prompts by category' })
  async getHelpPrompt(params: { category: string }): Promise<Result<object, string>> {
    if (!params.category) {
      return err('Category parameter is required');
    }

    const messages = [
      {
        role: 'system',
        content: {
          type: 'text',
          text: `You are a helpful assistant specializing in ${params.category}.`,
        },
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I need help with ${params.category}. Please provide guidance.`,
        },
      },
    ];

    return ok({ messages });
  }
}

describe('Prompts Get Response Compliance', () => {
  let server: PromptsGetComplianceServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new PromptsGetComplianceServer();
    router = createMCPRouter(server);
  });

  describe('Response Structure Compliance', () => {
    it('should return messages array for simple prompts', async () => {
      const result = await server.getPrompt('simple-text', { topic: 'machine learning' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Must have messages array
        expect(result.value).toHaveProperty('messages');
        expect(Array.isArray(result.value.messages)).toBe(true);
        expect(result.value.messages).toHaveLength(1);

        const message = result.value.messages[0];
        expect(message).toHaveProperty('role', 'user');
        expect(message).toHaveProperty('content');
        expect(message.content).toHaveProperty('type', 'text');
        expect(message.content).toHaveProperty('text');
        expect(typeof message.content.text).toBe('string');

        // Validate full response structure
        expect(result.value).toBeValidPromptResponse();
      }
    });

    it('should return proper messages array for multi-message prompts', async () => {
      const result = await server.getPrompt('multi-message', {
        context: 'AI development',
        question: 'What are best practices?',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('messages');
        expect(Array.isArray(result.value.messages)).toBe(true);
        expect(result.value.messages).toHaveLength(3);

        // Validate each message role and structure
        const [systemMsg, userMsg, assistantMsg] = result.value.messages;

        expect(systemMsg.role).toBe('system');
        expect(systemMsg.content.type).toBe('text');
        expect(systemMsg.content.text).toContain('AI development');

        expect(userMsg.role).toBe('user');
        expect(userMsg.content.type).toBe('text');
        expect(userMsg.content.text).toContain('best practices');

        expect(assistantMsg.role).toBe('assistant');
        expect(assistantMsg.content.type).toBe('text');
        expect(assistantMsg.content.text).toContain('ready to help');

        expect(result.value).toBeValidPromptResponse();
      }
    });

    it('should handle multi-modal content in messages', async () => {
      const result = await server.getPrompt('multi-modal', {
        textContent: 'Analyze this content',
        includeImage: true,
        includeResource: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('messages');
        expect(Array.isArray(result.value.messages)).toBe(true);
        expect(result.value.messages).toHaveLength(3);

        // Text message
        const textMsg = result.value.messages[0];
        expect(textMsg.content.type).toBe('text');
        expect(textMsg.content.text).toContain('Analyze this content');

        // Image message
        const imageMsg = result.value.messages[1];
        expect(imageMsg.content.type).toBe('image');
        expect(imageMsg.content).toHaveProperty('data');
        expect(imageMsg.content).toHaveProperty('mimeType', 'image/png');
        expect(imageMsg.content.data).toBeValidBase64();

        // Resource message
        const resourceMsg = result.value.messages[2];
        expect(resourceMsg.content.type).toBe('resource');
        expect(resourceMsg.content).toHaveProperty('uri');
        expect(resourceMsg.content.uri).toBeValidURI();

        expect(result.value).toBeValidPromptResponse();
      }
    });

    it('should handle complex parameter structures', async () => {
      const result = await server.getPrompt('code-assistant', {
        language: 'TypeScript',
        taskType: 'debugging',
        codeContext: 'function test() { return undefined; }',
        requirements: ['Add type safety', 'Improve performance'],
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toHaveLength(4);

        // System message
        expect(result.value.messages[0].role).toBe('system');
        expect(result.value.messages[0].content.text).toContain('TypeScript');

        // Code context message
        expect(result.value.messages[1].content.text).toContain('function test()');

        // Requirements message
        expect(result.value.messages[2].content.text).toContain('Add type safety');
        expect(result.value.messages[2].content.text).toContain('Improve performance');

        // Task message
        expect(result.value.messages[3].content.text).toContain('debugging');
      }
    });
  });

  describe('Message Role Compliance', () => {
    it('should support all valid message roles', async () => {
      const result = await server.getPrompt('multi-message', {
        context: 'test context',
        question: 'test question',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const roles = result.value.messages.map((msg: any) => msg.role);
        expect(roles).toContain('system');
        expect(roles).toContain('user');
        expect(roles).toContain('assistant');

        // All roles should be valid
        result.value.messages.forEach((msg: any) => {
          expect(['system', 'user', 'assistant'].includes(msg.role)).toBe(true);
        });
      }
    });

    it('should handle user-only prompts', async () => {
      const result = await server.getPrompt('simple-text', { topic: 'testing' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toHaveLength(1);
        expect(result.value.messages[0].role).toBe('user');
      }
    });

    it('should handle system message instructions', async () => {
      const result = await server.getPrompt('translation', {
        sourceLang: 'English',
        targetLang: 'Spanish',
        text: 'Hello world',
        style: 'formal',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toHaveLength(2);

        const systemMsg = result.value.messages[0];
        expect(systemMsg.role).toBe('system');
        expect(systemMsg.content.text).toContain('professional translator');
        expect(systemMsg.content.text).toContain('formal style');
      }
    });
  });

  describe('Content Type Compliance', () => {
    it('should handle text content correctly', async () => {
      const result = await server.getPrompt('data-analysis', {
        datasetDescription: 'Sales data from 2024',
        analysisGoals: ['Find trends', 'Identify outliers'],
        dataSample: { sales: 1000, month: 'January' },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        result.value.messages.forEach((msg: any) => {
          expect(msg.content.type).toBe('text');
          expect(typeof msg.content.text).toBe('string');
          expect(msg.content.text.length).toBeGreaterThan(0);
        });
      }
    });

    it('should handle image content in prompts', async () => {
      const result = await server.getPrompt('multi-modal', {
        textContent: 'Test image analysis',
        includeImage: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const imageMessage = result.value.messages.find((msg: any) => msg.content.type === 'image');
        expect(imageMessage).toBeDefined();
        expect(imageMessage.content).toHaveProperty('data');
        expect(imageMessage.content).toHaveProperty('mimeType');
        expect(imageMessage.content.data).toBeValidBase64();
        expect(imageMessage.content.mimeType).toBeValidMimeType();
      }
    });

    it('should handle resource content in prompts', async () => {
      const result = await server.getPrompt('multi-modal', {
        textContent: 'Test resource reference',
        includeResource: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resourceMessage = result.value.messages.find(
          (msg: any) => msg.content.type === 'resource'
        );
        expect(resourceMessage).toBeDefined();
        expect(resourceMessage.content).toHaveProperty('uri');
        expect(resourceMessage.content.uri).toBeValidURI();
        expect(resourceMessage.content.uri).toMatch(/^file:\/\//);
      }
    });
  });

  describe('Dynamic Prompts Compliance', () => {
    it('should return proper messages array for dynamic prompts', async () => {
      const result = await server.getPrompt('research-query', {
        topic: 'quantum computing',
        depth: 'detailed',
        sources: ['academic papers', 'industry reports'],
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('messages');
        expect(Array.isArray(result.value.messages)).toBe(true);
        expect(result.value.messages.length).toBeGreaterThan(0);

        // Should contain system message
        const systemMsg = result.value.messages.find((msg: any) => msg.role === 'system');
        expect(systemMsg).toBeDefined();
        expect(systemMsg.content.text).toContain('detailed research');

        expect(result.value).toBeValidPromptResponse();
      }
    });

    it('should handle array parameters in dynamic prompts', async () => {
      const result = await server.getPrompt('meeting-summary', {
        meetingType: 'standup',
        participants: ['Alice', 'Bob', 'Charlie'],
        duration: 30,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.messages).toHaveLength(2);

        const userMsg = result.value.messages[1];
        expect(userMsg.content.text).toContain('Alice, Bob, Charlie');
        expect(userMsg.content.text).toContain('30 minutes');
      }
    });
  });

  describe('Prompt Template Compliance', () => {
    it('should return proper messages array for template prompts', async () => {
      const result = await server.getPrompt('help/programming', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('messages');
        expect(Array.isArray(result.value.messages)).toBe(true);
        expect(result.value.messages).toHaveLength(2);

        const systemMsg = result.value.messages[0];
        expect(systemMsg.role).toBe('system');
        expect(systemMsg.content.text).toContain('programming');

        const userMsg = result.value.messages[1];
        expect(userMsg.role).toBe('user');
        expect(userMsg.content.text).toContain('help with programming');

        expect(result.value).toBeValidPromptResponse();
      }
    });

    it('should handle different template parameters', async () => {
      const testCases = [
        { promptName: 'help/javascript', expectedContent: 'javascript' },
        { promptName: 'help/database', expectedContent: 'database' },
        { promptName: 'help/api-design', expectedContent: 'api-design' },
      ];

      for (const testCase of testCases) {
        const result = await server.getPrompt(testCase.promptName, {});
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const systemMsg = result.value.messages[0];
          expect(systemMsg.content.text).toContain(testCase.expectedContent);
        }
      }
    });
  });

  describe('Error Handling Compliance', () => {
    it('should return proper error for missing required parameters', async () => {
      const result = await server.getPrompt('simple-text', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32602); // INVALID_PARAMS
        expect(result.error.message).toContain('Topic is required');
      }
    });

    it('should return proper error for prompt generation failures', async () => {
      const result = await server.getPrompt('error-prompt', { errorType: 'generation' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32603); // INTERNAL_ERROR
        expect(result.error.message).toContain('Generation error');
      }
    });

    it('should return proper error for non-existent prompts', async () => {
      const result = await server.getPrompt('non-existent-prompt', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32601); // METHOD_NOT_FOUND
        expect(result.error.message).toContain('not found');
      }
    });

    it('should handle validation errors in prompt parameters', async () => {
      const result = await server.getPrompt('data-analysis', {
        datasetDescription: 'Test dataset',
        analysisGoals: [], // Empty array should fail validation
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32603); // INTERNAL_ERROR for business logic validation
        expect(result.error.message).toContain('analysis goals are required');
      }
    });
  });

  describe('JSON-RPC Integration Compliance', () => {
    it('should return proper response format via JSON-RPC', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'simple-text',
          arguments: { topic: 'artificial intelligence' },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('messages');
        expect(Array.isArray(response.messages)).toBe(true);
        expect(response.messages).toHaveLength(1);

        const message = response.messages[0];
        expect(message).toHaveProperty('role');
        expect(message).toHaveProperty('content');
        expect(message.content).toHaveProperty('type');
        expect(message.content).toHaveProperty('text');
      }
    });

    it('should handle complex prompts via JSON-RPC', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'creative-writing',
          arguments: {
            genre: 'science fiction',
            theme: 'time travel',
            length: 'short story',
            characterDetails: { name: 'Alex', age: 30, profession: 'physicist' },
            setting: 'laboratory in 2025',
          },
        },
        2
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages.length).toBeGreaterThan(1);

        // Should contain story details
        const messageTexts = response.messages.map((msg: any) => msg.content.text).join(' ');
        expect(messageTexts).toContain('science fiction');
        expect(messageTexts).toContain('time travel');
        expect(messageTexts).toContain('laboratory in 2025');
      }
    });

    it('should return proper JSON-RPC errors for prompt failures', async () => {
      const result = await router(
        'prompts/get',
        {
          name: 'error-prompt',
          arguments: { errorType: 'permission' },
        },
        3
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32603);
        expect(result.error.message).toContain('Permission error');
      }
    });
  });

  describe('Message Content Serialization', () => {
    it('should handle Unicode content in messages', async () => {
      const result = await server.getPrompt('translation', {
        sourceLang: 'Chinese',
        targetLang: 'English',
        text: '你好世界 🌍',
        style: 'casual',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const userMsg = result.value.messages[1];
        expect(userMsg.content.text).toContain('你好世界 🌍');
        expect(userMsg.content.text).toContain('Chinese');
      }
    });

    it('should handle special characters and JSON serialization', async () => {
      const complexData = {
        'key with spaces': 'value',
        quotes: 'text with "embedded quotes"',
        newlines: 'text with\nnewlines',
        unicode: 'émojis 🎉',
      };

      const result = await server.getPrompt('data-analysis', {
        datasetDescription: 'Complex dataset with special characters',
        analysisGoals: ['Process JSON data'],
        dataSample: complexData,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const sampleMsg = result.value.messages.find((msg: any) =>
          msg.content.text.includes('Sample data:')
        );
        expect(sampleMsg).toBeDefined();
        expect(sampleMsg.content.text).toContain('émojis 🎉');
        expect(sampleMsg.content.text).toContain('embedded quotes');
      }
    });

    it('should maintain message structure consistency', async () => {
      const result = await server.getPrompt('multi-modal', {
        textContent: 'Test all content types',
        includeImage: true,
        includeResource: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // All messages should have consistent structure
        result.value.messages.forEach((msg: any) => {
          expect(msg).toHaveProperty('role');
          expect(msg).toHaveProperty('content');
          expect(msg.content).toHaveProperty('type');

          // Content should match type
          switch (msg.content.type) {
            case 'text':
              expect(msg.content).toHaveProperty('text');
              expect(typeof msg.content.text).toBe('string');
              break;
            case 'image':
              expect(msg.content).toHaveProperty('data');
              expect(msg.content).toHaveProperty('mimeType');
              break;
            case 'resource':
              expect(msg.content).toHaveProperty('uri');
              break;
          }
        });
      }
    });
  });
});
