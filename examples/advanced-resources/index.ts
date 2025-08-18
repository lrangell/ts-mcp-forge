#!/usr/bin/env tsx
import 'reflect-metadata';
import { Result, ok, err } from 'neverthrow';
import fs from 'fs/promises';
import path from 'path';
import {
  MCPServer,
  Tool,
  Resource,
  ResourceTemplate,
  Param,
  DynamicResource,
  DynamicPrompt,
  PromptTemplate,
  StdioTransport,
  ForgeServer,
  createDefaultLogger,
} from '../../src/index.js';

/**
 * Advanced Resources Example Server
 * Demonstrates:
 * - Subscribable resources
 * - Resource templates with URI parameters
 * - Dynamic resource registration using @DynamicResource decorator
 * - Dynamic prompt registration using @DynamicPrompt decorator
 * - Prompt templates with parameters
 * - List changed notifications
 */
class AdvancedResourcesServer extends MCPServer {
  private fileWatchers: Map<string, NodeJS.Timeout> = new Map();
  private projectRoot: string;
  private logFiles: string[] = [];

  constructor() {
    super('Advanced Resources Server', '1.0.0');
    this.projectRoot = process.cwd();
  }

  // Static subscribable resource
  @Resource('memory://system/stats', {
    description: 'System memory statistics',
    subscribable: true,
  })
  async getSystemStats(): Promise<Result<any, string>> {
    const memUsage = process.memoryUsage();
    return ok({
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      uptime: Math.round(process.uptime()) + ' seconds',
      timestamp: new Date().toISOString(),
    });
  }

  // Resource template for accessing files
  @ResourceTemplate('file:///{path}', {
    name: 'Project Files',
    description: 'Access files in the project directory',
    mimeType: 'text/plain',
  })
  async getFile(
    @Param('File path relative to project root') params: { path: string }
  ): Promise<Result<string, string>> {
    try {
      const filePath = path.join(this.projectRoot, params.path);

      // Security check - prevent directory traversal
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(this.projectRoot)) {
        return err('Access denied: Path outside project root');
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return ok(content);
    } catch (error: any) {
      return err(`Failed to read file: ${error.message}`);
    }
  }

  // Resource template for JSON configuration files
  @ResourceTemplate('config:///{name}.json', {
    name: 'Configuration Files',
    description: 'Access JSON configuration files',
    mimeType: 'application/json',
  })
  async getConfig(
    @Param('Configuration name') params: { name: string }
  ): Promise<Result<any, string>> {
    try {
      const configPath = path.join(this.projectRoot, 'config', `${params.name}.json`);
      const content = await fs.readFile(configPath, 'utf-8');
      return ok(JSON.parse(content));
    } catch (error: any) {
      return err(`Failed to read config: ${error.message}`);
    }
  }

  // Initialize dynamic resources when server starts
  @DynamicResource('Initialize log file resources')
  async initializeDynamicResources(): Promise<void> {
    // Scan for log files in the project
    try {
      // Use current directory if projectRoot is not set
      const searchPath = this.projectRoot || process.cwd();
      const files = await fs.readdir(searchPath);
      this.logFiles = files.filter((f) => f.endsWith('.log'));

      // Register each log file as a dynamic resource
      for (const logFile of this.logFiles) {
        const uri = `log://${logFile}`;

        const handler = async (): Promise<Result<string, string>> => {
          try {
            const fullPath = path.join(this.projectRoot, logFile);
            const content = await fs.readFile(fullPath, 'utf-8');
            return ok(content);
          } catch (error: any) {
            return err(`Failed to read log: ${error.message}`);
          }
        };

        this.registerResource(uri, handler, `Log file: ${logFile}`, true);
      }
    } catch (error) {
      this.logger.error('Failed to initialize log resources:', error);
    }
  }

