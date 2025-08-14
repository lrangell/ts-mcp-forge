import { Result, ok, err } from 'neverthrow';
import {
  Notification,
  ResourceListChangedNotification,
  ResourceUpdatedNotification,
} from './protocol.js';
import { SubscriptionManager } from './subscription-manager.js';

export interface NotificationSender {
  sendNotification(notification: Notification): Promise<Result<void, Error>>;
}

export class NotificationManager {
  constructor(
    private sender: NotificationSender | null,
    private subscriptionManager: SubscriptionManager
  ) {}

  setSender(sender: NotificationSender): void {
    this.sender = sender;
  }

  async notifyResourceUpdate(uri: string): Promise<Result<void, Error>> {
    if (!this.sender) {
      return ok(undefined);
    }

    const subscribers = this.subscriptionManager.getSubscribers(uri);
    if (subscribers.length === 0) {
      return ok(undefined);
    }

    const notification: ResourceUpdatedNotification = {
      method: 'notifications/resources/updated',
      params: { uri },
    };

    // Wrap in JSONRPCNotification for transport
    const jsonrpcNotification: Notification = {
      jsonrpc: '2.0',
      ...notification,
    };

    return this.sender.sendNotification(jsonrpcNotification);
  }

  async notifyListChanged(): Promise<Result<void, Error>> {
    if (!this.sender) {
      return ok(undefined);
    }

    const notification: ResourceListChangedNotification = {
      method: 'notifications/resources/list_changed',
    };

    // Wrap in JSONRPCNotification for transport
    const jsonrpcNotification: Notification = {
      jsonrpc: '2.0',
      ...notification,
    };

    return this.sender.sendNotification(jsonrpcNotification);
  }

  async notifyMultipleUpdates(uris: string[]): Promise<Result<void, Error>> {
    if (!this.sender) {
      return ok(undefined);
    }

    const results = await Promise.all(uris.map((uri) => this.notifyResourceUpdate(uri)));

    const errors = results
      .map((r, i) =>
        r.match(
          () => null,
          (error) => ({ uri: uris[i], error })
        )
      )
      .filter((e): e is { uri: string; error: Error } => e !== null);

    return errors.length > 0
      ? err(new Error(`Failed to send notifications for: ${errors.map((e) => e.uri).join(', ')}`))
      : ok(undefined);
  }

  isConfigured(): boolean {
    return this.sender !== null;
  }
}
