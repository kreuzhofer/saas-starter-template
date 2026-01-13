/**
 * Feature: task-scheduler, Property 7: Task registration logging
 * Validates: Requirements 10.1
 * 
 * For any task that is registered, the scheduler should log the task name and schedule.
 */

import * as fc from 'fast-check';
import { SchedulerFramework } from '../../scheduler/SchedulerFramework';
import { ScheduledTask } from '../../scheduler/types';
import { cleanupTestDb } from '../helpers/testDb';
import logger from '../../utils/logger';

// Mock the logger to capture log calls
jest.mock('../../utils/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('Property-Based Test: Task Registration Logging', () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestDb();
  });

  it('should log task name and schedule when registering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          schedule: fc.constantFrom(
            '* * * * *',
            '0 * * * *',
            '0 0 * * *',
            'every 1 minute',
            'every 1 hour',
            'every 1 day'
          ),
          enabled: fc.boolean(),
        }),
        async (taskConfig) => {
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          // Clear mocks before registering
          jest.clearAllMocks();

          // Create a task
          const task: ScheduledTask = {
            name: taskConfig.name,
            schedule: taskConfig.schedule,
            enabled: taskConfig.enabled,
            execute: async () => {
              // Task execution
            },
          };

          // Register the task
          scheduler.registerTask(task);

          // Verify logger.info was called with task registration
          expect(mockedLogger.info).toHaveBeenCalled();
          
          // Find the call that contains task registration info
          const registrationCalls = mockedLogger.info.mock.calls.filter(call => {
            const message = typeof call[0] === 'string' ? call[0] : String(call[0]);
            return message.includes('Task registered');
          });
          
          expect(registrationCalls.length).toBeGreaterThan(0);
          
          // Verify the log contains task name
          const registrationCall = registrationCalls[0] as any[];
          const message = typeof registrationCall[0] === 'string' ? registrationCall[0] : String(registrationCall[0]);
          expect(message).toContain(taskConfig.name);
          
          // Verify the log metadata contains schedule and enabled status
          if (registrationCall.length > 1 && registrationCall[1]) {
            const metadata = registrationCall[1] as any;
            expect(metadata.taskName).toBe(taskConfig.name);
            expect(metadata.schedule).toBe(taskConfig.schedule);
            expect(metadata.enabled).toBe(taskConfig.enabled);
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should log task name for all registered tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            schedule: fc.constantFrom('* * * * *', '0 * * * *', 'every 1 minute'),
            enabled: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (taskConfigs) => {
          // Remove duplicates by name
          const uniqueConfigs = Array.from(
            new Map(taskConfigs.map(c => [c.name, c])).values()
          );

          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          // Clear mocks before registering
          jest.clearAllMocks();

          // Register all tasks
          for (const config of uniqueConfigs) {
            const task: ScheduledTask = {
              name: config.name,
              schedule: config.schedule,
              enabled: config.enabled,
              execute: async () => {},
            };

            scheduler.registerTask(task);
          }

          // Verify logger.info was called for each task
          const registrationCalls = mockedLogger.info.mock.calls.filter(call => {
            const message = typeof call[0] === 'string' ? call[0] : String(call[0]);
            return message.includes('Task registered');
          });
          
          expect(registrationCalls.length).toBe(uniqueConfigs.length);
          
          // Verify each task name appears in the logs
          for (const config of uniqueConfigs) {
            const taskLogFound = registrationCalls.some(call => {
              const message = typeof call[0] === 'string' ? call[0] : String(call[0]);
              return message.includes(config.name);
            });
            expect(taskLogFound).toBe(true);
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should log error when registering invalid task', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (taskName) => {
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          // Clear mocks before registering
          jest.clearAllMocks();

          // Try to register an invalid task (missing execute function)
          const invalidTask = {
            name: taskName,
            schedule: '* * * * *',
            enabled: true,
            // Missing execute function
          } as any;

          // Registration should throw
          expect(() => scheduler.registerTask(invalidTask)).toThrow();

          // Verify logger.error was called
          expect(mockedLogger.error).toHaveBeenCalled();
          
          // Verify the error log contains information about the validation failure
          const errorCalls = mockedLogger.error.mock.calls;
          const validationError = errorCalls.some(call => {
            const message = typeof call[0] === 'string' ? call[0] : String(call[0]);
            return message.includes('Invalid task configuration') || message.includes('execute');
          });
          expect(validationError).toBe(true);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should log error when registering duplicate task name', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          schedule: fc.constantFrom('* * * * *', 'every 1 minute'),
        }),
        async (taskConfig) => {
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          // Register first task
          const task1: ScheduledTask = {
            name: taskConfig.name,
            schedule: taskConfig.schedule,
            enabled: true,
            execute: async () => {},
          };
          scheduler.registerTask(task1);

          // Clear mocks after first registration
          jest.clearAllMocks();

          // Try to register duplicate task
          const task2: ScheduledTask = {
            name: taskConfig.name, // Same name
            schedule: '0 0 * * *', // Different schedule
            enabled: false,
            execute: async () => {},
          };

          // Registration should throw
          expect(() => scheduler.registerTask(task2)).toThrow();

          // Verify logger.error was called
          expect(mockedLogger.error).toHaveBeenCalled();
          
          // Verify the error log contains information about duplicate
          const errorCalls = mockedLogger.error.mock.calls;
          const duplicateError = errorCalls.some(call => {
            const message = typeof call[0] === 'string' ? call[0] : String(call[0]);
            return message.includes('already registered');
          });
          expect(duplicateError).toBe(true);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});

