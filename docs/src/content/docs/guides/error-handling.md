---
title: Error Handling
description: Error handling patterns in TS MCP Forge
---

TS MCP Forge provides a comprehensive error handling system using Result types and domain-specific errors.

## Result Types

All MCP methods should return `Result<T, E>` types from the `neverthrow` library:

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

## Domain-Specific Errors

### Tool Errors

```typescript
import { ToolErrors } from 'ts-mcp-forge';

// Available error types
ToolErrors.NotFound(message); // Resource not found
ToolErrors.Unauthorized(message); // Unauthorized access
ToolErrors.InvalidParams(message); // Invalid parameters
ToolErrors.Internal(message); // Internal error
```

### Resource Errors

```typescript
import { ResourceErrors } from 'ts-mcp-forge';

// Available error types
ResourceErrors.NotFound(message); // Resource not found
ResourceErrors.Unauthorized(message); // Unauthorized access
ResourceErrors.Internal(message); // Internal error
```

### Prompt Errors

```typescript
import { PromptErrors } from 'ts-mcp-forge';

// Available error types
PromptErrors.NotFound(message); // Prompt not found
PromptErrors.InvalidArgs(message); // Invalid arguments
PromptErrors.Internal(message); // Internal error
```

## Error Handling Patterns

### Basic Error Handling

```typescript
@Tool()
async fetchData(url: string): Promise<Result<string, ToolErrors.NotFound>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return err(ToolErrors.NotFound(`Failed to fetch: ${response.statusText}`));
    }
    const data = await response.text();
    return ok(data);
  } catch (error) {
    return err(ToolErrors.Internal(`Network error: ${error.message}`));
  }
}
```

### Multiple Error Types

```typescript
type FileError =
  | ToolErrors.NotFound
  | ToolErrors.Unauthorized
  | ToolErrors.Internal;

@Tool()
async readSecureFile(
  path: string,
  token: string
): Promise<Result<string, FileError>> {
  // Check authorization
  if (!this.isValidToken(token)) {
    return err(ToolErrors.Unauthorized('Invalid token'));
  }

  // Check if file exists
  if (!await this.fileExists(path)) {
    return err(ToolErrors.NotFound(`File not found: ${path}`));
  }

  // Read file
  try {
    const content = await fs.readFile(path, 'utf-8');
    return ok(content);
  } catch (error) {
    return err(ToolErrors.Internal(`Read error: ${error.message}`));
  }
}
```

### Error Chaining

```typescript
@Tool()
async processData(input: string): Promise<Result<string, ToolErrors.InvalidParams>> {
  return this.validateInput(input)
    .andThen(valid => this.transformData(valid))
    .andThen(transformed => this.saveData(transformed))
    .mapErr(error => ToolErrors.InvalidParams(error.message));
}
```

## Validation Patterns

### Input Validation

```typescript
@Tool()
createUser(
  name: string,
  age: number,
  email: string
): Result<User, ToolErrors.InvalidParams> {
  // Validate name
  if (!name || name.length < 2) {
    return err(ToolErrors.InvalidParams('Name must be at least 2 characters'));
  }

  // Validate age
  if (age < 0 || age > 150) {
    return err(ToolErrors.InvalidParams('Age must be between 0 and 150'));
  }

  // Validate email
  if (!this.isValidEmail(email)) {
    return err(ToolErrors.InvalidParams('Invalid email format'));
  }

  const user = { name, age, email };
  return ok(user);
}
```

### Schema Validation

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2),
  age: z.number().min(0).max(150),
  email: z.string().email()
});

@Tool()
createUserWithSchema(
  data: unknown
): Result<User, ToolErrors.InvalidParams> {
  const result = UserSchema.safeParse(data);

  if (!result.success) {
    return err(ToolErrors.InvalidParams(
      result.error.errors.map(e => e.message).join(', ')
    ));
  }

  return ok(result.data);
}
```

## Async Error Handling

### Promise-based

```typescript
@Tool()
async fetchWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<Result<string, ToolErrors.NotFound>> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return ok(await response.text());
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        return err(ToolErrors.NotFound(`Failed after ${maxRetries} attempts`));
      }
      await this.delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  return err(ToolErrors.NotFound('Max retries exceeded'));
}
```

### Stream-based

```typescript
@Tool()
async* streamData(
  source: string
): AsyncGenerator<Result<string, ToolErrors.Internal>> {
  try {
    const stream = await this.openStream(source);

    for await (const chunk of stream) {
      yield ok(chunk);
    }
  } catch (error) {
    yield err(ToolErrors.Internal(`Stream error: ${error.message}`));
  }
}
```

## Error Recovery

### Fallback Values

```typescript
@Tool()
getConfigValue(key: string): string {
  return this.readConfig(key)
    .unwrapOr('default-value');
}
```

### Error Transformation

```typescript
@Tool()
processRequest(request: Request): Result<Response, AppError> {
  return this.validateRequest(request)
    .mapErr(validationError =>
      AppError.BadRequest(validationError.message)
    )
    .andThen(valid => this.handleRequest(valid))
    .mapErr(handlerError =>
      AppError.ServerError(handlerError.message)
    );
}
```

### Partial Success

```typescript
@Tool()
processBatch(
  items: string[]
): Result<BatchResult, ToolErrors.Internal> {
  const results = items.map(item => this.processItem(item));

  const successful = results.filter(r => r.isOk()).map(r => r.value);
  const failed = results.filter(r => r.isErr()).map(r => r.error);

  if (successful.length === 0) {
    return err(ToolErrors.Internal('All items failed'));
  }

  return ok({
    successful,
    failed,
    partial: failed.length > 0
  });
}
```

## Logging and Monitoring

### Error Logging

```typescript
@Tool()
async performOperation(
  input: string
): Promise<Result<string, ToolErrors.Internal>> {
  const result = await this.operation(input);

  if (result.isErr()) {
    this.logger.error('Operation failed', {
      input,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  }

  return result;
}
```

### Error Metrics

```typescript
class MyServer extends MCPServer {
  private errorCounts = new Map<string, number>();

  trackError(error: McpError): void {
    const key = `${error.code}_${error.message}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
  }

  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }
}
```

## Best Practices

1. **Always use Result types**: Return `Result<T, E>` instead of throwing exceptions
2. **Use domain-specific errors**: Choose the appropriate error type for your domain
3. **Provide context**: Include helpful error messages with context
4. **Validate early**: Validate inputs before processing
5. **Handle all cases**: Account for all possible error scenarios
6. **Log errors**: Log errors for debugging and monitoring
7. **Graceful degradation**: Provide fallback behavior when possible
8. **Document errors**: Document what errors each method can return

## Testing Error Handling

```typescript
import { describe, it, expect } from 'vitest';

describe('Error handling', () => {
  it('should return error for division by zero', () => {
    const result = server.divide(10, 0);

    expect(result.isErr()).toBe(true);
    expect(result.error.message).toBe('Cannot divide by zero');
  });

  it('should handle network errors', async () => {
    // Mock network failure
    vi.mock('fetch', () => {
      throw new Error('Network error');
    });

    const result = await server.fetchData('http://example.com');

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(ToolErrors.Internal);
  });
});
```

## Related Topics

- [Tools](/guides/tools/) - Tool implementation
- [Resources](/guides/resources/) - Resource implementation
- [Prompts](/guides/prompts/) - Prompt implementation
- [API Reference](/api/) - Complete API documentation