  // Tool to manually register additional log resources
  @Tool('register-log-resource', 'Register a log file as a dynamic resource')
  async registerLogResource(
    @Param('Path to log file') logPath: string,
    @Param('Enable subscriptions') subscribable: boolean = false
  ): Promise<Result<string, string>> {
    const uri = `log://${logPath}`;

    // Check if already registered
    if (this.logFiles.includes(logPath)) {
      return err(`Resource already registered: ${uri}`);
    }

    // Create handler for the dynamic resource
    const handler = async (): Promise<Result<string, string>> => {
      try {
        const fullPath = path.join(this.projectRoot, logPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        return ok(content);
      } catch (error: any) {
        return err(`Failed to read log: ${error.message}`);
      }
    };

    // Register the resource dynamically
    return this.registerResource(uri, handler, `Dynamic log file: ${logPath}`, subscribable)
      .map(() => {
        this.logFiles.push(logPath);

        // If subscribable, simulate updates
        if (subscribable) {
          this.startWatchingFile(uri, logPath);
        }

        return `Successfully registered resource: ${uri}`;
      })
      .mapErr((error) => error.message);
  }

  // Tool to unregister dynamic resources
  @Tool('unregister-resource', 'Unregister a dynamic resource')
  async unregisterDynamicResource(
    @Param('Resource URI') uri: string
  ): Promise<Result<string, string>> {
    // Stop watching if applicable
    this.stopWatchingFile(uri);

    return this.unregisterResource(uri)
      .map(() => `Successfully unregistered resource: ${uri}`)
      .mapErr((error) => error.message);
  }

  // Tool to trigger resource update notification
  @Tool('notify-update', 'Trigger a resource update notification')
  async triggerUpdate(@Param('Resource URI') uri: string): Promise<Result<string, string>> {
    return (await this.notifyResourceUpdate(uri))
      .map(() => `Notification sent for: ${uri}`)
      .mapErr((error) => error.message);
  }

  private startWatchingFile(uri: string, _filePath: string): void {
    // Simulate file watching with periodic checks
    const watcher = setInterval(async () => {
      // In a real implementation, use fs.watch or chokidar
      await this.notifyResourceUpdate(uri);
    }, 10000); // Check every 10 seconds

    this.fileWatchers.set(uri, watcher);
  }

  private stopWatchingFile(uri: string): void {
    const watcher = this.fileWatchers.get(uri);
    if (watcher) {
      clearInterval(watcher);
      this.fileWatchers.delete(uri);
    }
  }

  // Initialize dynamic prompts when server starts
  @DynamicPrompt('Initialize analysis prompts')
  initializeDynamicPrompts(): void {
    // Register a prompt for log analysis
    this.registerPrompt(
      'analyze-logs',
      async (logType: string, timeRange: string) =>
        ok({
          messages: [
            {
              role: 'system',
              content:
                'You are a log analysis expert. Focus on identifying errors, warnings, and patterns.',
            },
            {
              role: 'user',
              content: `Analyze ${logType} logs from the ${timeRange} time range. Look for:
1. Error patterns and their frequency
2. Warning messages that might indicate issues
3. Performance bottlenecks
4. Security concerns
5. Unusual patterns or anomalies`,
            },
          ],
        }),
      'Prompt for analyzing log files',
      [
        {
          index: 0,
          name: 'logType',
          description: 'Type of logs (e.g., application, system, security)',
        },
        {
          index: 1,
          name: 'timeRange',
          description: 'Time range to analyze (e.g., last hour, today, this week)',
        },
      ]
    );

    // Register a prompt for config validation
    this.registerPrompt(
      'validate-config',
      async (configName: string) =>
        ok({
          messages: [
            {
              role: 'user',
              content: `Validate the configuration file: ${configName}. Check for:
- Missing required fields
- Invalid values or types
- Security issues (exposed secrets, weak settings)
- Performance implications
- Best practices compliance`,
            },
          ],
        }),
      'Prompt for validating configuration files',
      [{ index: 0, name: 'configName', description: 'Name of the configuration to validate' }]
    );
  }

  // Prompt templates for different file types
  @PromptTemplate('debug/{language}/{issue}', {
    description: 'Generate debugging prompts for specific languages and issues',
  })
  async getDebugPrompt(params: {
    language: string;
    issue: string;
  }): Promise<Result<object, string>> {
    const debugStrategies: Record<string, string> = {
      javascript: 'Use console.log, debugger statements, and Chrome DevTools',
      python: 'Use print statements, pdb debugger, and logging module',
      rust: 'Use println!, dbg! macro, and rust-gdb',
      go: 'Use fmt.Println, Delve debugger, and pprof',
    };

    const strategy =
      debugStrategies[params.language.toLowerCase()] || 'Use appropriate debugging tools';

    return ok({
      messages: [
        {
          role: 'system',
          content: `You are a ${params.language} debugging expert.`,
        },
        {
          role: 'user',
          content: `Help me debug this ${params.issue} issue in ${params.language}. 
Debugging strategy: ${strategy}
Please provide:
1. Common causes of this issue
2. Step-by-step debugging approach
3. Code examples to identify the problem
4. Potential fixes`,
        },
      ],
    });
  }

  @PromptTemplate('optimize/{resource}/{metric}', {
    description: 'Generate optimization prompts for different resources and metrics',
  })
  async getOptimizationPrompt(params: {
    resource: string;
    metric: string;
  }): Promise<Result<object, string>> {
    return ok({
      messages: [
        {
          role: 'user',
          content: `Provide optimization strategies for improving ${params.metric} of ${params.resource}.
Focus on:
1. Current bottlenecks and their impact
2. Quick wins (easy optimizations with high impact)
3. Long-term improvements
4. Trade-offs to consider
5. Monitoring and measurement approaches`,
        },
      ],
    });
  }
}

// Start the server
async function main() {
  const logger = createDefaultLogger('AdvancedResourcesServer');
  
  logger.info('Starting Advanced Resources MCP Server...');

  const server = new AdvancedResourcesServer();
  
  await new ForgeServer(server)
    .setTransport(new StdioTransport())
    .setLogger(logger)
    .setInstructions('Advanced Resources Server demonstrating subscribable resources, templates, and dynamic registration')
    .start();
}

main().catch((error) => {
  const logger = createDefaultLogger('AdvancedResourcesServer');
  logger.error('Failed to start server:', error);
  process.exit(1);
});
