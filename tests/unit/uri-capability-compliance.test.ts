/**
 * URI Validation and Capability Declaration Compliance Tests
 * Ensures URI validation and capability declarations follow MCP specification 2025-06-18
 */

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
} from '../../src/decorators/index.js';
import { createMCPRouter } from '../../src/core/router.js';
import { setupMCPAssertions } from '../helpers/assertions.js';

// Setup custom assertions
setupMCPAssertions();

class URICapabilityComplianceServer extends MCPServer {
  constructor() {
    super('URI Capability Compliance Server', '1.0.0');
  }

  // Resources with various URI schemes
  @Resource('file:///absolute/path/to/file.txt', 'Absolute file path', 'text/plain')
  getAbsoluteFile(): Result<string, string> {
    return ok('Content from absolute file path');
  }

  @Resource('file://server/shared/file.txt', 'Network file path', 'text/plain')
  getNetworkFile(): Result<string, string> {
    return ok('Content from network file');
  }

  @Resource('https://api.example.com/v1/data', 'HTTPS API endpoint', 'application/json')
  getHttpsData(): Result<object, string> {
    return ok({ api: 'data', version: 'v1', secure: true });
  }

  @Resource('http://legacy.example.com/data', 'HTTP API endpoint', 'application/json')
  getHttpData(): Result<object, string> {
    return ok({ api: 'data', legacy: true, secure: false });
  }

  @Resource('ftp://files.example.com/public/data.zip', 'FTP file resource', 'application/zip')
  getFtpFile(): Result<string, string> {
    return ok('UEsDBBQAAAAA'); // ZIP file header in base64
  }

  @Resource('git://repo.example.com/project.git', 'Git repository', 'application/x-git')
  getGitRepo(): Result<object, string> {
    return ok({ type: 'git', url: 'git://repo.example.com/project.git', branch: 'main' });
  }

  @Resource('custom://domain/resource/123', 'Custom scheme resource', 'application/custom')
  getCustomResource(): Result<object, string> {
    return ok({ scheme: 'custom', domain: 'domain', id: 123 });
  }

  @Resource('urn:isbn:978-0-123456-78-9', 'URN resource', 'text/plain')
  getUrnResource(): Result<string, string> {
    return ok('Book metadata for ISBN 978-0-123456-78-9');
  }

  @Resource('data:text/plain;base64,SGVsbG8gV29ybGQ=', 'Data URI', 'text/plain')
  getDataUri(): Result<string, string> {
    return ok('Hello World'); // Decoded from base64
  }

  @Resource('mailto:support@example.com', 'Email resource', 'message/rfc822')
  getMailtoResource(): Result<object, string> {
    return ok({ type: 'email', address: 'support@example.com' });
  }

  @Resource('tel:+1-555-123-4567', 'Phone number resource', 'text/plain')
  getTelResource(): Result<string, string> {
    return ok('Phone number: +1-555-123-4567');
  }

  // Dynamic resources for URI testing
  @DynamicResource('Register resources with various URI patterns')
  registerUriResources(): void {
    const uriPatterns = [
      { uri: 'memory://cache/session-123', data: { session: '123', type: 'memory' } },
      { uri: 'database://localhost/users/456', data: { user: '456', type: 'database' } },
      { uri: 'queue://messages/pending', data: { queue: 'pending', type: 'messages' } },
      { uri: 'stream://events/live', data: { stream: 'live', type: 'events' } },
      { uri: 'blob://storage/container/file.dat', data: { container: 'container', type: 'blob' } },
    ];

    uriPatterns.forEach(({ uri, data }) => {
      this.registerResource(
        uri,
        async () => ok(data),
        `Dynamic resource: ${uri}`,
        false,
        'application/json'
      );
    });
  }

