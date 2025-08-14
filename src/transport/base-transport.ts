import Fastify, { FastifyInstance } from 'fastify';
import FastifyCors from '@fastify/cors';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../core/server.js';
import { Logger } from '../utils/logger.js';

export interface BaseTransportOptions {
  port?: number;
  host?: string;
  path?: string;
  cors?: boolean | object;
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

export abstract class BaseTransport<T extends BaseTransportOptions = BaseTransportOptions> {
  protected app: FastifyInstance | null = null;
  protected options: T;
  protected logger: Logger;

  constructor(options: T, defaults: Required<T>, loggerName: string) {
    this.options = { ...defaults, ...options };
    this.logger = new Logger(loggerName);
  }

  protected async createFastifyApp(): Promise<FastifyInstance> {
    const logLevel = this.options.logLevel || process.env.LOG_LEVEL || 'silent';

    const app = Fastify({
      logger:
        logLevel !== 'silent'
          ? {
              level: logLevel,
              transport: {
                target: '@fastify/one-line-logger',
              },
            }
          : false,
    });

    if (this.options.cors) {
      await app.register(
        FastifyCors,
        typeof this.options.cors === 'object' ? this.options.cors : {}
      );
    }

    return app;
  }

  protected abstract setupRoutes(app: FastifyInstance, server: MCPServer): void | Promise<void>;

  async start(server: MCPServer): Promise<Result<void, Error>> {
    return await this.startInternal(server)
      .then(() => ok(undefined))
      .catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to start server:`, error);
        return err(new Error(`Failed to start server: ${errorMessage}`));
      });
  }

  private async startInternal(server: MCPServer): Promise<void> {
    this.app = await this.createFastifyApp();
    await this.setupRoutes(this.app, server);

    await this.app.listen({
      port: this.options.port!,
      host: this.options.host!,
    });

    this.logger.info(
      `Server listening on http://${this.options.host}:${this.options.port}${this.options.path}`
    );
  }

  async stop(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.app = null;
    }
  }
}
