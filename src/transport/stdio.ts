import * as readline from 'node:readline';
import { MCPServer } from '../core/server.js';
import { createMCPRouter } from '../core/router.js';
import { handleJsonRpcMessage } from '../core/jsonrpc.js';

export const runStdioServer = async (server: MCPServer) => {
  const router = createMCPRouter(server);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  console.error('MCP Server started in stdio mode');

  rl.on('line', async (line) => {
    try {
      const response = await handleJsonRpcMessage(line, router);
      console.log(response);
    } catch (error: any) {
      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: error.message,
          },
        })
      );
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });
};
