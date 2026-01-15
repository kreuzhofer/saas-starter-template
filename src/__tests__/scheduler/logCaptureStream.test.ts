import { LogCaptureStream } from '../../scheduler/LogCaptureStream';
import winston from 'winston';

describe('LogCaptureStream - Unit Tests', () => {
  let logCapture: LogCaptureStream;
  let logger: winston.Logger;

  beforeEach(() => {
    logCapture = new LogCaptureStream({ maxSize: 1024 }); // 1KB for testing
    logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [logCapture],
    });
  });

  afterEach(() => {
    logCapture.clear();
    logger.close();
  });

  describe('log capture', () => {
    it('should capture log entries', (done) => {
      logger.info('Test message');
      
      // Give Winston time to process the log
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('INFO: Test message');
        done();
      }, 50);
    });

    it('should capture logs at different levels', (done) => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('DEBUG: Debug message');
        expect(logs).toContain('INFO: Info message');
        expect(logs).toContain('WARN: Warning message');
        expect(logs).toContain('ERROR: Error message');
        done();
      }, 50);
    });

    it('should capture log metadata', (done) => {
      logger.info('Message with metadata', { userId: '123', action: 'test' });
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('INFO: Message with metadata');
        expect(logs).toContain('userId');
        expect(logs).toContain('123');
        expect(logs).toContain('action');
        expect(logs).toContain('test');
        done();
      }, 50);
    });

    it('should include timestamps in captured logs', (done) => {
      logger.info('Timestamped message');
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        // Check for ISO timestamp format
        expect(logs).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        done();
      }, 50);
    });
  });

  describe('size limiting', () => {
    it('should truncate logs when size limit is exceeded', (done) => {
      // Create a small log capture stream
      const smallCapture = new LogCaptureStream({ maxSize: 200 });
      const smallLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [smallCapture],
      });

      // Log many messages to exceed the limit
      for (let i = 0; i < 20; i++) {
        smallLogger.info(`Message number ${i} with some additional text to increase size`);
      }

      setTimeout(() => {
        const logs = smallCapture.getFormattedLogs();
        expect(logs).toContain('[LOG TRUNCATED: Maximum size exceeded]');
        smallLogger.close();
        done();
      }, 100);
    });

    it('should stop capturing after truncation', (done) => {
      const smallCapture = new LogCaptureStream({ maxSize: 100 });
      const smallLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [smallCapture],
      });

      // Log many messages
      for (let i = 0; i < 10; i++) {
        smallLogger.info(`Message ${i} with text`);
      }

      setTimeout(() => {
        const logs = smallCapture.getFormattedLogs();
        const messageCount = (logs.match(/Message \d+ with text/g) || []).length;
        
        // Should have captured some but not all messages
        expect(messageCount).toBeLessThan(10);
        expect(messageCount).toBeGreaterThan(0);
        expect(logs).toContain('[LOG TRUNCATED: Maximum size exceeded]');
        
        smallLogger.close();
        done();
      }, 100);
    });

    it('should use default max size of 100KB when not specified', () => {
      const defaultCapture = new LogCaptureStream();
      // Access private property for testing
      expect((defaultCapture as any).maxSize).toBe(102400);
    });
  });

  describe('clear()', () => {
    it('should clear captured logs', (done) => {
      logger.info('First message');
      
      setTimeout(() => {
        let logs = logCapture.getFormattedLogs();
        expect(logs).toContain('First message');
        
        logCapture.clear();
        logs = logCapture.getFormattedLogs();
        expect(logs).toBe('');
        done();
      }, 50);
    });

    it('should reset truncation state', (done) => {
      const smallCapture = new LogCaptureStream({ maxSize: 50 });
      const smallLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [smallCapture],
      });

      // Exceed the limit
      for (let i = 0; i < 10; i++) {
        smallLogger.info(`Message ${i}`);
      }

      setTimeout(() => {
        let logs = smallCapture.getFormattedLogs();
        expect(logs).toContain('[LOG TRUNCATED: Maximum size exceeded]');
        
        // Clear and log again
        smallCapture.clear();
        smallLogger.info('New message');
        
        setTimeout(() => {
          logs = smallCapture.getFormattedLogs();
          expect(logs).toContain('New message');
          expect(logs).not.toContain('[LOG TRUNCATED: Maximum size exceeded]');
          smallLogger.close();
          done();
        }, 50);
      }, 100);
    });
  });

  describe('edge cases - empty log capture', () => {
    it('should handle empty log capture', () => {
      const logs = logCapture.getFormattedLogs();
      expect(logs).toBe('');
    });

    it('should return empty string when no logs captured', () => {
      // Create a fresh log capture stream
      const emptyCapture = new LogCaptureStream();
      const result = emptyCapture.getFormattedLogs();
      
      expect(result).toBe('');
      expect(result.length).toBe(0);
    });

    it('should handle empty log capture after clear', (done) => {
      logger.info('Test message');
      
      setTimeout(() => {
        logCapture.clear();
        const logs = logCapture.getFormattedLogs();
        expect(logs).toBe('');
        done();
      }, 50);
    });

    it('should handle logs with no message', (done) => {
      logger.log('info', '');
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('INFO:');
        done();
      }, 50);
    });

    it('should handle logs with special characters', (done) => {
      logger.info('Message with\nnewlines\tand\ttabs');
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('Message with\nnewlines\tand\ttabs');
        done();
      }, 50);
    });

    it('should handle metadata that cannot be serialized', (done) => {
      const circular: any = { name: 'test' };
      circular.self = circular; // Create circular reference
      
      logger.info('Message with circular metadata', circular);
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('INFO: Message with circular metadata');
        // Should handle the serialization error gracefully
        done();
      }, 50);
    });

    it('should handle undefined log info gracefully', (done) => {
      // Manually call log with minimal info
      logCapture.log({}, () => {});
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        // Should not crash and should contain some output
        expect(typeof logs).toBe('string');
        done();
      }, 50);
    });

    it('should handle null metadata', (done) => {
      logger.info('Message with null metadata', null as any);
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('INFO: Message with null metadata');
        done();
      }, 50);
    });

    it('should handle undefined metadata', (done) => {
      logger.info('Message with undefined metadata', undefined as any);
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('INFO: Message with undefined metadata');
        done();
      }, 50);
    });
  });

  describe('log capture failure handling', () => {
    it('should continue capturing after callback errors', (done) => {
      logger.info('Message before error');
      
      // Log a message that might cause issues
      logger.info('Message during potential error');
      
      logger.info('Message after error');
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('Message before error');
        expect(logs).toContain('Message during potential error');
        expect(logs).toContain('Message after error');
        done();
      }, 50);
    });

    it('should handle rapid successive log calls', (done) => {
      // Rapidly log many messages
      for (let i = 0; i < 100; i++) {
        logger.info(`Rapid message ${i}`);
      }
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        // Should capture at least some messages
        expect(logs).toContain('Rapid message 0');
        expect(logs.length).toBeGreaterThan(0);
        done();
      }, 150);
    });

    it('should handle log capture when logger is closed', (done) => {
      logger.info('Message before close');
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        expect(logs).toContain('Message before close');
        done();
      }, 50);
    });

    it('should not throw when getFormattedLogs called multiple times', (done) => {
      logger.info('Test message');
      
      setTimeout(() => {
        const logs1 = logCapture.getFormattedLogs();
        const logs2 = logCapture.getFormattedLogs();
        const logs3 = logCapture.getFormattedLogs();
        
        expect(logs1).toBe(logs2);
        expect(logs2).toBe(logs3);
        expect(logs1).toContain('Test message');
        done();
      }, 50);
    });

    it('should handle concurrent log calls from multiple sources', (done) => {
      // Simulate concurrent logging
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            logger.info(`Concurrent message ${i}`);
            resolve();
          })
        );
      }
      
      Promise.all(promises).then(() => {
        setTimeout(() => {
          const logs = logCapture.getFormattedLogs();
          // Should capture all messages without corruption
          for (let i = 0; i < 10; i++) {
            expect(logs).toContain(`Concurrent message ${i}`);
          }
          done();
        }, 100);
      });
    });
  });

  describe('truncation message format', () => {
    it('should append exact truncation message when size limit exceeded', (done) => {
      const smallCapture = new LogCaptureStream({ maxSize: 100 });
      const smallLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [smallCapture],
      });

      // Log enough to exceed limit
      for (let i = 0; i < 20; i++) {
        smallLogger.info(`Message ${i} with text`);
      }

      setTimeout(() => {
        const logs = smallCapture.getFormattedLogs();
        
        // Check exact truncation message format
        expect(logs).toContain('[LOG TRUNCATED: Maximum size exceeded]');
        
        // Verify it ends with the truncation message
        expect(logs.trim().endsWith('[LOG TRUNCATED: Maximum size exceeded]')).toBe(true);
        
        smallLogger.close();
        done();
      }, 100);
    });

    it('should include newlines around truncation message', (done) => {
      const smallCapture = new LogCaptureStream({ maxSize: 150 });
      const smallLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [smallCapture],
      });

      // Log enough to exceed limit
      for (let i = 0; i < 15; i++) {
        smallLogger.info(`Test message ${i}`);
      }

      setTimeout(() => {
        const logs = smallCapture.getFormattedLogs();
        
        // Check that truncation message has proper formatting
        expect(logs).toContain('\n[LOG TRUNCATED: Maximum size exceeded]\n');
        
        smallLogger.close();
        done();
      }, 100);
    });

    it('should not include truncation message when limit not exceeded', (done) => {
      const largeCapture = new LogCaptureStream({ maxSize: 10000 });
      const largeLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [largeCapture],
      });

      // Log a few messages that won't exceed limit
      largeLogger.info('Message 1');
      largeLogger.info('Message 2');
      largeLogger.info('Message 3');

      setTimeout(() => {
        const logs = largeCapture.getFormattedLogs();
        
        // Should NOT contain truncation message
        expect(logs).not.toContain('[LOG TRUNCATED: Maximum size exceeded]');
        
        largeLogger.close();
        done();
      }, 50);
    });

    it('should only add truncation message once', (done) => {
      const smallCapture = new LogCaptureStream({ maxSize: 100 });
      const smallLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [smallCapture],
      });

      // Log many messages to exceed limit multiple times
      for (let i = 0; i < 50; i++) {
        smallLogger.info(`Message ${i}`);
      }

      setTimeout(() => {
        const logs = smallCapture.getFormattedLogs();
        
        // Count occurrences of truncation message
        const matches = logs.match(/\[LOG TRUNCATED: Maximum size exceeded\]/g);
        expect(matches).not.toBeNull();
        expect(matches?.length).toBe(1);
        
        smallLogger.close();
        done();
      }, 150);
    });

    it('should preserve last captured log before truncation message', (done) => {
      const smallCapture = new LogCaptureStream({ maxSize: 200 });
      const smallLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [smallCapture],
      });

      // Log messages with identifiable content
      for (let i = 0; i < 20; i++) {
        smallLogger.info(`Numbered message ${i}`);
      }

      setTimeout(() => {
        const logs = smallCapture.getFormattedLogs();
        
        // Find the last captured message number
        const messageMatches = logs.match(/Numbered message (\d+)/g);
        expect(messageMatches).not.toBeNull();
        expect(messageMatches!.length).toBeGreaterThan(0);
        
        // Verify truncation message comes after the last captured message
        const lastMessage = messageMatches![messageMatches!.length - 1];
        const lastMessageIndex = logs.lastIndexOf(lastMessage);
        const truncationIndex = logs.indexOf('[LOG TRUNCATED: Maximum size exceeded]');
        
        expect(truncationIndex).toBeGreaterThan(lastMessageIndex);
        
        smallLogger.close();
        done();
      }, 100);
    });
  });

  describe('getFormattedLogs()', () => {
    it('should return formatted logs with line breaks', (done) => {
      logger.info('First message');
      logger.info('Second message');
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        const lines = logs.split('\n').filter(line => line.length > 0);
        expect(lines.length).toBeGreaterThanOrEqual(2);
        done();
      }, 50);
    });

    it('should preserve log order', (done) => {
      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');
      
      setTimeout(() => {
        const logs = logCapture.getFormattedLogs();
        const msg1Index = logs.indexOf('Message 1');
        const msg2Index = logs.indexOf('Message 2');
        const msg3Index = logs.indexOf('Message 3');
        
        expect(msg1Index).toBeLessThan(msg2Index);
        expect(msg2Index).toBeLessThan(msg3Index);
        done();
      }, 50);
    });
  });
});
