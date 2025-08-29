import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Tool, Param } from '../../../src/decorators/index.js';

// Test server class for tools/list testing
class TestToolsServer extends MCPServer {
  constructor() {
    super('Test Tools Server', '1.0.0');
  }

  @Tool('file-read', 'Read contents of a file')
  async readFile(@Param('Path to the file to read') path: string): Promise<Result<string, string>> {
    if (!path) {
      return err('Path is required');
    }
    return ok(`Contents of ${path}`);
  }

  @Tool('calculate-sum', 'Calculate sum of numbers')
  calculateSum(@Param('Array of numbers to sum') numbers: number[]): Result<number, string> {
    if (!Array.isArray(numbers)) {
      return err('Numbers must be an array');
    }
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return ok(sum);
  }

  @Tool('get-weather', 'Get weather information for a location')
  async getWeather(
    @Param('Location to get weather for') location: string,
    @Param('Temperature unit (celsius or fahrenheit)', false) unit?: string
  ): Promise<Result<object, string>> {
    if (!location) {
      return err('Location is required');
    }
    return ok({
      location,
      temperature: unit === 'fahrenheit' ? 72 : 22,
      unit: unit || 'celsius',
      conditions: 'sunny',
    });
  }

  @Tool('send-email', 'Send an email message')
  async sendEmail(
    @Param('Recipient email address') to: string,
    @Param('Email subject') subject: string,
    @Param('Email body content') body: string,
    @Param('CC recipients', false) cc?: string[],
    @Param('BCC recipients', false) bcc?: string[]
  ): Promise<Result<{ messageId: string }, string>> {
    if (!to || !subject || !body) {
      return err('to, subject, and body are required');
    }
    const ccCount = cc?.length || 0;
    const bccCount = bcc?.length || 0;
    return ok({
      messageId: `msg-${Date.now()}`,
      ccCount,
      bccCount,
    });
  }

  @Tool('image-analyze', 'Analyze image content')
  async analyzeImage(
    @Param('Base64 encoded image data') imageData: string,
    @Param('Analysis type (objects, text, faces)', { required: false }) analysisType?: string
  ): Promise<Result<object, string>> {
    if (!imageData) {
      return err('Image data is required');
    }
    return ok({
      type: analysisType || 'objects',
      results: ['person', 'car', 'building'],
      confidence: 0.95,
    });
  }
}

