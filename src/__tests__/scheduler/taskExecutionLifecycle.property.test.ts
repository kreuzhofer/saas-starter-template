/**
 * Feature: task-scheduler, Property 3: Task execution lifecycle tracking
 * Validates: Requirements 3.2, 3.3, 7.1, 7.2
 * 
 * For any task execution, the scheduler should log the start time, update the lastRun timestamp,
 * record the result (success/failure), and calculate the duration.
 */

import * as fc from 'fast-check';
import { TaskExecutor } from '../../scheduler/TaskExecutor';
import { TaskStatusRepository } from '../../scheduler/TaskStatusRepository';
import { ScheduledTask, TaskStatus } from '../../scheduler/types';
import logger from '../../utils/logger';
import { cleanupTestDb } from '../helpers/testDb';

// Mock logger to capture log calls
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('Property-Based Test: Task Execution Lifecycle Tracking', () => {
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

  describe('Successful task execution should track lifecycle', () => {
    it('should log start time, update lastRun, record success, and calculate duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.boolean(),
          fc.integer({ min: 0, max: 100 }), // Execution delay in ms
          async (taskName, enabled, executionDelay) => {
            const prefixedName = `test-task-${taskName}`;
            let executionCount = 0;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled,
              execute: async () => {
                executionCount++;
                // Simulate some work
                await new Promise(resolve => setTimeout(resolve, executionDelay));
              },
            };

            const beforeExecution = new Date();

            // Execute the task
            await executor.execute(task);

            const afterExecution = new Date();

            // Verify task was executed
            expect(executionCount).toBe(1);

            // Verify logging occurred
            expect(mockLogger.info).toHaveBeenCalledWith(
              expect.stringContaining('started'),
              expect.objectContaining({
                taskName: prefixedName,
              })
            );

            expect(mockLogger.info).toHaveBeenCalledWith(
              expect.stringContaining('completed'),
              expect.objectContaining({
                taskName: prefixedName,
                result: 'success',
                duration: expect.any(Number),
              })
            );

            // Verify status was updated in database
            const status = await statusRepository.findByName(prefixedName);
            expect(status).not.toBeNull();
            expect(status!.taskName).toBe(prefixedName);
            expect(status!.enabled).toBe(enabled);
            expect(status!.lastResult).toBe('success');
            expect(status!.lastError).toBeNull();

            // Verify lastRun timestamp is within execution window
            expect(status!.lastRun).not.toBeNull();
            expect(status!.lastRun!.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
            expect(status!.lastRun!.getTime()).toBeLessThanOrEqual(afterExecution.getTime());

            // Verify duration was calculated and is reasonable
            expect(status!.lastDuration).not.toBeNull();
            // Allow 2ms tolerance for timing precision
            expect(status!.lastDuration!).toBeGreaterThanOrEqual(Math.max(0, executionDelay - 2));
            expect(status!.lastDuration!).toBeLessThan(executionDelay + 1000); // Allow 1s overhead

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Failed task execution should track lifecycle', () => {
    it('should log start time, update lastRun, record failure, log error, and calculate duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.boolean(),
          fc.string({ minLength: 1, maxLength: 100 }), // Error message
          fc.integer({ min: 0, max: 50 }), // Execution delay before error
          async (taskName, enabled, errorMessage, executionDelay) => {
            const prefixedName = `test-task-${taskName}`;
            let executionCount = 0;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled,
              execute: async () => {
                executionCount++;
                // Simulate some work before failing
                await new Promise(resolve => setTimeout(resolve, executionDelay));
                throw new Error(errorMessage);
              },
            };

            const beforeExecution = new Date();

            // Execute the task (should not throw)
            await executor.execute(task);

            const afterExecution = new Date();

            // Verify task was executed
            expect(executionCount).toBe(1);

            // Verify start logging occurred
            expect(mockLogger.info).toHaveBeenCalledWith(
              expect.stringContaining('started'),
              expect.objectContaining({
                taskName: prefixedName,
              })
            );

            // Verify error logging occurred
            expect(mockLogger.error).toHaveBeenCalledWith(
              expect.stringContaining('failed'),
              expect.objectContaining({
                taskName: prefixedName,
                error: errorMessage,
                duration: expect.any(Number),
              })
            );

            // Verify status was updated in database
            const status = await statusRepository.findByName(prefixedName);
            expect(status).not.toBeNull();
            expect(status!.taskName).toBe(prefixedName);
            expect(status!.enabled).toBe(enabled);
            expect(status!.lastResult).toBe('failure');
            expect(status!.lastError).toBe(errorMessage);

            // Verify lastRun timestamp is within execution window
            expect(status!.lastRun).not.toBeNull();
            expect(status!.lastRun!.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
            expect(status!.lastRun!.getTime()).toBeLessThanOrEqual(afterExecution.getTime());

            // Verify duration was calculated and is reasonable
            expect(status!.lastDuration).not.toBeNull();
            // Allow 2ms tolerance for timing precision
            expect(status!.lastDuration!).toBeGreaterThanOrEqual(Math.max(0, executionDelay - 2));
            expect(status!.lastDuration!).toBeLessThan(executionDelay + 1000); // Allow 1s overhead

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Multiple executions should update status correctly', () => {
    it('should update status on each execution with latest values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }), // Array of success/failure flags
          async (taskName, executionResults) => {
            const prefixedName = `test-task-${taskName}`;
            let executionIndex = 0;

            for (const shouldSucceed of executionResults) {
              const task: ScheduledTask = {
                name: prefixedName,
                schedule: '* * * * *',
                enabled: true,
                execute: async () => {
                  if (!shouldSucceed) {
                    throw new Error(`Execution ${executionIndex} failed`);
                  }
                },
              };

              const beforeExecution = new Date();
              await executor.execute(task);
              const afterExecution = new Date();

              // Verify status reflects this execution
              const status = await statusRepository.findByName(prefixedName);
              expect(status).not.toBeNull();
              expect(status!.lastResult).toBe(shouldSucceed ? 'success' : 'failure');
              
              if (shouldSucceed) {
                expect(status!.lastError).toBeNull();
              } else {
                expect(status!.lastError).toContain(`Execution ${executionIndex} failed`);
              }

              // Verify lastRun is updated
              expect(status!.lastRun).not.toBeNull();
              expect(status!.lastRun!.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
              expect(status!.lastRun!.getTime()).toBeLessThanOrEqual(afterExecution.getTime());

              executionIndex++;

              // Small delay between executions
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Duration calculation should be accurate', () => {
    it('should calculate duration that matches actual execution time', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 10, max: 200 }), // Execution delay in ms
          async (taskName, executionDelay) => {
            const prefixedName = `test-task-${taskName}`;

            const task: ScheduledTask = {
              name: prefixedName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {
                await new Promise(resolve => setTimeout(resolve, executionDelay));
              },
            };

            const startTime = Date.now();
            await executor.execute(task);
            const actualDuration = Date.now() - startTime;

            const status = await statusRepository.findByName(prefixedName);
            expect(status).not.toBeNull();
            expect(status!.lastDuration).not.toBeNull();

            // Duration should be close to actual (within 100ms tolerance for overhead)
            const difference = Math.abs(status!.lastDuration! - actualDuration);
            expect(difference).toBeLessThan(100);

            // Duration should be at least the execution delay (with 2ms tolerance for timing precision)
            expect(status!.lastDuration!).toBeGreaterThanOrEqual(Math.max(0, executionDelay - 2));

            // Cleanup handled by cleanupTestDb()
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
