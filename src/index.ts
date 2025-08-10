import 'reflect-metadata';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { CalculatorServer } from '../examples/calculator/index.js';
import { setupStreamableHttp, setupSSE, runStdioServer } from './transport/index.js';

const startServer = async () => {
  const server = new CalculatorServer();

  if (process.argv.includes('--stdio')) {
    console.error('Starting MCP server in stdio mode...');
    await runStdioServer(server);
    return;
  }

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  setupStreamableHttp(app, server, '/mcp');
  await setupSSE(app, server, '/mcp/sse');

  app.get('/health', async () => {
    return { status: 'ok', server: 'Calculator MCP Server', version: '1.0.0' };
  });

  app.get('/info', async () => {
    return {
      name: 'Calculator MCP Server',
      version: '1.0.0',
      protocol: '2025-06-18',
      transports: ['streamable-http', 'sse', 'stdio'],
      endpoints: {
        streamableHttp: '/mcp',
        sse: '/mcp/sse',
        health: '/health',
      },
    };
  });

  const port = parseInt(process.env.PORT || '3000');
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`🚀 MCP Server running at http://${host}:${port}`);
    console.log(`📡 Streamable HTTP: http://${host}:${port}/mcp`);
    console.log(`📡 SSE: http://${host}:${port}/mcp/sse`);
    console.log(`💚 Health: http://${host}:${port}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
