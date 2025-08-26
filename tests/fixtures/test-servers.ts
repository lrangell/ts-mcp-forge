/**
 * Test server implementations for comprehensive MCP testing
 */

import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../src/core/server.js';
import { ResourceErrors } from '../../src/core/mcp-errors.js';
import {
  Tool,
  Resource,
  ResourceTemplate,
  Prompt,
  PromptTemplate,
  Param,
  DynamicResource,
  DynamicPrompt,
} from '../../src/decorators/index.js';

/**
 * Comprehensive test server that implements all MCP features
 */
export class ComprehensiveTestServer extends MCPServer {
  private fileSystem: Map<string, string> = new Map();
  private apiData: Map<string, any> = new Map();
  private subscribers: Set<string> = new Set();

  constructor() {
    super('Comprehensive Test Server', '1.0.0');

    // Initialize test data
    this.fileSystem.set('/project/README.md', '# Test Project\n\nThis is a test project.');
    this.fileSystem.set('/project/package.json', '{"name": "test", "version": "1.0.0"}');
    this.fileSystem.set('/logs/2025-01-01.log', '[INFO] Application started');
    this.fileSystem.set('/logs/2025-01-02.log', '[INFO] Processing requests');

    this.apiData.set('users/1', { id: 1, name: 'John Doe', email: 'john@example.com' });
    this.apiData.set('users/2', { id: 2, name: 'Jane Smith', email: 'jane@example.com' });
  }

  // Tools
  @Tool('calculator', 'Performs arithmetic operations')
  async calculate(
    @Param('Arithmetic operation') operation: 'add' | 'subtract' | 'multiply' | 'divide',
    @Param('First operand') a: number,
    @Param('Second operand') b: number
  ): Promise<Result<number, string>> {
    switch (operation) {
      case 'add':
        return ok(a + b);
      case 'subtract':
        return ok(a - b);
      case 'multiply':
        return ok(a * b);
      case 'divide':
        if (b === 0) {
          return err('Division by zero is not allowed');
        }
        return ok(a / b);
      default:
        return err(`Unknown operation: ${operation}`);
    }
  }

  @Tool('file_write', 'Writes content to a file')
  async writeFile(
    @Param('File path') path: string,
    @Param('File content') content: string
  ): Promise<Result<string, string>> {
    try {
      this.fileSystem.set(path, content);

      // Notify subscribers if this is a watched file
      if (this.subscribers.has(path)) {
        await this.notifyResourceUpdate(`file://${path}`);
      }

      return ok(`File written successfully: ${path}`);
    } catch (error) {
      return err(`Failed to write file: ${error}`);
    }
  }

  @Tool('image_generator', 'Generates a test image')
  async generateImage(
    @Param('Image type') type: 'png' | 'jpeg',
    @Param('Width') width: number = 100,
    @Param('Height') height: number = 100
  ): Promise<Result<{ image: string; mimeType: string }, string>> {
    const testImageData =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const dimensions = `${width}x${height}`;

    return ok({
      image: testImageData,
      mimeType: type === 'png' ? 'image/png' : 'image/jpeg',
      dimensions,
    });
  }

  @Tool('error_tool', 'Always returns an error for testing')
  async errorTool(): Promise<Result<never, string>> {
    return err('This tool always fails for testing error handling');
  }

  @Tool('slow_tool', 'Simulates a slow operation')
  async slowTool(
    @Param('Delay in milliseconds') delay: number = 1000
  ): Promise<Result<string, string>> {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return ok(`Operation completed after ${delay}ms`);
  }

  // Resources
  @Resource('file:///project/README.md', 'Project README file')
  async getReadme(): Promise<Result<string, string>> {
    const content = this.fileSystem.get('/project/README.md');
    if (!content) {
      return err('README.md not found');
    }
    return ok(content);
  }

