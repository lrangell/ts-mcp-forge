import { MCPServer } from '../core/server.js';
import { runStdioServer } from './stdio.js';

export class StdioTransport {
  async start(server: MCPServer): Promise<void> {
    await runStdioServer(server);
  }

  async stop(): Promise<void> {
    process.exit(0);
  }
}