  // Tools that work with URIs
  @Tool('uri-validator', 'Validates URI format and accessibility')
  validateUri(@Param('URI to validate') uri: string): Result<object, string> {
    if (!uri) {
      return err('URI is required');
    }

    // Standard schemes that should be classified as 'standard'
    const standardSchemes = ['http', 'https', 'ftp', 'file', 'git', 'urn', 'data', 'mailto', 'tel'];

    try {
      // Try standard URL parsing
      const url = new URL(uri);
      const scheme = url.protocol.slice(0, -1);

      // Check if it's a standard scheme or custom
      const isStandardScheme = standardSchemes.includes(scheme);

      return ok({
        valid: true,
        scheme: scheme,
        host: url.hostname || null,
        port: url.port || null,
        path: url.pathname,
        query: url.search,
        fragment: url.hash,
        type: isStandardScheme ? 'standard' : 'custom',
      });
    } catch {
      // Check for custom URI schemes
      const customMatch = uri.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$/);
      if (customMatch) {
        return ok({
          valid: true,
          scheme: customMatch[1],
          path: customMatch[2],
          type: 'custom',
        });
      }

      return err(`Invalid URI format: ${uri}`);
    }
  }

  @Tool('resource-fetcher', 'Fetches content from various URI schemes')
  fetchResource(@Param('Resource URI') uri: string): Result<object, string> {
    if (!uri) {
      return err('URI is required');
    }

    // Validate URI format first
    if (!this.isValidUri(uri)) {
      return err(`Invalid URI format: ${uri}`);
    }

    const scheme = uri.split(':')[0].toLowerCase();

    return ok({
      uri: uri,
      scheme: scheme,
      accessible: this.isSchemeSupported(scheme),
      timestamp: new Date().toISOString(),
      metadata: this.getSchemeMetadata(scheme),
    });
  }

  // Prompts with URI references
  @Prompt('document-analysis', 'Analyze document from URI')
  documentAnalysisPrompt(
    @Param('Document URI') documentUri: string,
    @Param('Analysis type') analysisType: string
  ): Result<object, string> {
    if (!documentUri || !analysisType) {
      return err('Document URI and analysis type are required');
    }

    if (!this.isValidUri(documentUri)) {
      return err(`Invalid document URI: ${documentUri}`);
    }

    return ok({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please perform ${analysisType} analysis on the following document:`,
          },
        },
        {
          role: 'user' as const,
          content: {
            type: 'resource' as const,
            uri: documentUri,
          },
        },
      ],
    });
  }

  private isValidUri(uri: string): boolean {
    try {
      new URL(uri);
      return true;
    } catch {
      // Check custom scheme format
      return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(uri);
    }
  }

  private isSchemeSupported(scheme: string): boolean {
    const supportedSchemes = [
      'file',
      'https',
      'http',
      'ftp',
      'git',
      'custom',
      'urn',
      'data',
      'mailto',
      'tel',
      'memory',
      'database',
      'queue',
      'stream',
      'blob',
    ];
    return supportedSchemes.includes(scheme);
  }

  private getSchemeMetadata(scheme: string): object {
    const metadata: Record<string, object> = {
      file: { category: 'filesystem', security: 'local' },
      https: { category: 'web', security: 'encrypted' },
      http: { category: 'web', security: 'plain' },
      ftp: { category: 'file-transfer', security: 'plain' },
      git: { category: 'version-control', security: 'depends' },
      custom: { category: 'application-specific', security: 'unknown' },
      urn: { category: 'identifier', security: 'none' },
      data: { category: 'embedded', security: 'none' },
      mailto: { category: 'communication', security: 'none' },
      tel: { category: 'communication', security: 'none' },
    };
    return metadata[scheme] || { category: 'unknown', security: 'unknown' };
  }
}

// Servers for capability testing
class FullCapabilityServer extends MCPServer {
  constructor() {
    super('Full Capability Server', '1.0.0');
  }

  @Tool('full-tool', 'Tool in full capability server')
  fullTool(): Result<string, string> {
    return ok('Full tool response');
  }

  @Resource('file:///full/resource.txt', 'Resource in full capability server', 'text/plain')
  fullResource(): Result<string, string> {
    return ok('Full resource content');
  }

  @Prompt('full-prompt', 'Prompt in full capability server')
  fullPrompt(): Result<object, string> {
    return ok({
      messages: [
        {
          role: 'user' as const,
          content: { type: 'text' as const, text: 'Full prompt message' },
        },
      ],
    });
  }

  @DynamicResource('Register dynamic resources')
  registerResources(): void {
    this.registerResource('dynamic://resource', async () => ok({}), 'Dynamic resource', true);
  }

  @DynamicPrompt('Register dynamic prompts')
  registerPrompts(): void {
    this.registerPrompt('dynamic-prompt', async () => ok({ messages: [] }), 'Dynamic prompt');
  }
}

class ToolsOnlyServer extends MCPServer {
  constructor() {
    super('Tools Only Server', '1.0.0');
  }

  @Tool('tools-only', 'Tool in tools-only server')
  toolsOnly(): Result<string, string> {
    return ok('Tools only response');
  }
}

class ResourcesOnlyServer extends MCPServer {
  constructor() {
    super('Resources Only Server', '1.0.0');
  }

  @Resource('file:///resources/only.txt', 'Resource in resources-only server', 'text/plain')
  resourcesOnly(): Result<string, string> {
    return ok('Resources only content');
  }
}

class PromptsOnlyServer extends MCPServer {
  constructor() {
    super('Prompts Only Server', '1.0.0');
  }

  @Prompt('prompts-only', 'Prompt in prompts-only server')
  promptsOnly(): Result<object, string> {
    return ok({
      messages: [
        {
          role: 'user' as const,
          content: { type: 'text' as const, text: 'Prompts only message' },
        },
      ],
    });
  }
}

class EmptyServer extends MCPServer {
  constructor() {
    super('Empty Server', '1.0.0');
  }
}

describe('URI Validation Compliance', () => {
  let server: URICapabilityComplianceServer;
  let router: ReturnType<typeof createMCPRouter>;

  beforeEach(() => {
    server = new URICapabilityComplianceServer();
    router = createMCPRouter(server);
  });

  describe('Standard URI Schemes', () => {
    it('should validate file:// scheme URIs', async () => {
      const fileUris = ['file:///absolute/path/to/file.txt', 'file://server/shared/file.txt'];

      for (const uri of fileUris) {
        const result = await server.readResource(uri);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const content = result.value.contents[0];
          expect(content.uri).toBe(uri);
          expect(content.uri).toBeValidURI();
          expect(content.uri).toMatch(/^file:\/\//);
        }
      }
    });

    it('should validate https:// scheme URIs', async () => {
      const result = await server.readResource('https://api.example.com/v1/data');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.uri).toBeValidURI();
        expect(content.uri).toMatch(/^https:\/\//);
        expect(content.mimeType).toBe('application/json');
      }
    });

    it('should validate http:// scheme URIs', async () => {
      const result = await server.readResource('http://legacy.example.com/data');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.uri).toBeValidURI();
        expect(content.uri).toMatch(/^http:\/\//);
      }
    });

    it('should validate ftp:// scheme URIs', async () => {
      const result = await server.readResource('ftp://files.example.com/public/data.zip');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.uri).toBeValidURI();
        expect(content.uri).toMatch(/^ftp:\/\//);
        expect(content.mimeType).toBe('application/zip');
      }
    });

    it('should validate git:// scheme URIs', async () => {
      const result = await server.readResource('git://repo.example.com/project.git');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.uri).toBeValidURI();
        expect(content.uri).toMatch(/^git:\/\//);
      }
    });
  });

  describe('Custom URI Schemes', () => {
    it('should validate custom scheme URIs', async () => {
      const customUris = [
        'custom://domain/resource/123',
        'memory://cache/session-123',
        'database://localhost/users/456',
        'queue://messages/pending',
        'stream://events/live',
        'blob://storage/container/file.dat',
      ];

      for (const uri of customUris) {
        expect(uri).toBeValidURI();

        // Test if scheme follows RFC 3986 format
        expect(uri).toMatch(/^[a-zA-Z][a-zA-Z0-9+.-]*:/);
      }
    });

    it('should handle URN scheme properly', async () => {
      const result = await server.readResource('urn:isbn:978-0-123456-78-9');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.uri).toBeValidURI();
        expect(content.uri).toMatch(/^urn:/);
      }
    });

    it('should handle data URI scheme', async () => {
      const result = await server.readResource('data:text/plain;base64,SGVsbG8gV29ybGQ=');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const content = result.value.contents[0];
        expect(content.uri).toBeValidURI();
        expect(content.uri).toMatch(/^data:/);
      }
    });

    it('should handle communication schemes', async () => {
      const communicationUris = ['mailto:support@example.com', 'tel:+1-555-123-4567'];

      for (const uri of communicationUris) {
        const result = await server.readResource(uri);
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const content = result.value.contents[0];
          expect(content.uri).toBeValidURI();
        }
      }
    });
  });

  describe('URI Validation Tool', () => {
    it('should validate standard URLs correctly', async () => {
      const testUris = [
        'https://example.com/path',
        'http://localhost:8080/api',
        'ftp://server.com/files',
        'file:///absolute/path',
      ];

      for (const uri of testUris) {
        const result = await server.callTool('uri-validator', { uri });
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const validation = JSON.parse(result.value.content[0].text);
          expect(validation.valid).toBe(true);
          expect(validation.type).toBe('standard');
          expect(validation).toHaveProperty('scheme');
          expect(validation).toHaveProperty('host');
        }
      }
    });

    it('should validate custom scheme URIs correctly', async () => {
      const customUris = ['custom://domain/path', 'memory://cache/key', 'database://host/table'];

      for (const uri of customUris) {
        const result = await server.callTool('uri-validator', { uri });
        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const validation = JSON.parse(result.value.content[0].text);
          expect(validation.valid).toBe(true);
          expect(validation.type).toBe('custom');
          expect(validation).toHaveProperty('scheme');
          expect(validation).toHaveProperty('path');
        }
      }
    });

    it('should reject invalid URIs', async () => {
      const invalidUris = [
        'not-a-uri',
        '://missing-scheme',
        'ht tp://spaces-in-scheme',
        '123://numeric-scheme-start',
      ];

      for (const uri of invalidUris) {
        const result = await server.callTool('uri-validator', { uri });
        expect(result.isErr()).toBe(true);

        if (result.isErr()) {
          expect(result.error.message).toContain('Invalid URI format');
        }
      }
    });
  });

  describe('URI Usage in Prompts', () => {
    it('should handle URI references in prompt content', async () => {
      const result = await server.getPrompt('document-analysis', {
        documentUri: 'file:///documents/report.pdf',
        analysisType: 'content extraction',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const resourceMessage = result.value.messages.find(
          (msg: any) => msg.content.type === 'resource'
        );

        expect(resourceMessage).toBeDefined();
        expect(resourceMessage.content.uri).toBe('file:///documents/report.pdf');
        expect(resourceMessage.content.uri).toBeValidURI();
      }
    });

    it('should validate URIs in prompt parameters', async () => {
      const result = await server.getPrompt('document-analysis', {
        documentUri: 'invalid-uri-format',
        analysisType: 'analysis',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid document URI');
      }
    });
  });

  describe('Resource Fetcher Tool', () => {
    it('should handle various URI schemes', async () => {
      const schemes = ['file', 'https', 'custom', 'memory', 'database'];

      for (const scheme of schemes) {
        const uri = `${scheme}://example/path`;
        const result = await server.callTool('resource-fetcher', { uri });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const fetchResult = JSON.parse(result.value.content[0].text);
          expect(fetchResult.uri).toBe(uri);
          expect(fetchResult.scheme).toBe(scheme);
          expect(fetchResult).toHaveProperty('accessible');
          expect(fetchResult).toHaveProperty('metadata');
        }
      }
    });

    it('should provide scheme metadata', async () => {
      const result = await server.callTool('resource-fetcher', {
        uri: 'https://secure.example.com/api',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const fetchResult = JSON.parse(result.value.content[0].text);
        expect(fetchResult.metadata).toHaveProperty('category', 'web');
        expect(fetchResult.metadata).toHaveProperty('security', 'encrypted');
      }
    });
  });
});

