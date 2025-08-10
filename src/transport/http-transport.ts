import Fastify, { FastifyInstance } from 'fastify';
import FastifyCors from '@fastify/cors';
import { MCPServer } from '../core/server.js';
import { setupStreamableHttp } from './streamable-http.js';

export interface HTTPTransportOptions {
  port?: number;
  host?: string;
  path?: string;
  cors?: boolean | object;
}

export class HTTPTransport {
  private app: FastifyInstance | null = null;
  private options: HTTPTransportOptions;

  constructor(options: HTTPTransportOptions = {}) {
    this.options = {
      port: options.port ?? 3000,
      host: options.host ?? 'localhost',
      path: options.path ?? '/mcp',
      cors: options.cors ?? true,
    };
  }

  async start(server: MCPServer): Promise<void> {
    this.app = Fastify({
      logger: process.env.LOG_LEVEL === 'debug',
    });

    // Register CORS if enabled
    if (this.options.cors) {
      await this.app.register(FastifyCors, 
        typeof this.options.cors === 'object' ? this.options.cors : {}
      );
    }

    // Setup HTTP routes
    setupStreamableHttp(this.app, server, this.options.path);

    // Start the server
    try {
      await this.app.listen({
        port: this.options.port!,
        host: this.options.host!,
      });
      console.log(`HTTP MCP Server listening on http://${this.options.host}:${this.options.port}${this.options.path}`);
    } catch (error) {
      console.error('Failed to start HTTP server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.app = null;
    }
  }
}