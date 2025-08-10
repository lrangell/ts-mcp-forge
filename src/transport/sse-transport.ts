import Fastify, { FastifyInstance } from 'fastify';
import FastifyCors from '@fastify/cors';
import { MCPServer } from '../core/server.js';
import { setupSSE } from './sse.js';

export interface SSETransportOptions {
  port?: number;
  host?: string;
  path?: string;
  cors?: boolean | object;
}

export class SSETransport {
  private app: FastifyInstance | null = null;
  private options: SSETransportOptions;

  constructor(options: SSETransportOptions = {}) {
    this.options = {
      port: options.port ?? 3000,
      host: options.host ?? 'localhost',
      path: options.path ?? '/mcp/sse',
      cors: options.cors ?? true,
    };
  }

  async start(server: MCPServer): Promise<void> {
    this.app = Fastify({
      logger: process.env.LOG_LEVEL === 'debug',
    });

    if (this.options.cors) {
      await this.app.register(
        FastifyCors,
        typeof this.options.cors === 'object' ? this.options.cors : {}
      );
    }

    await setupSSE(this.app, server, this.options.path);

    try {
      await this.app.listen({
        port: this.options.port!,
        host: this.options.host!,
      });
      console.log(
        `SSE MCP Server listening on http://${this.options.host}:${this.options.port}${this.options.path}`
      );
    } catch (error) {
      console.error('Failed to start SSE server:', error);
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

