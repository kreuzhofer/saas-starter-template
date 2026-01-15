/**
 * Feature: persistent-task-execution-history
 * 
 * Property 3: Log capture includes all levels
 * Validates: Requirements 2.1, 2.2, 2.3
 * 
 * For any task execution that logs messages at different levels (debug, info, warn, error),
 * all logged messages should be captured and stored in the capturedLogs field of the
 * TaskExecutionHistory record.
 */

import * as fc from 'fast-check';
import { LogCaptureStream } from '../../scheduler/LogCaptureStream';
import winston from 'winston';

describe('Property-Based Test: Log Capture Across All Levels', () => {
  describe('Property 3: Log capture includes all levels', () => {
    /**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     * 
     * This test verifies that the LogCaptureStream captures log messages at all levels
     * (debug, info, warn, error) during task execution. The property ensures that:
     * 1. All log messages are captured regardless of level
     * 2. All log levels are represented in the captured output
     * 3. Log order is preserved
     */
    it('should capture all log messages at different levels (debug, info, warn, error)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random arrays of log entries with different levels
          fc.array(
            fc.record({
              level: fc.constantFrom('debug', 'info', 'warn', 'error'),
              message: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (logEntries) => {
            // Create a new log capture stream for this test
            const logCapture = new LogCaptureStream({ maxSize: 102400 }); // 100KB
            const logger = winston.createLogger({
              level: 'debug', // Capture all levels
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
              transports: [logCapture],
            });

            try {
              // Log all entries
              for (const entry of logEntries) {
                logger.log(entry.level, entry.message);
              }

              // Wait for Winston to process all logs
              await new Promise(resolve => setTimeout(resolve, 100));

              // Get captured logs
              const capturedLogs = logCapture.getFormattedLogs();

              // Property 1: All log messages are captured
              for (const entry of logEntries) {
                expect(capturedLogs).toContain(entry.message);
              }

              // Property 2: All log levels are represented in captured output
              for (const entry of logEntries) {
                expect(capturedLogs).toContain(entry.level.toUpperCase());
              }

              // Property 3: Log order is preserved
              const messages = logEntries.map(e => e.message);
              let lastIndex = -1;
              for (const message of messages) {
                const currentIndex = capturedLogs.indexOf(message, lastIndex + 1);
                expect(currentIndex).toBeGreaterThan(lastIndex);
                lastIndex = currentIndex;
              }

              // Property 4: All four log levels can be captured
              const levelsUsed = new Set(logEntries.map(e => e.level));
              for (const level of levelsUsed) {
                expect(capturedLogs).toContain(level.toUpperCase());
              }
            } finally {
              // Clean up
              logger.close();
            }
          }
        ),
        { numRuns: 10 } // Pure functions (no I/O): 10-20 runs per property-tests.md guidelines
      );
    });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     * 
     * This test verifies that log capture works correctly with metadata at all levels.
     * Metadata is commonly used in task execution to provide context about the operation.
     */
    it('should capture logs with metadata at all levels', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random arrays of log entries with metadata
          fc.array(
            fc.record({
              level: fc.constantFrom('debug', 'info', 'warn', 'error'),
              // Use alphanumeric messages to avoid Winston format specifiers like %c, %s, etc.
              message: fc.string({ minLength: 5, maxLength: 50 })
                .filter(s => s.trim().length > 0 && !/[%{}]/.test(s)),
              metadataKey: fc.constantFrom('taskId', 'userId', 'duration', 'status'),
              metadataValue: fc.oneof(
                fc.integer({ min: 1, max: 9999 }),
                fc.string({ minLength: 3, maxLength: 20 })
                  .filter(s => s.trim().length > 0 && !/[%{}]/.test(s))
              ),
            }),
            { minLength: 1, maxLength: 15 }
          ),
          async (logEntries) => {
            // Create a new log capture stream for this test
            const logCapture = new LogCaptureStream({ maxSize: 102400 }); // 100KB
            const logger = winston.createLogger({
              level: 'debug', // Capture all levels
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
              transports: [logCapture],
            });

            try {
              // Log all entries with metadata
              for (const entry of logEntries) {
                const metadata = { [entry.metadataKey]: entry.metadataValue };
                logger.log(entry.level, entry.message, metadata);
              }

              // Wait for Winston to process all logs
              await new Promise(resolve => setTimeout(resolve, 100));

              // Get captured logs
              const capturedLogs = logCapture.getFormattedLogs();

              // Property 1: All log messages are captured
              for (const entry of logEntries) {
                expect(capturedLogs).toContain(entry.message);
              }

              // Property 2: All log levels are captured
              for (const entry of logEntries) {
                expect(capturedLogs).toContain(entry.level.toUpperCase());
              }

              // Property 3: Metadata keys are captured (when metadata is present)
              // Note: Metadata is only included in output if it exists and can be serialized
              for (const entry of logEntries) {
                // Check that either the metadata key or value appears in the logs
                const hasMetadataKey = capturedLogs.includes(entry.metadataKey);
                const hasMetadataValue = capturedLogs.includes(String(entry.metadataValue));
                expect(hasMetadataKey || hasMetadataValue).toBe(true);
              }
            } finally {
              // Clean up
              logger.close();
            }
          }
        ),
        { numRuns: 10 } // Pure functions (no I/O): 10-20 runs per property-tests.md guidelines
      );
    });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     * 
     * This test verifies that mixed log levels in any order are captured correctly.
     * This simulates real-world task execution where logs at different levels are
     * interleaved based on the task's execution flow.
     */
    it('should capture mixed log levels in any order', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a shuffled array of log levels to simulate random ordering
          fc.shuffledSubarray(
            ['debug', 'info', 'warn', 'error', 'debug', 'info', 'warn', 'error', 'debug', 'info'],
            { minLength: 4, maxLength: 10 }
          ),
          async (levels) => {
            // Create a new log capture stream for this test
            const logCapture = new LogCaptureStream({ maxSize: 102400 }); // 100KB
            const logger = winston.createLogger({
              level: 'debug', // Capture all levels
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
              transports: [logCapture],
            });

            try {
              // Log messages at different levels in the shuffled order
              const messages: Array<{ level: string; message: string }> = [];
              for (let i = 0; i < levels.length; i++) {
                const message = `Message ${i} at ${levels[i]} level`;
                logger.log(levels[i], message);
                messages.push({ level: levels[i], message });
              }

              // Wait for Winston to process all logs
              await new Promise(resolve => setTimeout(resolve, 100));

              // Get captured logs
              const capturedLogs = logCapture.getFormattedLogs();

              // Property 1: All messages are captured
              for (const { message } of messages) {
                expect(capturedLogs).toContain(message);
              }

              // Property 2: All levels are captured
              for (const { level } of messages) {
                expect(capturedLogs).toContain(level.toUpperCase());
              }

              // Property 3: Message order is preserved
              let lastIndex = -1;
              for (const { message } of messages) {
                const currentIndex = capturedLogs.indexOf(message, lastIndex + 1);
                expect(currentIndex).toBeGreaterThan(lastIndex);
                lastIndex = currentIndex;
              }

              // Property 4: At least some log entries were captured
              const logLines = capturedLogs.split('\n').filter(line => line.trim().length > 0);
              expect(logLines.length).toBeGreaterThanOrEqual(messages.length);
            } finally {
              // Clean up
              logger.close();
            }
          }
        ),
        { numRuns: 10 } // Pure functions (no I/O): 10-20 runs per property-tests.md guidelines
      );
    });
  });

  describe('Property 7: Log size limited to maximum', () => {
    /**
     * **Validates: Requirements 7.5**
     * 
     * This test verifies that the LogCaptureStream enforces the maximum log size limit
     * of 100KB per execution. The property ensures that:
     * 1. Captured logs do not exceed the configured maximum size
     * 2. A truncation message is added when the limit is exceeded
     * 3. Logs captured before the limit are preserved
     */
    it('should limit captured logs to maximum size and add truncation message', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a max size between 1KB and 10KB for faster testing
          fc.integer({ min: 1024, max: 10240 }),
          // Generate message size that will exceed the limit
          fc.integer({ min: 100, max: 500 }),
          async (maxSize, messageSize) => {
            // Create a log capture stream with the specified max size
            const logCapture = new LogCaptureStream({ maxSize });
            const logger = winston.createLogger({
              level: 'info',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
              transports: [logCapture],
            });

            try {
              // Generate enough messages to exceed the max size
              const message = 'x'.repeat(messageSize);
              const numMessages = Math.ceil((maxSize * 2) / messageSize);

              // Log messages until we exceed the limit
              for (let i = 0; i < numMessages; i++) {
                logger.info(`${message}-${i}`);
              }

              // Wait for Winston to process all logs
              await new Promise(resolve => setTimeout(resolve, 100));

              // Get captured logs
              const capturedLogs = logCapture.getFormattedLogs();
              const capturedSize = Buffer.byteLength(capturedLogs, 'utf8');

              // Property 1: Captured logs should not significantly exceed max size
              // Allow some overhead for the truncation message and formatting
              const truncationMessageSize = Buffer.byteLength('\n[LOG TRUNCATED: Maximum size exceeded]\n', 'utf8');
              expect(capturedSize).toBeLessThanOrEqual(maxSize + truncationMessageSize + 1000);

              // Property 2: If we generated enough logs to exceed the limit,
              // the truncation message should be present
              if (numMessages * messageSize > maxSize) {
                expect(capturedLogs).toContain('[LOG TRUNCATED: Maximum size exceeded]');
              }

              // Property 3: Some logs should be captured (not empty)
              expect(capturedLogs.length).toBeGreaterThan(0);
            } finally {
              // Clean up
              logger.close();
            }
          }
        ),
        { numRuns: 10 } // Pure functions (no I/O): 10-20 runs per property-tests.md guidelines
      );
    });

    /**
     * **Validates: Requirements 7.5**
     * 
     * This test verifies that logs captured before reaching the size limit are preserved
     * and that the truncation happens at the correct boundary.
     */
    it('should preserve logs captured before size limit and stop capturing after', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a small max size for predictable testing
          fc.constant(5000), // 5KB limit
          // Generate varying message sizes
          fc.integer({ min: 200, max: 400 }),
          async (maxSize, messageSize) => {
            // Create a log capture stream with the specified max size
            const logCapture = new LogCaptureStream({ maxSize });
            const logger = winston.createLogger({
              level: 'info',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
              transports: [logCapture],
            });

            try {
              // Log messages with unique identifiers
              const messages: string[] = [];
              const numMessages = 50; // Enough to exceed 5KB

              for (let i = 0; i < numMessages; i++) {
                const message = `Message-${i}-${'x'.repeat(messageSize)}`;
                messages.push(message);
                logger.info(message);
              }

              // Wait for Winston to process all logs
              await new Promise(resolve => setTimeout(resolve, 100));

              // Get captured logs
              const capturedLogs = logCapture.getFormattedLogs();

              // Property 1: First message should always be captured
              expect(capturedLogs).toContain('Message-0-');

              // Property 2: Not all messages should be captured (some truncated)
              const lastMessage = messages[messages.length - 1];
              expect(capturedLogs).not.toContain(lastMessage);

              // Property 3: Truncation message should be present
              expect(capturedLogs).toContain('[LOG TRUNCATED: Maximum size exceeded]');

              // Property 4: Find the boundary - count how many messages were captured
              let capturedCount = 0;
              for (const message of messages) {
                if (capturedLogs.includes(message)) {
                  capturedCount++;
                } else {
                  break; // Stop at first missing message
                }
              }

              // At least some messages should be captured
              expect(capturedCount).toBeGreaterThan(0);
              // But not all messages should be captured
              expect(capturedCount).toBeLessThan(numMessages);
            } finally {
              // Clean up
              logger.close();
            }
          }
        ),
        { numRuns: 10 } // Pure functions (no I/O): 10-20 runs per property-tests.md guidelines
      );
    });

    /**
     * **Validates: Requirements 7.5**
     * 
     * This test verifies that the 100KB default limit is enforced correctly
     * and that very large log volumes are handled properly.
     */
    it('should enforce 100KB default limit for large log volumes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate varying numbers of large messages
          fc.integer({ min: 500, max: 2000 }),
          async (numMessages) => {
            // Create a log capture stream with default 100KB limit
            const logCapture = new LogCaptureStream(); // Default maxSize: 102400
            const logger = winston.createLogger({
              level: 'info',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              ),
              transports: [logCapture],
            });

            try {
              // Generate large messages (each ~500 bytes)
              const largeMessage = 'x'.repeat(500);

              for (let i = 0; i < numMessages; i++) {
                logger.info(`${largeMessage}-${i}`);
              }

              // Wait for Winston to process all logs
              await new Promise(resolve => setTimeout(resolve, 150));

              // Get captured logs
              const capturedLogs = logCapture.getFormattedLogs();
              const capturedSize = Buffer.byteLength(capturedLogs, 'utf8');

              // Property 1: Captured logs should not exceed 100KB + overhead
              const maxAllowedSize = 102400 + 1000; // 100KB + 1KB overhead
              expect(capturedSize).toBeLessThanOrEqual(maxAllowedSize);

              // Property 2: If we generated enough logs to exceed 100KB,
              // truncation message should be present
              const estimatedTotalSize = numMessages * 500;
              if (estimatedTotalSize > 102400) {
                expect(capturedLogs).toContain('[LOG TRUNCATED: Maximum size exceeded]');
              }

              // Property 3: Some logs should be captured
              expect(capturedLogs.length).toBeGreaterThan(0);
            } finally {
              // Clean up
              logger.close();
            }
          }
        ),
        { numRuns: 10 } // Pure functions (no I/O): 10-20 runs per property-tests.md guidelines
      );
    });
  });
});
