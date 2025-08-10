#!/usr/bin/env node
import 'reflect-metadata';
import { CalculatorServer } from './index.js';
import { runStdioServer } from '../../src/transport/stdio.js';

const server = new CalculatorServer();

console.error('Calculator MCP Server started');
console.error('Use with: npx @modelcontextprotocol/inspector');

runStdioServer(server).catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