describe('Capability Declaration Compliance', () => {
  describe('Full Capability Server', () => {
    it('should declare all capabilities when features are present', () => {
      const server = new FullCapabilityServer();
      const response = server.handleInitialize();

      expect(response.protocolVersion).toBe('2025-06-18');
      expect(response).toBeValidInitializeResponse();

      // Should declare tools capability
      expect(response.capabilities).toHaveProperty('tools');
      expect(response.capabilities.tools).toEqual({});

      // Should declare resources capability
      expect(response.capabilities).toHaveProperty('resources');
      expect(typeof response.capabilities.resources).toBe('object');

      // Should declare prompts capability
      expect(response.capabilities).toHaveProperty('prompts');
      expect(typeof response.capabilities.prompts).toBe('object');
    });

    it('should support optional capability features', () => {
      const server = new FullCapabilityServer();
      const response = server.handleInitialize();

      // Resources capability with optional features
      if (response.capabilities.resources) {
        // subscribe feature (optional)
        if (response.capabilities.resources.subscribe !== undefined) {
          expect(typeof response.capabilities.resources.subscribe).toBe('boolean');
        }

        // listChanged feature (optional)
        if (response.capabilities.resources.listChanged !== undefined) {
          expect(typeof response.capabilities.resources.listChanged).toBe('boolean');
        }
      }

      // Prompts capability with optional features
      if (response.capabilities.prompts) {
        // listChanged feature (optional)
        if (response.capabilities.prompts.listChanged !== undefined) {
          expect(typeof response.capabilities.prompts.listChanged).toBe('boolean');
        }
      }
    });
  });

  describe('Selective Capability Servers', () => {
    it('should declare only tools capability for tools-only server', () => {
      const server = new ToolsOnlyServer();
      const response = server.handleInitialize();

      expect(response.capabilities).toHaveProperty('tools');
      expect(response.capabilities.resources).toBeUndefined();
      expect(response.capabilities.prompts).toBeUndefined();
    });

    it('should declare only resources capability for resources-only server', () => {
      const server = new ResourcesOnlyServer();
      const response = server.handleInitialize();

      expect(response.capabilities).toHaveProperty('resources');
      expect(response.capabilities.tools).toBeUndefined();
      expect(response.capabilities.prompts).toBeUndefined();
    });

    it('should declare only prompts capability for prompts-only server', () => {
      const server = new PromptsOnlyServer();
      const response = server.handleInitialize();

      expect(response.capabilities).toHaveProperty('prompts');
      expect(response.capabilities.tools).toBeUndefined();
      expect(response.capabilities.resources).toBeUndefined();
    });

    it('should declare no capabilities for empty server', () => {
      const server = new EmptyServer();
      const response = server.handleInitialize();

      expect(response.capabilities.tools).toBeUndefined();
      expect(response.capabilities.resources).toBeUndefined();
      expect(response.capabilities.prompts).toBeUndefined();
    });
  });

  describe('Capability-Method Consistency', () => {
    it('should only support declared capabilities', async () => {
      const toolsOnlyServer = new ToolsOnlyServer();
      const router = createMCPRouter(toolsOnlyServer);

      // Tools should work
      const toolsResult = await router('tools/list', {}, 1);
      expect(toolsResult.isOk()).toBe(true);

      // Resources should not work (not declared)
      const resourcesResult = await router('resources/list', {}, 2);
      expect(resourcesResult.isErr()).toBe(true);
      if (resourcesResult.isErr()) {
        expect(resourcesResult.error.code).toBe(-32601); // Method not found
      }

      // Prompts should not work (not declared)
      const promptsResult = await router('prompts/list', {}, 3);
      expect(promptsResult.isErr()).toBe(true);
      if (promptsResult.isErr()) {
        expect(promptsResult.error.code).toBe(-32601); // Method not found
      }
    });

    it('should support all methods for full capability server', async () => {
      const fullServer = new FullCapabilityServer();
      const router = createMCPRouter(fullServer);

      const methods = ['tools/list', 'resources/list', 'prompts/list'];

      for (const method of methods) {
        const result = await router(method, {}, 1);
        expect(result.isOk()).toBe(true);
      }
    });
  });

  describe('Capability Feature Negotiation', () => {
    it('should handle resource subscription capability', () => {
      const server = new FullCapabilityServer();
      const response = server.handleInitialize();

      if (response.capabilities.resources?.subscribe) {
        // If subscribe capability is declared, server should support subscription methods
        expect(typeof response.capabilities.resources.subscribe).toBe('boolean');
      }
    });

    it('should handle list change notification capability', () => {
      const server = new FullCapabilityServer();
      const response = server.handleInitialize();

      // Check resources listChanged capability
      if (response.capabilities.resources?.listChanged) {
        expect(typeof response.capabilities.resources.listChanged).toBe('boolean');
      }

      // Check prompts listChanged capability
      if (response.capabilities.prompts?.listChanged) {
        expect(typeof response.capabilities.prompts.listChanged).toBe('boolean');
      }

      // Tools don't typically have listChanged in the spec
      if (response.capabilities.tools?.listChanged !== undefined) {
        expect(typeof response.capabilities.tools.listChanged).toBe('boolean');
      }
    });

    it('should handle completion capability', () => {
      const server = new FullCapabilityServer();
      const response = server.handleInitialize();

      if (response.capabilities.completion !== undefined) {
        expect(typeof response.capabilities.completion).toBe('object');
      }
    });

    it('should not declare unsupported capabilities', () => {
      const server = new EmptyServer();
      const response = server.handleInitialize();

      // Should not have any capabilities for empty server
      expect(Object.keys(response.capabilities)).toHaveLength(0);
    });
  });

  describe('Protocol Version Consistency', () => {
    it('should use consistent protocol version across all server types', () => {
      const servers = [
        new FullCapabilityServer(),
        new ToolsOnlyServer(),
        new ResourcesOnlyServer(),
        new PromptsOnlyServer(),
        new EmptyServer(),
      ];

      servers.forEach((server) => {
        const response = server.handleInitialize();
        expect(response.protocolVersion).toBe('2025-06-18');
      });
    });

    it('should maintain capability structure format', () => {
      const server = new FullCapabilityServer();
      const response = server.handleInitialize();

      expect(response).toHaveProperty('capabilities');
      expect(typeof response.capabilities).toBe('object');
      expect(response.capabilities).not.toBeNull();

      // Each capability should be an object
      Object.values(response.capabilities).forEach((capability) => {
        expect(typeof capability).toBe('object');
        expect(capability).not.toBeNull();
      });
    });
  });
});
