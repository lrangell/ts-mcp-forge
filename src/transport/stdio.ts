import * as readline from 'node:readline';
import { Result } from 'neverthrow';
import { MCPServer } from '../core/server.js';
import { createMCPRouter } from '../core/router.js';
import { handleJsonRpcMessage } from '../core/jsonrpc.js';
import { Notification } from '../core/protocol.js';
import { BaseNotificationSender } from '../utils/base-notification-sender.js';
import { Logger } from '../utils/logger.js';
import { safeStringify } from '../utils/string-conversion.js';

class StdioNotificationSender extends BaseNotificationSender {
  constructor() {
    super('StdioNotificationSender');
  }

  async sendNotification(notification: Notification): Promise<Result<void, Error>> {
    return this.safeExecute(async () => {
      process.stdout.write(safeStringify(notification) + '\n');
    }, 'stdio');
  }
}

export const runStdioServer = async (server: MCPServer) => {
  const logger = new Logger('StdioServer');
  const router = createMCPRouter(server);
  const notificationSender = new StdioNotificationSender();
  server.setNotificationSender(notificationSender);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  logger.info('MCP Server started in stdio mode');

  rl.on('line', async (line) => {
    const response = await handleJsonRpcMessage(line, router);
    process.stdout.write(response + '\n');
  });

  rl.on('close', () => {
    process.exit(0);
  });
};
