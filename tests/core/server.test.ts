import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import {
  Tool,
  Resource,
  Prompt,
  Param,
  DynamicResource,
  DynamicPrompt,
  PromptTemplate,
} from '../../src/decorators/index.js';
import { createMCPRouter } from '../../src/core/router.js';
import { ErrorCodes } from '../../src/core/jsonrpc.js';

class TestServer extends MCPServer {
  constructor() {
    super('Test Server', '1.0.0');
  }

  @Tool('echo', 'Echoes the input')
  echo(@Param('Input text') text: string): Result<string, Error> {
    return ok(`Echo: ${text}`);
  }

  @Tool('add', 'Adds two numbers')
  add(@Param('First number') a: number, @Param('Second number') b: number): Result<number, Error> {
    return ok(a + b);
  }

  @Tool('error-tool', 'Always returns an error')
  errorTool(): Result<string, Error> {
    return err(new Error('Tool error'));
  }

  @Resource('test://data', 'Test data resource')
  getData(): Result<object, Error> {
    return ok({ test: 'data', timestamp: Date.now() });
  }

  @Resource('test://error', 'Error resource')
  getErrorResource(): Result<object, Error> {
    return err(new Error('Resource error'));
  }

  @Prompt('test-prompt', 'Test prompt template')
  getTestPrompt(@Param('Subject') subject: string): Result<string, Error> {
    return ok(`Please analyze: ${subject}`);
  }
}

describe('MCPServer', () => {
  let server: TestServer;

  beforeEach(() => {
    server = new TestServer();
  });

  describe('handleInitialize', () => {
    it('should return server info and capabilities', () => {
      const response = server.handleInitialize();

      expect(response.protocolVersion).toBe('2025-06-18');
      expect(response.serverInfo.name).toBe('Test Server');
      expect(response.serverInfo.version).toBe('1.0.0');
      expect(response.capabilities.tools).toBeDefined();
      expect(response.capabilities.resources).toBeDefined();
      expect(response.capabilities.prompts).toBeDefined();
    });
  });

  describe('listTools', () => {
    it('should list all registered tools', () => {
      const tools = server.listTools();

      expect(tools).toHaveLength(3);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('echo');
      expect(toolNames).toContain('add');
      expect(toolNames).toContain('error-tool');
    });

    it('should include input schemas with parameter types', () => {
      const tools = server.listTools();
      const addTool = tools.find((t) => t.name === 'add');

      expect(addTool?.inputSchema).toBeDefined();
      expect(addTool?.inputSchema.type).toBe('object');
      expect(addTool?.inputSchema.properties).toHaveProperty('a');
      expect(addTool?.inputSchema.properties).toHaveProperty('b');

      expect(addTool?.inputSchema.properties.a).toHaveProperty('type', 'number');
      expect(addTool?.inputSchema.properties.a).toHaveProperty('description', 'First number');
      expect(addTool?.inputSchema.properties.b).toHaveProperty('type', 'number');
      expect(addTool?.inputSchema.properties.b).toHaveProperty('description', 'Second number');

      const echoTool = tools.find((t) => t.name === 'echo');
      expect(echoTool?.inputSchema.properties.text).toHaveProperty('type', 'string');
      expect(echoTool?.inputSchema.properties.text).toHaveProperty('description', 'Input text');
    });
  });

  describe('listResources', () => {
    it('should list all registered resources', () => {
      const resources = server.listResources();

      expect(resources).toHaveLength(2);
      const uris = resources.map((r) => r.uri);
      expect(uris).toContain('test://data');
      expect(uris).toContain('test://error');
    });
  });

  describe('listPrompts', () => {
    it('should list all registered prompts', () => {
      const prompts = server.listPrompts();

      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('test-prompt');
      expect(prompts[0].arguments).toHaveLength(1);
      expect(prompts[0].arguments?.[0].name).toBe('subject');
    });
  });

  describe('callTool', () => {
    it('should call tool successfully', async () => {
      const result = await server.callTool('echo', { text: 'hello' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toHaveLength(1);
        expect(result.value.content[0].type).toBe('text');
        expect(result.value.content[0].text).toBe('Echo: hello');
      }
    });

    it('should handle tool with multiple parameters', async () => {
      const result = await server.callTool('add', { a: 5, b: 3 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('8');
      }
    });

    it('should handle tool errors', async () => {
      const result = await server.callTool('error-tool', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
        expect(result.error.message).toContain('Tool error');
      }
    });

    it('should return error for unknown tool', async () => {
      const result = await server.callTool('unknown', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCodes.METHOD_NOT_FOUND);
        expect(result.error.message).toContain('not found');
      }
    });

    it('should validate parameters', async () => {
      const result = await server.callTool('add', { a: 'not a number', b: 3 });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCodes.INVALID_PARAMS);
      }
    });
  });

  describe('readResource', () => {
    it('should read resource successfully with contents array format', async () => {
      const result = await server.readResource('test://data');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('contents');
        expect(result.value.contents).toBeInstanceOf(Array);
        expect(result.value.contents).toHaveLength(1);

        const content = result.value.contents[0];
        expect(content).toHaveProperty('uri', 'test://data');
        expect(content).toHaveProperty('mimeType', 'application/json');
        expect(content).toHaveProperty('text');

        const data = JSON.parse(content.text);
        expect(data).toHaveProperty('test', 'data');
        expect(data).toHaveProperty('timestamp');
      }
    });

    it('should handle resource errors', async () => {
      const result = await server.readResource('test://error');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Resource error');
      }
    });

    it('should return error for unknown resource', async () => {
      const result = await server.readResource('unknown://resource');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCodes.METHOD_NOT_FOUND);
      }
    });
  });

  describe('getPrompt', () => {
    it('should get prompt successfully', async () => {
      const result = await server.getPrompt('test-prompt', { subject: 'TypeScript' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('Please analyze: TypeScript');
      }
    });

    it('should return error for unknown prompt', async () => {
      const result = await server.getPrompt('unknown', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCodes.METHOD_NOT_FOUND);
      }
    });
  });
});

