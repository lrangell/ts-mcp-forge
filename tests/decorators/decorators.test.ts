import { describe, it, expect } from 'vitest';
import { Tool, Resource, Prompt, Param } from '../../src/decorators/index.js';
import {
  getToolMetadata,
  getResourceMetadata,
  getPromptMetadata,
  getParamMetadata,
  getAllToolsMetadata,
  getAllResourcesMetadata,
  getAllPromptsMetadata,
} from '../../src/decorators/metadata.js';

describe('Decorators', () => {
  describe('@Tool decorator', () => {
    it('should store tool metadata', () => {
      class TestServer {
        @Tool('test-tool', 'A test tool')
        testMethod(): string {
          return 'test';
        }
      }

      const metadata = getToolMetadata(TestServer.prototype, 'testMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('test-tool');
      expect(metadata?.description).toBe('A test tool');
      expect(metadata?.method).toBe('testMethod');
    });

    it('should capture parameter types', () => {
      class TestServer {
        @Tool('add', 'Adds numbers')
        add(a: number, b: number): number {
          return a + b;
        }
      }

      const metadata = getToolMetadata(TestServer.prototype, 'add');
      expect(metadata?.paramTypes).toHaveLength(2);
      expect(metadata?.paramTypes?.[0]).toBe(Number);
      expect(metadata?.paramTypes?.[1]).toBe(Number);
    });

    it('should capture return type', () => {
      class TestServer {
        @Tool('get-string', 'Returns a string')
        getString(): string {
          return 'hello';
        }
      }

      const metadata = getToolMetadata(TestServer.prototype, 'getString');
      expect(metadata?.returnType).toBe(String);
    });
  });

  describe('@Resource decorator', () => {
    it('should store resource metadata', () => {
      class TestServer {
        @Resource('test://resource', 'A test resource')
        getResource(): object {
          return { data: 'test' };
        }
      }

      const metadata = getResourceMetadata(TestServer.prototype, 'getResource');
      expect(metadata).toBeDefined();
      expect(metadata?.uri).toBe('test://resource');
      expect(metadata?.description).toBe('A test resource');
      expect(metadata?.method).toBe('getResource');
    });
  });

  describe('@Prompt decorator', () => {
    it('should store prompt metadata', () => {
      class TestServer {
        @Prompt('test-prompt', 'A test prompt')
        getPrompt(): string {
          return 'prompt text';
        }
      }

      const metadata = getPromptMetadata(TestServer.prototype, 'getPrompt');
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('test-prompt');
      expect(metadata?.description).toBe('A test prompt');
      expect(metadata?.method).toBe('getPrompt');
    });
  });

  describe('@Param decorator', () => {
    it('should store parameter metadata', () => {
      class TestServer {
        @Tool('test', 'Test')
        testMethod(
          @Param('First parameter') first: string,
          @Param('Second parameter') second: number
        ): void {
          console.log(first, second);
        }
      }

      const params = getParamMetadata(TestServer.prototype, 'testMethod');
      expect(params).toHaveLength(2);
      expect(params?.[0]).toMatchObject({
        index: 0,
        description: 'First parameter',
        type: String,
      });
      expect(params?.[1]).toMatchObject({
        index: 1,
        description: 'Second parameter',
        type: Number,
      });
    });

    it('should support custom parameter names', () => {
      class TestServer {
        @Tool('test', 'Test')
        testMethod(@Param('Description', 'customName') param: string): void {
          console.log(param);
        }
      }

      const params = getParamMetadata(TestServer.prototype, 'testMethod');
      expect(params?.[0].name).toBe('customName');
    });
  });

  describe('getAllMetadata functions', () => {
    it('should get all tools metadata', () => {
      class TestServer {
        @Tool('tool1', 'First tool')
        method1(): void {}

        @Tool('tool2', 'Second tool')
        method2(): void {}

        normalMethod(): void {}
      }

      const tools = getAllToolsMetadata(TestServer);
      expect(tools.size).toBe(2);
      expect(tools.has('method1')).toBe(true);
      expect(tools.has('method2')).toBe(true);
      expect(tools.has('normalMethod')).toBe(false);
    });

    it('should get all resources metadata', () => {
      class TestServer {
        @Resource('resource://1')
        resource1(): void {}

        @Resource('resource://2')
        resource2(): void {}
      }

      const resources = getAllResourcesMetadata(TestServer);
      expect(resources.size).toBe(2);
    });

    it('should get all prompts metadata', () => {
      class TestServer {
        @Prompt('prompt1', 'First prompt')
        prompt1(): void {}

        @Prompt('prompt2', 'Second prompt')
        prompt2(): void {}
      }

      const prompts = getAllPromptsMetadata(TestServer);
      expect(prompts.size).toBe(2);
    });
  });

  describe('Combined decorators', () => {
    it('should work with multiple decorators on same class', () => {
      class TestServer {
        @Tool('calculate', 'Performs calculation')
        calculate(@Param('First number') a: number, @Param('Second number') b: number): number {
          return a + b;
        }

        @Resource('data://info')
        getInfo(): object {
          return { version: '1.0' };
        }

        @Prompt('analyze', 'Analysis prompt')
        getAnalyzePrompt(@Param('Text to analyze') text: string): string {
          return `Analyze: ${text}`;
        }
      }

      const tools = getAllToolsMetadata(TestServer);
      const resources = getAllResourcesMetadata(TestServer);
      const prompts = getAllPromptsMetadata(TestServer);

      expect(tools.size).toBe(1);
      expect(resources.size).toBe(1);
      expect(prompts.size).toBe(1);

      const toolMeta = tools.get('calculate');
      expect(toolMeta?.params).toHaveLength(2);
    });
  });
});
