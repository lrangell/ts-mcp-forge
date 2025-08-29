import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Tool } from '../../../src/decorators/index.js';

class TestServerWithDefaults extends MCPServer {
  constructor() {
    super('Test Server With Defaults', '1.0.0');
  }

  @Tool('Format text with options')
  format(text: string, uppercase: boolean = false, prefix: string = '> '): Result<string, string> {
    let result = text;
    if (uppercase) {
      result = result.toUpperCase();
    }
    return ok(`${prefix}${result}`);
  }

  @Tool('Mix of required and optional params')
  process(
    required1: string,
    required2: number,
    optional1: string = 'default',
    optional2: boolean = true
  ): Result<string, string> {
    return ok(`${required1}-${required2}-${optional1}-${optional2}`);
  }
}

describe('Parameters with default values', () => {
  let server: TestServerWithDefaults;

  beforeEach(() => {
    server = new TestServerWithDefaults();
  });

  it('should detect parameters with defaults as optional', () => {
    const tools = server.listTools();
    const formatTool = (tools as any[]).find((t) => t.name === 'format');

    expect(formatTool).toBeDefined();
    expect(formatTool.inputSchema.properties).toHaveProperty('text');
    expect(formatTool.inputSchema.properties).toHaveProperty('uppercase');
    expect(formatTool.inputSchema.properties).toHaveProperty('prefix');
    expect(formatTool.inputSchema.required).toEqual(['text']);
  });

  it('should correctly identify mixed required/optional parameters', () => {
    const tools = server.listTools();
    const processTool = (tools as any[]).find((t) => t.name === 'process');

    expect(processTool).toBeDefined();
    expect(processTool.inputSchema.required).toEqual(['required1', 'required2']);
  });

  it('should execute with default values when optional params are omitted', async () => {
    const result = await server.callTool('format', { text: 'hello' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.content[0].text).toBe('> hello');
    }
  });

  it('should execute with provided values overriding defaults', async () => {
    const result = await server.callTool('format', {
      text: 'hello',
      uppercase: true,
      prefix: '>> ',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.content[0].text).toBe('>> HELLO');
    }
  });
});
