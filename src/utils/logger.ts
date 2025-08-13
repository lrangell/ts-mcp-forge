export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static logLevel: LogLevel = LogLevel.INFO;

  static setLogLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      const levelMap: Record<string, LogLevel> = {
        error: LogLevel.ERROR,
        warn: LogLevel.WARN,
        info: LogLevel.INFO,
        debug: LogLevel.DEBUG,
      };
      this.logLevel = levelMap[level.toLowerCase()] ?? LogLevel.INFO;
    } else {
      this.logLevel = level;
    }
  }

  constructor(private readonly prefix: string) {}

  debug(...args: unknown[]): void {
    if (Logger.logLevel >= LogLevel.DEBUG) {
      console.debug(`[${this.prefix}]`, ...args);
    }
  }

  info(...args: unknown[]): void {
    if (Logger.logLevel >= LogLevel.INFO) {
      console.log(`[${this.prefix}]`, ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (Logger.logLevel >= LogLevel.WARN) {
      console.warn(`[${this.prefix}]`, ...args);
    }
  }

  error(...args: unknown[]): void {
    if (Logger.logLevel >= LogLevel.ERROR) {
      console.error(`[${this.prefix}]`, ...args);
    }
  }
}

if (process.env.LOG_LEVEL) {
  Logger.setLogLevel(process.env.LOG_LEVEL);
}
