#!/usr/bin/env node
import 'reflect-metadata';
import { CalculatorServer } from './index.js';
import { ForgeServer } from '../../src/core/forge-server.js';
import { StdioTransport } from '../../src/transport/stdio-transport.js';
import { createDefaultLogger } from '../../src/core/logger.js';

const logger = createDefaultLogger('CalculatorServer');

logger.info('Calculator MCP Server started');
logger.info('Use with: npx @modelcontextprotocol/inspector');

const server = new CalculatorServer();

new ForgeServer(server)
  .setTransport(new StdioTransport())
  .setInstructions(
    'Calculator server providing arithmetic operations including addition, subtraction, multiplication, and division.'
  )
  .setLogger(logger)
  .start()
  .catch((error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });
