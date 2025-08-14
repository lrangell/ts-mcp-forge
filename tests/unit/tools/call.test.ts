import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Tool, Param } from '../../../src/decorators/index.js';

// Test server class for tools/call testing with various content types
class TestCallServer extends MCPServer {
  constructor() {
    super('Test Call Server', '1.0.0');
  }

  @Tool('text-processor', 'Process text content')
  processText(
    @Param('Input text to process') text: string,
    @Param('Processing operation (uppercase, lowercase, reverse)', false) operation?: string
  ): Result<string, string> {
    if (!text) {
      return err('Text input is required');
    }

    switch (operation) {
      case 'uppercase':
        return ok(text.toUpperCase());
      case 'lowercase':
        return ok(text.toLowerCase());
      case 'reverse':
        return ok(text.split('').reverse().join(''));
      default:
        return ok(text);
    }
  }

  @Tool('math-calculator', 'Perform mathematical calculations')
  calculate(
    @Param('First number') a: number,
    @Param('Second number') b: number,
    @Param('Operation (+, -, *, /)') operation: string
  ): Result<number, string> {
    if (typeof a !== 'number' || typeof b !== 'number') {
      return err('Both operands must be numbers');
    }

    switch (operation) {
      case '+':
        return ok(a + b);
      case '-':
        return ok(a - b);
      case '*':
        return ok(a * b);
      case '/':
        if (b === 0) {
          return err('Division by zero is not allowed');
        }
        return ok(a / b);
      default:
        return err(`Unsupported operation: ${operation}`);
    }
  }

  @Tool('array-processor', 'Process arrays of data')
  processArray(
    @Param('Array of numbers') numbers: number[],
    @Param('Operation (sum, average, max, min)') operation: string
  ): Result<number, string> {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return err('Numbers array is required and cannot be empty');
    }

    if (!numbers.every((n) => typeof n === 'number')) {
      return err('All array elements must be numbers');
    }

    switch (operation) {
      case 'sum':
        return ok(numbers.reduce((acc, num) => acc + num, 0));
      case 'average':
        return ok(numbers.reduce((acc, num) => acc + num, 0) / numbers.length);
      case 'max':
        return ok(Math.max(...numbers));
      case 'min':
        return ok(Math.min(...numbers));
      default:
        return err(`Unsupported operation: ${operation}`);
    }
  }

  @Tool('object-creator', 'Create structured object data')
  createObject(
    @Param('Object name') name: string,
    @Param('Object properties as key-value pairs') properties: Record<string, any>,
    @Param('Include metadata flag', { required: false }) includeMetadata?: boolean
  ): Result<object, string> {
    if (!name) {
      return err('Name is required');
    }

    if (!properties || typeof properties !== 'object') {
      return err('Properties must be a valid object');
    }

    const result: any = {
      name,
      properties,
    };

    if (includeMetadata) {
      result.metadata = {
        created: new Date().toISOString(),
        version: '1.0',
        propertyCount: Object.keys(properties).length,
      };
    }

    return ok(result);
  }

  @Tool('file-simulator', 'Simulate file operations returning different content types')
  async simulateFileOp(
    @Param('Operation type (read-text, read-image, read-binary)') operation: string,
    @Param('File path') filePath: string
  ): Promise<Result<object, string>> {
    if (!operation || !filePath) {
      return err('Operation and file path are required');
    }

    switch (operation) {
      case 'read-text':
        return ok({
          type: 'text',
          content: `This is the content of ${filePath}`,
          encoding: 'utf-8',
          size: 1024,
        });

      case 'read-image':
        return ok({
          type: 'image',
          content:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
          width: 1,
          height: 1,
        });

      case 'read-binary':
        return ok({
          type: 'binary',
          content: Buffer.from('Hello World').toString('base64'),
          encoding: 'base64',
          size: 11,
        });

      default:
        return err(`Unsupported operation: ${operation}`);
    }
  }

  @Tool('resource-creator', 'Create resource references')
  createResource(
    @Param('Resource URI') uri: string,
    @Param('Resource description') description: string
  ): Result<object, string> {
    if (!uri || !description) {
      return err('URI and description are required');
    }

    return ok({
      type: 'resource',
      uri,
      description,
      available: true,
      lastModified: new Date().toISOString(),
    });
  }

  @Tool('boolean-processor', 'Process boolean values')
  processBoolean(
    @Param('Boolean value') value: boolean,
    @Param('Invert the boolean', { required: false }) invert?: boolean
  ): Result<boolean, string> {
    if (typeof value !== 'boolean') {
      return err('Value must be a boolean');
    }

    return ok(invert ? !value : value);
  }

  @Tool('null-handler', 'Handle null and undefined values')
  handleNull(
    @Param('Input value that might be null', { required: false }) value?: any
  ): Result<string, string> {
    if (value === null) {
      return ok('Value is null');
    }
    if (value === undefined) {
      return ok('Value is undefined');
    }
    return ok(`Value is: ${JSON.stringify(value)}`);
  }

  @Tool('no-params-tool', 'Tool with no parameters')
  noParamsTool(): Result<string, string> {
    return ok('This tool requires no parameters');
  }
}

