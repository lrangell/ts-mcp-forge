---
title: Tools
description: How to define and use tools in TS MCP Forge
---

Tools are functions that can be called by LLMs to perform specific tasks. In TS MCP Forge, tools are defined using the `@Tool` decorator.

## Basic Tool Definition

```typescript
import { Tool, MCPServer } from 'ts-mcp-forge';

class MyServer extends MCPServer {
  @Tool()
  calculateSum(a: number, b: number): number {
    return a + b;
  }
}
```

## Tool Configuration

The `@Tool` decorator accepts an optional configuration object:

```typescript
@Tool({
  name: 'calc_sum',  // Custom name (defaults to method name)
  description: 'Calculate the sum of two numbers',
  inputSchema: {     // Optional: auto-inferred from parameters
    type: 'object',
    properties: {
      a: { type: 'number', description: 'First number' },
      b: { type: 'number', description: 'Second number' }
    },
    required: ['a', 'b']
  }
})
calculateSum(a: number, b: number): number {
  return a + b;
}
```

## Parameter Types

TS MCP Forge automatically infers parameter types and generates JSON schemas:

```typescript
@Tool()
processData(
  text: string,
  count: number,
  enabled: boolean,
  items: string[],
  options?: { timeout?: number }
): void {
  // Implementation
}
```

## Return Types

Tools can return various types:

```typescript
@Tool()
getString(): string {
  return 'Hello World';
}

@Tool()
getObject(): { status: string; data: number[] } {
  return { status: 'ok', data: [1, 2, 3] };
}

@Tool()
async fetchData(): Promise<string> {
  const response = await fetch('https://api.example.com');
  return response.text();
}
```

## Error Handling

Use Result types for safe error handling:

```typescript
import { Result, ok, err } from 'neverthrow';
import { ToolErrors } from 'ts-mcp-forge';

@Tool()
divide(a: number, b: number): Result<number, ToolErrors.InvalidParams> {
  if (b === 0) {
    return err(ToolErrors.InvalidParams('Cannot divide by zero'));
  }
  return ok(a / b);
}
```

## Complex Examples

### File Operations Tool

```typescript
@Tool({ description: 'Read a file from the filesystem' })
async readFile(path: string): Promise<Result<string, ToolErrors.NotFound>> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return ok(content);
  } catch (error) {
    return err(ToolErrors.NotFound(`File not found: ${path}`));
  }
}
```

### API Integration Tool

```typescript
@Tool({ description: 'Fetch weather data for a city' })
async getWeather(city: string): Promise<WeatherData> {
  const apiKey = process.env.WEATHER_API_KEY;
  const response = await fetch(
    `https://api.weather.com/v1/current?city=${city}&key=${apiKey}`
  );
  return response.json();
}
```

### Database Query Tool

```typescript
@Tool({ description: 'Query user data from database' })
async queryUsers(
  filter: { age?: number; country?: string },
  limit: number = 10
): Promise<User[]> {
  return this.db.users
    .find(filter)
    .limit(limit)
    .toArray();
}
```

## Tool Discovery

LLMs can discover available tools through the MCP protocol:

```json
{
  "tools": [
    {
      "name": "calculateSum",
      "description": "Calculate the sum of two numbers",
      "inputSchema": {
        "type": "object",
        "properties": {
          "a": { "type": "number" },
          "b": { "type": "number" }
        },
        "required": ["a", "b"]
      }
    }
  ]
}
```

## Best Practices

1. **Clear Naming**: Use descriptive, action-oriented names
2. **Comprehensive Descriptions**: Help LLMs understand when to use each tool
3. **Type Safety**: Leverage TypeScript's type system
4. **Error Handling**: Use Result types for predictable error handling
5. **Validation**: Validate inputs before processing
6. **Idempotency**: Make tools idempotent when possible
7. **Documentation**: Add JSDoc comments for better understanding

## Advanced Features

### Tool Composition

```typescript
@Tool()
async processAndSave(data: string): Promise<void> {
  const processed = await this.processData(data);
  await this.saveToDatabase(processed);
}

private async processData(data: string): Promise<ProcessedData> {
  // Processing logic
}

private async saveToDatabase(data: ProcessedData): Promise<void> {
  // Save logic
}
```

### Conditional Tools

```typescript
@Tool()
adminAction(action: string): Result<void, ToolErrors.Unauthorized> {
  if (!this.isAdmin) {
    return err(ToolErrors.Unauthorized('Admin access required'));
  }
  // Perform action
  return ok(undefined);
}
```

## Related Topics

- [Decorators](/guides/decorators/) - Overview of all decorators
- [Error Handling](/guides/error-handling/) - Error handling patterns
- [Toolkits](/guides/toolkits/) - Organizing tools into toolkits
- [API Reference](/api/) - Complete API documentation
