import Transport from 'winston-transport';
import type { TransportStreamOptions } from 'winston-transport';

/**
 * Interface for captured log entries
 */
interface CapturedLog {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

/**
 * Options for LogCaptureStream
 */
interface LogCaptureStreamOptions extends TransportStreamOptions {
  maxSize?: number; // Maximum size in bytes (default: 100KB)
}

/**
 * Custom Winston transport for capturing logs during task execution.
 * 
 * This transport captures log entries in memory with a configurable size limit.
 * When the size limit is exceeded, it stops capturing and adds a truncation message.
 * 
 * Usage:
 * ```typescript
 * const logCapture = new LogCaptureStream({ maxSize: 102400 });
 * logger.add(logCapture);
 * // ... task execution ...
 * const logs = logCapture.getFormattedLogs();
 * logger.remove(logCapture);
 * ```
 */
export class LogCaptureStream extends Transport {
  private logs: CapturedLog[] = [];
  private maxSize: number;
  private currentSize: number = 0;
  private truncated: boolean = false;

  constructor(options: LogCaptureStreamOptions = {}) {
    super(options);
    this.maxSize = options.maxSize || 102400; // Default: 100KB
  }

  /**
   * Captures a log entry if size limit has not been exceeded.
   * 
   * @param info - Log information object from Winston
   * @param callback - Callback to signal completion
   */
  log(info: any, callback: () => void): void {
    setImmediate(() => {
      // If already truncated, don't capture more logs
      if (this.truncated) {
        this.emit('logged', info);
        callback();
        return;
      }

      // Extract log information
      const capturedLog: CapturedLog = {
        timestamp: info.timestamp || new Date().toISOString(),
        level: info.level || 'info',
        message: info.message || '',
        metadata: this.extractMetadata(info),
      };

      // Calculate the size of this log entry when formatted
      const formattedEntry = this.formatLogEntry(capturedLog);
      const entrySize = Buffer.byteLength(formattedEntry, 'utf8');

      // Check if adding this log would exceed the size limit
      if (this.currentSize + entrySize > this.maxSize) {
        this.truncated = true;
        this.emit('logged', info);
        callback();
        return;
      }

      // Add the log entry
      this.logs.push(capturedLog);
      this.currentSize += entrySize;

      this.emit('logged', info);
      callback();
    });
  }

  /**
   * Extracts metadata from the log info object, excluding standard Winston fields.
   * 
   * @param info - Log information object
   * @returns Metadata object or undefined if no metadata
   */
  private extractMetadata(info: any): any {
    const standardFields = ['timestamp', 'level', 'message', 'splat', Symbol.for('level'), Symbol.for('message'), Symbol.for('splat')];
    const metadata: any = {};
    let hasMetadata = false;

    for (const key of Object.keys(info)) {
      if (!standardFields.includes(key)) {
        metadata[key] = info[key];
        hasMetadata = true;
      }
    }

    return hasMetadata ? metadata : undefined;
  }

  /**
   * Formats a single log entry as a string.
   * 
   * @param log - Captured log entry
   * @returns Formatted log string
   */
  private formatLogEntry(log: CapturedLog): string {
    let formatted = `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`;

    // Add metadata if present
    if (log.metadata && Object.keys(log.metadata).length > 0) {
      try {
        formatted += ` ${JSON.stringify(log.metadata)}`;
      } catch (error) {
        // If metadata can't be stringified, skip it
        formatted += ' [metadata serialization failed]';
      }
    }

    formatted += '\n';
    return formatted;
  }

  /**
   * Returns all captured logs as a formatted string.
   * 
   * If logs were truncated due to size limit, includes a truncation message.
   * 
   * @returns Formatted log string
   */
  getFormattedLogs(): string {
    let result = this.logs.map(log => this.formatLogEntry(log)).join('');

    if (this.truncated) {
      result += '\n[LOG TRUNCATED: Maximum size exceeded]\n';
    }

    return result;
  }

  /**
   * Clears all captured logs and resets the state.
   */
  clear(): void {
    this.logs = [];
    this.currentSize = 0;
    this.truncated = false;
  }
}
