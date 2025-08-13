import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Result } from 'neverthrow';
import { MCPServer } from '../core/server.js';
import { createMCPRouter } from '../core/router.js';
import { handleJsonRpcMessage } from '../core/jsonrpc.js';
import { Notification } from '../core/protocol.js';
import { BaseNotificationSender } from '../utils/base-notification-sender.js';
import { normalizeRequestBody, tryParseJson } from '../utils/string-conversion.js';

class HttpNotificationSender extends BaseNotificationSender {
  private notificationQueue: Notification[] = [];

  constructor() {
    super('HttpNotificationSender');
  }

  async sendNotification(notification: Notification): Promise<Result<void, Error>> {
    return this.safeExecute(async () => {
      this.notificationQueue.push(notification);
    }, 'HTTP');
  }

  getQueuedNotifications(): Notification[] {
    const notifications = [...this.notificationQueue];
    this.notificationQueue = [];
    return notifications;
  }
}

export const setupStreamableHttp = (
  app: FastifyInstance,
  server: MCPServer,
  path: string = '/mcp'
) => {
  const router = createMCPRouter(server);
  const notificationSender = new HttpNotificationSender();
  server.setNotificationSender(notificationSender);

  app.post(path, async (request: FastifyRequest, reply: FastifyReply) => {
    const message = normalizeRequestBody(request.body);
    const response = await handleJsonRpcMessage(message, router);
    reply.header('Content-Type', 'application/json');
    return response;
  });

  app.post(`${path}/batch`, async (request: FastifyRequest, reply: FastifyReply) => {
    const messages = request.body as unknown[];

    if (!Array.isArray(messages)) {
      return reply.code(400).send({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Expected array of messages',
        },
      });
    }

    const responses = await Promise.all(
      messages.map((msg) => handleJsonRpcMessage(normalizeRequestBody(msg), router))
    );

    reply.header('Content-Type', 'application/json');
    return responses.map((r) => tryParseJson(r) ?? r);
  });

  app.get(`${path}/notifications`, async (_request: FastifyRequest, reply: FastifyReply) => {
    const notifications = notificationSender.getQueuedNotifications();
    reply.header('Content-Type', 'application/json');
    return { notifications };
  });
};
