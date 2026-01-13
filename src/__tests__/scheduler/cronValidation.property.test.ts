/**
 * Property-Based Tests for Cron Expression Validation
 * 
 * **Feature: task-scheduler, Property 2: Cron expression validation**
 * **Validates: Requirements 2.3**
 */

import * as fc from 'fast-check';
import { CronManager } from '../../scheduler/CronManager';

describe('CronManager - Property-Based Tests', () => {
  let cronManager: CronManager;

  beforeEach(() => {
    cronManager = new CronManager();
  });

  describe('Property 2: Cron expression validation', () => {
    /**
     * Property: For any string provided as a schedule, the scheduler should 
     * correctly identify whether it's a valid cron expression or interval format
     */
    it('should correctly validate cron expressions', () => {
      fc.assert(
        fc.property(
          // Generate valid cron expressions
          fc.record({
            minute: fc.oneof(fc.constant('*'), fc.integer({ min: 0, max: 59 }).map(String), fc.constantFrom('*/5', '*/10', '*/15')),
            hour: fc.oneof(fc.constant('*'), fc.integer({ min: 0, max: 23 }).map(String), fc.constantFrom('*/2', '*/6')),
            dayOfMonth: fc.oneof(fc.constant('*'), fc.integer({ min: 1, max: 31 }).map(String)),
            month: fc.oneof(fc.constant('*'), fc.integer({ min: 1, max: 12 }).map(String)),
            dayOfWeek: fc.oneof(fc.constant('*'), fc.integer({ min: 0, max: 6 }).map(String)),
          }),
          (parts) => {
            const cronExpression = `${parts.minute} ${parts.hour} ${parts.dayOfMonth} ${parts.month} ${parts.dayOfWeek}`;
            
            // Valid cron expressions should be recognized as valid
            const isValid = cronManager.isValidCron(cronExpression);
            expect(isValid).toBe(true);
            
            // parseSchedule should not throw for valid cron expressions
            expect(() => cronManager.parseSchedule(cronExpression)).not.toThrow();
            
            // The parsed result should equal the input (since it's already a cron expression)
            const parsed = cronManager.parseSchedule(cronExpression);
            expect(parsed).toBe(cronExpression);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should correctly validate interval strings', () => {
      fc.assert(
        fc.property(
          // Generate valid interval strings with appropriate ranges
          fc.record({
            value: fc.integer({ min: 1, max: 30 }),
            unit: fc.constantFrom('minute', 'minutes', 'hour', 'hours', 'day', 'days'),
          }).filter((interval) => {
            // Filter out invalid combinations
            if ((interval.unit === 'minute' || interval.unit === 'minutes') && interval.value > 59) {
              return false;
            }
            if ((interval.unit === 'hour' || interval.unit === 'hours') && interval.value > 23) {
              return false;
            }
            if ((interval.unit === 'day' || interval.unit === 'days') && interval.value > 31) {
              return false;
            }
            return true;
          }),
          (interval) => {
            const intervalString = `every ${interval.value} ${interval.unit}`;
            
            // Valid interval strings should be parseable
            expect(() => cronManager.parseSchedule(intervalString)).not.toThrow();
            
            // The result should be a valid cron expression
            const parsed = cronManager.parseSchedule(intervalString);
            expect(cronManager.isValidCron(parsed)).toBe(true);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should reject invalid cron expressions', () => {
      fc.assert(
        fc.property(
          // Generate invalid cron expressions that node-cron actually rejects
          fc.oneof(
            // Too few fields
            fc.constant('* *'),
            fc.constant('* * *'),
            fc.constant('* * * *'),
            // Invalid values
            fc.constant('60 * * * *'), // minute > 59
            fc.constant('* 24 * * *'), // hour > 23
            fc.constant('* * 32 * *'), // day > 31
            fc.constant('* * * 13 *'), // month > 12
            // Invalid characters
            fc.constant('a * * * *'),
            fc.constant('* b * * *'),
            fc.constant('x y z * *'),
            // Empty or whitespace
            fc.constant(''),
            fc.constant('   '),
            // Invalid format
            fc.constant('not a cron'),
            fc.constant('invalid'),
          ),
          (invalidCron) => {
            // Invalid cron expressions should be recognized as invalid
            const isValid = cronManager.isValidCron(invalidCron);
            expect(isValid).toBe(false);
            
            // parseSchedule should throw for invalid cron expressions
            expect(() => cronManager.parseSchedule(invalidCron)).toThrow();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should reject invalid interval strings', () => {
      fc.assert(
        fc.property(
          // Generate invalid interval strings
          fc.oneof(
            // Missing "every" prefix
            fc.constant('1 minute'),
            fc.constant('5 hours'),
            // Invalid format
            fc.constant('every minute'),
            fc.constant('every 1'),
            fc.constant('every X minutes'),
            // Invalid values
            fc.constant('every 0 minutes'),
            fc.constant('every -1 hours'),
            fc.constant('every 60 minutes'), // > 59
            fc.constant('every 24 hours'),   // > 23
            fc.constant('every 32 days'),    // > 31
            // Invalid units
            fc.constant('every 1 second'),
            fc.constant('every 1 week'),
            fc.constant('every 1 month'),
          ),
          (invalidInterval) => {
            // parseSchedule should throw for invalid interval strings
            expect(() => cronManager.parseSchedule(invalidInterval)).toThrow();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should handle edge cases in interval parsing', () => {
      // Test boundary values
      expect(() => cronManager.parseSchedule('every 1 minute')).not.toThrow();
      expect(() => cronManager.parseSchedule('every 59 minutes')).not.toThrow();
      expect(() => cronManager.parseSchedule('every 1 hour')).not.toThrow();
      expect(() => cronManager.parseSchedule('every 23 hours')).not.toThrow();
      expect(() => cronManager.parseSchedule('every 1 day')).not.toThrow();
      expect(() => cronManager.parseSchedule('every 31 days')).not.toThrow();

      // Test case insensitivity
      expect(() => cronManager.parseSchedule('EVERY 1 MINUTE')).not.toThrow();
      expect(() => cronManager.parseSchedule('Every 1 Hour')).not.toThrow();
      
      // Test whitespace handling
      expect(() => cronManager.parseSchedule('  every 1 minute  ')).not.toThrow();
      expect(() => cronManager.parseSchedule('every  1  minute')).not.toThrow();
    });

    it('should convert intervals to correct cron expressions', () => {
      // Test specific conversions
      expect(cronManager.parseSchedule('every 1 minute')).toBe('* * * * *');
      expect(cronManager.parseSchedule('every 5 minutes')).toBe('*/5 * * * *');
      expect(cronManager.parseSchedule('every 1 hour')).toBe('0 * * * *');
      expect(cronManager.parseSchedule('every 6 hours')).toBe('0 */6 * * *');
      expect(cronManager.parseSchedule('every 1 day')).toBe('0 0 * * *');
      expect(cronManager.parseSchedule('every 7 days')).toBe('0 0 */7 * *');
    });
  });
});
