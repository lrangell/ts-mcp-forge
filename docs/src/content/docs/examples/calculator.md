---
title: Calculator Server Example
description: A complete example of a calculator MCP server
---

This example demonstrates a simple calculator server with basic arithmetic operations.

## Complete Implementation

```typescript
import { MCPServer, Tool, Resource, Prompt } from 'ts-mcp-forge';
import { StdioTransport } from '@modelcontextprotocol/sdk/node';
import { Result, ok, err } from 'neverthrow';
import { ToolErrors } from 'ts-mcp-forge';

class CalculatorServer extends MCPServer {
  private history: Array<{
    operation: string;
    result: number;
    timestamp: Date;
  }> = [];

  // Basic arithmetic tools
  @Tool({ description: 'Add two numbers' })
  add(a: number, b: number): number {
    const result = a + b;
    this.addToHistory(`${a} + ${b}`, result);
    return result;
  }

  @Tool({ description: 'Subtract two numbers' })
  subtract(a: number, b: number): number {
    const result = a - b;
    this.addToHistory(`${a} - ${b}`, result);
    return result;
  }

  @Tool({ description: 'Multiply two numbers' })
  multiply(a: number, b: number): number {
    const result = a * b;
    this.addToHistory(`${a} * ${b}`, result);
    return result;
  }

  @Tool({ description: 'Divide two numbers' })
  divide(a: number, b: number): Result<number, ToolErrors.InvalidParams> {
    if (b === 0) {
      return err(ToolErrors.InvalidParams('Cannot divide by zero'));
    }
    const result = a / b;
    this.addToHistory(`${a} / ${b}`, result);
    return ok(result);
  }

  // Advanced operations
  @Tool({ description: 'Calculate power' })
  power(base: number, exponent: number): number {
    const result = Math.pow(base, exponent);
    this.addToHistory(`${base} ^ ${exponent}`, result);
    return result;
  }

  @Tool({ description: 'Calculate square root' })
  sqrt(n: number): Result<number, ToolErrors.InvalidParams> {
    if (n < 0) {
      return err(ToolErrors.InvalidParams('Cannot calculate square root of negative number'));
    }
    const result = Math.sqrt(n);
    this.addToHistory(`√${n}`, result);
    return ok(result);
  }

  @Tool({ description: 'Calculate factorial' })
  factorial(n: number): Result<number, ToolErrors.InvalidParams> {
    if (n < 0) {
      return err(ToolErrors.InvalidParams('Factorial is not defined for negative numbers'));
    }
    if (n > 20) {
      return err(ToolErrors.InvalidParams('Number too large for factorial calculation'));
    }

    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }

    this.addToHistory(`${n}!`, result);
    return ok(result);
  }

  // Statistics
  @Tool({ description: 'Calculate average of numbers' })
  average(numbers: number[]): Result<number, ToolErrors.InvalidParams> {
    if (numbers.length === 0) {
      return err(ToolErrors.InvalidParams('Cannot calculate average of empty array'));
    }

    const sum = numbers.reduce((a, b) => a + b, 0);
    const result = sum / numbers.length;

    this.addToHistory(`average([${numbers.join(', ')}])`, result);
    return ok(result);
  }

  // Resources
  @Resource({
    uri: 'calculator://history',
    name: 'Calculation History',
    description: 'History of all calculations',
    mimeType: 'application/json',
  })
  getHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }

  @Resource({
    uri: 'calculator://stats',
    name: 'Calculator Statistics',
    description: 'Statistics about calculator usage',
    mimeType: 'application/json',
  })
  getStats(): string {
    const stats = {
      totalCalculations: this.history.length,
      operationCounts: this.getOperationCounts(),
      lastCalculation: this.history[this.history.length - 1] || null,
    };
    return JSON.stringify(stats, null, 2);
  }

  // Prompts
  @Prompt({
    name: 'solve-equation',
    description: 'Help solve a mathematical equation',
    arguments: [
      { name: 'equation', description: 'The equation to solve', required: true },
      { name: 'steps', description: 'Show step-by-step solution', required: false },
    ],
  })
  solveEquationPrompt(equation: string, steps: string = 'yes'): string {
    return `Please solve this equation: ${equation}