describe('MCPRouter', () => {
  let server: TestServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new TestServer();
    router = createMCPRouter(server);
  });

  it('should handle initialize request', async () => {
    const result = await router('initialize', {}, 1);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveProperty('protocolVersion');
      expect(result.value).toHaveProperty('serverInfo');
    }
  });

  it('should handle tools/list request', async () => {
    const result = await router('tools/list', {}, 2);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const response = result.value as { tools: unknown[] };
      expect(response.tools).toBeInstanceOf(Array);
      expect(response.tools.length).toBeGreaterThan(0);
    }
  });

  it('should handle tools/call request', async () => {
    const result = await router(
      'tools/call',
      {
        name: 'echo',
        arguments: { text: 'test' },
      },
      3
    );

    expect(result.isOk()).toBe(true);
  });

  it('should handle resources/list request', async () => {
    const result = await router('resources/list', {}, 4);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const response = result.value as { resources: unknown[] };
      expect(response.resources).toBeInstanceOf(Array);
    }
  });

  it('should handle resources/read request', async () => {
    const result = await router(
      'resources/read',
      {
        uri: 'test://data',
      },
      5
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const response = result.value as any;
      // Handle nested Result from asyncAndThen
      const actualResponse = response.value || response;
      expect(actualResponse).toHaveProperty('contents');
      expect(actualResponse.contents).toBeInstanceOf(Array);
      expect(actualResponse.contents).toHaveLength(1);
      expect(actualResponse.contents[0]).toHaveProperty('uri', 'test://data');
      expect(actualResponse.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(actualResponse.contents[0]).toHaveProperty('text');

      const data = JSON.parse(actualResponse.contents[0].text);
      expect(data).toHaveProperty('test', 'data');
      expect(data).toHaveProperty('timestamp');
    }
  });

  it('should handle prompts/list request', async () => {
    const result = await router('prompts/list', {}, 6);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const response = result.value as { prompts: unknown[] };
      expect(response.prompts).toBeInstanceOf(Array);
    }
  });

  it('should handle prompts/get request', async () => {
    const result = await router(
      'prompts/get',
      {
        name: 'test-prompt',
        arguments: { subject: 'test' },
      },
      7
    );

    expect(result.isOk()).toBe(true);
  });

  it('should return error for unknown method', async () => {
    const result = await router('unknown/method', {}, 8);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe(ErrorCodes.METHOD_NOT_FOUND);
    }
  });

  it('should validate required parameters', async () => {
    const result = await router('tools/call', {}, 9);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe(ErrorCodes.INVALID_PARAMS);
      expect(result.error.message).toContain('name is required');
    }
  });
});

