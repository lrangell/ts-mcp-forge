import 'reflect-metadata';
import { Result, ok } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { ForgeServer } from '../../src/core/forge-server.js';
import { StdioTransport } from '../../src/transport/stdio-transport.js';
import { Tool, Param } from '../../src/decorators/index.js';
import { Toolkit } from '../../src/core/toolkit.js';

// Math toolkit with 2 tools
class MathToolkit extends Toolkit {
  @Tool('Add two numbers')
  add(
    @Param('First number') a: number,
    @Param('Second number') b: number
  ): Result<number, string> {
    return ok(a + b);
  }

  @Tool('Multiply two numbers')
  multiply(
    @Param('First number') a: number,
    @Param('Second number') b: number
  ): Result<number, string> {
    return ok(a * b);
  }
}

// String toolkit with 2 tools
class StringToolkit extends Toolkit {
  @Tool('Concatenate strings')
  concat(
    @Param('First string') a: string,
    @Param('Second string') b: string
  ): Result<string, string> {
    return ok(a + b);
  }

  @Tool('Reverse a string')
  reverse(@Param('Input string') str: string): Result<string, string> {
    return ok(str.split('').reverse().join(''));
  }
}

class ToolkitExampleServer extends MCPServer {
  constructor() {
    super('Toolkit Example Server', '1.0.0');
    
    // Add multiple toolkits with different namespaces
    this.addToolkit(new MathToolkit(), 'math');
    this.addToolkit(new StringToolkit(), 'str');
  }
}

const server = new ToolkitExampleServer();

new ForgeServer(server)
  .setTransport(new StdioTransport())
  .setInstructions(`
    This server demonstrates the toolkit system with namespaced tools.
    
    Math tools (prefixed with 'math:'):
    - math:add - Add two numbers
    - math:multiply - Multiply two numbers
    
    String tools (prefixed with 'str:'):
    - str:concat - Concatenate strings
    - str:reverse - Reverse a string
  `)
  .start()
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });