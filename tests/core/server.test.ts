import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { Tool, Resource, Prompt, Param } from '../../src/decorators/index.js';
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
      expect(response).toHaveProperty('contents');
      expect(response.contents).toBeInstanceOf(Array);
      expect(response.contents).toHaveLength(1);
      expect(response.contents[0]).toHaveProperty('uri', 'test://data');
      expect(response.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(response.contents[0]).toHaveProperty('text');

      const data = JSON.parse(response.contents[0].text);
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
