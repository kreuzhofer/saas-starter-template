/**
 * Feature: persistent-task-execution-history, Property 1: Task execution creates complete history record
 * Validates: Requirements 1.1, 1.2, 1.4
 * 
 * For any task execution, when the task completes (successfully or with failure), a new TaskExecutionHistory
 * record should be created containing the task name, start time, end time, result status, error message
 * (if failed), and execution duration, AND the ScheduledTaskStatus table should be updated with the latest
 * execution information.
 */

import * as fc from 'fast-check';
import { TaskExecutor } from '../../scheduler/TaskExecutor';
import { TaskStatusRepository } from '../../scheduler/TaskStatusRepository';
import { ExecutionHistoryRepository } from '../../scheduler/ExecutionHistoryRepository';
import { ScheduledTask } from '../../scheduler/types';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import logger from '../../utils/logger';

const db = getTestDb();
const statusRepository = new TaskStatusRepository();
const historyRepository = new ExecutionHistoryRepository();

describe('Property-Based Test: Task Execution Creates Complete History Record', () => {
  afterEach(async () => {
    // Clean up test execution history records
    await db.taskExecutionHistory.deleteMany({
      where: {
        taskName: {
          startsWith: 'test-task-',
        },
      },
    });
    await db.scheduledTaskStatus.deleteMany({
      where: {
        taskName: {
          startsWith: 'test-task-',
        },
      },
    });
  });

  afterAll(async () => {
    // Final cleanup of all test data
    await cleanupTestDb();
  });

  describe('Property 1: Task execution creates complete history record', () => {
    it('should create complete history record and update status for successful task execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }).map(s => `test-task-${s.replace(/[^a-z0-9-]/gi, '')}`),
          fc.integer({ min: 10, max: 100 }), // Task execution delay in ms
          fc.boolean(), // Whether to log messages during execution
          async (taskName, executionDelay, shouldLog) => {
            // Skip if taskName is empty after sanitization
            if (taskName === 'test-task-') {
              return;
            }

            const executor = new TaskExecutor(statusRepository, historyRepository, {
              historyEnabled: true,
            });

            const beforeExecution = new Date();

            const task: ScheduledTask = {
              name: taskName,
              schedule: '0 0 * * *',
              enabled: true,
              execute: async () => {
                if (shouldLog) {
                  logger.info(`Task ${taskName} is executing`);
                }
                await new Promise(resolve => setTimeout(resolve, executionDelay));
                if (shouldLog) {
                  logger.info(`Task ${taskName} completed successfully`);
                }
              },
            };

            // Execute the task
            await executor.execute(task);

            const afterExecution = new Date();

            // Wait for asynchronous history storage
            await new Promise(resolve => setTimeout(resolve, 150));

            // Requirement 1.1: Verify history record was created
            const history = await historyRepository.findByTaskName({
              taskName,
              limit: 10,
              offset: 0,
            });

            expect(history.length).toBe(1);
            const historyRecord = history[0];

            // Requirement 1.2: Verify all required fields are present and valid
            
            // Task name
            expect(historyRecord.taskName).toBe(taskName);
            
            // Start time
            expect(historyRecord.startedAt).toBeInstanceOf(Date);
            expect(historyRecord.startedAt.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
            expect(historyRecord.startedAt.getTime()).toBeLessThanOrEqual(afterExecution.getTime());
            
            // End time
            expect(historyRecord.completedAt).toBeInstanceOf(Date);
            expect(historyRecord.completedAt.getTime()).toBeGreaterThanOrEqual(historyRecord.startedAt.getTime());
            expect(historyRecord.completedAt.getTime()).toBeLessThanOrEqual(afterExecution.getTime());
            
            // Result status (success for this test)
            expect(historyRecord.result).toBe('success');
            
            // Error message (null for successful execution)
            expect(historyRecord.errorMessage).toBeNull();
            
            // Duration
            expect(historyRecord.duration).toBeGreaterThanOrEqual(executionDelay);
            expect(historyRecord.duration).toBeLessThan(executionDelay + 200); // Allow some overhead
            
            // Captured logs (should be present if shouldLog is true)
            if (shouldLog) {
              expect(historyRecord.capturedLogs).not.toBeNull();
              expect(historyRecord.capturedLogs).toContain(taskName);
            }

            // Requirement 1.4: Verify ScheduledTaskStatus was updated
            const status = await statusRepository.findByName(taskName);
            
            expect(status).not.toBeNull();
            expect(status!.taskName).toBe(taskName);
            expect(status!.lastResult).toBe('success');
            expect(status!.lastError).toBeNull();
            expect(status!.lastRun).toBeInstanceOf(Date);
            expect(status!.lastRun!.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
            expect(status!.lastDuration).toBeGreaterThanOrEqual(executionDelay);

            // Clean up this test's data
            await db.taskExecutionHistory.deleteMany({
              where: { taskName },
            });
            await db.scheduledTaskStatus.deleteMany({
              where: { taskName },
            });
          }
        ),
        { numRuns: 3 } // DB operations: 3-5 runs per property-tests.md guidelines
      );
    });

    it('should create complete history record with error for failed task execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }).map(s => `test-task-${s.replace(/[^a-z0-9-]/gi, '')}`),
          fc.string({ minLength: 10, maxLength: 100 }), // Error message
          fc.integer({ min: 5, max: 50 }), // Task execution delay before failure
          async (taskName, errorMessage, executionDelay) => {
            // Skip if taskName is empty after sanitization
            if (taskName === 'test-task-') {
              return;
            }

            const executor = new TaskExecutor(statusRepository, historyRepository, {
              historyEnabled: true,
            });

            const beforeExecution = new Date();

            const task: ScheduledTask = {
              name: taskName,
              schedule: '0 0 * * *',
              enabled: true,
              execute: async () => {
                logger.warn(`Task ${taskName} is about to fail`);
                await new Promise(resolve => setTimeout(resolve, executionDelay));
                throw new Error(errorMessage);
              },
            };

            // Execute the task (should not throw - errors are caught internally)
            await executor.execute(task);

            const afterExecution = new Date();

            // Wait for asynchronous history storage
            await new Promise(resolve => setTimeout(resolve, 150));

            // Requirement 1.1: Verify history record was created
            const history = await historyRepository.findByTaskName({
              taskName,
              limit: 10,
              offset: 0,
            });

            expect(history.length).toBe(1);
            const historyRecord = history[0];

            // Requirement 1.2: Verify all required fields are present and valid
            
            // Task name
            expect(historyRecord.taskName).toBe(taskName);
            
            // Start time
            expect(historyRecord.startedAt).toBeInstanceOf(Date);
            expect(historyRecord.startedAt.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
            expect(historyRecord.startedAt.getTime()).toBeLessThanOrEqual(afterExecution.getTime());
            
            // End time
            expect(historyRecord.completedAt).toBeInstanceOf(Date);
            expect(historyRecord.completedAt.getTime()).toBeGreaterThanOrEqual(historyRecord.startedAt.getTime());
            expect(historyRecord.completedAt.getTime()).toBeLessThanOrEqual(afterExecution.getTime());
            
            // Result status (failure for this test)
            expect(historyRecord.result).toBe('failure');
            
            // Error message (should contain the error message)
            expect(historyRecord.errorMessage).toBe(errorMessage);
            
            // Duration
            expect(historyRecord.duration).toBeGreaterThanOrEqual(executionDelay);
            expect(historyRecord.duration).toBeLessThan(executionDelay + 200); // Allow some overhead
            
            // Captured logs (should contain the warning message)
            expect(historyRecord.capturedLogs).not.toBeNull();
            expect(historyRecord.capturedLogs).toContain('about to fail');

            // Requirement 1.4: Verify ScheduledTaskStatus was updated with error
            const status = await statusRepository.findByName(taskName);
            
            expect(status).not.toBeNull();
            expect(status!.taskName).toBe(taskName);
            expect(status!.lastResult).toBe('failure');
            expect(status!.lastError).toBe(errorMessage);
            expect(status!.lastRun).toBeInstanceOf(Date);
            expect(status!.lastRun!.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
            expect(status!.lastDuration).toBeGreaterThanOrEqual(executionDelay);

            // Clean up this test's data
            await db.taskExecutionHistory.deleteMany({
              where: { taskName },
            });
            await db.scheduledTaskStatus.deleteMany({
              where: { taskName },
            });
          }
        ),
        { numRuns: 3 } // DB operations: 3-5 runs per property-tests.md guidelines
      );
    });

    it('should create separate history records for multiple executions of the same task', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 30 }).map(s => `test-task-${s.replace(/[^a-z0-9-]/gi, '')}`),
          fc.integer({ min: 2, max: 5 }), // Number of executions
          async (taskName, executionCount) => {
            // Skip if taskName is empty after sanitization
            if (taskName === 'test-task-') {
              return;
            }

            const executor = new TaskExecutor(statusRepository, historyRepository, {
              historyEnabled: true,
            });

            let currentExecution = 0;

            const task: ScheduledTask = {
              name: taskName,
              schedule: '0 0 * * *',
              enabled: true,
              execute: async () => {
                currentExecution++;
                logger.info(`Execution ${currentExecution} of ${taskName}`);
                await new Promise(resolve => setTimeout(resolve, 10));
              },
            };

            // Execute the task multiple times
            for (let i = 0; i < executionCount; i++) {
              await executor.execute(task);
              await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between executions
            }

            // Wait for asynchronous history storage
            await new Promise(resolve => setTimeout(resolve, 150));

            // Requirement 1.1: Verify separate history records were created for each execution
            const history = await historyRepository.findByTaskName({
              taskName,
              limit: 100,
              offset: 0,
            });

            expect(history.length).toBe(executionCount);

            // Verify each record has complete data
            history.forEach((record, index) => {
              // Requirement 1.2: All required fields present
              expect(record.taskName).toBe(taskName);
              expect(record.startedAt).toBeInstanceOf(Date);
              expect(record.completedAt).toBeInstanceOf(Date);
              expect(record.result).toBe('success');
              expect(record.errorMessage).toBeNull();
              expect(record.duration).toBeGreaterThanOrEqual(0);
              expect(record.capturedLogs).not.toBeNull();
            });

            // Verify records are ordered by startedAt descending (most recent first)
            for (let i = 0; i < history.length - 1; i++) {
              expect(history[i].startedAt.getTime()).toBeGreaterThanOrEqual(
                history[i + 1].startedAt.getTime()
              );
            }

            // Requirement 1.4: Verify ScheduledTaskStatus reflects the most recent execution
            const status = await statusRepository.findByName(taskName);
            expect(status).not.toBeNull();
            expect(status!.lastResult).toBe('success');

            // Clean up this test's data
            await db.taskExecutionHistory.deleteMany({
              where: { taskName },
            });
            await db.scheduledTaskStatus.deleteMany({
              where: { taskName },
            });
          }
        ),
        { numRuns: 3 } // DB operations: 3-5 runs per property-tests.md guidelines
      );
    });
  });
});
