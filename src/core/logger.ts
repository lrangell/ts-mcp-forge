import { createConsola, type ConsolaInstance } from 'consola';

/**
 * Logger interface that abstracts the logging implementation
 * Compatible with consola, console, and custom implementations
 */
export interface Logger {
  // Log levels
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;

  // Additional methods
  success?(...args: unknown[]): void;
  verbose?(...args: unknown[]): void;
  ready?(...args: unknown[]): void;
  start?(...args: unknown[]): void;
  box?(...args: unknown[]): void;

  // Utilities
  silent?(...args: unknown[]): void;
  clear?(): void;
}

/**
 * Create a default logger instance using consola
 * @param tag Optional tag/namespace for the logger
 */
export function createDefaultLogger(tag?: string): ConsolaInstance {
  const logger = createConsola({
    level: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : 3, // Default to info level
    formatOptions: {
      date: false,
      colors: true,
      compact: true,
    },
  });

  if (tag) {
    return logger.withTag(tag);
  }

  return logger;
}

/**
 * Checks if the provided logger is a valid logger instance
 */
export function isValidLogger(logger: unknown): logger is Logger {
  if (!logger || typeof logger !== 'object') {
    return false;
  }

  const log = logger as Record<string, unknown>;

  // Check for required methods
  const requiredMethods = ['debug', 'info', 'warn', 'error'];
  return requiredMethods.every((method) => typeof log[method] === 'function');
}

/**
 * Creates a no-op logger that does nothing
 * Useful for testing or when logging should be disabled
 */
export function createNoOpLogger(): Logger {
  const noop = () => {};
  return {
    trace: noop,
    debug: noop,
    info: noop,
    log: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    success: noop,
    verbose: noop,
    ready: noop,
    start: noop,
    box: noop,
    silent: noop,
    clear: noop,
  };
}

/**
 * Creates a logger that forwards to console methods
 * Provides compatibility when consola is not available
 */
export function createConsoleLogger(): Logger {
  return {
    trace: console.trace.bind(console),
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    fatal: console.error.bind(console),
    success: console.log.bind(console),
    verbose: console.log.bind(console),
    ready: console.log.bind(console),
    start: console.log.bind(console),
    box: console.log.bind(console),
    silent: () => {},
    clear: console.clear?.bind(console),
  };
}
