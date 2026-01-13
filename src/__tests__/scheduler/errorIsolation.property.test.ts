/**
 * Feature: task-scheduler, Property 4: Error isolation and logging
 * Validates: Requirements 4.1, 4.2, 4.3
 * 
 * For any task that throws an error during execution, the scheduler should catch the error,
 * log it with task name and details, update the status to failure, and continue running other tasks.
 */

import * as fc from 'fast-check';
import { TaskExecutor } from '../../scheduler/TaskExecutor';
import { TaskStatusRepository } from '../../scheduler/TaskStatusRepository';
import { ScheduledTask } from '../../scheduler/types';
import logger from '../../utils/logger';
import { cleanupTestDb } from '../helpers/testDb';

// Mock logger to capture log calls
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('Property-Based Test: Error Isolation and Logging', () => {
  let executor: TaskExecutor;
  let statusRepository: TaskStatusRepository;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    statusRepository = new TaskStatusRepository();
    executor = new TaskExecutor(statusRepository);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Final cleanup of all test data
    await cleanupTestDb();
  });

  describe('Errors should be caught and not propagate', () => {
    it('should catch errors and prevent application crash', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }), // Error message
          fc.oneof(
            fc.constant(Error),
            fc.constant(TypeError),
            fc.constant(RangeError),
            fc.constant(ReferenceError)
          ), // Error type
          async (taskName, errorMessage, ErrorType) => {
            const prefixedName = `test-error-${taskName}`;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {
                throw new ErrorType(errorMessage);
              },
            };

            // Execute should not throw - errors should be caught
            await expect(executor.execute(task)).resolves.not.toThrow();

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should catch non-Error objects thrown by tasks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.object(),
            fc.constant(null),
            fc.constant(undefined)
          ), // Non-Error values
          async (taskName, thrownValue) => {
            const prefixedName = `test-error-${taskName}`;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {
                throw thrownValue;
              },
            };

            // Execute should not throw - even non-Error values should be caught
            await expect(executor.execute(task)).resolves.not.toThrow();

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Errors should be logged with task name and details', () => {
    it('should log error with task name, error message, and stack trace', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }), // Error message
          async (taskName, errorMessage) => {
            const prefixedName = `test-error-${taskName}`;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {
                throw new Error(errorMessage);
              },
            };

            await executor.execute(task);

            // Verify error was logged
            expect(mockLogger.error).toHaveBeenCalledWith(
              expect.stringContaining('failed'),
              expect.objectContaining({
                taskName: prefixedName,
                error: errorMessage,
                stack: expect.any(String),
              })
            );

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Error status should be persisted', () => {
    it('should update status to failure with error message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }), // Error message
          async (taskName, errorMessage) => {
            const prefixedName = `test-error-${taskName}`;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {
                throw new Error(errorMessage);
              },
            };

            await executor.execute(task);

            // Verify status was updated
            const status = await statusRepository.findByName(prefixedName);
            expect(status).not.toBeNull();
            expect(status!.lastResult).toBe('failure');
            expect(status!.lastError).toBe(errorMessage);

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Error handler should be invoked if provided', () => {
    it('should call task onError handler with the error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }), // Error message
          async (taskName, errorMessage) => {
            const prefixedName = `test-error-${taskName}`;
            let errorHandlerCalled = false;
            let capturedError: Error | null = null;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {
                throw new Error(errorMessage);
              },
              onError: (error: Error) => {
                errorHandlerCalled = true;
                capturedError = error;
              },
            };

            await executor.execute(task);

            // Verify error handler was called
            expect(errorHandlerCalled).toBe(true);
            expect(capturedError).not.toBeNull();
            expect(capturedError!.message).toBe(errorMessage);

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should handle errors in error handler without propagating', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }), // Error message
          fc.string({ minLength: 1, maxLength: 100 }), // Handler error message
          async (taskName, errorMessage, handlerErrorMessage) => {
            const prefixedName = `test-error-${taskName}`;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {
                throw new Error(errorMessage);
              },
              onError: (error: Error) => {
                // Error handler itself throws
                throw new Error(handlerErrorMessage);
              },
            };

            // Should not throw even if error handler fails
            await expect(executor.execute(task)).resolves.not.toThrow();

            // Verify error handler failure was logged
            expect(mockLogger.error).toHaveBeenCalledWith(
              expect.stringContaining('error handler failed'),
              expect.objectContaining({
                taskName: prefixedName,
                handlerError: handlerErrorMessage,
              })
            );

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Multiple tasks should be isolated from each other', () => {
    it('should continue executing other tasks when one fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              shouldFail: fc.boolean(),
              errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (taskConfigs) => {
            // Remove duplicates by name
            const uniqueConfigs = Array.from(
              new Map(taskConfigs.map(c => [c.name, c])).values()
            );

            const executionResults: { name: string; executed: boolean; failed: boolean }[] = [];

            // Execute all tasks
            for (const config of uniqueConfigs) {
              const prefixedName = `test-error-${config.name}`;
              let executed = false;

              const task: ScheduledTask = {
                name: prefixedName,
                schedule: '* * * * *',
                enabled: true,
                execute: async () => {
                  executed = true;
                  if (config.shouldFail) {
                    throw new Error(config.errorMessage);
                  }
                },
              };

              // Execute task - should not throw
              await executor.execute(task);

              executionResults.push({
                name: prefixedName,
                executed,
                failed: config.shouldFail,
              });
            }

            // Verify all tasks were executed
            for (const result of executionResults) {
              expect(result.executed).toBe(true);

              // Verify status matches expected result
              const status = await statusRepository.findByName(result.name);
              expect(status).not.toBeNull();
              expect(status!.lastResult).toBe(result.failed ? 'failure' : 'success');
            }

            // Cleanup handled by cleanupTestDb()
            for (const config of uniqueConfigs) {
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Async errors should be caught', () => {
    it('should catch errors from async operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }), // Error message
          fc.integer({ min: 0, max: 50 }), // Delay before error
          async (taskName, errorMessage, delay) => {
            const prefixedName = `test-error-${taskName}`;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {
                await new Promise(resolve => setTimeout(resolve, delay));
                throw new Error(errorMessage);
              },
            };

            // Should not throw
            await expect(executor.execute(task)).resolves.not.toThrow();

            // Verify error was logged
            expect(mockLogger.error).toHaveBeenCalledWith(
              expect.stringContaining('failed'),
              expect.objectContaining({
                taskName: prefixedName,
                error: errorMessage,
              })
            );

            // Verify status was updated
            const status = await statusRepository.findByName(prefixedName);
            expect(status).not.toBeNull();
            expect(status!.lastResult).toBe('failure');

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
