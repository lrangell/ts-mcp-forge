---
title: File System Server Example
description: A file system MCP server with safe file operations
---

This example demonstrates a file system server with safe read/write operations and directory management.

## Complete Implementation

```typescript
import { MCPServer, Tool, Resource, ResourceTemplate } from 'ts-mcp-forge';
import { StdioTransport } from '@modelcontextprotocol/sdk/node';
import { Result, ok, err } from 'neverthrow';
import { ToolErrors, ResourceErrors } from 'ts-mcp-forge';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

class FileSystemServer extends MCPServer {
  private readonly rootDir: string;
  private readonly allowedExtensions = ['.txt', '.md', '.json', '.yml', '.yaml'];

  constructor(rootDir: string = process.cwd()) {
    super();
    this.rootDir = path.resolve(rootDir);
  }

  // File Operations
  @Tool({ description: 'Read a file' })
  async readFile(
    filePath: string
  ): Promise<Result<string, ToolErrors.NotFound | ToolErrors.Unauthorized>> {
    const fullPath = this.resolvePath(filePath);

    if (!this.isPathSafe(fullPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return ok(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return err(ToolErrors.NotFound(`File not found: ${filePath}`));
      }
      return err(ToolErrors.Internal(`Read error: ${error.message}`));
    }
  }

  @Tool({ description: 'Write to a file' })
  async writeFile(
    filePath: string,
    content: string
  ): Promise<Result<void, ToolErrors.Unauthorized | ToolErrors.InvalidParams>> {
    const fullPath = this.resolvePath(filePath);
    const ext = path.extname(filePath);

    if (!this.isPathSafe(fullPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    if (!this.allowedExtensions.includes(ext)) {
      return err(
        ToolErrors.InvalidParams(
          `File type not allowed. Allowed types: ${this.allowedExtensions.join(', ')}`
        )
      );
    }

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      return ok(undefined);
    } catch (error: any) {
      return err(ToolErrors.Internal(`Write error: ${error.message}`));
    }
  }

  @Tool({ description: 'Delete a file' })
  async deleteFile(
    filePath: string
  ): Promise<Result<void, ToolErrors.NotFound | ToolErrors.Unauthorized>> {
    const fullPath = this.resolvePath(filePath);

    if (!this.isPathSafe(fullPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    try {
      await fs.unlink(fullPath);
      return ok(undefined);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return err(ToolErrors.NotFound(`File not found: ${filePath}`));
      }
      return err(ToolErrors.Internal(`Delete error: ${error.message}`));
    }
  }

  @Tool({ description: 'Copy a file' })
  async copyFile(
    source: string,
    destination: string
  ): Promise<Result<void, ToolErrors.NotFound | ToolErrors.Unauthorized>> {
    const sourcePath = this.resolvePath(source);
    const destPath = this.resolvePath(destination);

    if (!this.isPathSafe(sourcePath) || !this.isPathSafe(destPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    try {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      return ok(undefined);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return err(ToolErrors.NotFound(`Source file not found: ${source}`));
      }
      return err(ToolErrors.Internal(`Copy error: ${error.message}`));
    }
  }

  @Tool({ description: 'Move/rename a file' })
  async moveFile(
    source: string,
    destination: string
  ): Promise<Result<void, ToolErrors.NotFound | ToolErrors.Unauthorized>> {
    const sourcePath = this.resolvePath(source);
    const destPath = this.resolvePath(destination);

    if (!this.isPathSafe(sourcePath) || !this.isPathSafe(destPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    try {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.rename(sourcePath, destPath);
      return ok(undefined);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return err(ToolErrors.NotFound(`Source file not found: ${source}`));
      }
      return err(ToolErrors.Internal(`Move error: ${error.message}`));
    }
  }

  // Directory Operations
  @Tool({ description: 'List directory contents' })
  async listDirectory(
    dirPath: string = '.'
  ): Promise<Result<DirectoryEntry[], ToolErrors.NotFound | ToolErrors.Unauthorized>> {
    const fullPath = this.resolvePath(dirPath);

    if (!this.isPathSafe(fullPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const result: DirectoryEntry[] = [];

      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry.name);
        const stats = await fs.stat(entryPath);

        result.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
          path: path.relative(this.rootDir, entryPath),
        });
      }

      return ok(result);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return err(ToolErrors.NotFound(`Directory not found: ${dirPath}`));
      }
      return err(ToolErrors.Internal(`List error: ${error.message}`));
    }
  }

  @Tool({ description: 'Create a directory' })
  async createDirectory(dirPath: string): Promise<Result<void, ToolErrors.Unauthorized>> {
    const fullPath = this.resolvePath(dirPath);

    if (!this.isPathSafe(fullPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    try {
      await fs.mkdir(fullPath, { recursive: true });
      return ok(undefined);
    } catch (error: any) {
      return err(ToolErrors.Internal(`Create directory error: ${error.message}`));
    }
  }

  @Tool({ description: 'Delete a directory' })
  async deleteDirectory(
    dirPath: string,
    recursive: boolean = false
  ): Promise<Result<void, ToolErrors.NotFound | ToolErrors.Unauthorized>> {
    const fullPath = this.resolvePath(dirPath);

    if (!this.isPathSafe(fullPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    try {
      await fs.rmdir(fullPath, { recursive });
      return ok(undefined);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return err(ToolErrors.NotFound(`Directory not found: ${dirPath}`));
      }
      return err(ToolErrors.Internal(`Delete directory error: ${error.message}`));
    }
  }

  // File Information
  @Tool({ description: 'Get file information' })
  async getFileInfo(
    filePath: string
  ): Promise<Result<FileInfo, ToolErrors.NotFound | ToolErrors.Unauthorized>> {
    const fullPath = this.resolvePath(filePath);

    if (!this.isPathSafe(fullPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    try {
      const stats = await fs.stat(fullPath);

      return ok({
        name: path.basename(fullPath),
        path: path.relative(this.rootDir, fullPath),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        permissions: stats.mode,
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return err(ToolErrors.NotFound(`File not found: ${filePath}`));
      }
      return err(ToolErrors.Internal(`File info error: ${error.message}`));
    }
  }

  // Search
  @Tool({ description: 'Search for files' })
  async searchFiles(
    pattern: string,
    searchIn: string = '.'
  ): Promise<Result<string[], ToolErrors.Unauthorized>> {
    const searchPath = this.resolvePath(searchIn);

    if (!this.isPathSafe(searchPath)) {
      return err(ToolErrors.Unauthorized('Access denied: Path outside root directory'));
    }

    try {
      const results: string[] = [];
      await this.searchRecursive(searchPath, pattern, results);
      return ok(results.map((p) => path.relative(this.rootDir, p)));
    } catch (error: any) {
      return err(ToolErrors.Internal(`Search error: ${error.message}`));
    }
  }

  // Resources
  @ResourceTemplate({
    uriTemplate: 'file:///{path}',
    name: 'File Content',
    description: 'Read file content',
    mimeType: 'text/plain',
  })
  async fileResource(filePath: string): Promise<string> {
    const result = await this.readFile(filePath);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    return result.value;
  }

  @Resource({
    uri: 'fs://tree',
    name: 'Directory Tree',
    description: 'Full directory tree structure',
    mimeType: 'application/json',
  })
  async getDirectoryTree(): Promise<string> {
    const tree = await this.buildTree(this.rootDir);
    return JSON.stringify(tree, null, 2);
  }

  @Resource({
    uri: 'fs://stats',
    name: 'File System Statistics',
    description: 'Statistics about the file system',
    mimeType: 'application/json',
  })
  async getStats(): Promise<string> {
    const stats = await this.calculateStats(this.rootDir);
    return JSON.stringify(stats, null, 2);
  }

  // Helper Methods
  private resolvePath(filePath: string): string {
    return path.resolve(this.rootDir, filePath);
  }

  private isPathSafe(fullPath: string): boolean {
    const relative = path.relative(this.rootDir, fullPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  private async searchRecursive(dir: string, pattern: string, results: string[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.searchRecursive(fullPath, pattern, results);
      } else if (entry.name.includes(pattern)) {
        results.push(fullPath);
      }
    }
  }

  private async buildTree(dir: string): Promise<TreeNode> {
    const stats = await fs.stat(dir);
    const name = path.basename(dir);

    if (!stats.isDirectory()) {
      return { name, type: 'file', size: stats.size };
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    const children: TreeNode[] = [];

    for (const entry of entries) {
      const childPath = path.join(dir, entry.name);
      if (this.isPathSafe(childPath)) {
        children.push(await this.buildTree(childPath));
      }
    }

    return { name, type: 'directory', children };
  }

  private async calculateStats(dir: string): Promise<FileSystemStats> {
    let fileCount = 0;
    let directoryCount = 0;
    let totalSize = 0;
    const extensions = new Map<string, number>();

    const process = async (currentDir: string) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          directoryCount++;
          await process(fullPath);
        } else {
          fileCount++;
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;

          const ext = path.extname(entry.name);
          extensions.set(ext, (extensions.get(ext) || 0) + 1);
        }
      }
    };

    await process(dir);

    return {
      fileCount,
      directoryCount,
      totalSize,
      averageFileSize: fileCount > 0 ? totalSize / fileCount : 0,
      fileTypeDistribution: Object.fromEntries(extensions),
    };
  }
}

// Type Definitions
interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
  path: string;
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: number;
}

interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  children?: TreeNode[];
}

interface FileSystemStats {
  fileCount: number;
  directoryCount: number;
  totalSize: number;
  averageFileSize: number;
  fileTypeDistribution: Record<string, number>;
}

// Main entry point
async function main() {
  const rootDir = process.argv[2] || process.cwd();
  const server = new FileSystemServer(rootDir);
  const transport = new StdioTransport();

  await server.connect(transport);
  console.error(`File System MCP server running. Root: ${rootDir}`);
}

main().catch(console.error);
```

## Security Features

- **Path Traversal Protection**: Prevents access outside root directory
- **File Type Restrictions**: Only allows safe file extensions
- **Permission Checks**: Validates all paths before operations
- **Error Handling**: Safe error messages without exposing system details

## Usage Examples

See the Calculator example for setup instructions. This server follows the same pattern but provides file system operations instead of arithmetic.

## Best Practices Demonstrated

1. **Security First**: All paths are validated and sandboxed
2. **Error Handling**: Comprehensive error handling with Result types
3. **Async Operations**: All I/O operations are asynchronous
4. **Resource Management**: Proper cleanup and error recovery
5. **Type Safety**: Full TypeScript typing throughout
