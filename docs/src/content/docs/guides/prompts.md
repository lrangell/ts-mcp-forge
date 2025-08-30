---
title: Prompts
description: How to define and manage prompts in TS MCP Forge
---

Prompts are reusable templates that help LLMs generate consistent, structured responses. They can include arguments that are filled in at runtime.

## Basic Prompt Definition

```typescript
import { Prompt, MCPServer } from 'ts-mcp-forge';

class MyServer extends MCPServer {
  @Prompt({
    name: 'code-review',
    description: 'Generate a code review',
    arguments: [
      { name: 'language', description: 'Programming language', required: true },
      { name: 'code', description: 'Code to review', required: true },
    ],
  })
  codeReviewPrompt(language: string, code: string): string {
    return `Please review this ${language} code:\n\n${code}\n\nProvide feedback on:\n- Code quality\n- Best practices\n- Potential bugs\n- Performance improvements`;
  }
}
```

## Prompt Configuration

The `@Prompt` decorator requires:

- **name**: Unique identifier for the prompt
- **description**: What the prompt does
- **arguments**: Array of argument definitions

## Prompt Templates

For dynamic prompt names:

```typescript
@PromptTemplate({
  nameTemplate: 'analyze-{type}',
  description: 'Analyze different types of content',
  arguments: [
    { name: 'content', description: 'Content to analyze', required: true }
  ]
})
analyzePrompt(type: string, content: string): string {
  const prompts = {
    'code': 'Analyze this code for quality and bugs',
    'text': 'Analyze this text for clarity and grammar',
    'data': 'Analyze this data for patterns and insights'
  };

  return `${prompts[type] || 'Analyze this content'}:\n\n${content}`;
}
```

## Dynamic Prompts

Register prompts at runtime:

```typescript
@DynamicPrompt()
async initializePrompts(): Promise<void> {
  const templates = await this.loadTemplates();

  for (const template of templates) {
    this.registerPrompt({
      name: template.name,
      description: template.description,
      arguments: template.arguments
    }, (...args: string[]) => {
      return this.renderTemplate(template, args);
    });
  }
}
```

## Prompt Types

### Analysis Prompts

```typescript
@Prompt({
  name: 'analyze-performance',
  description: 'Analyze code performance',
  arguments: [
    { name: 'code', description: 'Code to analyze', required: true },
    { name: 'context', description: 'Additional context', required: false }
  ]
})
performancePrompt(code: string, context?: string): string {
  return `Analyze the performance of this code:

${code}

${context ? `Context: ${context}\n\n` : ''}
Identify:
- Time complexity
- Space complexity
- Bottlenecks
- Optimization opportunities`;
}
```

### Generation Prompts

```typescript
@Prompt({
  name: 'generate-tests',
  description: 'Generate unit tests',
  arguments: [
    { name: 'code', description: 'Code to test', required: true },
    { name: 'framework', description: 'Test framework', required: true }
  ]
})
testGenerationPrompt(code: string, framework: string): string {
  return `Generate comprehensive unit tests for this code using ${framework}:

${code}

Include:
- Happy path tests
- Edge cases
- Error scenarios
- Mock dependencies`;
}
```

### Documentation Prompts

```typescript
@Prompt({
  name: 'generate-docs',
  description: 'Generate documentation',
  arguments: [
    { name: 'code', description: 'Code to document', required: true },
    { name: 'format', description: 'Documentation format', required: false }
  ]
})
documentationPrompt(code: string, format: string = 'markdown'): string {
  return `Generate ${format} documentation for:

${code}

Include:
- Description
- Parameters
- Return values
- Examples
- Error handling`;
}
```

## Complex Examples

### Multi-Step Prompt

```typescript
@Prompt({
  name: 'refactor-guide',
  description: 'Guide for refactoring code',
  arguments: [
    { name: 'code', description: 'Code to refactor', required: true },
    { name: 'goal', description: 'Refactoring goal', required: true },
    { name: 'constraints', description: 'Constraints', required: false }
  ]
})
refactorPrompt(code: string, goal: string, constraints?: string): string {
  return `Help me refactor this code:

${code}

Goal: ${goal}
${constraints ? `\nConstraints: ${constraints}` : ''}

Provide:
1. Analysis of current code
2. Refactoring strategy
3. Step-by-step implementation
4. Before/after comparison
5. Testing recommendations`;
}
```

