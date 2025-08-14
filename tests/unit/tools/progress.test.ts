import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Result, ok, err } from 'neverthrow';
import { MCPServer } from '../../../src/core/server.js';
import { Tool, Param } from '../../../src/decorators/index.js';
import { NotificationSender, NotificationManager } from '../../../src/core/notifications.js';
import { Notification } from '../../../src/core/protocol.js';

// Mock notification sender to capture progress notifications
class MockNotificationSender implements NotificationSender {
  public sentNotifications: Notification[] = [];

  async sendNotification(notification: Notification): Promise<Result<void, Error>> {
    this.sentNotifications.push(notification);
    return ok(undefined);
  }

  reset(): void {
    this.sentNotifications = [];
  }

  getProgressNotifications(): any[] {
    return this.sentNotifications.filter(
      (n) => n.method === 'notifications/progress' || n.method === 'progress'
    );
  }
}

// Custom progress notification interface for testing
interface ProgressNotification extends Notification {
  method: 'notifications/progress';
  params: {
    progressToken: string | number;
    value: number;
    total?: number;
    message?: string;
  };
}

// Test server class for progress notification testing
class ProgressTestServer extends MCPServer {
  private notificationSender: MockNotificationSender | null = null;

  constructor() {
    super('Progress Test Server', '1.0.0');
  }

  setMockNotificationSender(sender: MockNotificationSender): void {
    this.notificationSender = sender;
    this.setNotificationSender(sender);
  }

  private async sendProgressNotification(
    progressToken: string | number,
    value: number,
    total?: number,
    message?: string
  ): Promise<void> {
    if (this.notificationSender) {
      const notification: ProgressNotification = {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: {
          progressToken,
          value,
          total,
          message,
        },
      };
      await this.notificationSender.sendNotification(notification);
    }
  }

  @Tool('long-running-task', 'Simulate a long-running task with progress updates')
  async longRunningTask(
    @Param('Number of steps to process') steps: number,
    @Param('Delay between steps in milliseconds', { required: false }) delay?: number,
    @Param('Progress token for tracking', { required: false }) progressToken?: string
  ): Promise<Result<object, string>> {
    if (typeof steps !== 'number' || steps <= 0) {
      return err('Steps must be a positive number');
    }

    const actualDelay = delay || 10;
    const token = progressToken || `task-${Date.now()}`;
    const results: string[] = [];

    try {
      // Send initial progress
      await this.sendProgressNotification(token, 0, steps, 'Starting task...');

      for (let i = 1; i <= steps; i++) {
        // Simulate work
        await new Promise((resolve) => setTimeout(resolve, actualDelay));

        results.push(`Step ${i} completed`);

        // Send progress update
        await this.sendProgressNotification(token, i, steps, `Completed step ${i} of ${steps}`);
      }

      // Send completion notification
      await this.sendProgressNotification(token, steps, steps, 'Task completed successfully');

      return ok({
        status: 'completed',
        totalSteps: steps,
        results,
        progressToken: token,
      });
    } catch (error) {
      await this.sendProgressNotification(token, -1, steps, `Task failed: ${error}`);
      return err(`Task failed: ${error}`);
    }
  }

  @Tool('file-batch-processor', 'Process multiple files with progress tracking')
  async fileBatchProcessor(
    @Param('Array of file paths to process') filePaths: string[],
    @Param('Processing operation (read, validate, compress)') operation: string,
    @Param('Progress token for tracking', { required: false }) progressToken?: string
  ): Promise<Result<object, string>> {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return err('File paths array is required and cannot be empty');
    }

    const token = progressToken || `batch-${Date.now()}`;
    const results: { file: string; status: string; size?: number }[] = [];
    const total = filePaths.length;

    try {
      await this.sendProgressNotification(token, 0, total, `Starting ${operation} operation...`);

      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];

        // Simulate file processing
        await new Promise((resolve) => setTimeout(resolve, 20));

        let fileResult: { file: string; status: string; size?: number };

        if (filePath.includes('error')) {
          fileResult = { file: filePath, status: 'error' };
        } else {
          fileResult = {
            file: filePath,
            status: 'success',
            size: Math.floor(Math.random() * 10000) + 1000,
          };
        }

