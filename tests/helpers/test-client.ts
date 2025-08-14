/**
 * Test client helpers for MCP protocol testing
 */

import { Result, ok, err } from 'neverthrow';
import {
  Request,
  Response,
  Notification,
  InitializeRequest,
  InitializeResponse,
  ToolCallRequest,
  ToolCallResponse,
  ListToolsRequest,
  ListResourcesRequest,
  ListPromptsRequest,
  CompletionRequest,
  CompletionResponse,
} from '../../src/core/protocol.js';
import { McpError } from '../../src/index.js';
import { createMCPRouter } from '../../src/core/router.js';

export interface MockTransport {
  send(message: Request | Notification): Promise<Result<any, McpError>>;
  onNotification(callback: (notification: Notification) => void): void;
  close(): Promise<void>;
}

/**
 * Mock client for testing MCP server implementations
 */
export class TestMCPClient {
  private messageId = 0;
  private responseHandlers = new Map<number, (response: any) => void>();
  private notificationHandlers: ((notification: Notification) => void)[] = [];
  private isInitialized = false;

  constructor(private transport: MockTransport) {
    this.transport.onNotification((notification) => {
      this.notificationHandlers.forEach((handler) => handler(notification));
    });
  }

  /**
   * Initialize the MCP session
   */
  async initialize(clientInfo?: {
    name: string;
    version?: string;
  }): Promise<Result<InitializeResponse, McpError>> {
    const request: InitializeRequest = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {
          roots: {
            listChanged: true,
          },
          sampling: {},
        },
        clientInfo: clientInfo || { name: 'Test Client', version: '1.0.0' },
      },
    };

    const result = await this.transport.send(request);
    if (result.isOk()) {
      this.isInitialized = true;
    }
    return result;
  }

  /**
   * List available tools
   */
  async listTools(cursor?: string): Promise<Result<any, McpError>> {
    this.ensureInitialized();

    const request: ListToolsRequest = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'tools/list',
      params: cursor ? { cursor } : {},
    };

    return this.transport.send(request);
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args?: any): Promise<Result<ToolCallResponse, McpError>> {
    this.ensureInitialized();

    const request: ToolCallRequest = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    return this.transport.send(request);
  }

  /**
   * List available resources
   */
  async listResources(cursor?: string): Promise<Result<any, McpError>> {
    this.ensureInitialized();

    const request: ListResourcesRequest = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'resources/list',
      params: cursor ? { cursor } : {},
    };

    return this.transport.send(request);
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<Result<any, McpError>> {
    this.ensureInitialized();

    const request: Request = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'resources/read',
      params: { uri },
    };

    return this.transport.send(request);
  }

  /**
   * Subscribe to a resource
   */
  async subscribeToResource(uri: string): Promise<Result<any, McpError>> {
    this.ensureInitialized();

    const request: Request = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'resources/subscribe',
      params: { uri },
    };

    return this.transport.send(request);
  }

  /**
   * Unsubscribe from a resource
   */
  async unsubscribeFromResource(uri: string): Promise<Result<any, McpError>> {
    this.ensureInitialized();

    const request: Request = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'resources/unsubscribe',
      params: { uri },
    };

    return this.transport.send(request);
  }

  /**
   * List resource templates
   */
  async listResourceTemplates(): Promise<Result<any, McpError>> {
    this.ensureInitialized();

    const request: Request = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'resources/templates/list',
      params: {},
    };

    return this.transport.send(request);
  }

  /**
   * List available prompts
   */
  async listPrompts(cursor?: string): Promise<Result<any, McpError>> {
    this.ensureInitialized();

    const request: ListPromptsRequest = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'prompts/list',
      params: cursor ? { cursor } : {},
    };

    return this.transport.send(request);
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, args?: any): Promise<Result<any, McpError>> {
    this.ensureInitialized();

    const request: Request = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'prompts/get',
      params: {
        name,
        arguments: args,
      },
    };

    return this.transport.send(request);
  }

  /**
   * Get completion suggestions
   */
  async getCompletion(
    ref: { type: 'ref/resource' | 'ref/prompt'; uri?: string; name?: string },
    argument: { name: string; value: string }
  ): Promise<Result<CompletionResponse, McpError>> {
    this.ensureInitialized();

    const request: CompletionRequest = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'completion/complete',
      params: {
        ref,
        argument,
      },
    };

    return this.transport.send(request);
  }

  /**
   * Send a notification (no response expected)
   */
  async sendNotification(method: string, params?: any): Promise<void> {
    const notification: Notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    await this.transport.send(notification);
  }

  /**
   * Register a handler for notifications
   */
  onNotification(handler: (notification: Notification) => void): void {
    this.notificationHandlers.push(handler);
  }

  /**
   * Send a custom request
   */
  async sendRequest(method: string, params?: any): Promise<Result<any, McpError>> {
    const request: Request = {
      jsonrpc: '2.0',
      id: this.nextId(),
      method,
      params,
    };

    return this.transport.send(request);
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    await this.transport.close();
  }

  private nextId(): number {
    return ++this.messageId;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Client must be initialized before making requests');
    }
  }
}

