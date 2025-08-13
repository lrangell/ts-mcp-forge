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
      return ok(undefined); // No sender configured, silently succeed
    }

    const subscribers = this.subscriptionManager.getSubscribers(uri);
    if (subscribers.length === 0) {
      return ok(undefined); // No subscribers, nothing to notify
    }

    const notification: ResourceUpdatedNotification = {
      jsonrpc: '2.0',
      method: 'notifications/resources/updated',
      params: { uri },
    };

    return this.sender.sendNotification(notification);
  }

  async notifyListChanged(): Promise<Result<void, Error>> {
    if (!this.sender) {
      return ok(undefined); // No sender configured, silently succeed
    }

    const notification: ResourceListChangedNotification = {
      jsonrpc: '2.0',
      method: 'notifications/resources/list_changed',
    };

    return this.sender.sendNotification(notification);
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