        results.push(fileResult);

        await this.sendProgressNotification(
          token,
          i + 1,
          total,
          `Processed ${filePath} (${i + 1}/${total})`
        );
      }

      const successCount = results.filter((r) => r.status === 'success').length;
      const errorCount = results.filter((r) => r.status === 'error').length;

      await this.sendProgressNotification(
        token,
        total,
        total,
        `Batch processing completed: ${successCount} success, ${errorCount} errors`
      );

      return ok({
        status: 'completed',
        operation,
        totalFiles: total,
        successCount,
        errorCount,
        results,
        progressToken: token,
      });
    } catch (error) {
      await this.sendProgressNotification(token, -1, total, `Batch processing failed: ${error}`);
      return err(`Batch processing failed: ${error}`);
    }
  }

  @Tool('download-simulator', 'Simulate file download with progress updates')
  async downloadSimulator(
    @Param('File URL to download') url: string,
    @Param('File size in bytes', { required: false }) fileSize?: number,
    @Param('Progress token for tracking', { required: false }) progressToken?: string
  ): Promise<Result<object, string>> {
    if (!url) {
      return err('URL is required');
    }

    const size = fileSize || 1000000; // 1MB default
    const token = progressToken || `download-${Date.now()}`;
    const chunkSize = Math.floor(size / 20); // 20 progress updates
    let downloaded = 0;

    try {
      await this.sendProgressNotification(token, 0, size, `Starting download from ${url}...`);

      while (downloaded < size) {
        // Simulate download chunk
        await new Promise((resolve) => setTimeout(resolve, 25));

        const currentChunk = Math.min(chunkSize, size - downloaded);
        downloaded += currentChunk;

        const percentage = Math.round((downloaded / size) * 100);
        await this.sendProgressNotification(
          token,
          downloaded,
          size,
          `Downloaded ${percentage}% (${downloaded}/${size} bytes)`
        );
      }

      await this.sendProgressNotification(token, size, size, 'Download completed successfully');

      return ok({
        status: 'completed',
        url,
        fileSize: size,
        downloadedBytes: downloaded,
        progressToken: token,
      });
    } catch (error) {
      await this.sendProgressNotification(token, -1, size, `Download failed: ${error}`);
      return err(`Download failed: ${error}`);
    }
  }

  @Tool('no-progress-task', 'Task that completes without progress updates')
  async noProgressTask(
    @Param('Simple input value') value: string
  ): Promise<Result<string, string>> {
    // Simulate some work without progress notifications
    await new Promise((resolve) => setTimeout(resolve, 50));
    return ok(`Processed: ${value}`);
  }

  @Tool('failing-progress-task', 'Task that fails during progress updates')
  async failingProgressTask(
    @Param('Number of steps before failure') stepsBeforeFailure: number,
    @Param('Progress token for tracking', { required: false }) progressToken?: string
  ): Promise<Result<object, string>> {
    const token = progressToken || `failing-${Date.now()}`;
    const totalSteps = stepsBeforeFailure + 5;

    try {
      await this.sendProgressNotification(token, 0, totalSteps, 'Starting task that will fail...');

      for (let i = 1; i <= stepsBeforeFailure; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        await this.sendProgressNotification(token, i, totalSteps, `Step ${i} completed`);
      }

      // Simulate failure
      await this.sendProgressNotification(
        token,
        stepsBeforeFailure,
        totalSteps,
        'Task is about to fail...'
      );

      return err('Simulated task failure after some progress');
    } catch (error) {
      return err(`Task failed: ${error}`);
    }
  }
}

