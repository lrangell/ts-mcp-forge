import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Tool, Param } from '../../../src/decorators/index.js';

class TestServerWithoutParam extends MCPServer {
  constructor() {
    super('Test Server Without Param', '1.0.0');
  }

  @Tool('Add two numbers together')
  add(a: number, b: number): Result<number, string> {
    return ok(a + b);
  }

  @Tool('Concatenate strings')
  concat(first: string, second: string, separator?: string): Result<string, string> {
    const sep = separator || '';
    return ok(`${first}${sep}${second}`);
  }

  @Tool('Process data with complex parameters')
  processData(
    data: string,
    options?: { uppercase?: boolean; reverse?: boolean }
  ): Result<string, string> {
    let result = data;

    if (options?.uppercase) {
      result = result.toUpperCase();
    }

    if (options?.reverse) {
      result = result.split('').reverse().join('');
    }

    return ok(result);
  }
}

class TestServerWithPartialParam extends MCPServer {
  constructor() {
    super('Test Server With Partial Param', '1.0.0');
  }

  @Tool('Calculate with description override')
  calculate(
    @Param('The first operand') a: number,
    b: number,
    @Param('The operation to perform') operation: string = 'add'
  ): Result<number, string> {
    switch (operation) {
      case 'add':
        return ok(a + b);
      case 'subtract':
        return ok(a - b);
      case 'multiply':
        return ok(a * b);
      default:
        return err('Unknown operation');
    }
  }
}

describe('Optional @Param decorator', () => {
  describe('Tools without @Param decorators', () => {
    let server: TestServerWithoutParam;

    beforeEach(() => {
      server = new TestServerWithoutParam();
    });

    it('should list tools with auto-extracted parameter names', () => {
      const tools = server.listTools();
      expect(Array.isArray(tools)).toBe(true);

      const addTool = (tools as any[]).find((t) => t.name === 'add');
      expect(addTool).toBeDefined();
      expect(addTool.inputSchema.properties).toHaveProperty('a');
      expect(addTool.inputSchema.properties).toHaveProperty('b');
      expect(addTool.inputSchema.required).toEqual(['a', 'b']);
    });

    it('should handle optional parameters correctly', () => {
      const tools = server.listTools();
      const concatTool = (tools as any[]).find((t) => t.name === 'concat');

      expect(concatTool).toBeDefined();
      expect(concatTool.inputSchema.properties).toHaveProperty('first');
      expect(concatTool.inputSchema.properties).toHaveProperty('second');
      expect(concatTool.inputSchema.properties).toHaveProperty('separator');
      expect(concatTool.inputSchema.required).toEqual(['first', 'second', 'separator']);
    });

    it('should execute tools with auto-extracted parameters', async () => {
      const result = await server.callTool('add', { a: 5, b: 3 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('8');
      }
    });

    it('should handle complex object parameters', () => {
      const tools = server.listTools();
      const processTool = (tools as any[]).find((t) => t.name === 'processData');

      expect(processTool).toBeDefined();
      expect(processTool.inputSchema.properties).toHaveProperty('data');
      expect(processTool.inputSchema.properties).toHaveProperty('options');
      expect(processTool.inputSchema.required).toEqual(['data', 'options']);
    });
  });

  describe('Tools with partial @Param decorators', () => {
    let server: TestServerWithPartialParam;

    beforeEach(() => {
      server = new TestServerWithPartialParam();
    });

    it('should merge @Param descriptions with auto-extracted metadata', () => {
      const tools = server.listTools();
      const calculateTool = (tools as any[]).find((t) => t.name === 'calculate');

      expect(calculateTool).toBeDefined();
      expect(calculateTool.inputSchema.properties.a.description).toBe('The first operand');
      expect(calculateTool.inputSchema.properties.b).toBeDefined();
      expect(calculateTool.inputSchema.properties.b.description).toBeUndefined();
      expect(calculateTool.inputSchema.properties.operation.description).toBe(
        'The operation to perform'
      );
    });

    it('should correctly identify parameters with defaults as optional', () => {
      const tools = server.listTools();
      const calculateTool = (tools as any[]).find((t) => t.name === 'calculate');

      expect(calculateTool.inputSchema.required).toEqual(['a', 'b']);
    });
  });

  describe('Backward compatibility', () => {
    class LegacyServer extends MCPServer {
      constructor() {
        super('Legacy Server', '1.0.0');
      }

      @Tool('Legacy tool with all params decorated')
      legacyMethod(
        @Param('First parameter') param1: string,
        @Param('Second parameter', false) param2?: number
      ): Result<string, string> {
        return ok(`${param1}-${param2 || 0}`);
      }
    }

    it('should maintain backward compatibility with fully decorated methods', () => {
      const server = new LegacyServer();
      const tools = server.listTools();
      const legacyTool = (tools as any[]).find((t) => t.name === 'legacyMethod');

      expect(legacyTool).toBeDefined();
      expect(legacyTool.inputSchema.properties.param1.description).toBe('First parameter');
      expect(legacyTool.inputSchema.properties.param2.description).toBe('Second parameter');
      expect(legacyTool.inputSchema.required).toEqual(['param1']);
    });
  });
});