  @Resource('file:///project/package.json', 'Project package.json')
  async getPackageJson(): Promise<Result<object, string>> {
    const content = this.fileSystem.get('/project/package.json');
    if (!content) {
      return err('package.json not found');
    }
    try {
      return ok(JSON.parse(content));
    } catch (error) {
      return err(`Invalid JSON: ${error}`);
    }
  }

  @Resource('https://api.example.com/status', {
    description: 'API status endpoint',
    subscribable: true,
  })
  async getApiStatus(): Promise<Result<object, string>> {
    return ok({
      status: 'online',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(Math.random() * 86400),
      version: '2.1.0',
    });
  }

  @Resource('memory://cache', 'In-memory cache data')
  async getCacheData(): Promise<Result<object, string>> {
    return ok({
      entries: Array.from(this.apiData.entries()).map(([key, value]) => ({ key, value })),
      size: this.apiData.size,
      lastAccess: new Date().toISOString(),
    });
  }

  // Resource Templates
  @ResourceTemplate('file:///logs/{date}', {
    name: 'Daily Logs',
    description: 'Daily log files',
    mimeType: 'text/plain',
  })
  async getLogFile(params: {
    date: string;
  }): Promise<Result<string, (typeof ResourceErrors)[keyof typeof ResourceErrors]>> {
    const logPath = `/logs/${params.date}.log`;
    const content = this.fileSystem.get(logPath);

    if (!content) {
      return err(ResourceErrors.notFound(`file:///logs/${params.date}`));
    }

    return ok(content);
  }

  @ResourceTemplate('https://api.example.com/users/{userId}', {
    name: 'User Profile',
    description: 'User profile data',
    mimeType: 'application/json',
  })
  async getUserProfile(params: {
    userId: string;
  }): Promise<Result<object, (typeof ResourceErrors)[keyof typeof ResourceErrors]>> {
    const userData = this.apiData.get(`users/${params.userId}`);

    if (!userData) {
      return err(ResourceErrors.notFound(`https://api.example.com/users/${params.userId}`));
    }

    return ok(userData);
  }

  @ResourceTemplate('git://repo/commit/{hash}', {
    name: 'Git Commit',
    description: 'Git commit information',
  })
  async getCommitInfo(params: { hash: string }): Promise<Result<object, string>> {
    // Simulate git commit data
    return ok({
      hash: params.hash,
      author: 'Test Author',
      date: '2025-01-01T12:00:00Z',
      message: `Test commit ${params.hash}`,
      files: ['src/main.ts', 'README.md'],
    });
  }