describe('Tools Progress Notifications', () => {
  let server: ProgressTestServer;
  let mockSender: MockNotificationSender;

  beforeEach(() => {
    server = new ProgressTestServer();
    mockSender = new MockNotificationSender();
    server.setMockNotificationSender(mockSender);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Progress Tracking', () => {
    it('should send progress notifications for long-running tasks', async () => {
      const result = await server.callTool('long-running-task', {
        steps: 5,
        delay: 10,
        progressToken: 'test-task-1',
      });

      expect(result.isOk()).toBe(true);

      const progressNotifications = mockSender.getProgressNotifications();
      expect(progressNotifications.length).toBeGreaterThan(0);

      // Should have initial, intermediate, and final progress notifications
      expect(progressNotifications.length).toBe(7); // 0 + 1,2,3,4,5 + completion

      // Check initial notification
      expect(progressNotifications[0].params.progressToken).toBe('test-task-1');
      expect(progressNotifications[0].params.value).toBe(0);
      expect(progressNotifications[0].params.total).toBe(5);
      expect(progressNotifications[0].params.message).toContain('Starting task');

      // Check final notification
      const finalNotification = progressNotifications[progressNotifications.length - 1];
      expect(finalNotification.params.value).toBe(5);
      expect(finalNotification.params.total).toBe(5);
      expect(finalNotification.params.message).toContain('completed successfully');
    });

    it('should track progress with incremental updates', async () => {
      const result = await server.callTool('long-running-task', {
        steps: 3,
        delay: 5,
      });

      expect(result.isOk()).toBe(true);

      const progressNotifications = mockSender.getProgressNotifications();

      // Verify progressive increase in values
      const values = progressNotifications.map((n) => n.params.value);
      expect(values).toEqual([0, 1, 2, 3, 3]); // Initial, steps 1-3, completion
    });

    it('should generate unique progress tokens when not provided', async () => {
      const result1 = await server.callTool('long-running-task', {
        steps: 2,
        delay: 5,
      });

      const result2 = await server.callTool('long-running-task', {
        steps: 2,
        delay: 5,
      });

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      const progressNotifications = mockSender.getProgressNotifications();
      const tokens = progressNotifications.map((n) => n.params.progressToken);
      const uniqueTokens = [...new Set(tokens)];

      expect(uniqueTokens.length).toBe(2); // Two different tokens
    });
  });

  describe('Batch Processing Progress', () => {
    it('should track progress for batch file processing', async () => {
      const filePaths = [
        '/path/file1.txt',
        '/path/file2.txt',
        '/path/file3.txt',
        '/path/error-file.txt',
      ];

      const result = await server.callTool('file-batch-processor', {
        filePaths,
        operation: 'validate',
        progressToken: 'batch-test',
      });

      expect(result.isOk()).toBe(true);

      const progressNotifications = mockSender.getProgressNotifications();
      expect(progressNotifications.length).toBe(6); // Initial + 4 files + completion

      // Check that progress increases with each file
      const values = progressNotifications.map((n) => n.params.value);
      expect(values).toEqual([0, 1, 2, 3, 4, 4]);

      // Verify all notifications have the same token
      const tokens = progressNotifications.map((n) => n.params.progressToken);
      expect([...new Set(tokens)]).toEqual(['batch-test']);
    });

    it('should handle batch processing with mixed success/error results', async () => {
      const result = await server.callTool('file-batch-processor', {
        filePaths: ['/success.txt', '/error-file.txt', '/success2.txt'],
        operation: 'compress',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const response = JSON.parse(result.value.content[0].text);
        expect(response.successCount).toBe(2);
        expect(response.errorCount).toBe(1);
      }

      const progressNotifications = mockSender.getProgressNotifications();
      const finalNotification = progressNotifications[progressNotifications.length - 1];
      expect(finalNotification.params.message).toContain('2 success, 1 errors');
    });
  });

  describe('Download Progress Simulation', () => {
    it('should track download progress with byte-level updates', async () => {
      const result = await server.callTool('download-simulator', {
        url: 'https://example.com/file.zip',
        fileSize: 1000,
        progressToken: 'download-test',
      });

      expect(result.isOk()).toBe(true);

      const progressNotifications = mockSender.getProgressNotifications();
      expect(progressNotifications.length).toBeGreaterThan(5); // Multiple progress updates

      // Check that downloaded bytes increase
      const values = progressNotifications.map((n) => n.params.value);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
      }

      // Final value should equal total
      const finalValue = values[values.length - 1];
      expect(finalValue).toBe(1000);
    });

    it('should include percentage in progress messages', async () => {
      const result = await server.callTool('download-simulator', {
        url: 'https://example.com/test.pdf',
        fileSize: 500,
      });

      expect(result.isOk()).toBe(true);

      const progressNotifications = mockSender.getProgressNotifications();
      const messages = progressNotifications.map((n) => n.params.message);

      // Should contain percentage information in intermediate messages
      const percentageMessages = messages.filter((msg) => msg?.includes('%'));
      expect(percentageMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Progress Error Handling', () => {
    it('should handle task failures with progress notifications', async () => {
      const result = await server.callTool('failing-progress-task', {
        stepsBeforeFailure: 3,
        progressToken: 'failing-test',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Simulated task failure');
      }

      const progressNotifications = mockSender.getProgressNotifications();
      expect(progressNotifications.length).toBeGreaterThan(0);

      // Should have progress updates before failure
      const values = progressNotifications.map((n) => n.params.value);
      expect(values).toContain(0); // Initial
      expect(values).toContain(1); // First step
      expect(values).toContain(2); // Second step
      expect(values).toContain(3); // Third step
    });

    it('should handle invalid parameters without progress', async () => {
      const result = await server.callTool('long-running-task', {
        steps: -1, // Invalid
      });

      expect(result.isErr()).toBe(true);

      const progressNotifications = mockSender.getProgressNotifications();
      expect(progressNotifications.length).toBe(0); // No progress notifications for failed validation
    });
  });

  describe('Tasks Without Progress', () => {
    it('should work normally for tasks without progress notifications', async () => {
      const result = await server.callTool('no-progress-task', {
        value: 'test-input',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toBe('Processed: test-input');
      }

      const progressNotifications = mockSender.getProgressNotifications();
      expect(progressNotifications.length).toBe(0); // No progress notifications
    });
  });

  describe('Progress Notification Format', () => {
    it('should send properly formatted progress notifications', async () => {
      await server.callTool('long-running-task', {
        steps: 2,
        progressToken: 'format-test',
      });

      const progressNotifications = mockSender.getProgressNotifications();

      for (const notification of progressNotifications) {
        // Check JSON-RPC format
        expect(notification.jsonrpc).toBe('2.0');
        expect(notification.method).toBe('notifications/progress');

        // Check required parameters
        expect(notification.params).toBeDefined();
        expect(notification.params.progressToken).toBe('format-test');
        expect(typeof notification.params.value).toBe('number');

        // Optional parameters should be present for this test
        expect(typeof notification.params.total).toBe('number');
        expect(typeof notification.params.message).toBe('string');
      }
    });

    it('should handle progress tokens of different types', async () => {
      const numericResult = await server.callTool('long-running-task', {
        steps: 1,
        progressToken: '12345',
      });

      expect(numericResult.isOk()).toBe(true);

      const progressNotifications = mockSender.getProgressNotifications();
      expect(progressNotifications[0].params.progressToken).toBe('12345');
    });
  });

  describe('Concurrent Progress Tracking', () => {
    it('should handle multiple concurrent tasks with different tokens', async () => {
      const [result1, result2] = await Promise.all([
        server.callTool('long-running-task', {
          steps: 2,
          delay: 10,
          progressToken: 'concurrent-1',
        }),
        server.callTool('long-running-task', {
          steps: 2,
          delay: 10,
          progressToken: 'concurrent-2',
        }),
      ]);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      const progressNotifications = mockSender.getProgressNotifications();

      const task1Notifications = progressNotifications.filter(
        (n) => n.params.progressToken === 'concurrent-1'
      );
      const task2Notifications = progressNotifications.filter(
        (n) => n.params.progressToken === 'concurrent-2'
      );

      expect(task1Notifications.length).toBeGreaterThan(0);
      expect(task2Notifications.length).toBeGreaterThan(0);

      // Each task should have its own complete progress sequence
      expect(task1Notifications.length).toBe(4); // 0, 1, 2, completion
      expect(task2Notifications.length).toBe(4); // 0, 1, 2, completion
    });
  });
});
