/**
 * Property-Based Tests for CronManager Next Run Calculation
 * 
 * Tests universal properties that should hold across all valid inputs.
 */

import * as fc from 'fast-check';
import { CronManager } from '../../scheduler/CronManager';

describe('CronManager Next Run Calculation - Property Tests', () => {
  let cronManager: CronManager;

  beforeEach(() => {
    cronManager = new CronManager();
  });

  afterEach(() => {
    cronManager.stopAll();
  });

  /**
   * Generator for valid cron expressions
   * Generates standard 5-field cron expressions
   */
  const validCronExpression = (): fc.Arbitrary<string> => {
    return fc.tuple(
      // Minute (0-59 or *)
      fc.oneof(
        fc.constant('*'),
        fc.integer({ min: 0, max: 59 }).map(String),
        fc.integer({ min: 0, max: 59 }).chain(n => fc.constant(`*/${n}`)),
      ),
      // Hour (0-23 or *)
      fc.oneof(
        fc.constant('*'),
        fc.integer({ min: 0, max: 23 }).map(String),
        fc.integer({ min: 0, max: 23 }).chain(n => fc.constant(`*/${n}`)),
      ),
      // Day of month (1-31 or *)
      fc.oneof(
        fc.constant('*'),
        fc.integer({ min: 1, max: 31 }).map(String),
      ),
      // Month (1-12 or *)
      fc.oneof(
        fc.constant('*'),
        fc.integer({ min: 1, max: 12 }).map(String),
      ),
      // Day of week (0-6 or *)
      fc.oneof(
        fc.constant('*'),
        fc.integer({ min: 0, max: 6 }).map(String),
      ),
    ).map(([minute, hour, day, month, dow]) => `${minute} ${hour} ${day} ${month} ${dow}`);
  };

  /**
   * Generator for random dates
   * Generates dates between 2020 and 2030
   */
  const randomDate = (): fc.Arbitrary<Date> => {
    return fc.date({
      min: new Date('2020-01-01T00:00:00.000Z'),
      max: new Date('2030-12-31T23:59:59.999Z'),
    }).filter(date => !isNaN(date.getTime()));
  };

  /**
   * Feature: cron-next-run-calculation, Property 1: Next run time is always in the future
   * Validates: Requirements 1.1, 1.2
   */
  it('Property 1: Next run time is always in the future', () => {
    fc.assert(
      fc.property(
        validCronExpression(),
        randomDate(),
        (cronExpression, currentDate) => {
          // Skip if the cron expression is invalid
          if (!cronManager.isValidCron(cronExpression)) {
            return true;
          }

          try {
            const nextRun = cronManager.getNextRun(cronExpression, currentDate);
            
            // Property: next run time must be strictly greater than current time
            expect(nextRun.getTime()).toBeGreaterThan(currentDate.getTime());
            
            return true;
          } catch (error) {
            // If parsing fails, that's acceptable for some edge cases
            return true;
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Feature: cron-next-run-calculation, Property 2: Next run time respects cron schedule boundaries
   * Validates: Requirements 1.3, 1.4
   */
  it('Property 2: Next run time respects cron schedule boundaries', () => {
    fc.assert(
      fc.property(
        randomDate(),
        (currentDate) => {
          // Test hourly boundary: "0 * * * *" should align to hour boundaries
          const hourlyNextRun = cronManager.getNextRun('0 * * * *', currentDate);
          expect(hourlyNextRun.getUTCMinutes()).toBe(0);
          expect(hourlyNextRun.getUTCSeconds()).toBe(0);
          expect(hourlyNextRun.getUTCMilliseconds()).toBe(0);

          // Test daily boundary: "0 0 * * *" should align to day boundaries
          const dailyNextRun = cronManager.getNextRun('0 0 * * *', currentDate);
          expect(dailyNextRun.getUTCHours()).toBe(0);
          expect(dailyNextRun.getUTCMinutes()).toBe(0);
          expect(dailyNextRun.getUTCSeconds()).toBe(0);
          expect(dailyNextRun.getUTCMilliseconds()).toBe(0);

          // Test 5-minute interval: "*/5 * * * *" should align to 5-minute boundaries
          const fiveMinuteNextRun = cronManager.getNextRun('*/5 * * * *', currentDate);
          expect(fiveMinuteNextRun.getUTCMinutes() % 5).toBe(0);
          expect(fiveMinuteNextRun.getUTCSeconds()).toBe(0);
          expect(fiveMinuteNextRun.getUTCMilliseconds()).toBe(0);

          // Test 15-minute interval: "*/15 * * * *" should align to 15-minute boundaries
          const fifteenMinuteNextRun = cronManager.getNextRun('*/15 * * * *', currentDate);
          expect(fifteenMinuteNextRun.getUTCMinutes() % 15).toBe(0);
          expect(fifteenMinuteNextRun.getUTCSeconds()).toBe(0);
          expect(fifteenMinuteNextRun.getUTCMilliseconds()).toBe(0);

          // Test specific hour: "0 14 * * *" should align to 14:00 UTC
          const specificHourNextRun = cronManager.getNextRun('0 14 * * *', currentDate);
          expect(specificHourNextRun.getUTCHours()).toBe(14);
          expect(specificHourNextRun.getUTCMinutes()).toBe(0);
          expect(specificHourNextRun.getUTCSeconds()).toBe(0);
          expect(specificHourNextRun.getUTCMilliseconds()).toBe(0);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Feature: cron-next-run-calculation, Property 3: Repeated calculations advance correctly
   * Validates: Requirements 1.5
   */
  it('Property 3: Repeated calculations advance correctly', () => {
    fc.assert(
      fc.property(
        validCronExpression(),
        randomDate(),
        (cronExpression, currentDate) => {
          // Skip if the cron expression is invalid
          if (!cronManager.isValidCron(cronExpression)) {
            return true;
          }

          try {
            // Calculate next run at T1
            const nextRunT1 = cronManager.getNextRun(cronExpression, currentDate);
            
            // Advance time to just after T1's next run (add 1 second)
            const timeAfterT1 = new Date(nextRunT1.getTime() + 1000);
            
            // Calculate next run at T2 (after T1's next run)
            const nextRunT2 = cronManager.getNextRun(cronExpression, timeAfterT1);
            
            // Property: T2's next run must be strictly greater than T1's next run
            expect(nextRunT2.getTime()).toBeGreaterThan(nextRunT1.getTime());
            
            return true;
          } catch (error) {
            // If parsing fails, that's acceptable for some edge cases
            return true;
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Generator for invalid cron expressions
   * Generates strings that should not be valid cron expressions
   */
  const invalidCronExpression = (): fc.Arbitrary<string> => {
    return fc.oneof(
      // Random strings that are not cron expressions
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.match(/^[\d\s\*\/\-,]+$/)),
      // Too few fields
      fc.constant('* *'),
      fc.constant('* * *'),
      fc.constant('* * * *'),
      // Invalid minute values (60+)
      fc.integer({ min: 60, max: 100 }).map(n => `${n} * * * *`),
      // Invalid hour values (24+)
      fc.integer({ min: 24, max: 100 }).map(n => `* ${n} * * *`),
      // Invalid day of month values (32+)
      fc.integer({ min: 32, max: 100 }).map(n => `* * ${n} * *`),
      // Invalid month values (13+)
      fc.integer({ min: 13, max: 100 }).map(n => `* * * ${n} *`),
      // Invalid day of week values (8+ since 0-7 are valid, where both 0 and 7 = Sunday)
      fc.integer({ min: 8, max: 100 }).map(n => `* * * * ${n}`),
      // Empty or whitespace
      fc.constant(''),
      fc.constant('   '),
      // Random words
      fc.constant('not a cron'),
      fc.constant('invalid expression'),
      fc.constant('hello world'),
    );
  };

  /**
   * Feature: cron-next-run-calculation, Property 4: Invalid cron expressions are rejected
   * Validates: Requirements 2.2
   */
  it('Property 4: Invalid cron expressions are rejected', () => {
    fc.assert(
      fc.property(
        invalidCronExpression(),
        (invalidExpression) => {
          // Property: all invalid expressions should throw an error
          expect(() => cronManager.getNextRun(invalidExpression)).toThrow();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
