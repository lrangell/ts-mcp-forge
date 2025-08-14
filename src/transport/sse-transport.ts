import { FastifyInstance } from 'fastify';
import { MCPServer } from '../core/server.js';
import { setupSSE } from './sse.js';
import { BaseTransport, BaseTransportOptions } from './base-transport.js';

export interface SSETransportOptions extends BaseTransportOptions {}

export class SSETransport extends BaseTransport<SSETransportOptions> {
  constructor(options: SSETransportOptions = {}) {
    super(
      options,
      {
        port: 3000,
        host: 'localhost',
        path: '/mcp/sse',
        cors: true,
        logLevel: 'silent',
      },
      'SSETransport'
    );
  }

  protected async setupRoutes(app: FastifyInstance, server: MCPServer): Promise<void> {
    await setupSSE(app, server, this.options.path);
  }
}