describe('Tools Call (tools/call)', () => {
  let server: TestCallServer;

  beforeEach(() => {
    server = new TestCallServer();
  });

  describe('Basic tool calling', () => {
    it('should call tool with string parameters', async () => {
      const result = await server.callTool('text-processor', {
        text: 'Hello World',
        operation: 'uppercase',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toHaveLength(1);
        expect(result.value.content[0].type).toBe('text');
        expect(result.value.content[0].text).toBe('HELLO WORLD');
      }
    });

    it('should call tool with numeric parameters', async () => {
      const result = await server.callTool('math-calculator', {
        a: 10,
        b: 5,
        operation: '+',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('15');
      }
    });

    it('should call tool with array parameters', async () => {
      const result = await server.callTool('array-processor', {
        numbers: [1, 2, 3, 4, 5],
        operation: 'sum',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('15');
      }
    });

    it('should call tool with object parameters', async () => {
      const result = await server.callTool('object-creator', {
        name: 'TestObject',
        properties: {
          color: 'blue',
          size: 'large',
          count: 42,
        },
        includeMetadata: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = JSON.parse(result.value.content[0].text);
        expect(response.name).toBe('TestObject');
        expect(response.properties.color).toBe('blue');
        expect(response.metadata).toBeDefined();
        expect(response.metadata.propertyCount).toBe(3);
      }
    });

    it('should call tool with boolean parameters', async () => {
      const result = await server.callTool('boolean-processor', {
        value: true,
        invert: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('false');
      }
    });
  });

  describe('Optional parameters', () => {
    it('should handle missing optional parameters', async () => {
      const result = await server.callTool('text-processor', {
        text: 'Hello World',
        // operation is optional and not provided
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('Hello World');
      }
    });

    it('should handle null and undefined optional parameters', async () => {
      const result1 = await server.callTool('null-handler', {
        value: null,
      });

      const result2 = await server.callTool('null-handler', {
        value: undefined,
      });

      const result3 = await server.callTool('null-handler', {});

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);

      if (result1.isOk()) {
        expect(result1.value.content[0].text).toBe('Value is null');
      }
      if (result2.isOk()) {
        expect(result2.value.content[0].text).toBe('Value is undefined');
      }
      if (result3.isOk()) {
        expect(result3.value.content[0].text).toBe('Value is undefined');
      }
    });
  });

  describe('No parameters tool', () => {
    it('should call tool with no parameters', async () => {
      const result = await server.callTool('no-params-tool', {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('This tool requires no parameters');
      }
    });

    it('should call tool with no parameters and no arguments object', async () => {
      const result = await server.callTool('no-params-tool');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('This tool requires no parameters');
      }
    });
  });

  describe('Async tool calling', () => {
    it('should handle async tools', async () => {
      const result = await server.callTool('file-simulator', {
        operation: 'read-text',
        filePath: '/path/to/file.txt',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = JSON.parse(result.value.content[0].text);
        expect(response.type).toBe('text');
        expect(response.content).toContain('/path/to/file.txt');
        expect(response.encoding).toBe('utf-8');
      }
    });

    it('should handle async tools with different content types', async () => {
      const imageResult = await server.callTool('file-simulator', {
        operation: 'read-image',
        filePath: '/path/to/image.png',
      });

      expect(imageResult.isOk()).toBe(true);
      if (imageResult.isOk()) {
        const response = JSON.parse(imageResult.value.content[0].text);
        expect(response.type).toBe('image');
        expect(response.mimeType).toBe('image/png');
        expect(response.content).toContain('iVBORw0KGgoAAAA'); // Base64 PNG header
      }
    });
  });

  describe('Content type handling', () => {
    it('should return text content by default', async () => {
      const result = await server.callTool('text-processor', {
        text: 'test',
        operation: 'uppercase',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toHaveLength(1);
        expect(result.value.content[0].type).toBe('text');
        expect(typeof result.value.content[0].text).toBe('string');
      }
    });

    it('should handle complex object responses as text', async () => {
      const result = await server.callTool('resource-creator', {
        uri: 'file:///example.txt',
        description: 'Example file resource',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].type).toBe('text');
        const response = JSON.parse(result.value.content[0].text);
        expect(response.type).toBe('resource');
        expect(response.uri).toBe('file:///example.txt');
      }
    });
  });

  describe('Error handling in tool calls', () => {
    it('should handle tool execution errors', async () => {
      const result = await server.callTool('math-calculator', {
        a: 10,
        b: 0,
        operation: '/',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Division by zero is not allowed');
      }
    });

    it('should handle validation errors', async () => {
      const result = await server.callTool('array-processor', {
        numbers: 'not an array',
        operation: 'sum',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Numbers array is required');
      }
    });

    it('should handle type validation errors', async () => {
      const result = await server.callTool('math-calculator', {
        a: 'not a number',
        b: 5,
        operation: '+',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // Error message now includes MCP error prefix
        expect(result.error.message).toMatch(
          /Invalid tool arguments|Both operands must be numbers/
        );
      }
    });
  });

  describe('Parameter validation', () => {
    it('should handle missing required parameters', async () => {
      const result = await server.callTool('text-processor', {
        // missing required 'text' parameter
        operation: 'uppercase',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32602); // Invalid params error code
      }
    });

    it('should handle extra unexpected parameters', async () => {
      const result = await server.callTool('text-processor', {
        text: 'Hello',
        operation: 'uppercase',
        extraParam: 'unexpected',
      });

      // Should succeed - extra parameters are typically ignored
      expect(result.isOk()).toBe(true);
    });

    it('should handle null values for required parameters', async () => {
      const result = await server.callTool('text-processor', {
        text: null,
        operation: 'uppercase',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Text input is required');
      }
    });
  });

  describe('Complex data structures', () => {
    it('should handle nested objects', async () => {
      const result = await server.callTool('object-creator', {
        name: 'NestedObject',
        properties: {
          user: {
            name: 'John Doe',
            age: 30,
            preferences: {
              color: 'blue',
              numbers: [1, 2, 3],
            },
          },
          settings: {
            enabled: true,
            level: 5,
          },
        },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = JSON.parse(result.value.content[0].text);
        expect(response.properties.user.name).toBe('John Doe');
        expect(response.properties.user.preferences.numbers).toEqual([1, 2, 3]);
        expect(response.properties.settings.enabled).toBe(true);
      }
    });

    it('should handle arrays with mixed types in objects', async () => {
      const result = await server.callTool('object-creator', {
        name: 'MixedArray',
        properties: {
          data: [1, 'string', true, { nested: 'object' }, [1, 2, 3]],
        },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = JSON.parse(result.value.content[0].text);
        expect(response.properties.data).toHaveLength(5);
        expect(response.properties.data[0]).toBe(1);
        expect(response.properties.data[1]).toBe('string');
        expect(response.properties.data[2]).toBe(true);
        expect(response.properties.data[3].nested).toBe('object');
        expect(response.properties.data[4]).toEqual([1, 2, 3]);
      }
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty string parameters', async () => {
      const result = await server.callTool('text-processor', {
        text: '',
        operation: 'uppercase',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Text input is required');
      }
    });

    it('should handle empty arrays', async () => {
      const result = await server.callTool('array-processor', {
        numbers: [],
        operation: 'sum',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should handle very large numbers', async () => {
      const result = await server.callTool('math-calculator', {
        a: Number.MAX_SAFE_INTEGER,
        b: 1,
        operation: '+',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const value = parseFloat(result.value.content[0].text);
        expect(value).toBe(Number.MAX_SAFE_INTEGER + 1);
      }
    });

    it('should handle negative numbers', async () => {
      const result = await server.callTool('array-processor', {
        numbers: [-5, -3, -1, 0, 1, 3, 5],
        operation: 'average',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('0');
      }
    });

    it('should handle floating point precision', async () => {
      const result = await server.callTool('math-calculator', {
        a: 0.1,
        b: 0.2,
        operation: '+',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const value = parseFloat(result.value.content[0].text);
        expect(value).toBeCloseTo(0.3, 10);
      }
    });
  });

  describe('Tool not found errors', () => {
    it('should return error for non-existent tool', async () => {
      const result = await server.callTool('non-existent-tool', {
        param: 'value',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32601); // Method not found error code
        expect(result.error.message).toContain('Tool not found');
      }
    });

    it('should handle empty tool name', async () => {
      const result = await server.callTool('', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32601);
      }
    });
  });
});
