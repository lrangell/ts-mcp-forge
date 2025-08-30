---
title: Quick Start
description: Build your first MCP server in minutes
---

This guide will walk you through creating your first MCP server using TS MCP Forge.

## Create Your First Server

### 1. Initialize Your Project

```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
npm install ts-mcp-forge
npm install -D typescript tsx
```

### 2. Configure TypeScript

Create a `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  }
}
```

### 3. Create Your Server

Create `server.ts`:

```typescript
import { MCPServer, Tool, Resource, Prompt } from 'ts-mcp-forge';
import { StdioTransport } from 'ts-mcp-forge/transports';

class MyFirstServer extends MCPServer {
  @Tool({
    description: 'Add two numbers together',
  })
  add(a: number, b: number): number {
    return a + b;
  }

  @Tool({
    description: 'Multiply two numbers',
  })
  multiply(a: number, b: number): number {
    return a * b;
  }

  @Resource({
    uri: 'memory://greeting',
    name: 'Greeting Message',
    description: 'A friendly greeting',
    mimeType: 'text/plain',
  })
  getGreeting(): string {
    return 'Hello from TS MCP Forge!';
  }

  @Prompt({
    name: 'code-review',
    description: 'Generate a code review prompt',
    arguments: [
      { name: 'language', description: 'Programming language', required: true },
      { name: 'code', description: 'Code to review', required: true },
    ],
  })
  codeReviewPrompt(language: string, code: string): string {
    return `Please review this ${language} code:\n\n${code}`;
  }
}

// Create and start the server
async function main() {
  const server = new MyFirstServer();
  const transport = new StdioTransport();
  await server.connect(transport);
  console.error('MCP Server is running');
}

main().catch(console.error);
```

### 4. Add NPM Scripts

Update your `package.json`:

```json
{
  "scripts": {
    "start": "tsx server.ts",
    "build": "tsc",
    "dev": "tsx watch server.ts"
  }
}
```

### 5. Test Your Server

You can test your server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector tsx server.ts
```

This will open a web interface where you can:

- See all available tools, resources, and prompts
- Call tools with different parameters
- View resources
- Test prompts

## Using the Forge Builder Pattern

For more control over server configuration, use the Forge builder pattern:

```typescript
import { ForgeServer } from 'ts-mcp-forge';
import { StdioTransport } from 'ts-mcp-forge/transports';

class MyServer extends MCPServer {
  // ... your decorated methods
}

const server = await ForgeServer.from(MyServer)
  .withTransport(new StdioTransport())
  .withLogger(console)
  .withName('my-server')
  .withVersion('1.0.0')
  .start();
```

## Adding to Claude Desktop

To use your server with Claude Desktop, add it to your configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/your/server.js"]
    }
  }
}
```

## Next Steps

Now that you have a working MCP server:

- Learn about [Decorators](/guides/decorators/) in depth
- Explore [Error Handling](/guides/error-handling/) patterns
- Understand [Tools](/guides/tools/), [Resources](/guides/resources/), and [Prompts](/guides/prompts/)
- Check out more [Examples](/examples/calculator/)
- Read the [API Reference](/api/) for detailed documentation
