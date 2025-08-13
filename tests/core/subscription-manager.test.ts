import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionManager } from '../../src/core/subscription-manager.js';

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  describe('subscribe', () => {
    it('should successfully subscribe a client to a resource', () => {
      const result = manager.subscribe('client1', 'resource1');
      expect(result.isOk()).toBe(true);
      expect(manager.isSubscribed('client1', 'resource1')).toBe(true);
    });

    it('should handle multiple clients subscribing to the same resource', () => {
      manager.subscribe('client1', 'resource1');
      manager.subscribe('client2', 'resource1');

      const subscribers = manager.getSubscribers('resource1');
      expect(subscribers).toHaveLength(2);
      expect(subscribers).toContain('client1');
      expect(subscribers).toContain('client2');
    });

    it('should handle a client subscribing to multiple resources', () => {
      manager.subscribe('client1', 'resource1');
      manager.subscribe('client1', 'resource2');

      const subscriptions = manager.getClientSubscriptions('client1');
      expect(subscriptions).toHaveLength(2);
      expect(subscriptions).toContain('resource1');
      expect(subscriptions).toContain('resource2');
    });

    it('should handle duplicate subscriptions gracefully', () => {
      manager.subscribe('client1', 'resource1');
      manager.subscribe('client1', 'resource1'); // Duplicate

      const subscribers = manager.getSubscribers('resource1');
      expect(subscribers).toHaveLength(1);
    });
  });

  describe('unsubscribe', () => {
    beforeEach(() => {
      manager.subscribe('client1', 'resource1');
      manager.subscribe('client2', 'resource1');
      manager.subscribe('client1', 'resource2');
    });

    it('should successfully unsubscribe a client from a resource', () => {
      const result = manager.unsubscribe('client1', 'resource1');
      expect(result.isOk()).toBe(true);
      expect(manager.isSubscribed('client1', 'resource1')).toBe(false);
    });

    it('should not affect other clients when unsubscribing', () => {
      manager.unsubscribe('client1', 'resource1');

      expect(manager.isSubscribed('client2', 'resource1')).toBe(true);
      const subscribers = manager.getSubscribers('resource1');
      expect(subscribers).toHaveLength(1);
      expect(subscribers).toContain('client2');
    });

    it('should not affect other resources when unsubscribing', () => {
      manager.unsubscribe('client1', 'resource1');

      expect(manager.isSubscribed('client1', 'resource2')).toBe(true);
      const subscriptions = manager.getClientSubscriptions('client1');
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions).toContain('resource2');
    });

    it('should handle unsubscribing from non-existent subscriptions', () => {
      const result = manager.unsubscribe('client3', 'resource3');
      expect(result.isOk()).toBe(true); // Should not error
      expect(manager.isSubscribed('client3', 'resource3')).toBe(false);
    });
  });

  describe('clearClient', () => {
    beforeEach(() => {
      manager.subscribe('client1', 'resource1');
      manager.subscribe('client1', 'resource2');
      manager.subscribe('client1', 'resource3');
      manager.subscribe('client2', 'resource1');
    });

    it('should remove all subscriptions for a client', () => {
      manager.clearClient('client1');

      expect(manager.getClientSubscriptions('client1')).toHaveLength(0);
      expect(manager.isSubscribed('client1', 'resource1')).toBe(false);
      expect(manager.isSubscribed('client1', 'resource2')).toBe(false);
      expect(manager.isSubscribed('client1', 'resource3')).toBe(false);
    });

    it('should not affect other clients', () => {
      manager.clearClient('client1');

      expect(manager.isSubscribed('client2', 'resource1')).toBe(true);
      const subscribers = manager.getSubscribers('resource1');
      expect(subscribers).toHaveLength(1);
      expect(subscribers).toContain('client2');
    });

    it('should handle clearing non-existent clients', () => {
      manager.clearClient('client3'); // Should not throw
      expect(manager.getClientSubscriptions('client3')).toHaveLength(0);
    });
  });

  describe('getSubscribers', () => {
    it('should return empty array for resource with no subscribers', () => {
      const subscribers = manager.getSubscribers('resource1');
      expect(subscribers).toEqual([]);
    });

    it('should return all subscribers for a resource', () => {
      manager.subscribe('client1', 'resource1');
      manager.subscribe('client2', 'resource1');
      manager.subscribe('client3', 'resource1');

      const subscribers = manager.getSubscribers('resource1');
      expect(subscribers).toHaveLength(3);
      expect(new Set(subscribers)).toEqual(new Set(['client1', 'client2', 'client3']));
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return empty map when no subscriptions exist', () => {
      const all = manager.getAllSubscriptions();
      expect(all.size).toBe(0);
    });

    it('should return all subscriptions organized by resource', () => {
      manager.subscribe('client1', 'resource1');
      manager.subscribe('client2', 'resource1');
      manager.subscribe('client1', 'resource2');

      const all = manager.getAllSubscriptions();
      expect(all.size).toBe(2);
      expect(all.get('resource1')).toEqual(['client1', 'client2']);
      expect(all.get('resource2')).toEqual(['client1']);
    });
  });
});
