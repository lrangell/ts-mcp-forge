import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import FastifySSE from 'fastify-sse-v2';
import { MCPServer } from '../core/server.js';
import { createMCPRouter } from '../core/router.js';
import { handleJsonRpcMessage } from '../core/jsonrpc.js';

export const setupSSE = async (
  app: FastifyInstance,
  server: MCPServer,
  path: string = '/mcp/sse'
) => {
  await app.register(FastifySSE);

  const router = createMCPRouter(server);

  app.get(path, async (request: FastifyRequest, reply: FastifyReply) => {
    reply.sse({ event: 'connected', data: JSON.stringify({ status: 'ready' }) });

    const keepAlive = setInterval(() => {
      reply.sse({ event: 'ping', data: JSON.stringify({ timestamp: Date.now() }) });
    }, 30000);

    request.socket.on('close', () => {
      clearInterval(keepAlive);
    });
  });

  app.post(`${path}/message`, async (request: FastifyRequest, reply: FastifyReply) => {
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
};
