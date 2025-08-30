---
title: Installation
description: How to install TS MCP Forge
---

## Prerequisites

Before installing TS MCP Forge, ensure you have:

- Node.js 18.0.0 or higher
- TypeScript 5.0 or higher
- A package manager (npm, yarn, or pnpm)

## Installation

Install TS MCP Forge using your preferred package manager:

```bash
npm install ts-mcp-forge
```

```bash
yarn add ts-mcp-forge
```

```bash
pnpm add ts-mcp-forge
```

## TypeScript Configuration

TS MCP Forge requires experimental decorators and decorator metadata. Add the following to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  }
}
```

## Package.json Setup

Ensure your package.json includes:

```json
{
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Verify Installation

Create a simple test file to verify the installation:

```typescript
import { MCPServer, Tool } from 'ts-mcp-forge';

class TestServer extends MCPServer {
  @Tool()
  hello(name: string): string {
    return `Hello, ${name}!`;
  }
}

console.log('TS MCP Forge installed successfully!');
```

## Next Steps

- Continue to the [Quick Start Guide](/getting-started/quick-start/)
- Explore the [Core Concepts](/guides/decorators/)
- Check out [Examples](/examples/calculator/)