/**
 * In-memory transport for testing
 */
export class InMemoryTransport implements MockTransport {
  private notificationCallback?: (notification: Notification) => void;
  private requestHandler?: (request: Request) => Promise<Result<any, McpError>>;

  constructor(requestHandler: (request: Request) => Promise<Result<any, McpError>>) {
    this.requestHandler = requestHandler;
  }

  async send(message: Request | Notification): Promise<Result<any, McpError>> {
    if ('id' in message) {
      // It's a request
      return this.requestHandler!(message as Request);
    } else {
      // It's a notification
      if (this.notificationCallback) {
        this.notificationCallback(message as Notification);
      }
      return ok(undefined);
    }
  }

  onNotification(callback: (notification: Notification) => void): void {
    this.notificationCallback = callback;
  }

  async close(): Promise<void> {
    // No-op for in-memory transport
  }

  /**
   * Simulate receiving a notification from the server
   */
  simulateNotification(notification: Notification): void {
    if (this.notificationCallback) {
      this.notificationCallback(notification);
    }
  }
}

/**
 * Create a test client connected to a server instance
 */
export function createTestClient(server: any): TestMCPClient {
  const router = createMCPRouter(server);

  const transport = new InMemoryTransport(async (request: Request) => {
    try {
      const result = await router(request.method, request.params, request.id);
      return result;
    } catch (error) {
      return err(new McpError(-32603, 'Internal error', error));
    }
  });

  // Set up notification sender to send notifications through the transport
  server.setNotificationSender({
    async sendNotification(notification: Notification): Promise<Result<void, Error>> {
      transport.simulateNotification(notification);
      return ok(undefined);
    },
  });

  return new TestMCPClient(transport);
}

/**
 * Utility functions for test assertions
 */
export const TestAssertions = {
  /**
   * Assert that a response follows the MCP protocol format
   */
  assertValidMCPResponse(response: any): void {
    if (!response || typeof response !== 'object') {
      throw new Error('Response must be an object');
    }
  },

  /**
   * Assert that a tool response is valid
   */
  assertValidToolResponse(response: any): void {
    if (!response.content || !Array.isArray(response.content)) {
      throw new Error('Tool response must have a content array');
    }

    response.content.forEach((item: any, index: number) => {
      if (!item.type || !['text', 'image', 'resource'].includes(item.type)) {
        throw new Error(`Invalid content type at index ${index}: ${item.type}`);
      }

      switch (item.type) {
        case 'text':
          if (typeof item.text !== 'string') {
            throw new Error(`Text content must have a string 'text' field at index ${index}`);
          }
          break;
        case 'image':
          if (typeof item.data !== 'string' || typeof item.mimeType !== 'string') {
            throw new Error(
              `Image content must have 'data' and 'mimeType' fields at index ${index}`
            );
          }
          break;
        case 'resource':
          if (typeof item.uri !== 'string') {
            throw new Error(`Resource content must have a 'uri' field at index ${index}`);
          }
          break;
      }
    });
  },

  /**
   * Assert that a resource response is valid
   */
  assertValidResourceResponse(response: any): void {
    if (!response.contents || !Array.isArray(response.contents)) {
      throw new Error('Resource response must have a contents array');
    }

    response.contents.forEach((item: any, index: number) => {
      if (typeof item.uri !== 'string') {
        throw new Error(`Resource content must have a 'uri' field at index ${index}`);
      }

      if (typeof item.mimeType !== 'string') {
        throw new Error(`Resource content must have a 'mimeType' field at index ${index}`);
      }

      if (!item.text && !item.blob) {
        throw new Error(
          `Resource content must have either 'text' or 'blob' field at index ${index}`
        );
      }
    });
  },

  /**
   * Assert that a prompt response is valid
   */
  assertValidPromptResponse(response: any): void {
    if (!response.messages || !Array.isArray(response.messages)) {
      throw new Error('Prompt response must have a messages array');
    }

    response.messages.forEach((message: any, index: number) => {
      if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
        throw new Error(`Invalid message role at index ${index}: ${message.role}`);
      }

      if (!message.content) {
        throw new Error(`Message must have content at index ${index}`);
      }
    });
  },

  /**
   * Assert that a completion response is valid
   */
  assertValidCompletionResponse(response: any): void {
    if (!response.completion) {
      throw new Error('Completion response must have a completion field');
    }

    const completion = response.completion;

    if (!completion.values || !Array.isArray(completion.values)) {
      throw new Error('Completion must have a values array');
    }

    if (completion.values.length > 100) {
      throw new Error('Completion values array must not exceed 100 items');
    }

    completion.values.forEach((value: any, index: number) => {
      if (typeof value !== 'string') {
        throw new Error(`Completion value at index ${index} must be a string`);
      }
    });

    if (completion.total !== undefined && typeof completion.total !== 'number') {
      throw new Error('Completion total must be a number');
    }

    if (completion.hasMore !== undefined && typeof completion.hasMore !== 'boolean') {
      throw new Error('Completion hasMore must be a boolean');
    }
  },
};
