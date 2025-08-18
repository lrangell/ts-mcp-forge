import { MCPServer } from './server.js';

/**
 * Transport interface for MCP servers
 */
export interface Transport {
  start(server: MCPServer): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Builder class for MCP servers that provides a fluent API for configuration
 */
export class ForgeServer<T extends MCPServer> {
  private transport?: Transport;

  constructor(private server: T) {}

  /**
   * Set the transport for the server
   * @param transport The transport to use (StdioTransport, SSETransport, HTTPTransport, etc.)
   */
  setTransport(transport: Transport): this {
    this.transport = transport;
    return this;
  }

  /**
   * Set instructions for the server that will be included in the initialization response
   * @param instructions Instructions describing how to use the server and its features
   */
  setInstructions(instructions: string): this {
    this.server.setInstructions(instructions);
    return this;
  }

  /**
   * Start the server with the configured transport
   * @throws Error if transport is not set
   */
  async start(): Promise<void> {
    if (!this.transport) {
      throw new Error('Transport must be set before starting. Use setTransport() first.');
    }
    await this.transport.start(this.server);
  }

  /**
   * Get access to the underlying server instance
   */
  getServer(): T {
    return this.server;
  }
}