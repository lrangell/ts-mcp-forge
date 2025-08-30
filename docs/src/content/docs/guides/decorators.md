---
title: Decorators
description: Understanding decorators in TS MCP Forge
---

Decorators are the heart of TS MCP Forge. They provide a clean, declarative way to define MCP server capabilities.

## Available Decorators

### @Tool

Define a tool that can be called by the LLM:

```typescript
@Tool({
  name: 'calculate',  // Optional: defaults to method name
  description: 'Perform a calculation',
  inputSchema: {      // Optional: auto-inferred from parameters
    type: 'object',
    properties: {
      expression: { type: 'string' }
    }
  }
})
calculate(expression: string): number {
  return eval(expression); // Simplified example
}
```

### @Resource

Define a resource that can be read by the LLM:

```typescript
@Resource({
  uri: 'file:///config.json',
  name: 'Configuration',
  description: 'Application configuration',
  mimeType: 'application/json'
})
getConfig(): string {
  return JSON.stringify(this.config);
}
```

### @ResourceTemplate

Define a parameterized resource:

```typescript
@ResourceTemplate({
  uriTemplate: 'file:///{path}',
  name: 'File Reader',
  description: 'Read any file',
  mimeType: 'text/plain'
})
readFile(path: string): string {
  return fs.readFileSync(path, 'utf-8');
}
```

### @Prompt

Define a prompt template:

```typescript
@Prompt({
  name: 'debug',
  description: 'Generate a debug prompt',
  arguments: [
    { name: 'error', description: 'Error message', required: true },
    { name: 'context', description: 'Additional context', required: false }
  ]
})
debugPrompt(error: string, context?: string): string {
  return `Debug this error: ${error}${context ? `\nContext: ${context}` : ''}`;
}
```

### @PromptTemplate

Define a parameterized prompt:

```typescript
@PromptTemplate({
  nameTemplate: 'review-{type}',
  description: 'Generate review prompts',
  arguments: [
    { name: 'content', description: 'Content to review', required: true }
  ]
})
reviewPrompt(type: string, content: string): string {
  return `Please review this ${type}:\n${content}`;
}
```

## Dynamic Registration

### @DynamicResource

Initialize resources at runtime:

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
    }, () => fs.readFileSync(`./data/${file}`, 'utf-8'));
  }
}
```

### @DynamicPrompt

Initialize prompts at runtime:

```typescript
@DynamicPrompt()
async initializePrompts(): Promise<void> {
  const templates = await this.loadTemplates();
  for (const template of templates) {
    this.registerPrompt({
      name: template.name,
      description: template.description,
      arguments: template.arguments
    }, (...args) => this.renderTemplate(template, args));
  }
}
```

## Decorator Metadata

All decorators store metadata that's used by the framework:

```typescript
// The framework automatically extracts:
// - Method name
// - Parameter names and types
// - Return type
// - JSDoc comments

/**
 * Calculate the sum of numbers
 * @param numbers - Array of numbers to sum
 * @returns The sum of all numbers
 */
@Tool()
sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}
```

## Combining Decorators

You can apply multiple decorators to organize functionality:

```typescript
class FileServer extends MCPServer {
  @Resource({ uri: 'file:///readme', name: 'README' })
  @Tool({ description: 'Get the README file' })
  getReadme(): string {
    return this.readmeContent;
  }
}
```

## Type Safety

The framework provides full type safety:

```typescript
// TypeScript will enforce parameter types
@Tool()
divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}

// The framework generates this schema automatically:
{
  type: 'object',
  properties: {
    a: { type: 'number' },
    b: { type: 'number' }
  },
  required: ['a', 'b']
}
```

## Best Practices

1. **Use descriptive names**: Tool and resource names should be clear and action-oriented
2. **Provide descriptions**: Always include descriptions for better LLM understanding
3. **Handle errors gracefully**: Use Result types for proper error handling
4. **Keep methods focused**: Each decorated method should do one thing well
5. **Use TypeScript types**: Let the framework infer schemas from your types

## Next Steps

- Learn about [Error Handling](/guides/error-handling/)
- Explore [Tools](/guides/tools/) in detail
- Understand [Resources](/guides/resources/)
- Master [Prompts](/guides/prompts/)
