/**
 * Unit Tests for CronManager
 * 
 * Tests schedule parsing, validation, and cron job management.
 */

import { CronManager } from '../../scheduler/CronManager';
import { ScheduledTask } from '../../scheduler/types';

describe('CronManager', () => {
  let cronManager: CronManager;

  beforeEach(() => {
    cronManager = new CronManager();
  });

  afterEach(() => {
    // Clean up any scheduled jobs
    cronManager.stopAll();
  });

  describe('Schedule Parsing', () => {
    describe('Valid Cron Expressions', () => {
      it('should accept standard 5-field cron expressions', () => {
        expect(() => cronManager.parseSchedule('* * * * *')).not.toThrow();
        expect(() => cronManager.parseSchedule('0 * * * *')).not.toThrow();
        expect(() => cronManager.parseSchedule('0 0 * * *')).not.toThrow();
        expect(() => cronManager.parseSchedule('0 0 * * 0')).not.toThrow();
        expect(() => cronManager.parseSchedule('0 0 1 * *')).not.toThrow();
      });

      it('should accept cron expressions with ranges', () => {
        expect(() => cronManager.parseSchedule('0-30 * * * *')).not.toThrow();
        expect(() => cronManager.parseSchedule('* 9-17 * * *')).not.toThrow();
        expect(() => cronManager.parseSchedule('* * 1-15 * *')).not.toThrow();
      });

      it('should accept cron expressions with step values', () => {
        expect(() => cronManager.parseSchedule('*/5 * * * *')).not.toThrow();
        expect(() => cronManager.parseSchedule('0 */2 * * *')).not.toThrow();
        expect(() => cronManager.parseSchedule('0 0 */3 * *')).not.toThrow();
      });

      it('should accept cron expressions with lists', () => {
        expect(() => cronManager.parseSchedule('0,30 * * * *')).not.toThrow();
        expect(() => cronManager.parseSchedule('* 9,12,15 * * *')).not.toThrow();
        expect(() => cronManager.parseSchedule('* * * * 1,3,5')).not.toThrow();
      });

      it('should return the same cron expression when already valid', () => {
        const expression = '0 2 * * *';
        expect(cronManager.parseSchedule(expression)).toBe(expression);
      });
    });

    describe('Interval String Conversion', () => {
      it('should convert "every 1 minute" to cron expression', () => {
        expect(cronManager.parseSchedule('every 1 minute')).toBe('* * * * *');
      });

      it('should convert "every X minutes" to cron expression', () => {
        expect(cronManager.parseSchedule('every 5 minutes')).toBe('*/5 * * * *');
        expect(cronManager.parseSchedule('every 10 minutes')).toBe('*/10 * * * *');
        expect(cronManager.parseSchedule('every 15 minutes')).toBe('*/15 * * * *');
        expect(cronManager.parseSchedule('every 30 minutes')).toBe('*/30 * * * *');
      });

      it('should convert "every 1 hour" to cron expression', () => {
        expect(cronManager.parseSchedule('every 1 hour')).toBe('0 * * * *');
      });

      it('should convert "every X hours" to cron expression', () => {
        expect(cronManager.parseSchedule('every 2 hours')).toBe('0 */2 * * *');
        expect(cronManager.parseSchedule('every 6 hours')).toBe('0 */6 * * *');
        expect(cronManager.parseSchedule('every 12 hours')).toBe('0 */12 * * *');
      });

      it('should convert "every 1 day" to cron expression', () => {
        expect(cronManager.parseSchedule('every 1 day')).toBe('0 0 * * *');
      });

      it('should convert "every X days" to cron expression', () => {
        expect(cronManager.parseSchedule('every 2 days')).toBe('0 0 */2 * *');
        expect(cronManager.parseSchedule('every 7 days')).toBe('0 0 */7 * *');
        expect(cronManager.parseSchedule('every 14 days')).toBe('0 0 */14 * *');
      });

      it('should handle singular and plural units', () => {
        expect(cronManager.parseSchedule('every 1 minute')).toBe('* * * * *');
        expect(cronManager.parseSchedule('every 2 minutes')).toBe('*/2 * * * *');
        expect(cronManager.parseSchedule('every 1 hour')).toBe('0 * * * *');
        expect(cronManager.parseSchedule('every 2 hours')).toBe('0 */2 * * *');
        expect(cronManager.parseSchedule('every 1 day')).toBe('0 0 * * *');
        expect(cronManager.parseSchedule('every 2 days')).toBe('0 0 */2 * *');
      });

      it('should handle case insensitivity', () => {
        expect(cronManager.parseSchedule('EVERY 1 MINUTE')).toBe('* * * * *');
        expect(cronManager.parseSchedule('Every 1 Hour')).toBe('0 * * * *');
        expect(cronManager.parseSchedule('every 1 DAY')).toBe('0 0 * * *');
      });

      it('should handle extra whitespace', () => {
        expect(cronManager.parseSchedule('  every 1 minute  ')).toBe('* * * * *');
        expect(cronManager.parseSchedule('every  5  minutes')).toBe('*/5 * * * *');
      });
    });

    describe('Invalid Format Rejection', () => {
      it('should reject invalid cron expressions', () => {
        expect(() => cronManager.parseSchedule('invalid')).toThrow();
        expect(() => cronManager.parseSchedule('not a cron')).toThrow();
        expect(() => cronManager.parseSchedule('* *')).toThrow(); // Too few fields
        expect(() => cronManager.parseSchedule('60 * * * *')).toThrow(); // Invalid minute
        expect(() => cronManager.parseSchedule('* 24 * * *')).toThrow(); // Invalid hour
      });

      it('should reject invalid interval formats', () => {
        expect(() => cronManager.parseSchedule('every minute')).toThrow(); // Missing number
        expect(() => cronManager.parseSchedule('every 1')).toThrow(); // Missing unit
        expect(() => cronManager.parseSchedule('1 minute')).toThrow(); // Missing "every"
        expect(() => cronManager.parseSchedule('every X minutes')).toThrow(); // Non-numeric value
      });

      it('should reject invalid interval values', () => {
        expect(() => cronManager.parseSchedule('every 0 minutes')).toThrow(); // Zero value
        expect(() => cronManager.parseSchedule('every -1 hours')).toThrow(); // Negative value
        expect(() => cronManager.parseSchedule('every 60 minutes')).toThrow(); // Exceeds max
        expect(() => cronManager.parseSchedule('every 24 hours')).toThrow(); // Exceeds max
        expect(() => cronManager.parseSchedule('every 32 days')).toThrow(); // Exceeds max
      });

      it('should reject unsupported interval units', () => {
        expect(() => cronManager.parseSchedule('every 1 second')).toThrow();
        expect(() => cronManager.parseSchedule('every 1 week')).toThrow();
        expect(() => cronManager.parseSchedule('every 1 month')).toThrow();
        expect(() => cronManager.parseSchedule('every 1 year')).toThrow();
      });

      it('should reject empty or whitespace-only schedules', () => {
        expect(() => cronManager.parseSchedule('')).toThrow();
        expect(() => cronManager.parseSchedule('   ')).toThrow();
        expect(() => cronManager.parseSchedule('\t\n')).toThrow();
      });
    });
  });

  describe('Cron Expression Validation', () => {
    it('should validate correct cron expressions', () => {
      expect(cronManager.isValidCron('* * * * *')).toBe(true);
      expect(cronManager.isValidCron('0 * * * *')).toBe(true);
      expect(cronManager.isValidCron('0 0 * * *')).toBe(true);
      expect(cronManager.isValidCron('*/5 * * * *')).toBe(true);
      expect(cronManager.isValidCron('0 0 1 * *')).toBe(true);
    });

    it('should reject invalid cron expressions', () => {
      expect(cronManager.isValidCron('invalid')).toBe(false);
      expect(cronManager.isValidCron('* *')).toBe(false);
      expect(cronManager.isValidCron('60 * * * *')).toBe(false);
      expect(cronManager.isValidCron('* 24 * * *')).toBe(false);
      expect(cronManager.isValidCron('')).toBe(false);
    });
  });

  describe('Job Management', () => {
    it('should track scheduled jobs', () => {
      const task: ScheduledTask = {
        name: 'test-task',
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {},
      };

      expect(cronManager.has('test-task')).toBe(false);
      expect(cronManager.size()).toBe(0);

      cronManager.schedule(task, () => {});

      expect(cronManager.has('test-task')).toBe(true);
      expect(cronManager.size()).toBe(1);
    });

    it('should stop individual jobs', () => {
      const task: ScheduledTask = {
        name: 'test-task',
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {},
      };

      cronManager.schedule(task, () => {});
      expect(cronManager.has('test-task')).toBe(true);

      cronManager.stop('test-task');
      expect(cronManager.has('test-task')).toBe(false);
    });

    it('should stop all jobs', () => {
      const task1: ScheduledTask = {
        name: 'task-1',
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {},
      };

      const task2: ScheduledTask = {
        name: 'task-2',
        schedule: '0 * * * *',
        enabled: true,
        execute: async () => {},
      };

      cronManager.schedule(task1, () => {});
      cronManager.schedule(task2, () => {});
      expect(cronManager.size()).toBe(2);

      cronManager.stopAll();
      expect(cronManager.size()).toBe(0);
    });

    it('should handle stopping non-existent jobs gracefully', () => {
      expect(() => cronManager.stop('non-existent')).not.toThrow();
    });
  });

  describe('Next Run Calculation', () => {
    it('should calculate next run time for valid cron expressions', () => {
      const now = new Date();
      const nextRun = cronManager.getNextRun('* * * * *');
      
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should throw for invalid cron expressions', () => {
      expect(() => cronManager.getNextRun('invalid')).toThrow();
      expect(() => cronManager.getNextRun('* *')).toThrow();
    });

    it('should return next minute boundary for "* * * * *" (every minute)', () => {
      // Use a specific current date for predictable testing
      const currentDate = new Date('2024-01-15T10:30:45.123Z');
      const nextRun = cronManager.getNextRun('* * * * *', currentDate);
      
      // Next run should be at 10:31:00.000Z (next minute boundary)
      expect(nextRun.getUTCFullYear()).toBe(2024);
      expect(nextRun.getUTCMonth()).toBe(0); // January
      expect(nextRun.getUTCDate()).toBe(15);
      expect(nextRun.getUTCHours()).toBe(10);
      expect(nextRun.getUTCMinutes()).toBe(31);
      expect(nextRun.getUTCSeconds()).toBe(0);
      expect(nextRun.getUTCMilliseconds()).toBe(0);
    });

    it('should return next hour boundary for "0 * * * *" (every hour)', () => {
      // Use a specific current date for predictable testing
      const currentDate = new Date('2024-01-15T10:30:45.123Z');
      const nextRun = cronManager.getNextRun('0 * * * *', currentDate);
      
      // Next run should be at 11:00:00.000Z (next hour boundary)
      expect(nextRun.getUTCFullYear()).toBe(2024);
      expect(nextRun.getUTCMonth()).toBe(0); // January
      expect(nextRun.getUTCDate()).toBe(15);
      expect(nextRun.getUTCHours()).toBe(11);
      expect(nextRun.getUTCMinutes()).toBe(0);
      expect(nextRun.getUTCSeconds()).toBe(0);
      expect(nextRun.getUTCMilliseconds()).toBe(0);
    });

    it('should return next day boundary for "0 0 * * *" (every day)', () => {
      // Use a specific current date for predictable testing
      const currentDate = new Date('2024-01-15T10:30:45.123Z');
      const nextRun = cronManager.getNextRun('0 0 * * *', currentDate);
      
      // Next run should be at 2024-01-16 00:00:00.000Z (next day boundary)
      expect(nextRun.getUTCFullYear()).toBe(2024);
      expect(nextRun.getUTCMonth()).toBe(0); // January
      expect(nextRun.getUTCDate()).toBe(16);
      expect(nextRun.getUTCHours()).toBe(0);
      expect(nextRun.getUTCMinutes()).toBe(0);
      expect(nextRun.getUTCSeconds()).toBe(0);
      expect(nextRun.getUTCMilliseconds()).toBe(0);
    });

    it('should return next 5-minute interval for "*/5 * * * *"', () => {
      // Use a specific current date for predictable testing
      const currentDate = new Date('2024-01-15T10:32:45.123Z');
      const nextRun = cronManager.getNextRun('*/5 * * * *', currentDate);
      
      // Next run should be at 10:35:00.000Z (next 5-minute interval)
      expect(nextRun.getUTCFullYear()).toBe(2024);
      expect(nextRun.getUTCMonth()).toBe(0); // January
      expect(nextRun.getUTCDate()).toBe(15);
      expect(nextRun.getUTCHours()).toBe(10);
      expect(nextRun.getUTCMinutes()).toBe(35);
      expect(nextRun.getUTCSeconds()).toBe(0);
      expect(nextRun.getUTCMilliseconds()).toBe(0);
    });

    it('should throw error for invalid cron expression', () => {
      expect(() => cronManager.getNextRun('invalid cron')).toThrow('Invalid cron expression');
      expect(() => cronManager.getNextRun('60 * * * *')).toThrow('Invalid cron expression');
      expect(() => cronManager.getNextRun('not a valid cron')).toThrow('Invalid cron expression');
    });

    it('should use UTC timezone for calculations', () => {
      // Create a date in a specific timezone (e.g., PST which is UTC-8)
      const currentDate = new Date('2024-01-15T10:30:00.000Z');
      const nextRun = cronManager.getNextRun('0 * * * *', currentDate);
      
      // Verify the result is in UTC (next hour boundary in UTC)
      expect(nextRun.getUTCHours()).toBe(11);
      expect(nextRun.getUTCMinutes()).toBe(0);
      
      // The calculation should be based on UTC, not local timezone
      // If it were using local timezone, the result would be different
      expect(nextRun.toISOString()).toBe('2024-01-15T11:00:00.000Z');
    });
  });
});
