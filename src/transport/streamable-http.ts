import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MCPServer } from '../core/server.js';
import { createMCPRouter } from '../core/router.js';
import { handleJsonRpcMessage } from '../core/jsonrpc.js';

export const setupStreamableHttp = (
  app: FastifyInstance,
  server: MCPServer,
  path: string = '/mcp'
) => {
  const router = createMCPRouter(server);

  app.post(path, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as string | object;
    const message = typeof body === 'string' ? body : JSON.stringify(body);

    try {
      const response = await handleJsonRpcMessage(message, router);
      reply.header('Content-Type', 'application/json');
      return response;
    } catch (error: any) {
      return reply.code(500).send({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message,
        },
      });
    }
  });

  app.post(`${path}/batch`, async (request: FastifyRequest, reply: FastifyReply) => {
    const messages = request.body as any[];

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

    try {
      const responses = await Promise.all(
        messages.map((msg) =>
          handleJsonRpcMessage(typeof msg === 'string' ? msg : JSON.stringify(msg), router)
        )
      );

      reply.header('Content-Type', 'application/json');
      return responses.map((r) => JSON.parse(r));
    } catch (error: any) {
      return reply.code(500).send({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message,
        },
      });
    }
  });
};
