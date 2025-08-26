import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { Toolkit } from '../../src/core/toolkit.js';
import { Tool, Resource, Prompt, Param } from '../../src/decorators/index.js';

class TestMathToolkit extends Toolkit {
  @Tool('Add numbers')
  add(
    @Param('First') a: number,
    @Param('Second') b: number
  ): Result<number, string> {
    return ok(a + b);
  }

  @Tool('divide', 'Divide numbers')
  divide(
    @Param('Dividend') a: number,
    @Param('Divisor') b: number
  ): Result<number, string> {
    return b === 0 ? err('Division by zero') : ok(a / b);
  }
}

class TestStringToolkit extends Toolkit {
  @Tool('Concatenate strings')
  concat(
    @Param('First') a: string,
    @Param('Second') b: string
  ): Result<string, string> {
    return ok(a + b);
  }

  @Tool('reverse', 'Reverse string')
  reverse(@Param('Input') str: string): Result<string, string> {
    return ok(str.split('').reverse().join(''));
  }
}

class TestResourceToolkit extends Toolkit {
  private data = new Map<string, string>();

  constructor() {
    super();
    this.data.set('test', 'test data');
  }

  @Resource('data://test', 'Test resource')
  getTestResource(): Result<string, string> {
    return ok(this.data.get('test') || 'not found');
  }

  @Tool('Update data')
  updateData(
    @Param('Key') key: string,
    @Param('Value') value: string
  ): Result<void, string> {
    this.data.set(key, value);
    return ok(undefined);
  }
}

class TestPromptToolkit extends Toolkit {
  @Prompt('greeting', 'Generate greeting')
  generateGreeting(
    @Param('Name') name: string
  ): Result<string, string> {
    return ok(`Hello, ${name}!`);
  }
}

class TestServer extends MCPServer {
  constructor() {
    super('Test Server', '1.0.0');
  }

  @Tool('Server tool')
  serverTool(): Result<string, string> {
    return ok('server response');
  }
}

