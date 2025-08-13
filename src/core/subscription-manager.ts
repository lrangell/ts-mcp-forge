import { Result } from 'neverthrow';
import { forEach } from 'remeda';
import { wrapSync } from '../utils/error-handling.js';

export class SubscriptionManager {
  private subscriptions: Map<string, Set<string>>; // uri -> client ids
  private clientSubscriptions: Map<string, Set<string>>; // client id -> uris

  constructor() {
    this.subscriptions = new Map();
    this.clientSubscriptions = new Map();
  }

  subscribe(clientId: string, uri: string): Result<void, Error> {
    return wrapSync(
      () => {
        // Add to uri -> clients mapping
        if (!this.subscriptions.has(uri)) {
          this.subscriptions.set(uri, new Set());
        }
        this.subscriptions.get(uri)!.add(clientId);

        // Add to client -> uris mapping
        if (!this.clientSubscriptions.has(clientId)) {
          this.clientSubscriptions.set(clientId, new Set());
        }
        this.clientSubscriptions.get(clientId)!.add(uri);
      },
      (error) => new Error(`Failed to subscribe: ${error}`)
    );
  }

  unsubscribe(clientId: string, uri: string): Result<void, Error> {
    return wrapSync(
      () => {
        // Remove from uri -> clients mapping
        const uriSubscribers = this.subscriptions.get(uri);
        if (uriSubscribers) {
          uriSubscribers.delete(clientId);
          if (uriSubscribers.size === 0) {
            this.subscriptions.delete(uri);
          }
        }

        // Remove from client -> uris mapping
        const clientUris = this.clientSubscriptions.get(clientId);
        if (clientUris) {
          clientUris.delete(uri);
          if (clientUris.size === 0) {
            this.clientSubscriptions.delete(clientId);
          }
        }
      },
      (error) => new Error(`Failed to unsubscribe: ${error}`)
    );
  }

  getSubscribers(uri: string): string[] {
    const subscribers = this.subscriptions.get(uri);
    return subscribers ? Array.from(subscribers) : [];
  }

  getClientSubscriptions(clientId: string): string[] {
    const uris = this.clientSubscriptions.get(clientId);
    return uris ? Array.from(uris) : [];
  }

  clearClient(clientId: string): Result<void, Error> {
    return wrapSync(
      () => {
        const clientUris = this.clientSubscriptions.get(clientId);
        if (clientUris) {
          forEach(Array.from(clientUris), (uri) => {
            const uriSubscribers = this.subscriptions.get(uri);
            if (uriSubscribers) {
              uriSubscribers.delete(clientId);
              if (uriSubscribers.size === 0) {
                this.subscriptions.delete(uri);
              }
            }
          });
          this.clientSubscriptions.delete(clientId);
        }
      },
      (error) => new Error(`Failed to clear client: ${error}`)
    );
  }

  isSubscribed(clientId: string, uri: string): boolean {
    const uriSubscribers = this.subscriptions.get(uri);
    return uriSubscribers ? uriSubscribers.has(clientId) : false;
  }

  getAllSubscriptions(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    forEach(Array.from(this.subscriptions.entries()), ([uri, clients]) => {
      result.set(uri, Array.from(clients));
    });
    return result;
  }
}
