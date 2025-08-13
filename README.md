# ts-mcp-forge

[![npm version](https://badge.fury.io/js/ts-mcp-forge.svg)](https://badge.fury.io/js/ts-mcp-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript framework for building MCP (Model Context Protocol) servers with decorators. It leverages TypeScript's decorator metadata to automatically generate JSON schemas, validate parameters at runtime while maintaining minimal boilerplate and maximum type safety.

## Features

- 🎯 **Decorator-based API** - Define tools, resources, and prompts with simple decorators
- 🔧 **Type Safety** - Full TypeScript support with automatic type inference
- 🚀 **Zero Configuration** - Get started immediately with sensible defaults
- 📦 **Modular Design** - Use only what you need
- 🔌 **Transport Agnostic** - Support for stdio, SSE, and HTTP transports

## Installation

```bash
npm install ts-mcp-forge
# or
pnpm add ts-mcp-forge
# or
yarn add ts-mcp-forge
```

## TypeScript Configuration

ts-mcp-forge requires decorator metadata to generate proper JSON schemas. Add these settings to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**Important:** Many bundlers like esbuild don't emit decorator metadata by default, which will result in missing type information in generated schemas. If you're using Vite or other esbuild-based tools, configure them to use SWC or another transformer that preserves decorator metadata:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
```

## Quick Start

```typescript
import { MCPServer, Tool, Param, StdioTransport } from 'ts-mcp-forge';
import { Result, ok } from 'neverthrow';

class MyServer extends MCPServer {
  constructor() {
    super('My MCP Server', '1.0.0');
  }

  // Method name as tool name
  @Tool('Greets a person by name')
  greet(@Param('Name of the person') name: string): Result<string, string> {
    return ok(`Hello, ${name}!`);
  }

  // Custom tool name
  @Tool('say-goodbye', 'Says goodbye to a person')
  farewell(@Param('Name of the person') name: string): Result<string, string> {
    return ok(`Goodbye, ${name}!`);
  }
}

// Start the server with stdio transport
const server = new MyServer();
const transport = new StdioTransport();
await transport.start(server);
```

## Core Concepts

### Tools

Tools are functions that can be called by MCP clients. You can define them with or without explicit names:

```typescript
// Using method name as tool name
@Tool('Performs a calculation')
calculate(@Param('First number') a: number, @Param('Second number') b: number): Result<number, string> {
  return ok(a + b);
}

// Using custom tool name
@Tool('add-numbers', 'Adds two numbers')
calculate(@Param('First number') a: number, @Param('Second number') b: number): Result<number, string> {
  return ok(a + b);
}
```

### Resources

Resources provide data that can be read by MCP clients:

```typescript
@Resource('config://settings', 'Application settings')
getSettings(): Result<object, string> {
  return ok({ theme: 'dark', language: 'en' });
}
```

### Prompts

Prompts are templates that can be filled by MCP clients:

```typescript
@Prompt('code-review', 'Template for code review')
codeReviewPrompt(@Param('Programming language') language: string): Result<string, string> {
  return ok(`Review this ${language} code for best practices...`);
}
```

## Advanced Usage

### Custom Error Types

```typescript
class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

@Tool('validateEmail', 'Validates an email address')
validateEmail(@Param('Email address') email: string): Result<boolean, ValidationError> {
  if (!email.includes('@')) {
    return err(new ValidationError('email', 'Invalid email format'));
  }
  return ok(true);
}
```

### Async Operations

```typescript
@Tool('fetchData', 'Fetches data from API')
async fetchData(@Param('API endpoint') endpoint: string): Promise<Result<any, string>> {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    return ok(data);
  } catch (error) {
    return err(`Failed to fetch: ${error.message}`);
  }
}
```

### Using with Different Transports

#### Standard I/O

```typescript
import { MCPServer, StdioTransport } from 'ts-mcp-forge';

const server = new MyServer();
const transport = new StdioTransport();
await transport.start(server);
```

#### Server-Sent Events

```typescript
import { MCPServer, SSETransport } from 'ts-mcp-forge';

const server = new MyServer();
const transport = new SSETransport({
  port: 3000,
  host: 'localhost',
});
await transport.start(server);
```

#### HTTP/REST

```typescript
import { MCPServer, HTTPTransport } from 'ts-mcp-forge';

const server = new MyServer();
const transport = new HTTPTransport({
  port: 3000,
  host: '0.0.0.0',
});
await transport.start(server);
```

## API Reference

### Decorators

- `@Tool(name: string, description: string)` - Defines a tool
- `@Resource(uri: string, description: string)` - Defines a resource
- `@Prompt(name: string, description: string)` - Defines a prompt
- `@Param(description: string)` - Describes a parameter

### MCPServer Methods

- `handleInitialize()` - Returns server capabilities
- `listTools()` - Lists all available tools
- `listResources()` - Lists all available resources
- `listPrompts()` - Lists all available prompts
- `callTool(name, args)` - Executes a tool
- `readResource(uri)` - Reads a resource
- `getPrompt(name, args)` - Gets a prompt