describe('Toolkit System', () => {
  let server: TestServer;

  beforeEach(() => {
    server = new TestServer();
  });

  describe('addToolkit', () => {
    it('should add toolkit tools to server', () => {
      const mathToolkit = new TestMathToolkit();
      server.addToolkit(mathToolkit);

      const tools = server.listTools();
      const toolNames = tools.map(t => t.name);
      
      expect(toolNames).toContain('add');
      expect(toolNames).toContain('divide');
      expect(toolNames).toContain('serverTool');
    });

    it('should add toolkit tools with namespace', () => {
      const mathToolkit = new TestMathToolkit();
      server.addToolkit(mathToolkit, 'math');

      const tools = server.listTools();
      const toolNames = tools.map(t => t.name);
      
      expect(toolNames).toContain('math:add');
      expect(toolNames).toContain('math:divide');
      expect(toolNames).toContain('serverTool');
    });

    it('should support multiple toolkits', () => {
      server.addToolkit(new TestMathToolkit(), 'math');
      server.addToolkit(new TestStringToolkit(), 'str');

      const tools = server.listTools();
      const toolNames = tools.map(t => t.name);
      
      expect(toolNames).toContain('math:add');
      expect(toolNames).toContain('math:divide');
      expect(toolNames).toContain('str:concat');
      expect(toolNames).toContain('str:reverse');
      expect(toolNames).toContain('serverTool');
    });

    it('should allow same toolkit with different namespaces', () => {
      const toolkit1 = new TestMathToolkit();
      const toolkit2 = new TestMathToolkit();
      
      server.addToolkit(toolkit1, 'calc1');
      server.addToolkit(toolkit2, 'calc2');

      const tools = server.listTools();
      const toolNames = tools.map(t => t.name);
      
      expect(toolNames).toContain('calc1:add');
      expect(toolNames).toContain('calc2:add');
    });
  });

  describe('toolkit method invocation', () => {
    it('should invoke toolkit methods correctly', async () => {
      const mathToolkit = new TestMathToolkit();
      server.addToolkit(mathToolkit);

      const result = await server.callTool('add', { a: 5, b: 3 });
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('8');
      }
    });

    it('should invoke namespaced toolkit methods', async () => {
      server.addToolkit(new TestMathToolkit(), 'math');
      server.addToolkit(new TestStringToolkit(), 'str');

      const mathResult = await server.callTool('math:add', { a: 10, b: 20 });
      const strResult = await server.callTool('str:concat', { a: 'Hello', b: ' World' });
      
      expect(mathResult.isOk()).toBe(true);
      expect(strResult.isOk()).toBe(true);
      
      if (mathResult.isOk()) {
        expect(mathResult.value.content[0].text).toBe('30');
      }
      if (strResult.isOk()) {
        expect(strResult.value.content[0].text).toBe('Hello World');
      }
    });

    it('should handle toolkit method errors', async () => {
      server.addToolkit(new TestMathToolkit(), 'math');

      const result = await server.callTool('math:divide', { a: 10, b: 0 });
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Division by zero');
      }
    });

    it('should maintain toolkit instance state', async () => {
      const resourceToolkit = new TestResourceToolkit();
      server.addToolkit(resourceToolkit);

      const initialRead = await server.readResource('data://test');
      expect(initialRead.isOk()).toBe(true);
      if (initialRead.isOk()) {
        expect(initialRead.value.contents[0].text).toBe('test data');
      }

      await server.callTool('updateData', { key: 'test', value: 'updated data' });

      const updatedRead = await server.readResource('data://test');
      expect(updatedRead.isOk()).toBe(true);
      if (updatedRead.isOk()) {
        expect(updatedRead.value.contents[0].text).toBe('updated data');
      }
    });
  });

  describe('toolkit resources', () => {
    it('should add toolkit resources', () => {
      server.addToolkit(new TestResourceToolkit());

      const resources = server.listResources();
      const resourceUris = resources.map(r => r.uri);
      
      expect(resourceUris).toContain('data://test');
    });

    it('should add toolkit resources with namespace', () => {
      server.addToolkit(new TestResourceToolkit(), 'res');

      const resources = server.listResources();
      const resourceUris = resources.map(r => r.uri);
      
      expect(resourceUris).toContain('res:data://test');
    });

    it('should read toolkit resources', async () => {
      server.addToolkit(new TestResourceToolkit());

      const result = await server.readResource('data://test');
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contents[0].text).toBe('test data');
      }
    });
  });

  describe('toolkit prompts', () => {
    it('should add toolkit prompts', () => {
      server.addToolkit(new TestPromptToolkit());

      const prompts = server.listPrompts();
      const promptNames = Array.isArray(prompts) 
        ? prompts.map(p => p.name)
        : prompts.prompts.map(p => p.name);
      
      expect(promptNames).toContain('greeting');
    });

    it('should add toolkit prompts with namespace', () => {
      server.addToolkit(new TestPromptToolkit(), 'prompt');

      const prompts = server.listPrompts();
      const promptNames = Array.isArray(prompts)
        ? prompts.map(p => p.name)
        : prompts.prompts.map(p => p.name);
      
      expect(promptNames).toContain('prompt:greeting');
    });

    it('should get toolkit prompts', async () => {
      server.addToolkit(new TestPromptToolkit());

      const result = await server.getPrompt('greeting', { name: 'World' });
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('Hello, World!');
      }
    });
  });

  describe('dynamic toolkit addition', () => {
    it('should support adding toolkits after instantiation', () => {
      const initialTools = server.listTools();
      expect(initialTools.map(t => t.name)).toContain('serverTool');
      expect(initialTools.map(t => t.name)).not.toContain('add');

      server.addToolkit(new TestMathToolkit());

      const updatedTools = server.listTools();
      expect(updatedTools.map(t => t.name)).toContain('serverTool');
      expect(updatedTools.map(t => t.name)).toContain('add');
    });

    it('should support chaining addToolkit calls', () => {
      server
        .addToolkit(new TestMathToolkit(), 'math')
        .addToolkit(new TestStringToolkit(), 'str')
        .addToolkit(new TestResourceToolkit(), 'res');

      const tools = server.listTools();
      const toolNames = tools.map(t => t.name);
      
      expect(toolNames).toContain('math:add');
      expect(toolNames).toContain('str:concat');
      expect(toolNames).toContain('res:updateData');
    });
  });

  describe('mixed server and toolkit tools', () => {
    it('should handle both server and toolkit tools', async () => {
      server.addToolkit(new TestMathToolkit(), 'math');

      const serverResult = await server.callTool('serverTool', {});
      const toolkitResult = await server.callTool('math:add', { a: 1, b: 2 });
      
      expect(serverResult.isOk()).toBe(true);
      expect(toolkitResult.isOk()).toBe(true);
      
      if (serverResult.isOk()) {
        expect(serverResult.value.content[0].text).toBe('server response');
      }
      if (toolkitResult.isOk()) {
        expect(toolkitResult.value.content[0].text).toBe('3');
      }
    });
  });
});