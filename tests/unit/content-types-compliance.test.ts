/**
 * Content Types Compliance Tests
 * Ensures all content types follow MCP specification 2025-06-18
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { Tool, Resource, Prompt, Param } from '../../src/decorators/index.js';
import { setupMCPAssertions, AssertionHelpers } from '../helpers/assertions.js';

// Setup custom assertions
setupMCPAssertions();

class ContentTypesComplianceServer extends MCPServer {
  constructor() {
    super('Content Types Compliance Server', '1.0.0');
  }

  // Tools that return different content types
  @Tool('text-content-tool', 'Returns various text content types')
  textContentTool(
    @Param('Content type') contentType: string,
    @Param('Content data') data: string
  ): Result<string, string> {
    if (!contentType || !data) {
      return err('Content type and data are required');
    }

    switch (contentType) {
      case 'plain':
        return ok(data);
      case 'markdown':
        return ok(`# ${data}\n\nThis is **markdown** content with *formatting*.`);
      case 'json':
        return ok(JSON.stringify({ message: data, timestamp: new Date().toISOString() }));
      case 'xml':
        return ok(`<?xml version="1.0"?><root><message>${data}</message></root>`);
      case 'html':
        return ok(`<html><body><h1>${data}</h1><p>HTML content</p></body></html>`);
      case 'code':
        return ok(`function example() {\n  console.log("${data}");\n  return true;\n}`);
      case 'unicode':
        return ok(`${data} - Unicode: 你好 🌍 αβγ ñiño émojis 🎉🚀💻`);
      default:
        return err(`Unsupported content type: ${contentType}`);
    }
  }

  @Tool('image-content-tool', 'Returns various image content formats')
  imageContentTool(
    @Param('Image format') format: string,
    @Param('Image description') description: string
  ): Result<object, string> {
    if (!format || !description) {
      return err('Format and description are required');
    }

    // Different image formats with proper base64 data
    const imageData: Record<string, string> = {
      png: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      jpeg: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==',
      gif: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      webp: 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
      svg: 'PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
    };

    if (!imageData[format]) {
      return err(`Unsupported image format: ${format}`);
    }

    return ok({
      type: 'image',
      data: imageData[format],
      mimeType: `image/${format}`,
      description: description,
      width: format === 'svg' ? undefined : 1,
      height: format === 'svg' ? undefined : 1,
      size: imageData[format].length,
    });
  }

  @Tool('resource-content-tool', 'Returns various resource references')
  resourceContentTool(
    @Param('Resource scheme') scheme: string,
    @Param('Resource path') path: string,
    @Param('Resource description') description: string
  ): Result<object, string> {
    if (!path || !description) {
      return err('Scheme, path, and description are required');
    }

    // Validate URI scheme format first
    if (!scheme) {
      return err('Invalid URI: empty scheme');
    }

    if (!scheme.match(/^[a-zA-Z][a-zA-Z0-9+.-]*$/)) {
      return err('Invalid URI: invalid scheme format');
    }

    const uri = `${scheme}://${path}`;

    // Validate URI format
    try {
      if (scheme !== 'custom') {
        new URL(uri);
      }
    } catch {
      return err('Invalid URI format');
    }

    return ok({
      type: 'resource',
      uri: uri,
      description: description,
      mimeType: this.getMimeTypeForResource(path),
      availability: 'available',
      lastModified: new Date().toISOString(),
    });
  }

  @Tool('mixed-content-tool', 'Returns mixed content types')
  mixedContentTool(
    @Param('Include text') includeText: boolean,
    @Param('Include image') includeImage: boolean,
    @Param('Include resource') includeResource: boolean,
    @Param('Base name') baseName: string
  ): Result<object[], string> {
    if (!baseName) {
      return err('Base name is required');
    }

    const contents: any[] = [];

    if (includeText) {
      contents.push({
        type: 'text',
        text: `Text content for ${baseName}`,
        format: 'plain',
      });
    }

    if (includeImage) {
      contents.push({
        type: 'image',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        description: `Generated image for ${baseName}`,
      });
    }

    if (includeResource) {
      contents.push({
        type: 'resource',
        uri: `file:///generated/${encodeURIComponent(baseName)}.dat`,
        description: `Generated resource for ${baseName}`,
      });
    }

    if (contents.length === 0) {
      return err('At least one content type must be included');
    }

    return ok(contents);
  }

  // Resources with different content types
  @Resource('text://plain/sample.txt', 'Plain text sample', 'text/plain')
  getPlainText(): Result<string, string> {
    return ok(
      'This is a plain text sample with line breaks.\nSecond line here.\nThird line with special chars: !@#$%^&*()'
    );
  }

  @Resource('text://markdown/document.md', 'Markdown document', 'text/markdown')
  getMarkdownText(): Result<string, string> {
    return ok(`# Markdown Document

## Features
- **Bold text**
- *Italic text*
- \`Code snippets\`
- [Links](https://example.com)

### Code Block
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

> This is a blockquote
`);
  }

  @Resource('application://json/data.json', 'JSON data sample', 'application/json')
  getJsonData(): Result<object, string> {
    return ok({
      id: 12345,
      name: 'Sample Data',
      created: '2025-01-01T00:00:00Z',
      tags: ['sample', 'test', 'json'],
      metadata: {
        version: '1.0',
        author: 'System',
        encoding: 'utf-8',
      },
      data: {
        numbers: [1, 2, 3, 4, 5],
        flags: { active: true, visible: false },
        description: 'This is a comprehensive JSON sample with various data types',
      },
    });
  }

  @Resource('image://png/pixel.png', 'Single pixel PNG', 'image/png')
  getPngImage(): Result<string, string> {
    return ok(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );
  }

  @Resource('application://xml/config.xml', 'XML configuration', 'application/xml')
  getXmlConfig(): Result<string, string> {
    return ok(`<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <settings>
    <setting name="debug" value="true" />
    <setting name="timeout" value="30" />
    <setting name="retries" value="3" />
  </settings>
  <database>
    <host>localhost</host>
    <port>5432</port>
    <name>testdb</name>
  </database>
  <features>
    <feature name="authentication" enabled="true" />
    <feature name="logging" enabled="true" />
  </features>
</configuration>`);
  }

  @Resource('application://binary/data.bin', 'Binary data sample', 'application/octet-stream')
  getBinaryData(): Result<string, string> {
    // Create binary data with various byte values
    const binaryArray = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      binaryArray[i] = i * 8; // Various byte values
    }
    return ok(Buffer.from(binaryArray).toString('base64'));
  }

  // Prompts with different content types
  @Prompt('text-only-prompt', 'Prompt with only text content')
  textOnlyPrompt(@Param('Topic') topic: string): Result<object, string> {
    if (!topic) return err('Topic is required');

    return ok({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please provide detailed information about ${topic}.`,
          },
        },
      ],
    });
  }

  @Prompt('image-analysis-prompt', 'Prompt with image content')
  imageAnalysisPrompt(
    @Param('Analysis type') analysisType: string,
    @Param('Include sample image') includeSample: boolean
  ): Result<object, string> {
    if (!analysisType) return err('Analysis type is required');

    const messages: any[] = [
      {
        role: 'system' as const,
        content: {
          type: 'text' as const,
          text: `You are an expert in ${analysisType} image analysis.`,
        },
      },
    ];

    if (includeSample) {
      messages.push({
        role: 'user' as const,
        content: {
          type: 'image' as const,
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
        },
      });
    }

    messages.push({
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Please analyze this image using ${analysisType} techniques.`,
      },
    });

    return ok({ messages });
  }

  @Prompt('resource-reference-prompt', 'Prompt with resource references')
  resourceReferencePrompt(
    @Param('Resource URI') resourceUri: string,
    @Param('Analysis goal') goal: string
  ): Result<object, string> {
    if (!resourceUri || !goal) return err('Resource URI and goal are required');

    return ok({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze the following resource for ${goal}:`,
          },
        },
        {
          role: 'user' as const,
          content: {
            type: 'resource' as const,
            uri: resourceUri,
          },
        },
      ],
    });
  }

  private getMimeTypeForResource(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      zip: 'application/zip',
      bin: 'application/octet-stream',
      dat: 'application/octet-stream',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}

describe('Content Types Compliance', () => {
  let server: ContentTypesComplianceServer;
  beforeEach(() => {
    server = new ContentTypesComplianceServer();
  });

  describe('Text Content Type Compliance', () => {
    it('should handle plain text content correctly', async () => {
      const result = await server.callTool('text-content-tool', {
        contentType: 'plain',
        data: 'Simple plain text content',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toHaveLength(1);
        const content = result.value.content[0];

        expect(content.type).toBe('text');
        expect(content).toHaveProperty('text');
        expect(typeof content.text).toBe('string');
        expect(content.text).toBe('Simple plain text content');

        AssertionHelpers.expectValidContentType(content, 'text');
      }
    });

    it('should handle formatted text content', async () => {
      const testCases = [
        { type: 'markdown', expectedContent: '# test\n\nThis is **markdown**' },
        { type: 'json', expectedContent: '{"message":"test"' },
        { type: 'xml', expectedContent: '<?xml version="1.0"?>' },
        { type: 'html', expectedContent: '<html><body><h1>test</h1>' },
        { type: 'code', expectedContent: 'function example()' },
      ];

      for (const testCase of testCases) {
        const result = await server.callTool('text-content-tool', {
          contentType: testCase.type,
          data: 'test',
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const content = result.value.content[0];
          expect(content.type).toBe('text');
          expect(content.text).toContain(testCase.expectedContent);
        }
      }
    });

    it('should handle Unicode and special characters', async () => {
      const result = await server.callTool('text-content-tool', {
        contentType: 'unicode',
        data: 'Test Unicode',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        expect(content.text).toContain('你好'); // Chinese characters
        expect(content.text).toContain('🌍'); // Emoji
        expect(content.text).toContain('αβγ'); // Greek letters
        expect(content.text).toContain('ñiño'); // Accented characters
        expect(content.text).toContain('🎉🚀💻'); // Multiple emojis
      }
    });

    it('should handle text in resource responses', async () => {
      const result = await server.readResource('text://plain/sample.txt');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.contents).toHaveLength(1);
        const content = result.value.contents[0];

        expect(content.uri).toBe('text://plain/sample.txt');
        expect(content.mimeType).toBe('text/plain');
        expect(content).toHaveProperty('text');
        expect(content.text).toContain('plain text sample');
        expect(content.text).toContain('\n'); // Should preserve line breaks
      }
    });

    it('should handle markdown content in resources', async () => {
      const result = await server.readResource('text://markdown/document.md');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.mimeType).toBe('text/markdown');
        expect(content.text).toContain('# Markdown Document');
        expect(content.text).toContain('**Bold text**');
        expect(content.text).toContain('```javascript');
      }
    });
  });

  describe('Image Content Type Compliance', () => {
    it('should handle different image formats', async () => {
      const formats = ['png', 'jpeg', 'gif', 'webp'];

      for (const format of formats) {
        const result = await server.callTool('image-content-tool', {
          format: format,
          description: `Test ${format} image`,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const content = result.value.content[0];
          const imageData = JSON.parse(content.text);

          expect(imageData.type).toBe('image');
          expect(imageData).toHaveProperty('data');
          expect(imageData).toHaveProperty('mimeType', `image/${format}`);
          expect(imageData.data).toBeValidBase64();
          expect(imageData.mimeType).toBeValidMimeType();

          // Should have image metadata
          expect(imageData).toHaveProperty('description');
          expect(imageData.description).toContain(format);
        }
      }
    });

    it('should handle SVG format differently', async () => {
      const result = await server.callTool('image-content-tool', {
        format: 'svg',
        description: 'Test SVG image',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const imageData = JSON.parse(result.value.content[0].text);

        expect(imageData.mimeType).toBe('image/svg');
        expect(imageData.width).toBeUndefined(); // SVG doesn't have fixed dimensions
        expect(imageData.height).toBeUndefined();
      }
    });

    it('should handle image content in prompts', async () => {
      const result = await server.getPrompt('image-analysis-prompt', {
        analysisType: 'object detection',
        includeSample: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const imageMessage = result.value.messages.find((msg: any) => msg.content.type === 'image');

        expect(imageMessage).toBeDefined();
        expect(imageMessage.content).toHaveProperty('data');
        expect(imageMessage.content).toHaveProperty('mimeType', 'image/png');
        expect(imageMessage.content.data).toBeValidBase64();
      }
    });

    it('should handle binary image in resources', async () => {
      const result = await server.readResource('image://png/pixel.png');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.mimeType).toBe('image/png');
        expect(content).toHaveProperty('blob');
        expect(content.blob).toBeValidBase64();
        expect(content).not.toHaveProperty('text');
      }
    });
  });

  describe('Resource Content Type Compliance', () => {
    it('should handle various URI schemes', async () => {
      const schemes = [
        { scheme: 'file', path: 'path/to/file.txt' },
        { scheme: 'https', path: 'example.com/api/data' },
        { scheme: 'ftp', path: 'server.com/files/data.zip' },
        { scheme: 'custom', path: 'domain/resource/123' },
      ];

      for (const { scheme, path } of schemes) {
        const result = await server.callTool('resource-content-tool', {
          scheme: scheme,
          path: path,
          description: `Test ${scheme} resource`,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const resourceData = JSON.parse(result.value.content[0].text);

          expect(resourceData.type).toBe('resource');
          expect(resourceData).toHaveProperty('uri');
          expect(resourceData.uri).toBeValidURI();
          expect(resourceData.uri).toMatch(new RegExp(`^${scheme}:`));
          expect(resourceData).toHaveProperty('description');
          expect(resourceData).toHaveProperty('mimeType');
        }
      }
    });

    it('should handle resource references in prompts', async () => {
      const result = await server.getPrompt('resource-reference-prompt', {
        resourceUri: 'file:///documents/analysis.pdf',
        goal: 'content analysis',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resourceMessage = result.value.messages.find(
          (msg: any) => msg.content.type === 'resource'
        );

        expect(resourceMessage).toBeDefined();
        expect(resourceMessage.content).toHaveProperty('uri');
        expect(resourceMessage.content.uri).toBe('file:///documents/analysis.pdf');
        expect(resourceMessage.content.uri).toBeValidURI();
      }
    });

    it('should validate resource URIs properly', async () => {
      const invalidCases = [
        { scheme: 'ht#tp', path: 'invalid' }, // Invalid scheme characters
        { scheme: '', path: 'path' }, // Empty scheme
        { scheme: '123', path: 'path' }, // Scheme starting with number
      ];

      for (const { scheme, path } of invalidCases) {
        const result = await server.callTool('resource-content-tool', {
          scheme: scheme,
          path: path,
          description: 'Test invalid resource',
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid URI');
        }
      }
    });
  });

  describe('Mixed Content Type Compliance', () => {
    it('should handle multiple content types in single response', async () => {
      const result = await server.callTool('mixed-content-tool', {
        includeText: true,
        includeImage: true,
        includeResource: true,
        baseName: 'mixed-test',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const contents = JSON.parse(result.value.content[0].text);
        expect(Array.isArray(contents)).toBe(true);
        expect(contents).toHaveLength(3);

        // Text content
        const textContent = contents.find((c: any) => c.type === 'text');
        expect(textContent).toBeDefined();
        expect(textContent).toHaveProperty('text');
        AssertionHelpers.expectValidContentType(textContent, 'text');

        // Image content
        const imageContent = contents.find((c: any) => c.type === 'image');
        expect(imageContent).toBeDefined();
        expect(imageContent).toHaveProperty('data');
        expect(imageContent).toHaveProperty('mimeType');
        expect(imageContent.data).toBeValidBase64();

        // Resource content
        const resourceContent = contents.find((c: any) => c.type === 'resource');
        expect(resourceContent).toBeDefined();
        expect(resourceContent).toHaveProperty('uri');
        expect(resourceContent.uri).toBeValidURI();
      }
    });

    it('should handle selective content inclusion', async () => {
      const testCases = [
        { text: true, image: false, resource: false, expectedCount: 1 },
        { text: false, image: true, resource: false, expectedCount: 1 },
        { text: true, image: true, resource: false, expectedCount: 2 },
        { text: false, image: false, resource: true, expectedCount: 1 },
      ];

      for (const testCase of testCases) {
        const result = await server.callTool('mixed-content-tool', {
          includeText: testCase.text,
          includeImage: testCase.image,
          includeResource: testCase.resource,
          baseName: 'selective-test',
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const contents = JSON.parse(result.value.content[0].text);
          expect(contents).toHaveLength(testCase.expectedCount);
        }
      }
    });

    it('should validate empty content combinations', async () => {
      const result = await server.callTool('mixed-content-tool', {
        includeText: false,
        includeImage: false,
        includeResource: false,
        baseName: 'empty-test',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('At least one content type must be included');
      }
    });
  });

  describe('MIME Type Compliance', () => {
    it('should use correct MIME types for different content', async () => {
      const resources = [
        { uri: 'text://plain/sample.txt', expectedMime: 'text/plain' },
        { uri: 'text://markdown/document.md', expectedMime: 'text/markdown' },
        { uri: 'application://json/data.json', expectedMime: 'application/json' },
        { uri: 'application://xml/config.xml', expectedMime: 'application/xml' },
        { uri: 'image://png/pixel.png', expectedMime: 'image/png' },
        { uri: 'application://binary/data.bin', expectedMime: 'application/octet-stream' },
      ];

      for (const { uri, expectedMime } of resources) {
        const result = await server.readResource(uri);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const content = result.value.contents[0];
          expect(content.mimeType).toBe(expectedMime);
          expect(content.mimeType).toBeValidMimeType();
        }
      }
    });

    it('should validate MIME type format', async () => {
      const result = await server.callTool('image-content-tool', {
        format: 'png',
        description: 'MIME type test',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const imageData = JSON.parse(result.value.content[0].text);
        expect(imageData.mimeType).toBeValidMimeType();
        expect(imageData.mimeType).toMatch(/^image\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*$/);
      }
    });
  });

  describe('Content Encoding Compliance', () => {
    it('should properly encode text content', async () => {
      const result = await server.readResource('text://plain/sample.txt');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content).toHaveProperty('text');
        expect(typeof content.text).toBe('string');
        // Should not be base64 encoded for text
        expect(content.text).not.toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
      }
    });

    it('should properly encode binary content as base64', async () => {
      const result = await server.readResource('application://binary/data.bin');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content).toHaveProperty('blob');
        expect(content.blob).toBeValidBase64();
        expect(content).not.toHaveProperty('text');
      }
    });

    it('should handle JSON content properly', async () => {
      const result = await server.readResource('application://json/data.json');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content).toHaveProperty('text');
        expect(() => JSON.parse(content.text)).not.toThrow();

        const jsonData = JSON.parse(content.text);
        expect(jsonData).toHaveProperty('id');
        expect(jsonData).toHaveProperty('name');
        expect(jsonData).toHaveProperty('metadata');
      }
    });
  });

  describe('Content Validation and Security', () => {
    it('should validate content size limits', async () => {
      // Test with very large text content
      const largeText = 'A'.repeat(100000); // 100KB text

      const result = await server.callTool('text-content-tool', {
        contentType: 'plain',
        data: largeText,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        expect(content.text).toHaveLength(largeText.length);
      }
    });

    it('should handle special characters safely', async () => {
      const specialChars = 'Special chars: <>&"\'\\n\\t\\r\u0000\u001f';

      const result = await server.callTool('text-content-tool', {
        contentType: 'plain',
        data: specialChars,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.content[0];
        expect(content.text).toContain('Special chars:');
        // Should preserve special characters
        expect(content.text).toContain('<>&"\'');
      }
    });

    it('should validate base64 encoding integrity', async () => {
      const result = await server.callTool('image-content-tool', {
        format: 'png',
        description: 'Base64 validation test',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const imageData = JSON.parse(result.value.content[0].text);
        expect(imageData.data).toBeValidBase64();

        // Should be able to decode without errors
        expect(() => Buffer.from(imageData.data, 'base64')).not.toThrow();

        // Decoded data should have expected length
        const decoded = Buffer.from(imageData.data, 'base64');
        expect(decoded.length).toBeGreaterThan(0);
      }
    });
  });
});