  // Prompts
  @Prompt('code_review', 'Code review assistant')
  async codeReviewPrompt(
    @Param('Programming language') language: string,
    @Param('Code focus area', { required: false }) focus?: string
  ): Promise<Result<object, string>> {
    const focusText = focus ? ` with a focus on ${focus}` : '';

    return ok({
      description: `Code review prompt for ${language}${focusText}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please review this ${language} code${focusText}. Look for potential issues, improvements, and best practices.`,
          },
        },
      ],
    });
  }

  @Prompt('summarize', 'Text summarization assistant')
  async summarizePrompt(
    @Param('Text to summarize') text: string,
    @Param('Summary length', { required: false }) length: 'short' | 'medium' | 'long' = 'medium'
  ): Promise<Result<object, string>> {
    const lengthInstructions = {
      short: 'in 1-2 sentences',
      medium: 'in 1-2 paragraphs',
      long: 'in detail with multiple paragraphs',
    };

    return ok({
      description: `Summarize text ${lengthInstructions[length]}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please summarize the following text ${lengthInstructions[length]}:\n\n${text}`,
          },
        },
      ],
    });
  }

  @Prompt('translate', 'Translation assistant')
  async translatePrompt(
    @Param('Source language') from: string,
    @Param('Target language') to: string,
    @Param('Text to translate') text: string
  ): Promise<Result<object, string>> {
    return ok({
      description: `Translate text from ${from} to ${to}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please translate the following text from ${from} to ${to}:\n\n${text}`,
          },
        },
      ],
    });
  }

  // Prompt Templates
  @PromptTemplate('analyze/{type}', { description: 'Analysis prompts by type' })
  async getAnalysisPrompt(params: { type: string }): Promise<Result<object, string>> {
    const analysisTypes = {
      security: 'Analyze for security vulnerabilities and best practices',
      performance: 'Analyze for performance optimizations and bottlenecks',
      accessibility: 'Analyze for accessibility compliance and improvements',
      seo: 'Analyze for SEO optimization opportunities',
    };

    const instruction =
      analysisTypes[params.type as keyof typeof analysisTypes] ||
      `Perform a ${params.type} analysis`;

    return ok({
      description: `${params.type} analysis prompt`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: instruction,
          },
        },
      ],
    });
  }

  // Dynamic Resources
  @DynamicResource('Initialize dynamic file resources')
  initializeDynamicResources(): void {
    // Register dynamic resources for all files in the file system
    // Skip files that are already registered as static resources
    const staticResourcePaths = ['/project/README.md', '/project/package.json'];

    for (const [path, content] of this.fileSystem.entries()) {
      if (staticResourcePaths.includes(path)) {
        continue; // Skip paths that are already static resources
      }

      const uri = `file://${path}`;

      this.registerResource(
        uri,
        async () => ok(content),
        `Dynamic file resource: ${path}`,
        path.includes('log') // Log files are subscribable
      );
    }

    // Register a live data resource
    this.registerResource(
      'live://random-data',
      async () =>
        ok({
          timestamp: Date.now(),
          randomValue: Math.random(),
          counter: Math.floor(Math.random() * 1000),
        }),
      'Live random data that updates',
      true
    );
  }

  // Dynamic Prompts
  @DynamicPrompt('Initialize dynamic prompt templates')
  initializeDynamicPrompts(): void {
    // Register dynamic prompts for different programming languages
    const languages = ['javascript', 'python', 'rust', 'go', 'java'];

    languages.forEach((lang) => {
      this.registerPrompt(
        `${lang}_expert`,
        async (topic: string) =>
          ok({
            description: `${lang} expert advice`,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `As a ${lang} expert, please help me with: ${topic}`,
                },
              },
            ],
          }),
        `Expert assistance for ${lang} programming`,
        [{ index: 0, name: 'topic', description: 'What you need help with' }]
      );
    });
  }

  // Completion helpers
  protected async getTemplateCompletions(template: any, currentValue: string): Promise<string[]> {
    if (template.uriTemplate.includes('/logs/{date}')) {
      // Return date completions
      const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
      return dates.filter((date) => date.includes(currentValue));
    }

    if (template.uriTemplate.includes('/users/{userId}')) {
      // Return user ID completions
      const userIds = ['1', '2', '3', '4', '5'];
      return userIds.filter((id) => id.includes(currentValue));
    }

    return [];
  }

  protected async getParamCompletions(
    param: { name: string; type: string; description?: string },
    currentValue: string
  ): Promise<Array<{ value: string; description?: string }>> {
    if (param.name === 'language') {
      const languages = [
        { value: 'javascript', description: 'JavaScript programming language' },
        { value: 'typescript', description: 'TypeScript programming language' },
        { value: 'python', description: 'Python programming language' },
        { value: 'rust', description: 'Rust programming language' },
        { value: 'go', description: 'Go programming language' },
        { value: 'java', description: 'Java programming language' },
      ];
      return languages.filter((lang) =>
        lang.value.toLowerCase().includes(currentValue.toLowerCase())
      );
    }

    if (param.name === 'operation') {
      const operations = [
        { value: 'add', description: 'Addition operation' },
        { value: 'subtract', description: 'Subtraction operation' },
        { value: 'multiply', description: 'Multiplication operation' },
        { value: 'divide', description: 'Division operation' },
      ];
      return operations.filter((op) => op.value.toLowerCase().includes(currentValue.toLowerCase()));
    }

    return [];
  }

  // Helper methods for testing
  addFileToFileSystem(path: string, content: string): void {
    this.fileSystem.set(path, content);
    // Also register it as a dynamic resource
    const uri = `file://${path}`;
    this.registerResource(uri, async () => ok(content), `Dynamic file resource: ${path}`, false);
  }

  removeFileFromFileSystem(path: string): void {
    this.fileSystem.delete(path);
    // Also unregister the resource
    const uri = `file://${path}`;
    this.unregisterResource(uri);
  }

  addApiData(key: string, data: any): void {
    this.apiData.set(key, data);
  }

  async simulateFileChange(path: string, newContent: string): Promise<void> {
    this.fileSystem.set(path, newContent);
    await this.notifyResourceUpdate(`file://${path}`);
  }
}

