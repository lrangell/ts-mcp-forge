---
title: Toolkits
description: Organizing tools into reusable toolkits
---

Toolkits allow you to organize related tools into reusable classes that can be composed into your MCP server.

## Basic Toolkit

```typescript
import { Toolkit, Tool } from 'ts-mcp-forge';

@Toolkit({ namespace: 'math' })
class MathToolkit {
  @Tool()
  add(a: number, b: number): number {
    return a + b;
  }

  @Tool()
  subtract(a: number, b: number): number {
    return a - b;
  }

  @Tool()
  multiply(a: number, b: number): number {
    return a * b;
  }

  @Tool()
  divide(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  }
}
```

## Using Toolkits

```typescript
import { MCPServer } from 'ts-mcp-forge';
import { MathToolkit } from './toolkits/math';
import { FileToolkit } from './toolkits/file';

class MyServer extends MCPServer {
  constructor() {
    super();

    // Register toolkits
    this.useToolkit(new MathToolkit());
    this.useToolkit(new FileToolkit());
  }
}
```

## Namespaced Tools

When a toolkit has a namespace, all tools are prefixed:

```typescript
@Toolkit({ namespace: 'file' })
class FileToolkit {
  @Tool({ description: 'Read a file' })
  async read(path: string): Promise<string> {
    return await fs.readFile(path, 'utf-8');
  }

  @Tool({ description: 'Write a file' })
  async write(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content, 'utf-8');
  }
}

// Tools will be registered as:
// - file_read
// - file_write
```

## Configurable Toolkits

```typescript
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
}

@Toolkit({ namespace: 'db' })
class DatabaseToolkit {
  private connection: Database;

  constructor(private config: DatabaseConfig) {
    this.connection = new Database(config);
  }

  @Tool({ description: 'Query the database' })
  async query(sql: string): Promise<any[]> {
    return await this.connection.query(sql);
  }

  @Tool({ description: 'Insert data' })
  async insert(table: string, data: Record<string, any>): Promise<void> {
    await this.connection.insert(table, data);
  }
}

// Usage
class MyServer extends MCPServer {
  constructor() {
    super();

    const dbToolkit = new DatabaseToolkit({
      host: 'localhost',
      port: 5432,
      database: 'myapp',
    });

    this.useToolkit(dbToolkit);
  }
}
```

## Toolkit Composition

```typescript
@Toolkit({ namespace: 'analytics' })
class AnalyticsToolkit {
  constructor(
    private mathToolkit: MathToolkit,
    private dataToolkit: DataToolkit
  ) {}

  @Tool({ description: 'Calculate average' })
  average(numbers: number[]): number {
    const sum = numbers.reduce((a, b) => this.mathToolkit.add(a, b), 0);
    return this.mathToolkit.divide(sum, numbers.length);
  }

  @Tool({ description: 'Analyze dataset' })
  async analyze(datasetId: string): Promise<Analysis> {
    const data = await this.dataToolkit.load(datasetId);
    return {
      count: data.length,
      average: this.average(data.values),
      min: Math.min(...data.values),
      max: Math.max(...data.values),
    };
  }
}
```

## Toolkit with State

```typescript
@Toolkit({ namespace: 'session' })
class SessionToolkit {
  private sessions = new Map<string, Session>();

  @Tool({ description: 'Create a new session' })
  createSession(userId: string): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      createdAt: new Date(),
      data: {},
    });
    return sessionId;
  }

  @Tool({ description: 'Get session data' })
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  @Tool({ description: 'Update session data' })
  updateSession(sessionId: string, data: Record<string, any>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.data = { ...session.data, ...data };
    session.updatedAt = new Date();
    return true;
  }

  @Tool({ description: 'Delete session' })
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}
```

## Async Initialization

```typescript
@Toolkit({ namespace: 'api' })
class ApiToolkit {
  private client: ApiClient;

  async initialize(): Promise<void> {
    this.client = await ApiClient.connect({
      endpoint: process.env.API_ENDPOINT,
      apiKey: process.env.API_KEY,
    });
  }

  @Tool({ description: 'Fetch user data' })
  async getUser(userId: string): Promise<User> {
    return await this.client.get(`/users/${userId}`);
  }
}

// Usage with initialization
class MyServer extends MCPServer {
  async initialize(): Promise<void> {
    const apiToolkit = new ApiToolkit();
    await apiToolkit.initialize();

    this.useToolkit(apiToolkit);
  }
}
```

