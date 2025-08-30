---
title: Resources
description: How to define and manage resources in TS MCP Forge
---

Resources represent data that can be read by LLMs. Unlike tools which perform actions, resources provide access to information.

## Basic Resource Definition

```typescript
import { Resource, MCPServer } from 'ts-mcp-forge';

class MyServer extends MCPServer {
  @Resource({
    uri: 'config://app',
    name: 'Application Configuration',
    description: 'Current application configuration',
    mimeType: 'application/json',
  })
  getConfig(): string {
    return JSON.stringify(this.config);
  }
}
```

## Resource Configuration

Every resource requires:

- **uri**: Unique identifier for the resource
- **name**: Human-readable name
- **description**: What the resource contains
- **mimeType**: Content type (e.g., 'text/plain', 'application/json')

## Resource Templates

For dynamic resources with parameters:

```typescript
@ResourceTemplate({
  uriTemplate: 'file:///{path}',
  name: 'File Reader',
  description: 'Read files from the filesystem',
  mimeType: 'text/plain'
})
async readFile(path: string): Promise<string> {
  return await fs.readFile(path, 'utf-8');
}
```

## Dynamic Resources

Register resources at runtime:

```typescript
@DynamicResource()
async initializeResources(): Promise<void> {
  const files = await fs.readdir('./data');

  for (const file of files) {
    this.registerResource({
      uri: `file:///data/${file}`,
      name: file,
      description: `Data file: ${file}`,
      mimeType: 'application/json'
    }, async () => {
      return await fs.readFile(`./data/${file}`, 'utf-8');
    });
  }
}
```

## Resource Types

### Text Resources

```typescript
@Resource({
  uri: 'text://readme',
  name: 'README',
  description: 'Project README file',
  mimeType: 'text/markdown'
})
getReadme(): string {
  return this.readmeContent;
}
```

### JSON Resources

```typescript
@Resource({
  uri: 'data://users',
  name: 'User List',
  description: 'List of all users',
  mimeType: 'application/json'
})
getUsers(): string {
  const users = this.database.getUsers();
  return JSON.stringify(users, null, 2);
}
```

### Binary Resources

```typescript
@Resource({
  uri: 'image://logo',
  name: 'Company Logo',
  description: 'Company logo image',
  mimeType: 'image/png'
})
getLogo(): string {
  const imageBuffer = fs.readFileSync('./logo.png');
  return imageBuffer.toString('base64');
}
```

## Error Handling

```typescript
import { Result, ok, err } from 'neverthrow';
import { ResourceErrors } from 'ts-mcp-forge';

@Resource({
  uri: 'db://stats',
  name: 'Database Statistics',
  description: 'Current database statistics',
  mimeType: 'application/json'
})
getDbStats(): Result<string, ResourceErrors.NotFound> {
  try {
    const stats = this.database.getStats();
    return ok(JSON.stringify(stats));
  } catch (error) {
    return err(ResourceErrors.NotFound('Database not available'));
  }
}
```

## Resource Subscriptions

Resources can notify subscribers when they change:

```typescript
@Resource({
  uri: 'monitor://cpu',
  name: 'CPU Usage',
  description: 'Current CPU usage',
  mimeType: 'application/json'
})
getCpuUsage(): string {
  return JSON.stringify({ usage: this.currentCpuUsage });
}

private monitorCpu(): void {
  setInterval(() => {
    this.currentCpuUsage = os.cpuUsage();
    // Notify subscribers of resource change
    this.notifyResourceUpdated('monitor://cpu');
  }, 5000);
}
```

## Complex Examples

### Database Resource

```typescript
@ResourceTemplate({
  uriTemplate: 'db://table/{tableName}',
  name: 'Database Table',
  description: 'Query database table',
  mimeType: 'application/json'
})
async queryTable(tableName: string): Promise<string> {
  const validTables = ['users', 'posts', 'comments'];

  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table: ${tableName}`);
  }

  const results = await this.db.query(`SELECT * FROM ${tableName}`);
  return JSON.stringify(results);
}
```

### API Resource

```typescript
@ResourceTemplate({
  uriTemplate: 'api://endpoint/{endpoint}',
  name: 'API Endpoint',
  description: 'Fetch data from API endpoint',
  mimeType: 'application/json'
})
async fetchEndpoint(endpoint: string): Promise<string> {
  const response = await fetch(`https://api.example.com/${endpoint}`);
  return await response.text();
}
```

### Configuration Resource

```typescript
@Resource({
  uri: 'config://environment',
  name: 'Environment Variables',
  description: 'Current environment configuration',
  mimeType: 'application/json'
})
getEnvironment(): string {
  // Filter sensitive variables
  const safeEnv = Object.entries(process.env)
    .filter(([key]) => !key.includes('SECRET'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  return JSON.stringify(safeEnv, null, 2);
}
```

## Best Practices

1. **URI Schemes**: Use consistent URI schemes (e.g., `file://`, `db://`, `api://`)
2. **Caching**: Cache expensive resources when appropriate
3. **Security**: Filter sensitive data before exposing
4. **Validation**: Validate template parameters
5. **Error Messages**: Provide clear error messages
6. **Documentation**: Document resource format and structure
7. **Versioning**: Consider versioning for API resources

## Resource Discovery

LLMs discover resources through the MCP protocol:

```json
{
  "resources": [
    {
      "uri": "config://app",
      "name": "Application Configuration",
      "description": "Current application configuration",
      "mimeType": "application/json"
    }
  ]
}
```

## Managing Resources

### List Resources

```typescript
class MyServer extends MCPServer {
  listResources(): ResourceInfo[] {
    return [...this.staticResources, ...this.dynamicResources];
  }
}
```

### Update Resources

```typescript
updateResource(uri: string, newContent: string): void {
  this.resourceCache.set(uri, newContent);
  this.notifyResourceUpdated(uri);
}
```

### Delete Resources

```typescript
unregisterResource(uri: string): void {
  this.dynamicResources.delete(uri);
  this.notifyResourceListChanged();
}
```

## Related Topics

- [Decorators](/guides/decorators/) - Overview of all decorators
- [Dynamic Registration](/guides/decorators/#dynamic-registration) - Runtime resource registration
- [Error Handling](/guides/error-handling/) - Error handling patterns
- [API Reference](/api/) - Complete API documentation