/**
 * Minimal test server for basic functionality testing
 */
export class MinimalTestServer extends MCPServer {
  constructor() {
    super('Minimal Test Server', '0.1.0');
  }

  @Tool('echo', 'Simple echo tool')
  async echo(@Param('Text to echo') text: string): Promise<Result<string, string>> {
    return ok(`Echo: ${text}`);
  }

  @Resource('test://simple', 'Simple test resource')
  async getSimpleResource(): Promise<Result<string, string>> {
    return ok('Simple resource content');
  }

  @Prompt('simple', 'Simple test prompt')
  async getSimplePrompt(@Param('Input') input: string): Promise<Result<object, string>> {
    return ok({
      description: 'Simple prompt response',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Process this input: ${input}`,
          },
        },
      ],
    });
  }
}

/**
 * Error-prone test server for error handling testing
 */
export class ErrorTestServer extends MCPServer {
  constructor() {
    super('Error Test Server', '1.0.0');
  }

  @Tool('timeout_tool', 'Tool that times out')
  async timeoutTool(): Promise<Result<never, string>> {
    // Simulate a timeout
    await new Promise((resolve) => setTimeout(resolve, 30000));
    return err('This should timeout');
  }

  @Tool('invalid_output', 'Tool with invalid output')
  async invalidOutputTool(): Promise<Result<any, string>> {
    // Return invalid data structure
    return ok({
      invalidStructure: true,
      circularRef: {} as any,
    });
  }

  @Resource('error://not-found', 'Resource that always returns not found')
  async notFoundResource(): Promise<Result<never, string>> {
    return err('Resource not found');
  }

  @Resource('error://internal', 'Resource that throws internal error')
  async internalErrorResource(): Promise<Result<never, string>> {
    throw new Error('Internal server error');
  }

  @Prompt('invalid_prompt', 'Prompt with invalid response')
  async invalidPrompt(): Promise<Result<any, string>> {
    return ok({
      // Missing required fields
      invalidPromptResponse: true,
    });
  }
}

/**
 * Security test server for testing security constraints
 */
export class SecurityTestServer extends MCPServer {
  constructor() {
    super('Security Test Server', '1.0.0');
  }

  @Tool('sql_query', 'Simulated SQL query tool (for injection testing)')
  async sqlQuery(@Param('SQL query') query: string): Promise<Result<string, string>> {
    // Check for SQL injection patterns
    const dangerousPatterns = [
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+.*set/i,
      /union\s+select/i,
      /;\s*--/,
      /'\s*or\s*'1'\s*=\s*'1/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return err('Potentially dangerous SQL query detected');
      }
    }

    return ok(`Query result for: ${query}`);
  }

  @Resource('file://sensitive-data', 'Sensitive data resource')
  async getSensitiveData(): Promise<Result<object, string>> {
    // Simulate access control
    return ok({
      message: 'This would contain sensitive data in a real system',
      accessTime: new Date().toISOString(),
    });
  }

  @Tool('file_access', 'File access tool (for path traversal testing)')
  async fileAccess(@Param('File path') path: string): Promise<Result<string, string>> {
    // Check for path traversal attempts
    if (path.includes('..') || path.includes('~') || path.startsWith('/etc/')) {
      return err('Path traversal attempt detected');
    }

    return ok(`File content for: ${path}`);
  }
}