### Template-Based Prompt

```typescript
@Prompt({
  name: 'api-design',
  description: 'Design REST API endpoints',
  arguments: [
    { name: 'resource', description: 'Resource name', required: true },
    { name: 'operations', description: 'Required operations', required: true }
  ]
})
apiDesignPrompt(resource: string, operations: string): string {
  const template = `
Design REST API endpoints for ${resource}

Required operations: ${operations}

For each endpoint, provide:
- HTTP method
- Path
- Request body (if applicable)
- Response format
- Status codes
- Authentication requirements
- Rate limiting
- Example usage
`;
  return template;
}
```

### Context-Aware Prompt

```typescript
@Prompt({
  name: 'debug-assist',
  description: 'Assist with debugging',
  arguments: [
    { name: 'error', description: 'Error message', required: true },
    { name: 'code', description: 'Related code', required: true },
    { name: 'logs', description: 'Debug logs', required: false }
  ]
})
debugPrompt(error: string, code: string, logs?: string): string {
  return `Help debug this error:

Error: ${error}

Code:
${code}

${logs ? `Debug logs:\n${logs}\n\n` : ''}
Provide:
1. Root cause analysis
2. Possible solutions
3. Prevention strategies
4. Related issues to check`;
}
```

## Prompt Management

### Listing Prompts

```typescript
class MyServer extends MCPServer {
  listPrompts(): PromptInfo[] {
    return [...this.staticPrompts, ...this.dynamicPrompts];
  }
}
```

### Prompt Validation

```typescript
@Prompt({
  name: 'validated-prompt',
  description: 'Prompt with validation',
  arguments: [
    { name: 'type', description: 'Content type', required: true },
    { name: 'content', description: 'Content', required: true }
  ]
})
validatedPrompt(type: string, content: string): string {
  const validTypes = ['code', 'text', 'data'];

  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  if (content.length > 10000) {
    throw new Error('Content too large. Maximum 10000 characters.');
  }

  return `Process ${type}:\n\n${content}`;
}
```

## Best Practices

1. **Clear Instructions**: Provide detailed, unambiguous instructions
2. **Consistent Format**: Use consistent formatting across prompts
3. **Argument Validation**: Validate arguments before using them
4. **Context Inclusion**: Include relevant context in prompts
5. **Structured Output**: Request structured output formats
6. **Error Handling**: Handle missing or invalid arguments gracefully
7. **Documentation**: Document expected inputs and outputs

## Prompt Discovery

LLMs discover prompts through the MCP protocol:

```json
{
  "prompts": [
    {
      "name": "code-review",
      "description": "Generate a code review",
      "arguments": [
        {
          "name": "language",
          "description": "Programming language",
          "required": true
        },
        {
          "name": "code",
          "description": "Code to review",
          "required": true
        }
      ]
    }
  ]
}
```

## Advanced Features

### Chained Prompts

```typescript
@Prompt({
  name: 'complete-analysis',
  description: 'Complete code analysis',
  arguments: [
    { name: 'code', description: 'Code to analyze', required: true }
  ]
})
completeAnalysis(code: string): string {
  const security = this.securityPrompt(code);
  const performance = this.performancePrompt(code);
  const quality = this.qualityPrompt(code);

  return `${security}\n\n${performance}\n\n${quality}`;
}
```

### Conditional Prompts

```typescript
@Prompt({
  name: 'adaptive-help',
  description: 'Adaptive help based on skill level',
  arguments: [
    { name: 'topic', description: 'Help topic', required: true },
    { name: 'level', description: 'Skill level', required: true }
  ]
})
adaptiveHelp(topic: string, level: string): string {
  const prompts = {
    beginner: `Explain ${topic} in simple terms with examples`,
    intermediate: `Provide detailed explanation of ${topic} with best practices`,
    advanced: `Discuss advanced concepts and edge cases for ${topic}`
  };

  return prompts[level] || prompts.intermediate;
}
```

## Related Topics

- [Decorators](/guides/decorators/) - Overview of all decorators
- [Dynamic Registration](/guides/decorators/#dynamic-registration) - Runtime prompt registration
- [Error Handling](/guides/error-handling/) - Error handling patterns
- [API Reference](/api/) - Complete API documentation
