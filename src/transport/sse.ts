import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import FastifySSE from 'fastify-sse-v2';
import { Result } from 'neverthrow';
import { MCPServer } from '../core/server.js';
import { createMCPRouter } from '../core/router.js';
import { handleJsonRpcMessage } from '../core/jsonrpc.js';
import { Notification } from '../core/protocol.js';
import { BaseNotificationSender } from '../utils/base-notification-sender.js';
import { safeStringify, normalizeRequestBody } from '../utils/string-conversion.js';

class SSENotificationSender extends BaseNotificationSender {
  private connections: Set<FastifyReply> = new Set();

  constructor() {
    super('SSENotificationSender');
  }

  addConnection(reply: FastifyReply): void {
    this.connections.add(reply);
  }

  removeConnection(reply: FastifyReply): void {
    this.connections.delete(reply);
  }

  async sendNotification(notification: Notification): Promise<Result<void, Error>> {
    return this.safeExecute(async () => {
      const data = safeStringify(notification);
      for (const reply of this.connections) {
        reply.sse({ event: 'notification', data });
      }
    }, 'SSE');
  }
}

export const setupSSE = async (
  app: FastifyInstance,
  server: MCPServer,
  path: string = '/mcp/sse'
) => {
  await app.register(FastifySSE);

  const router = createMCPRouter(server);
  const notificationSender = new SSENotificationSender();
  server.setNotificationSender(notificationSender);

  app.get(path, async (request: FastifyRequest, reply: FastifyReply) => {
    reply.sse({ event: 'connected', data: safeStringify({ status: 'ready' }) });

    notificationSender.addConnection(reply);

    const keepAlive = setInterval(() => {
      reply.sse({ event: 'ping', data: safeStringify({ timestamp: Date.now() }) });
    }, 30000);

    request.socket.on('close', () => {
      clearInterval(keepAlive);
      notificationSender.removeConnection(reply);
    });
  });

  app.post(`${path}/message`, async (request: FastifyRequest, reply: FastifyReply) => {
    const message = normalizeRequestBody(request.body);
    const response = await handleJsonRpcMessage(message, router);
    reply.header('Content-Type', 'application/json');
    return response;
  });
};
