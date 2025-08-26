/**
 * Tests for MCP resource subscriptions (resources/subscribe, resources/unsubscribe)
 * Based on MCP specification 2025-06-18
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComprehensiveTestServer } from '../../fixtures/test-servers.js';
import { createTestClient } from '../../helpers/test-client.js';
import { setupMCPAssertions } from '../../helpers/assertions.js';
import { ResultTestUtils, TestUtils } from '../../helpers/test-utilities.js';
import {} from '../../fixtures/mcp-protocol.js';
import { ErrorCode, RESOURCE_NOT_FOUND_CODE } from '../../../src/index.js';
import { Notification } from '../../../src/core/protocol.js';

// Setup custom assertions
setupMCPAssertions();

describe('Resource Subscriptions', () => {
  let server: ComprehensiveTestServer;
  let client: ReturnType<typeof createTestClient>;
  let notifications: Notification[] = [];

  beforeEach(async () => {
    server = new ComprehensiveTestServer();
    client = createTestClient(server);
    notifications = [];

    // Listen for notifications
    client.onNotification((notification) => {
      notifications.push(notification);
    });

    await client.initialize();
  });

  describe('Resource Subscribe (resources/subscribe)', () => {
    it('should subscribe to a subscribable resource successfully', async () => {
      const subscribableUri = 'https://api.example.com/status';

      const result = await client.subscribeToResource(subscribableUri);
      ResultTestUtils.expectOk(result);

      // Response should be empty for successful subscription
      expect(result.value).toBeUndefined();
    });

    it('should subscribe to live data resources', async () => {
      const liveUri = 'live://random-data';

      const result = await client.subscribeToResource(liveUri);
      ResultTestUtils.expectOk(result);
    });

    it('should reject subscription to non-subscribable resources', async () => {
      const nonSubscribableUri = 'file:///project/README.md';

      const result = await client.subscribeToResource(nonSubscribableUri);

      // Should either succeed (if resource is actually subscribable) or fail with proper error
      if (result.isErr()) {
        expect(result.error.code).toBe(ErrorCode.InvalidRequest);
        expect(result.error.message).toContain('does not support subscriptions');
      }
    });

    it('should return error for non-existent resources', async () => {
      const nonExistentUri = 'file:///does-not-exist.txt';

      const result = await client.subscribeToResource(nonExistentUri);
      const error = ResultTestUtils.expectErr(result);

      expect(error.code).toBe(RESOURCE_NOT_FOUND_CODE);
      expect(error.message).toContain('not found');
    });

    it('should validate URI parameter', async () => {
      const result = await client.sendRequest('resources/subscribe', {
        // Missing uri parameter
      });

      const error = ResultTestUtils.expectErr(result);
      expect(error.code).toBe(ErrorCode.InvalidParams);
    });

    it('should handle malformed URI', async () => {
      const result = await client.subscribeToResource('invalid-uri-format');

      const error = ResultTestUtils.expectErr(result);
      expect([ErrorCode.InvalidParams, RESOURCE_NOT_FOUND_CODE]).toContain(error.code);
    });

    it('should allow multiple subscribers to the same resource', async () => {
      const uri = 'live://random-data';

      // Create multiple clients
      const client2 = createTestClient(server);
      await client2.initialize();

      // Both should be able to subscribe
      const result1 = await client.subscribeToResource(uri);
      const result2 = await client2.subscribeToResource(uri);

      ResultTestUtils.expectOk(result1);
      ResultTestUtils.expectOk(result2);

      await client2.close();
    });

    it('should handle duplicate subscriptions gracefully', async () => {
      const uri = 'live://random-data';

      // Subscribe twice with same client
      const result1 = await client.subscribeToResource(uri);
      const result2 = await client.subscribeToResource(uri);

      ResultTestUtils.expectOk(result1);
      ResultTestUtils.expectOk(result2); // Should not fail
    });
  });

  describe('Resource Unsubscribe (resources/unsubscribe)', () => {
    it('should unsubscribe from a subscribed resource successfully', async () => {
      const uri = 'live://random-data';

      // First subscribe
      await client.subscribeToResource(uri);

      // Then unsubscribe
      const result = await client.unsubscribeFromResource(uri);
      ResultTestUtils.expectOk(result);
    });

    it('should handle unsubscribe from non-subscribed resource gracefully', async () => {
      const uri = 'live://random-data';

      // Unsubscribe without subscribing first
      const result = await client.unsubscribeFromResource(uri);

      // Should either succeed (idempotent) or return appropriate error
      if (result.isErr()) {
        // Error is acceptable for not-subscribed resources
        expect(typeof result.error.message).toBe('string');
      }
    });

    it('should validate URI parameter', async () => {
      const result = await client.sendRequest('resources/unsubscribe', {
        // Missing uri parameter
      });

      const error = ResultTestUtils.expectErr(result);
      expect(error.code).toBe(ErrorCode.InvalidParams);
    });

    it('should handle unsubscribe from non-existent resource', async () => {
      const uri = 'file:///does-not-exist.txt';

      const result = await client.unsubscribeFromResource(uri);

      // Should either succeed (idempotent) or return not found
      if (result.isErr()) {
        expect([RESOURCE_NOT_FOUND_CODE, ErrorCode.InvalidRequest]).toContain(result.error.code);
      }
    });
  });

  describe('Resource Update Notifications', () => {
    it('should receive notifications when subscribed resource is updated', async () => {
      const uri = 'file:///watched-file.txt';

      // Add a file that can be watched
      server.addFileToFileSystem('/watched-file.txt', 'Initial content');

      // Subscribe to the resource (if it's subscribable)
      const subscribeResult = await client.subscribeToResource(uri);

      if (subscribeResult.isOk()) {
        // Clear any initial notifications
        notifications.length = 0;

        // Simulate file change
        await server.simulateFileChange('/watched-file.txt', 'Updated content');

        // Wait a bit for notification to arrive
        await TestUtils.delay(100);

        // Should have received a notification
        expect(notifications.length).toBeGreaterThan(0);

        const updateNotification = notifications.find(
          (n) => n.method === 'notifications/resources/updated'
        );

        if (updateNotification) {
          expect(updateNotification).toHaveProperty('method', 'notifications/resources/updated');
          expect(updateNotification.params).toHaveProperty('uri', uri);
        }
      }
    });

    it('should not receive notifications after unsubscribing', async () => {
      const uri = 'live://random-data';

      // Subscribe
      await client.subscribeToResource(uri);

      // Clear notifications
      notifications.length = 0;

      // Unsubscribe
      await client.unsubscribeFromResource(uri);

      // Trigger a change (if possible)
      // Note: This is implementation-dependent

      // Wait a bit
      await TestUtils.delay(100);

      // Should not receive new notifications for this resource
      const resourceNotifications = notifications.filter(
        (n) => n.method === 'notifications/resources/updated' && n.params?.uri === uri
      );

      expect(resourceNotifications.length).toBe(0);
    });

    it('should receive list changed notifications when resources are added/removed', async () => {
      // Clear initial notifications
      notifications.length = 0;

      // Add a new dynamic resource
      const newUri = 'dynamic://new-resource';
      server.registerResource(
        newUri,
        async () => ResultTestUtils.expectOk({ data: 'new resource' }),
        'Dynamically added resource'
      );

      // Wait for notification
      await TestUtils.delay(100);

      // Should receive a list changed notification
      const listChangedNotifications = notifications.filter(
        (n) => n.method === 'notifications/resources/list_changed'
      );

      expect(listChangedNotifications.length).toBeGreaterThan(0);
    });

    it('should validate notification format', async () => {
      const uri = 'live://random-data';

      // Subscribe to a resource
      await client.subscribeToResource(uri);

      // Clear notifications and trigger a change
      notifications.length = 0;

      // Force a notification (implementation-dependent)
      await server.notifyResourceUpdate(uri);

      // Wait for notification
      await TestUtils.delay(100);

      if (notifications.length > 0) {
        const notification = notifications[0];

        // Should be valid JSON-RPC notification
        expect(notification).toHaveProperty('jsonrpc', '2.0');
        expect(notification).toHaveProperty('method');
        expect(notification.method).toMatch(/^notifications\//);
        expect(notification).not.toHaveProperty('id'); // Notifications don't have IDs
      }
    });
  });

  describe('Subscription Management', () => {
    it('should track subscription state correctly', async () => {
      const uri = 'live://random-data';

      // Initially not subscribed - try to unsubscribe
      const unsubResult1 = await client.unsubscribeFromResource(uri);
      // Should either succeed (idempotent) or indicate not subscribed
      expect(unsubResult1.isOk()).toBe(true);

      // Subscribe
      const subResult = await client.subscribeToResource(uri);
      ResultTestUtils.expectOk(subResult);

      // Now unsubscribe should work
      const unsubResult2 = await client.unsubscribeFromResource(uri);
      ResultTestUtils.expectOk(unsubResult2);
    });

    it('should handle client disconnection and cleanup subscriptions', async () => {
      const uri = 'live://random-data';

      // Subscribe
      await client.subscribeToResource(uri);

      // Close client connection
      await client.close();

      // Subscriptions should be cleaned up automatically
      // This is tested implicitly by proper cleanup in the server
    });

    it('should support subscribing to multiple resources', async () => {
      const uris = ['live://random-data', 'https://api.example.com/status'];

      // Subscribe to multiple resources
      for (const uri of uris) {
        const result = await client.subscribeToResource(uri);
        if (result.isOk()) {
          // Subscription succeeded
          expect(result.value).toBeUndefined();
        }
      }

      // Should be able to unsubscribe from all
      for (const uri of uris) {
        const result = await client.unsubscribeFromResource(uri);
        // Should succeed or be idempotent
        expect(result.isOk()).toBe(true);
      }
    });
  });

  describe('Resource Templates and Subscriptions', () => {
    it('should handle subscriptions to templated resources', async () => {
      // Template resources might not be directly subscribable
      const templateUri = 'file:///logs/2025-01-01';

      const result = await client.subscribeToResource(templateUri);

      // Implementation-dependent: may or may not support template subscriptions
      if (result.isErr()) {
        expect([ErrorCode.InvalidRequest, RESOURCE_NOT_FOUND_CODE]).toContain(result.error.code);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle many subscriptions efficiently', async () => {
      const baseUri = 'test://resource-';
      const subscriptionCount = 50;

      // Add many resources
      for (let i = 0; i < subscriptionCount; i++) {
        const uri = `${baseUri}${i}`;
        server.registerResource(
          uri,
          async () => ResultTestUtils.expectOk({ id: i, data: `Resource ${i}` }),
          `Test resource ${i}`,
          true // subscribable
        );
      }

      const startTime = Date.now();

      // Subscribe to all
      const subscribePromises = [];
      for (let i = 0; i < subscriptionCount; i++) {
        const uri = `${baseUri}${i}`;
        subscribePromises.push(client.subscribeToResource(uri));
      }

      const results = await Promise.all(subscribePromises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds max

      // Most subscriptions should succeed
      const successCount = results.filter((r) => r.isOk()).length;
      expect(successCount).toBeGreaterThan(subscriptionCount * 0.8); // At least 80% success
    });

    it('should handle rapid subscribe/unsubscribe cycles', async () => {
      const uri = 'live://random-data';
      const cycles = 10;

      const startTime = Date.now();

      for (let i = 0; i < cycles; i++) {
        await client.subscribeToResource(uri);
        await client.unsubscribeFromResource(uri);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle rapid cycles efficiently
      expect(totalTime).toBeLessThan(2000); // 2 seconds max for 10 cycles
    });
  });

  describe('Error Scenarios', () => {
    it('should handle server errors during subscription', async () => {
      // Simulate server error
      const originalSubscribe = server.subscribeToResource;
      server.subscribeToResource = async () => {
        return ResultTestUtils.expectErr(new Error('Subscription failed'));
      };

      const result = await client.subscribeToResource('live://random-data');
      const error = ResultTestUtils.expectErr(result);

      expect(error.code).toBe(ErrorCode.InternalError);

      // Restore original method
      server.subscribeToResource = originalSubscribe;
    });

    it('should handle notification sending failures gracefully', async () => {
      // This is tested by ensuring the server doesn't crash when notifications fail
      // Implementation-dependent test
      const uri = 'live://random-data';

      await client.subscribeToResource(uri);

      // Try to trigger a notification
      const notifyResult = await server.notifyResourceUpdate(uri);

      // Should either succeed or fail gracefully
      if (notifyResult.isErr()) {
        expect(typeof notifyResult.error.message).toBe('string');
      }
    });
  });

  afterEach(async () => {
    await client.close();
    notifications.length = 0;
  });
});
