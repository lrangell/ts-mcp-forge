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
  StdioTransport,
} from '../../src/index.js';

/**
 * Advanced Resources Example Server
 * Demonstrates:
 * - Subscribable resources
 * - Resource templates with URI parameters
 * - Dynamic resource registration
 * - List changed notifications
 */
class AdvancedResourcesServer extends MCPServer {
  private fileWatchers: Map<string, NodeJS.Timeout> = new Map();
  private projectRoot: string;

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

  // Tool to demonstrate dynamic resource registration
  @Tool('register-log-resource', 'Register a log file as a dynamic resource')
  async registerLogResource(
    @Param('Path to log file') logPath: string,
    @Param('Enable subscriptions') subscribable: boolean = false
  ): Promise<Result<string, string>> {
    const uri = `log://${logPath}`;

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
    const result = this.registerResource(
      uri,
      handler,
      `Dynamic log file: ${logPath}`,
      subscribable
    );

    if (result.isErr()) {
      return err(result.error.message);
    }

    // If subscribable, simulate updates
    if (subscribable) {
      this.startWatchingFile(uri, logPath);
    }

    return ok(`Successfully registered resource: ${uri}`);
  }

  // Tool to unregister dynamic resources
  @Tool('unregister-resource', 'Unregister a dynamic resource')
  async unregisterDynamicResource(
    @Param('Resource URI') uri: string
  ): Promise<Result<string, string>> {
    // Stop watching if applicable
    this.stopWatchingFile(uri);

    const result = this.unregisterResource(uri);

    if (result.isErr()) {
      return err(result.error.message);
    }

    return ok(`Successfully unregistered resource: ${uri}`);
  }

  // Tool to trigger resource update notification
  @Tool('notify-update', 'Trigger a resource update notification')
  async triggerUpdate(@Param('Resource URI') uri: string): Promise<Result<string, string>> {
    const result = await this.notifyResourceUpdate(uri);

    if (result.isErr()) {
      return err(result.error.message);
    }

    return ok(`Notification sent for: ${uri}`);
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
}

// Start the server
async function main() {
  const server = new AdvancedResourcesServer();
  const transport = new StdioTransport();

  console.error('Starting Advanced Resources MCP Server...');
  console.error('Features:');
  console.error('- Subscribable resources (memory://system/stats)');
  console.error('- Resource templates (file:///{path}, config:///{name}.json)');
  console.error('- Dynamic resource registration via tools');
  console.error('- List changed notifications');

  await transport.start(server);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
