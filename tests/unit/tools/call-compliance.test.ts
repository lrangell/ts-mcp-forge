/**
 * Tools Call Response Compliance Tests
 * Ensures tools/call responses follow MCP specification 2025-06-18
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Tool, Param } from '../../../src/decorators/index.js';
import { createMCPRouter } from '../../../src/core/router.js';
import { setupMCPAssertions } from '../../helpers/assertions.js';

// Setup custom assertions
setupMCPAssertions();

class ToolsCallComplianceServer extends MCPServer {
  constructor() {
    super('Tools Call Compliance Server', '1.0.0');
  }

  @Tool('text-generator', 'Generates text content')
  generateText(
    @Param('Text prompt') prompt: string,
    @Param('Max length', { required: false }) maxLength?: number
  ): Result<string, string> {
    if (!prompt) {
      return err('Prompt is required');
    }

    const length = maxLength || 100;
    const generated = `Generated text based on: "${prompt}". This is a sample response that would be ${length} characters or less.`;
    return ok(generated);
  }

  @Tool('image-creator', 'Creates image content')
  createImage(
    @Param('Image description') description: string,
    @Param('Image format', { required: false }) format?: string
  ): Result<object, string> {
    if (!description) {
      return err('Image description is required');
    }

    const imageFormat = format || 'png';
    const mimeType = `image/${imageFormat}`;

    // Return structured content for image
    return ok({
      type: 'image',
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: mimeType,
      description: `Generated ${imageFormat} image: ${description}`,
      width: 1,
      height: 1,
    });
  }

  @Tool('resource-generator', 'Generates resource references')
  generateResource(
    @Param('Resource type') resourceType: string,
    @Param('Resource name') name: string
  ): Result<object, string> {
    if (!resourceType || !name) {
      return err('Resource type and name are required');
    }

    return ok({
      type: 'resource',
      uri: `generated://${resourceType}/${encodeURIComponent(name)}`,
      description: `Generated ${resourceType} resource: ${name}`,
      mimeType: this.getMimeTypeForResourceType(resourceType),
    });
  }

  @Tool('multi-content-generator', 'Generates multiple content types')
  generateMultiContent(
    @Param('Content types') contentTypes: string[],
    @Param('Base name') baseName: string
  ): Result<object[], string> {
    if (!Array.isArray(contentTypes) || contentTypes.length === 0) {
      return err('Content types array is required');
    }
    if (!baseName) {
      return err('Base name is required');
    }

    const contents = contentTypes.map((type, index) => {
      switch (type) {
        case 'text':
          return {
            type: 'text',
            text: `Text content for ${baseName} (item ${index + 1})`,
          };
        case 'image':
          return {
            type: 'image',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            mimeType: 'image/png',
          };
        case 'resource':
          return {
            type: 'resource',
            uri: `file:///generated/${baseName}-${index + 1}.dat`,
          };
        default:
          return {
            type: 'text',
            text: `Unknown content type: ${type}`,
          };
      }
    });

    return ok(contents);
  }

  @Tool('json-processor', 'Processes JSON data')
  processJson(
    @Param('JSON data') jsonData: object,
    @Param('Operation') operation: string
  ): Result<object, string> {
    if (!jsonData || typeof jsonData !== 'object') {
      return err('Valid JSON data is required');
    }
    if (!operation) {
      return err('Operation is required');
    }

    const result = {
      operation: operation,
      input: jsonData,
      output: this.performJsonOperation(jsonData, operation),
      timestamp: new Date().toISOString(),
    };

    return ok(result);
  }

  @Tool('error-simulator', 'Simulates various error conditions')
  simulateError(
    @Param('Error type') errorType: string,
    @Param('Error details', { required: false }) details?: string
  ): Result<string, string> {
    switch (errorType) {
      case 'validation':
        return err('Validation error: Invalid input parameters');
      case 'permission':
        return err('Permission denied: Insufficient access rights');
      case 'resource':
        return err('Resource error: Required resource not available');
      case 'timeout':
        return err('Timeout error: Operation took too long to complete');
      case 'network':
        return err('Network error: Connection failed');
      default:
        return err(`Unknown error type: ${errorType}${details ? ` (${details})` : ''}`);
    }
  }

  @Tool('file-processor', 'Processes file content')
  processFile(
    @Param('File path') filePath: string,
    @Param('Processing type') processingType: string
  ): Result<object, string> {
    if (!filePath) {
      return err('File path is required');
    }
    if (!processingType) {
      return err('Processing type is required');
    }

    // Simulate file processing with different content types based on processing type
    switch (processingType) {
      case 'analyze':
        return ok({
          type: 'analysis',
          filePath: filePath,
          analysis: {
            size: 1024,
            lines: 42,
            words: 256,
            characters: 1024,
          },
        });

      case 'convert':
        return ok({
          type: 'conversion',
          source: filePath,
          target: filePath.replace(/\.[^.]+$/, '.converted'),
          format: 'converted',
        });

      case 'extract':
        return ok({
          type: 'extraction',
          source: filePath,
          extractedData: 'Sample extracted content',
          metadata: {
            extractedAt: new Date().toISOString(),
            method: 'text-extraction',
          },
        });

      default:
        return err(`Unsupported processing type: ${processingType}`);
    }
  }

  @Tool('complex-calculator', 'Performs complex calculations')
  complexCalculate(
    @Param('Operation') operation: string,
    @Param('Operands') operands: number[],
    @Param('Options', { required: false }) options?: object
  ): Result<object, string> {
    if (!operation) {
      return err('Operation is required');
    }
    if (!Array.isArray(operands) || operands.length === 0) {
      return err('Operands array is required');
    }
    if (!operands.every((n) => typeof n === 'number')) {
      return err('All operands must be numbers');
    }

    let result: number;
    switch (operation) {
      case 'sum':
        result = operands.reduce((acc, n) => acc + n, 0);
        break;
      case 'product':
        result = operands.reduce((acc, n) => acc * n, 1);
        break;
      case 'average':
        result = operands.reduce((acc, n) => acc + n, 0) / operands.length;
        break;
      case 'max':
        result = Math.max(...operands);
        break;
      case 'min':
        result = Math.min(...operands);
        break;
      default:
        return err(`Unsupported operation: ${operation}`);
    }

    return ok({
      operation: operation,
      operands: operands,
      result: result,
      options: options || {},
      metadata: {
        calculatedAt: new Date().toISOString(),
        precision: 'double',
      },
    });
  }

  private getMimeTypeForResourceType(resourceType: string): string {
    const mimeTypes: Record<string, string> = {
      document: 'application/pdf',
      spreadsheet: 'application/vnd.ms-excel',
      image: 'image/jpeg',
      video: 'video/mp4',
      audio: 'audio/mpeg',
      archive: 'application/zip',
      data: 'application/json',
    };
    return mimeTypes[resourceType] || 'application/octet-stream';
  }

  private performJsonOperation(data: object, operation: string): any {
    switch (operation) {
      case 'keys':
        return Object.keys(data);
      case 'values':
        return Object.values(data);
      case 'size':
        return Object.keys(data).length;
      case 'stringify':
        return JSON.stringify(data);
      default:
        return `Performed ${operation} on data`;
    }
  }
}

describe('Tools Call Response Compliance', () => {
  let server: ToolsCallComplianceServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new ToolsCallComplianceServer();
    router = createMCPRouter(server);
  });

  describe('Response Structure Compliance', () => {
    it('should return content array for successful text tools', async () => {
      const result = await server.callTool('text-generator', {
        prompt: 'Generate a test message',
        maxLength: 50,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Must have content array
        expect(result.value).toHaveProperty('content');
        expect(Array.isArray(result.value.content)).toBe(true);
        expect(result.value.content).toHaveLength(1);

        const content = result.value.content[0];
        expect(content).toHaveProperty('type', 'text');
        expect(content).toHaveProperty('text');
        expect(typeof content.text).toBe('string');
        expect(content.text.length).toBeGreaterThan(0);

        // Validate response structure
        expect(result.value).toBeValidToolCallResponse();
      }
    });

    it('should return proper content array for image tools', async () => {
      const result = await server.callTool('image-creator', {
        description: 'A test image',
        format: 'png',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('content');
        expect(Array.isArray(result.value.content)).toBe(true);
        expect(result.value.content).toHaveLength(1);

        const content = result.value.content[0];
        expect(content.type).toBe('text');

        // Parse the JSON response to validate image structure
        const imageData = JSON.parse(content.text);
        expect(imageData.type).toBe('image');
        expect(imageData).toHaveProperty('data');
        expect(imageData).toHaveProperty('mimeType');
        expect(imageData.data).toBeValidBase64();
        expect(imageData.mimeType).toBeValidMimeType();

        expect(result.value).toBeValidToolCallResponse();
      }
    });

    it('should return proper content array for resource tools', async () => {
      const result = await server.callTool('resource-generator', {
        resourceType: 'document',
        name: 'test-document',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('content');
        expect(Array.isArray(result.value.content)).toBe(true);
        expect(result.value.content).toHaveLength(1);

        const content = result.value.content[0];
        expect(content.type).toBe('text');

        const resourceData = JSON.parse(content.text);
        expect(resourceData.type).toBe('resource');
        expect(resourceData).toHaveProperty('uri');
        expect(resourceData.uri).toBeValidURI();
        expect(resourceData.uri).toMatch(/^generated:\/\//);

        expect(result.value).toBeValidToolCallResponse();
      }
    });

    it('should handle multiple content types in single response', async () => {
      const result = await server.callTool('multi-content-generator', {
        contentTypes: ['text', 'image', 'resource'],
        baseName: 'test-multi',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('content');
        expect(Array.isArray(result.value.content)).toBe(true);
        expect(result.value.content).toHaveLength(1);

        const content = result.value.content[0];
        const multiContentData = JSON.parse(content.text);

        expect(Array.isArray(multiContentData)).toBe(true);
        expect(multiContentData).toHaveLength(3);

        // Validate each content type
        expect(multiContentData[0].type).toBe('text');
        expect(multiContentData[0]).toHaveProperty('text');

        expect(multiContentData[1].type).toBe('image');
        expect(multiContentData[1]).toHaveProperty('data');
        expect(multiContentData[1]).toHaveProperty('mimeType');
        expect(multiContentData[1].data).toBeValidBase64();

        expect(multiContentData[2].type).toBe('resource');
        expect(multiContentData[2]).toHaveProperty('uri');
        expect(multiContentData[2].uri).toBeValidURI();

        expect(result.value).toBeValidToolCallResponse();
      }
    });
  });

  describe('Content Type Validation', () => {
    it('should handle complex JSON responses properly', async () => {
      const testData = {
        name: 'test',
        values: [1, 2, 3],
        nested: { key: 'value' },
      };

      const result = await server.callTool('json-processor', {
        jsonData: testData,
        operation: 'keys',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        expect(content.type).toBe('text');

        const responseData = JSON.parse(content.text);
        expect(responseData).toHaveProperty('operation', 'keys');
        expect(responseData).toHaveProperty('input');
        expect(responseData).toHaveProperty('output');
        expect(responseData).toHaveProperty('timestamp');
      }
    });

    it('should handle array parameters correctly', async () => {
      const result = await server.callTool('complex-calculator', {
        operation: 'sum',
        operands: [1, 2, 3, 4, 5],
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        const calculationData = JSON.parse(content.text);

        expect(calculationData.operation).toBe('sum');
        expect(calculationData.operands).toEqual([1, 2, 3, 4, 5]);
        expect(calculationData.result).toBe(15);
        expect(calculationData).toHaveProperty('metadata');
      }
    });

    it('should handle object parameters correctly', async () => {
      const result = await server.callTool('file-processor', {
        filePath: '/path/to/test.txt',
        processingType: 'analyze',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        const processData = JSON.parse(content.text);

        expect(processData.type).toBe('analysis');
        expect(processData.filePath).toBe('/path/to/test.txt');
        expect(processData).toHaveProperty('analysis');
        expect(processData.analysis).toHaveProperty('size');
        expect(processData.analysis).toHaveProperty('lines');
      }
    });
  });

  describe('Error Response Compliance', () => {
    it('should return proper error structure for validation errors', async () => {
      const result = await server.callTool('error-simulator', {
        errorType: 'validation',
        details: 'Test validation error',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32603); // INTERNAL_ERROR for tool execution errors
        expect(result.error.message).toContain('Validation error');
        expect(result.error).toHaveProperty('message');
      }
    });

    it('should return proper error for missing required parameters', async () => {
      const result = await server.callTool('text-generator', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32602); // INVALID_PARAMS
      }
    });

    it('should return proper error for invalid parameter types', async () => {
      const result = await server.callTool('complex-calculator', {
        operation: 'sum',
        operands: 'not-an-array',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32603); // INTERNAL_ERROR for tool logic errors
        expect(result.error.message).toContain('array is required');
      }
    });

    it('should return proper error for tool not found', async () => {
      const result = await server.callTool('non-existent-tool', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32601); // METHOD_NOT_FOUND
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('JSON-RPC Integration Compliance', () => {
    it('should return proper response format via JSON-RPC', async () => {
      const result = await router(
        'tools/call',
        {
          name: 'text-generator',
          arguments: {
            prompt: 'Test prompt',
            maxLength: 100,
          },
        },
        1
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('content');
        expect(Array.isArray(response.content)).toBe(true);
        expect(response.content).toHaveLength(1);

        const content = response.content[0];
        expect(content).toHaveProperty('type', 'text');
        expect(content).toHaveProperty('text');
      }
    });

    it('should handle complex tools via JSON-RPC', async () => {
      const result = await router(
        'tools/call',
        {
          name: 'multi-content-generator',
          arguments: {
            contentTypes: ['text', 'image'],
            baseName: 'rpc-test',
          },
        },
        2
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value as any;
        expect(response).toHaveProperty('content');
        expect(Array.isArray(response.content)).toBe(true);

        const contentData = JSON.parse(response.content[0].text);
        expect(Array.isArray(contentData)).toBe(true);
        expect(contentData).toHaveLength(2);
      }
    });

    it('should return proper JSON-RPC errors for tool failures', async () => {
      const result = await router(
        'tools/call',
        {
          name: 'error-simulator',
          arguments: {
            errorType: 'permission',
          },
        },
        3
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe(-32603);
        expect(result.error).toHaveProperty('message');
        expect(result.error.message).toContain('Permission denied');
      }
    });
  });

  describe('Content Serialization Compliance', () => {
    it('should properly serialize complex objects in responses', async () => {
      const complexData = {
        level1: {
          level2: {
            array: [1, 'two', { three: 3 }],
            date: '2025-01-01T00:00:00Z',
            boolean: true,
            null_value: null,
          },
        },
      };

      const result = await server.callTool('json-processor', {
        jsonData: complexData,
        operation: 'stringify',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        expect(() => JSON.parse(content.text)).not.toThrow();

        const responseData = JSON.parse(content.text);
        expect(responseData.input).toEqual(complexData);
        expect(typeof responseData.output).toBe('string');
      }
    });

    it('should handle Unicode content correctly', async () => {
      const unicodePrompt = 'Generate text with Unicode: 你好 🌍 αβγ ñiño';

      const result = await server.callTool('text-generator', {
        prompt: unicodePrompt,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        expect(content.text).toContain(unicodePrompt);
        // Ensure Unicode characters are preserved
        expect(content.text).toContain('你好');
        expect(content.text).toContain('🌍');
        expect(content.text).toContain('αβγ');
        expect(content.text).toContain('ñiño');
      }
    });

    it('should handle special characters and escaping', async () => {
      const specialCharPrompt = 'Text with "quotes", \'apostrophes\', and \n newlines \t tabs';

      const result = await server.callTool('text-generator', {
        prompt: specialCharPrompt,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        expect(content.text).toContain(specialCharPrompt);
      }
    });
  });

  describe('Content Array Consistency', () => {
    it('should always return content as array even for single items', async () => {
      const tools = [
        { name: 'text-generator', args: { prompt: 'test' } },
        { name: 'image-creator', args: { description: 'test' } },
        { name: 'resource-generator', args: { resourceType: 'data', name: 'test' } },
        { name: 'json-processor', args: { jsonData: { test: true }, operation: 'keys' } },
      ];

      for (const tool of tools) {
        const result = await server.callTool(tool.name, tool.args);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          expect(result.value).toHaveProperty('content');
          expect(Array.isArray(result.value.content)).toBe(true);
          expect(result.value.content.length).toBeGreaterThan(0);

          // Each content item should have proper structure
          result.value.content.forEach((content) => {
            expect(content).toHaveProperty('type');
            expect(['text', 'image', 'resource'].includes(content.type)).toBe(true);
          });
        }
      }
    });

    it('should maintain content array structure across different tool types', async () => {
      const result = await server.callTool('multi-content-generator', {
        contentTypes: ['text', 'text', 'text'], // Multiple same type
        baseName: 'consistency-test',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toHaveLength(1);

        const multiContent = JSON.parse(result.value.content[0].text);
        expect(Array.isArray(multiContent)).toBe(true);
        expect(multiContent).toHaveLength(3);

        multiContent.forEach((content) => {
          expect(content.type).toBe('text');
          expect(content).toHaveProperty('text');
        });
      }
    });
  });
});
