import { Result, ok, err } from 'neverthrow';
import type { Notification } from '../core/protocol.js';
import type { NotificationSender } from '../core/notifications.js';
import { createDefaultLogger, type Logger } from '../core/logger.js';
import { extractErrorMessage } from './error-handling.js';

export abstract class BaseNotificationSender implements NotificationSender {
  protected logger: Logger;

  constructor(loggerName: string) {
    this.logger = createDefaultLogger(loggerName);
  }

  abstract sendNotification(notification: Notification): Promise<Result<void, Error>>;

  protected wrapError(error: unknown, context: string): Error {
    const message = extractErrorMessage(error);
    const fullMessage = `Failed to send ${context} notification: ${message}`;
    this.logger.error(fullMessage, error);
    return new Error(fullMessage);
  }

  protected async safeExecute(
    fn: () => Promise<void>,
    context: string
  ): Promise<Result<void, Error>> {
    try {
      await fn();
      return ok(undefined);
    } catch (error) {
      return err(this.wrapError(error, context));
    }
  }
}
