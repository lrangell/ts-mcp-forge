import { FastifyInstance } from 'fastify';
import { MCPServer } from '../core/server.js';
import { setupStreamableHttp } from './streamable-http.js';
import { BaseTransport, BaseTransportOptions } from './base-transport.js';

export interface HTTPTransportOptions extends BaseTransportOptions {}

export class HTTPTransport extends BaseTransport<HTTPTransportOptions> {
  constructor(options: HTTPTransportOptions = {}) {
    super(
      options,
      {
        port: 3000,
        host: 'localhost',
        path: '/mcp',
        cors: true,
      },
      'HTTPTransport'
    );
  }

  protected setupRoutes(app: FastifyInstance, server: MCPServer): void {
    setupStreamableHttp(app, server, this.options.path);
  }
}