describe('Dynamic Prompts', () => {
  class DynamicPromptServer extends MCPServer {
    constructor() {
      super('Dynamic Prompt Server', '1.0.0');
    }

    @DynamicPrompt('Initialize custom prompts')
    initializePrompts(): void {
      // Register a dynamic prompt
      this.registerPrompt(
        'dynamic-test',
        async (subject: string) =>
          ok({
            messages: [{ role: 'user', content: `Analyze: ${subject}` }],
          }),
        'A dynamically registered prompt',
        [{ index: 0, name: 'subject', description: 'Subject to analyze' }]
      );

      // Register another dynamic prompt
      this.registerPrompt(
        'custom-format',
        async (format: string, text: string) =>
          ok({
            messages: [{ role: 'user', content: `Format as ${format}: ${text}` }],
          }),
        'Custom formatting prompt',
        [
          { index: 0, name: 'format', description: 'Format type' },
          { index: 1, name: 'text', description: 'Text to format' },
        ]
      );
    }

    @PromptTemplate('code-review/{language}', { description: 'Code review by language' })
    async getCodeReviewPrompt(params: { language: string }): Promise<Result<object, string>> {
      return ok({
        messages: [{ role: 'user', content: `Review this ${params.language} code` }],
      });
    }
  }

  let server: DynamicPromptServer;

  beforeEach(() => {
    server = new DynamicPromptServer();
  });

  describe('registerPrompt', () => {
    it('should register and list dynamic prompts', () => {
      const prompts = server.listPrompts();

      // Should include dynamically registered prompts
      const promptNames = prompts.map((p) => p.name);
      expect(promptNames).toContain('dynamic-test');
      expect(promptNames).toContain('custom-format');
    });

    it('should call dynamic prompt handlers', async () => {
      const result = await server.getPrompt('dynamic-test', { subject: 'TypeScript' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content).toBe('Analyze: TypeScript');
      }
    });

    it('should handle multiple arguments in dynamic prompts', async () => {
      const result = await server.getPrompt('custom-format', {
        format: 'JSON',
        text: 'hello world',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content).toBe('Format as JSON: hello world');
      }
    });
  });

  describe('unregisterPrompt', () => {
    it('should unregister dynamic prompts', () => {
      // Register a temporary prompt
      server.registerPrompt('temp-prompt', async () => ok({ messages: [] }), 'Temporary prompt');

      let prompts = server.listPrompts();
      expect(prompts.map((p) => p.name)).toContain('temp-prompt');

      // Unregister it
      server.unregisterPrompt('temp-prompt');

      prompts = server.listPrompts();
      expect(prompts.map((p) => p.name)).not.toContain('temp-prompt');
    });
  });

  describe('PromptTemplate', () => {
    it('should handle prompt templates with parameters', async () => {
      const result = await server.getPrompt('code-review/python', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content).toBe('Review this python code');
      }
    });

    it('should handle different template parameters', async () => {
      const result = await server.getPrompt('code-review/javascript', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response.messages[0].content).toBe('Review this javascript code');
      }
    });

    it('should return error for non-matching template', async () => {
      const result = await server.getPrompt('non-existent-template', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCodes.METHOD_NOT_FOUND);
      }
    });
  });
});

describe('Dynamic Resources', () => {
  class DynamicResourceServer extends MCPServer {
    private dynamicData: Map<string, any> = new Map();

    constructor() {
      super('Dynamic Resource Server', '1.0.0');
    }

    @DynamicResource('Initialize dynamic resources')
    initializeResources(): void {
      // Register a dynamic resource
      this.registerResource(
        'dynamic://data/test',
        async () => ok({ value: this.dynamicData.get('test') || 'default' }),
        'Dynamic test data',
        false
      );

      // Register a subscribable dynamic resource
      this.registerResource(
        'dynamic://data/live',
        async () => ok({ timestamp: Date.now() }),
        'Live data resource',
        true
      );
    }

    setDynamicData(key: string, value: any): void {
      this.dynamicData.set(key, value);
    }
  }

  let server: DynamicResourceServer;

  beforeEach(() => {
    server = new DynamicResourceServer();
  });

  describe('DynamicResource decorator', () => {
    it('should initialize dynamic resources on first access', () => {
      const resources = server.listResources();

      const uris = resources.map((r) => r.uri);
      expect(uris).toContain('dynamic://data/test');
      expect(uris).toContain('dynamic://data/live');
    });

    it('should read dynamic resources', async () => {
      server.setDynamicData('test', 'custom value');
      const result = await server.readResource('dynamic://data/test');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const contents = result.value.contents[0];
        expect(contents.text).toContain('custom value');
      }
    });

    it('should unregister dynamic resources', () => {
      const resourcesBefore = server.listResources();
      const urisBefore = resourcesBefore.map((r) => r.uri);
      expect(urisBefore).toContain('dynamic://data/test');

      server.unregisterResource('dynamic://data/test');

      const resources = server.listResources();
      const uris = resources.map((r) => r.uri);
      expect(uris).not.toContain('dynamic://data/test');
      expect(uris).toContain('dynamic://data/live'); // Other resource still exists
    });
  });
});