describe('Tools List (tools/list)', () => {
  let server: TestToolsServer;

  beforeEach(() => {
    server = new TestToolsServer();
  });

  describe('Basic tools listing', () => {
    it('should return all available tools', () => {
      const tools = server.listTools();

      expect(tools).toHaveLength(5);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('file-read');
      expect(toolNames).toContain('calculate-sum');
      expect(toolNames).toContain('get-weather');
      expect(toolNames).toContain('send-email');
      expect(toolNames).toContain('image-analyze');
    });

    it('should include proper tool descriptions', () => {
      const tools = server.listTools();

      const fileReadTool = tools.find((t) => t.name === 'file-read');
      expect(fileReadTool?.description).toBe('Read contents of a file');

      const weatherTool = tools.find((t) => t.name === 'get-weather');
      expect(weatherTool?.description).toBe('Get weather information for a location');
    });

    it('should include input schemas for all tools', () => {
      const tools = server.listTools();

      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      }
    });

    it('should have correct input schema for file-read tool', () => {
      const tools = server.listTools();
      const fileReadTool = tools.find((t) => t.name === 'file-read');

      expect(fileReadTool?.inputSchema.properties).toHaveProperty('path');
      expect(fileReadTool?.inputSchema.properties.path.type).toBe('string');
      expect(fileReadTool?.inputSchema.properties.path.description).toBe(
        'Path to the file to read'
      );
      expect(fileReadTool?.inputSchema.required).toContain('path');
    });

    it('should have correct input schema for get-weather tool with optional parameter', () => {
      const tools = server.listTools();
      const weatherTool = tools.find((t) => t.name === 'get-weather');

      expect(weatherTool?.inputSchema.properties).toHaveProperty('location');
      expect(weatherTool?.inputSchema.properties).toHaveProperty('unit');
      expect(weatherTool?.inputSchema.required).toContain('location');
      expect(weatherTool?.inputSchema.required).not.toContain('unit');
    });

    it('should handle complex parameter types', () => {
      const tools = server.listTools();
      const sumTool = tools.find((t) => t.name === 'calculate-sum');

      expect(sumTool?.inputSchema.properties.numbers.type).toBe('array');
      // TypeScript reflection doesn't provide array element type info at runtime
      expect(sumTool?.inputSchema.properties.numbers.items).toBeDefined();
    });

    it('should handle multiple optional parameters', () => {
      const tools = server.listTools();
      const emailTool = tools.find((t) => t.name === 'send-email');

      expect(emailTool?.inputSchema.required).toContain('to');
      expect(emailTool?.inputSchema.required).toContain('subject');
      expect(emailTool?.inputSchema.required).toContain('body');
      expect(emailTool?.inputSchema.required).not.toContain('cc');
      expect(emailTool?.inputSchema.required).not.toContain('bcc');

      expect(emailTool?.inputSchema.properties).toHaveProperty('cc');
      expect(emailTool?.inputSchema.properties).toHaveProperty('bcc');
    });
  });

  describe('Schema validation', () => {
    it('should generate valid JSON Schema format', () => {
      const tools = server.listTools();

      for (const tool of tools) {
        // Basic schema structure
        expect(tool.inputSchema.type).toBe('object');
        expect(typeof tool.inputSchema.properties).toBe('object');

        // Required array should be present and valid
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }

        // All properties should have types
        for (const [_propName, propSchema] of Object.entries(tool.inputSchema.properties)) {
          expect(propSchema).toHaveProperty('type');
          expect(typeof propSchema.type).toBe('string');
        }
      }
    });

    it('should properly handle array parameter schemas', () => {
      const tools = server.listTools();
      const emailTool = tools.find((t) => t.name === 'send-email');

      // CC and BCC should be array types
      expect(emailTool?.inputSchema.properties.cc.type).toBe('array');
      expect(emailTool?.inputSchema.properties.cc.items).toBeDefined();
      expect(emailTool?.inputSchema.properties.bcc.type).toBe('array');
      expect(emailTool?.inputSchema.properties.bcc.items).toBeDefined();
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should return tools in proper MCP format', () => {
      const tools = server.listTools();

      for (const tool of tools) {
        // Required fields per MCP spec
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('inputSchema');

        // Name should be a string
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);

        // Description is optional but should be string if present
        if (tool.description !== undefined) {
          expect(typeof tool.description).toBe('string');
        }

        // Input schema should be valid JSON Schema
        expect(tool.inputSchema).toBeTypeOf('object');
        expect(tool.inputSchema.type).toBe('object');
      }
    });

    it('should handle tools with no parameters', () => {
      // Create a server with a parameterless tool
      class SimpleServer extends MCPServer {
        @Tool('get-time', 'Get current time')
        getCurrentTime(): Result<string, string> {
          return ok(new Date().toISOString());
        }
      }

      const simpleServer = new SimpleServer();
      const tools = simpleServer.listTools();
      const timeTool = tools.find((t) => t.name === 'get-time');

      expect(timeTool).toBeDefined();
      expect(timeTool?.inputSchema.properties).toEqual({});
      expect(timeTool?.inputSchema.required).toEqual([]);
    });
  });

  describe('Server initialization and capabilities', () => {
    it('should report tools capability when tools are present', () => {
      const initResponse = server.handleInitialize();

      expect(initResponse.capabilities.tools).toBeDefined();
      expect(initResponse.capabilities.tools).toEqual({});
    });

    it('should not report tools capability when no tools are present', () => {
      class EmptyServer extends MCPServer {
        constructor() {
          super('Empty Server', '1.0.0');
        }
      }

      const emptyServer = new EmptyServer();
      const initResponse = emptyServer.handleInitialize();

      expect(initResponse.capabilities.tools).toBeUndefined();
    });

    it('should use correct protocol version', () => {
      const initResponse = server.handleInitialize();
      expect(initResponse.protocolVersion).toBe('2025-06-18');
    });
  });

  describe('Tool discovery edge cases', () => {
    it('should handle tools with special characters in names', () => {
      class SpecialServer extends MCPServer {
        @Tool('file-system:read', 'Read from file system')
        fileSystemRead(): Result<string, string> {
          return ok('file contents');
        }

        @Tool('api_call-v2', 'Make API call version 2')
        apiCallV2(): Result<string, string> {
          return ok('api response');
        }
      }

      const specialServer = new SpecialServer();
      const tools = specialServer.listTools();

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('file-system:read');
      expect(toolNames).toContain('api_call-v2');
    });

    it('should preserve parameter order in schema', () => {
      const tools = server.listTools();
      const emailTool = tools.find((t) => t.name === 'send-email');

      // Parameter order should be maintained
      const properties = Object.keys(emailTool?.inputSchema.properties || {});
      expect(properties.indexOf('to')).toBeLessThan(properties.indexOf('subject'));
      expect(properties.indexOf('subject')).toBeLessThan(properties.indexOf('body'));
    });
  });
});
