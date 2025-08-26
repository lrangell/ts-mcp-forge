import 'reflect-metadata';
import { Result, ok } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { ForgeServer } from '../../src/core/forge-server.js';
import { StdioTransport } from '../../src/transport/stdio-transport.js';
import { Toolkit } from '../../src/core/toolkit.js';
import { Tool, Param } from '../../src/decorators/index.js';

interface Config {
  enableString: boolean;
}

// Math toolkit - always loaded
class MathToolkit extends Toolkit {
  @Tool('Add numbers')
  add(@Param('First') a: number, @Param('Second') b: number): Result<number, string> {
    return ok(a + b);
  }

  @Tool('Subtract numbers')
  subtract(@Param('First') a: number, @Param('Second') b: number): Result<number, string> {
    return ok(a - b);
  }
}

// String toolkit - dynamically loaded
class StringToolkit extends Toolkit {
  @Tool('Reverse string')
  reverse(@Param('Text') text: string): Result<string, string> {
    return ok(text.split('').reverse().join(''));
  }

  @Tool('Uppercase string')
  uppercase(@Param('Text') text: string): Result<string, string> {
    return ok(text.toUpperCase());
  }
}

class DynamicToolkitServer extends MCPServer {
  private config: Config;

  constructor(config: Config) {
    super('Dynamic Toolkit Server', '1.0.0');
    this.config = config;

    this.loadToolkits();
  }

  private loadToolkits(): void {
    // Always add math toolkit
    this.addToolkit(new MathToolkit(), 'math');

    // Conditionally add string toolkit
    if (this.config.enableString) {
      this.addToolkit(new StringToolkit(), 'str');
    }
  }

  @Tool('Enable string toolkit')
  enableStringToolkit(): Result<string, string> {
    if (!this.config.enableString) {
      this.config.enableString = true;
      this.addToolkit(new StringToolkit(), 'str');
      return ok('String toolkit enabled - str:reverse and str:uppercase are now available');
    }
    return ok('String toolkit already enabled');
  }
}

const config: Config = {
  enableString: false,
};

const server = new DynamicToolkitServer(config);

new ForgeServer(server)
  .setTransport(new StdioTransport())
  .setInstructions(
    `
    This server demonstrates dynamic toolkit loading.
    
    Initially available:
    - math:add - Add two numbers
    - math:subtract - Subtract two numbers
    - enableStringToolkit - Enable string manipulation tools
    
    After enabling string toolkit:
    - str:reverse - Reverse a string
    - str:uppercase - Convert to uppercase
  `
  )
  .start()
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