${
  steps === 'yes' ? 'Show a step-by-step solution with explanations.' : 'Provide the final answer.'
}`;
  }

  @Prompt({
    name: 'explain-concept',
    description: 'Explain a mathematical concept',
    arguments: [
      { name: 'concept', description: 'The concept to explain', required: true },
      { name: 'level', description: 'Difficulty level', required: false },
    ],
  })
  explainConceptPrompt(concept: string, level: string = 'intermediate'): string {
    return `Explain the mathematical concept of "${concept}" at a ${level} level.
Include examples and practical applications.`;
  }

  // Helper methods
  private addToHistory(operation: string, result: number): void {
    this.history.push({
      operation,
      result,
      timestamp: new Date(),
    });
  }

  private getOperationCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const entry of this.history) {
      const op = entry.operation.match(/[+\-*/^√!]|average/)?.[0] || 'other';
      counts[op] = (counts[op] || 0) + 1;
    }

    return counts;
  }
}

// Main entry point
async function main() {
  const server = new CalculatorServer();
  const transport = new StdioTransport();

  await server.connect(transport);
  console.error('Calculator MCP server is running');
}

main().catch(console.error);
```

## Running the Example

### 1. Install Dependencies

```bash
npm install ts-mcp-forge @modelcontextprotocol/sdk neverthrow
npm install -D typescript tsx
```

### 2. Configure TypeScript

Create `tsconfig.json`:

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

### 3. Add to Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "calculator": {
      "command": "tsx",
      "args": ["/path/to/calculator-server.ts"]
    }
  }
}
```

### 4. Test with Inspector

```bash
npx @modelcontextprotocol/inspector tsx calculator-server.ts
```

## Example Interactions

### Basic Calculations

```typescript
// Add numbers
result = await server.callTool('add', { a: 10, b: 5 });
// Returns: 15

// Divide with error handling
result = await server.callTool('divide', { a: 10, b: 0 });
// Returns: Error - Cannot divide by zero
```

### Using Resources

```typescript
// Get calculation history
const history = await server.readResource('calculator://history');
// Returns: JSON array of all calculations

// Get statistics
const stats = await server.readResource('calculator://stats');
// Returns: JSON object with usage statistics
```

### Using Prompts

```typescript
// Get equation solving prompt
const prompt = await server.getPrompt('solve-equation', {
  equation: 'x^2 + 5x + 6 = 0',
  steps: 'yes',
});
// Returns: Formatted prompt for solving the equation
```

## Extending the Calculator

### Add Scientific Functions

```typescript
@Tool({ description: 'Calculate sine' })
sin(angle: number, unit: 'radians' | 'degrees' = 'radians'): number {
  const radians = unit === 'degrees' ? angle * Math.PI / 180 : angle;
  return Math.sin(radians);
}

@Tool({ description: 'Calculate logarithm' })
log(n: number, base: number = 10): Result<number, ToolErrors.InvalidParams> {
  if (n <= 0) {
    return err(ToolErrors.InvalidParams('Logarithm undefined for non-positive numbers'));
  }
  return ok(Math.log(n) / Math.log(base));
}
```

### Add Memory Functions

```typescript
private memory: number = 0;

@Tool({ description: 'Store value in memory' })
memoryStore(value: number): void {
  this.memory = value;
}

@Tool({ description: 'Recall value from memory' })
memoryRecall(): number {
  return this.memory;
}

@Tool({ description: 'Add to memory' })
memoryAdd(value: number): void {
  this.memory += value;
}

@Tool({ description: 'Clear memory' })
memoryClear(): void {
  this.memory = 0;
}
```

## Best Practices Demonstrated

1. **Error Handling**: Using Result types for operations that can fail
2. **Input Validation**: Checking for edge cases like division by zero
3. **State Management**: Maintaining calculation history
4. **Resource Exposure**: Providing access to server state through resources
5. **Prompt Templates**: Creating reusable prompts for common tasks
6. **Documentation**: Clear descriptions for all tools and resources
7. **Type Safety**: Full TypeScript type annotations

## Next Steps

- Add more advanced mathematical operations
- Implement expression parsing
- Add unit conversions
- Create a web interface
- Add persistence for calculation history
- Implement user sessions
