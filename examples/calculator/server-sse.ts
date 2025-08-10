#!/usr/bin/env node
import 'reflect-metadata';
import { CalculatorServer } from './index.js';
import { SSETransport } from '../../src/transport/sse-transport.js';

const server = new CalculatorServer();
const transport = new SSETransport({
  port: 3000,
  host: 'localhost',
  cors: true,
});

console.log('Starting Calculator MCP Server with SSE transport...');

transport.start(server).catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
