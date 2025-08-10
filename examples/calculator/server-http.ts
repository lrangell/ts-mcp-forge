#!/usr/bin/env node
import 'reflect-metadata';
import { CalculatorServer } from './index.js';
import { HTTPTransport } from '../../src/transport/http-transport.js';

const server = new CalculatorServer();
const transport = new HTTPTransport({
  port: 3000,
  host: 'localhost',
  path: '/api/mcp',
  cors: true,
});

console.log('Starting Calculator MCP Server with HTTP transport...');

transport.start(server).catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