## Error Handling in Toolkits

```typescript
import { Result, ok, err } from 'neverthrow';
import { ToolErrors } from 'ts-mcp-forge';

@Toolkit({ namespace: 'secure' })
class SecureToolkit {
  @Tool({ description: 'Encrypt data' })
  encrypt(data: string, key: string): Result<string, ToolErrors.InvalidParams> {
    if (!key || key.length < 16) {
      return err(ToolErrors.InvalidParams('Encryption key must be at least 16 characters'));
    }

    try {
      const encrypted = crypto.encrypt(data, key);
      return ok(encrypted);
    } catch (error) {
      return err(ToolErrors.Internal(`Encryption failed: ${error.message}`));
    }
  }
}
```

## Toolkit Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MathToolkit } from './math-toolkit';

describe('MathToolkit', () => {
  let toolkit: MathToolkit;

  beforeEach(() => {
    toolkit = new MathToolkit();
  });

  it('should add numbers correctly', () => {
    expect(toolkit.add(2, 3)).toBe(5);
  });

  it('should handle division by zero', () => {
    expect(() => toolkit.divide(10, 0)).toThrow('Division by zero');
  });
});
```

## Best Practices

1. **Single Responsibility**: Each toolkit should focus on one domain
2. **Namespace Consistently**: Use clear, descriptive namespaces
3. **Configuration**: Accept configuration through constructor
4. **Initialization**: Handle async initialization properly
5. **State Management**: Keep toolkit state isolated
6. **Error Handling**: Use consistent error patterns
7. **Documentation**: Document each tool's purpose
8. **Testing**: Test toolkits independently

## Common Toolkit Patterns

### CRUD Toolkit

```typescript
@Toolkit({ namespace: 'users' })
class UserCrudToolkit {
  @Tool() create(data: UserInput): User {
    /* ... */
  }
  @Tool() read(id: string): User {
    /* ... */
  }
  @Tool() update(id: string, data: Partial<User>): User {
    /* ... */
  }
  @Tool() delete(id: string): boolean {
    /* ... */
  }
  @Tool() list(filter?: UserFilter): User[] {
    /* ... */
  }
}
```

### Integration Toolkit

```typescript
@Toolkit({ namespace: 'github' })
class GitHubToolkit {
  @Tool() createIssue(repo: string, issue: IssueInput): Issue {
    /* ... */
  }
  @Tool() createPR(repo: string, pr: PRInput): PullRequest {
    /* ... */
  }
  @Tool() getRepo(owner: string, name: string): Repository {
    /* ... */
  }
  @Tool() listWorkflows(repo: string): Workflow[] {
    /* ... */
  }
}
```

### Utility Toolkit

```typescript
@Toolkit({ namespace: 'utils' })
class UtilityToolkit {
  @Tool() formatDate(date: Date, format: string): string {
    /* ... */
  }
  @Tool() parseJSON(text: string): any {
    /* ... */
  }
  @Tool() hash(data: string, algorithm: string): string {
    /* ... */
  }
  @Tool() generateId(prefix?: string): string {
    /* ... */
  }
}
```

## Advanced Features

### Dynamic Tool Registration

```typescript
@Toolkit({ namespace: 'dynamic' })
class DynamicToolkit {
  private tools = new Map<string, Function>();

  registerTool(name: string, fn: Function): void {
    this.tools.set(name, fn);
    // Dynamically register with MCP server
  }

  @Tool({ description: 'Execute dynamic tool' })
  execute(toolName: string, ...args: any[]): any {
    const tool = this.tools.get(toolName);
    if (!tool) throw new Error(`Tool ${toolName} not found`);
    return tool(...args);
  }
}
```

### Middleware Support

```typescript
@Toolkit({ namespace: 'middleware' })
class MiddlewareToolkit {
  private middleware: Middleware[] = [];

  use(fn: Middleware): void {
    this.middleware.push(fn);
  }

  @Tool()
  async execute(action: string, data: any): Promise<any> {
    let result = data;

    for (const mw of this.middleware) {
      result = await mw(action, result);
    }

    return result;
  }
}
```

## Related Topics

- [Tools](/guides/tools/) - Tool implementation details
- [Decorators](/guides/decorators/) - Decorator reference
- [Error Handling](/guides/error-handling/) - Error patterns
- [API Reference](/api/) - Complete API documentation
