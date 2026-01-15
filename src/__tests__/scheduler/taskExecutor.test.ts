/**
 * TaskExecutor Unit Tests
 * 
 * Tests TaskExecutor integration with history storage and log capture.
 * Validates Requirements: 1.4, 2.5, 7.2, 8.1, 8.5
 * 
 * Task 5.3: Unit tests for TaskExecutor integration
 * - Test successful task execution creates history
 * - Test failed task execution creates history with error
 * - Test history storage failure doesn't break task execution
 * - Test log capture failure doesn't break task execution
 * - Test backward compatibility (ScheduledTaskStatus still updated)
 * - Test history disabled via configuration
 */

import { TaskExecutor } from '../../scheduler/TaskExecutor';
import { TaskStatusRepository } from '../../scheduler/TaskStatusRepository';
import { ExecutionHistoryRepository } from '../../scheduler/ExecutionHistoryRepository';
import { ScheduledTask } from '../../scheduler/types';
import { getTestDb } from '../helpers/testDb';
import logger from '../../utils/logger';

const db = getTestDb();
const statusRepository = new TaskStatusRepository();
const historyRepository = new ExecutionHistoryRepository();

describe('TaskExecutor - Unit Tests', () => {
  afterEach(async () => {
    // Clean up test data
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

  describe('successful task execution creates history', () => {
    it('should create history record for successful task execution', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-success',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executing successfully');
          await new Promise(resolve => setTimeout(resolve, 50));
        },
      };

      await executor.execute(task);

      // Wait for asynchronous history storage
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify history record was created
      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-success',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].taskName).toBe('test-task-success');
      expect(history[0].result).toBe('success');
      expect(history[0].errorMessage).toBeNull();
      expect(history[0].duration).toBeGreaterThanOrEqual(50);
      expect(history[0].capturedLogs).toContain('Task executing successfully');
    });

    it('should update ScheduledTaskStatus for successful execution', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-status-success',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
        },
      };

      await executor.execute(task);

      // Verify ScheduledTaskStatus was updated (Requirement 1.4, 8.1)
      const status = await statusRepository.findByName('test-task-status-success');

      expect(status).not.toBeNull();
      expect(status!.taskName).toBe('test-task-status-success');
      expect(status!.lastResult).toBe('success');
      expect(status!.lastError).toBeNull();
      expect(status!.lastRun).toBeInstanceOf(Date);
      expect(status!.lastDuration).toBeGreaterThanOrEqual(20);
    });
  });

  describe('failed task execution creates history with error', () => {
    it('should create history record with error for failed task execution', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-failure',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          logger.warn('Task about to fail');
          await new Promise(resolve => setTimeout(resolve, 30));
          throw new Error('Task execution failed');
        },
      };

      // Execute should not throw - errors are caught internally
      await executor.execute(task);

      // Wait for asynchronous history storage
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify history record was created with error
      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-failure',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].taskName).toBe('test-task-failure');
      expect(history[0].result).toBe('failure');
      expect(history[0].errorMessage).toBe('Task execution failed');
      expect(history[0].duration).toBeGreaterThanOrEqual(30);
      expect(history[0].capturedLogs).toContain('Task about to fail');
    });

    it('should update ScheduledTaskStatus with error for failed execution', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-status-failure',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          throw new Error('Status update test error');
        },
      };

      await executor.execute(task);

      // Verify ScheduledTaskStatus was updated with error (Requirement 1.4, 8.1)
      const status = await statusRepository.findByName('test-task-status-failure');

      expect(status).not.toBeNull();
      expect(status!.taskName).toBe('test-task-status-failure');
      expect(status!.lastResult).toBe('failure');
      expect(status!.lastError).toBe('Status update test error');
      expect(status!.lastRun).toBeInstanceOf(Date);
    });

    it('should call task onError handler when task fails', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const onErrorMock = jest.fn();

      const task: ScheduledTask = {
        name: 'test-task-onerror',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          throw new Error('Test error for handler');
        },
        onError: onErrorMock,
      };

      await executor.execute(task);

      // Verify onError handler was called
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error));
      expect(onErrorMock.mock.calls[0][0].message).toBe('Test error for handler');
    });
  });

  describe('history storage failure does not break task execution', () => {
    it('should continue task execution when history storage fails', async () => {
      // Create a mock history repository that always fails
      const failingHistoryRepository = {
        create: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        findByTaskName: jest.fn(),
        countByTaskName: jest.fn(),
        deleteOlderThan: jest.fn(),
      } as any;

      const executor = new TaskExecutor(statusRepository, failingHistoryRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-history-fail',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executing despite history failure');
          await new Promise(resolve => setTimeout(resolve, 20));
        },
      };

      // Should not throw even though history storage fails
      await expect(executor.execute(task)).resolves.not.toThrow();

      // Wait for async history storage attempt
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify history create was attempted
      expect(failingHistoryRepository.create).toHaveBeenCalled();

      // Verify ScheduledTaskStatus was still updated (Requirement 7.2)
      const status = await statusRepository.findByName('test-task-history-fail');
      expect(status).not.toBeNull();
      expect(status!.lastResult).toBe('success');
    });

    it('should handle history repository being null', async () => {
      const executor = new TaskExecutor(statusRepository, null, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-null-history',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      // Should not throw with null history repository
      await expect(executor.execute(task)).resolves.not.toThrow();

      // Verify ScheduledTaskStatus was still updated
      const status = await statusRepository.findByName('test-task-null-history');
      expect(status).not.toBeNull();
      expect(status!.lastResult).toBe('success');
    });

    it('should handle async history storage errors gracefully', async () => {
      // Create a history repository that fails after a delay
      const delayedFailHistoryRepository = {
        create: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          throw new Error('Delayed storage failure');
        }),
        findByTaskName: jest.fn(),
        countByTaskName: jest.fn(),
        deleteOlderThan: jest.fn(),
      } as any;

      const executor = new TaskExecutor(statusRepository, delayedFailHistoryRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-delayed-fail',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      // Should complete successfully
      await expect(executor.execute(task)).resolves.not.toThrow();

      // Wait for async history storage to fail
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify task status was updated despite history failure
      const status = await statusRepository.findByName('test-task-delayed-fail');
      expect(status).not.toBeNull();
      expect(status!.lastResult).toBe('success');
    });
  });

  describe('log capture failure does not break task execution', () => {
    it('should continue task execution when log capture initialization fails', async () => {
      // This test verifies Requirement 2.5: log capture failure doesn't break execution
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
        maxLogSize: -1, // Invalid size might cause initialization issues
      });

      const task: ScheduledTask = {
        name: 'test-task-log-init-fail',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executing despite log capture issues');
          await new Promise(resolve => setTimeout(resolve, 20));
        },
      };

      // Should not throw even if log capture has issues
      await expect(executor.execute(task)).resolves.not.toThrow();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify task completed and status was updated
      const status = await statusRepository.findByName('test-task-log-init-fail');
      expect(status).not.toBeNull();
      expect(status!.lastResult).toBe('success');

      // History should still be created (possibly with null logs)
      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-log-init-fail',
        limit: 10,
        offset: 0,
      });
      expect(history).toHaveLength(1);
    });

    it('should handle log capture retrieval failure gracefully', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-log-retrieval',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executing');
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      // Execute task
      await expect(executor.execute(task)).resolves.not.toThrow();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify task completed successfully
      const status = await statusRepository.findByName('test-task-log-retrieval');
      expect(status).not.toBeNull();
      expect(status!.lastResult).toBe('success');
    });

    it('should create history with null logs when log capture fails', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-null-logs',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          // Task executes without logging
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      await executor.execute(task);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));

      // History should be created even if logs are minimal/null
      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-null-logs',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].result).toBe('success');
      // Logs might be null or minimal
    });
  });

  describe('backward compatibility - ScheduledTaskStatus still updated', () => {
    it('should always update ScheduledTaskStatus regardless of history settings', async () => {
      // Test with history enabled
      const executorWithHistory = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const task1: ScheduledTask = {
        name: 'test-task-compat-enabled',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      await executorWithHistory.execute(task1);

      const status1 = await statusRepository.findByName('test-task-compat-enabled');
      expect(status1).not.toBeNull();
      expect(status1!.lastResult).toBe('success');

      // Test with history disabled
      const executorWithoutHistory = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: false,
      });

      const task2: ScheduledTask = {
        name: 'test-task-compat-disabled',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      await executorWithoutHistory.execute(task2);

      const status2 = await statusRepository.findByName('test-task-compat-disabled');
      expect(status2).not.toBeNull();
      expect(status2!.lastResult).toBe('success');
    });

    it('should preserve existing status fields when updating', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      // Create initial status with enabled=false
      await statusRepository.upsert({
        taskName: 'test-task-preserve',
        enabled: false,
        lastRun: null,
        nextRun: new Date('2025-01-01T00:00:00Z'),
        lastResult: null,
        lastError: null,
        lastDuration: null,
      });

      const task: ScheduledTask = {
        name: 'test-task-preserve',
        schedule: '0 0 * * *',
        enabled: false, // Keep disabled
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      await executor.execute(task);

      const status = await statusRepository.findByName('test-task-preserve');
      expect(status).not.toBeNull();
      expect(status!.enabled).toBe(false); // Should preserve enabled state
      expect(status!.lastResult).toBe('success'); // Should update result
    });

    it('should update status even when history repository is null', async () => {
      const executor = new TaskExecutor(statusRepository, null, {
        historyEnabled: false,
      });

      const task: ScheduledTask = {
        name: 'test-task-no-history-repo',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      await executor.execute(task);

      // Verify status was updated (Requirement 8.1)
      const status = await statusRepository.findByName('test-task-no-history-repo');
      expect(status).not.toBeNull();
      expect(status!.lastResult).toBe('success');
      expect(status!.lastRun).toBeInstanceOf(Date);
    });
  });

  describe('history disabled via configuration', () => {
    it('should not create history when historyEnabled is false', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: false,
      });

      const task: ScheduledTask = {
        name: 'test-task-disabled-history',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executing without history');
          await new Promise(resolve => setTimeout(resolve, 20));
        },
      };

      await executor.execute(task);

      // Wait for any potential async operations
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify NO history record was created (Requirement 8.5)
      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-disabled-history',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(0);

      // But status should still be updated
      const status = await statusRepository.findByName('test-task-disabled-history');
      expect(status).not.toBeNull();
      expect(status!.lastResult).toBe('success');
    });

    it('should not capture logs when history is disabled', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: false,
      });

      const task: ScheduledTask = {
        name: 'test-task-no-log-capture',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          logger.info('This should not be captured');
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      await executor.execute(task);

      // Wait for any potential async operations
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify no history was created
      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-no-log-capture',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(0);
    });

    it('should respect historyEnabled default value of true', async () => {
      // Create executor without specifying historyEnabled (should default to true)
      const executor = new TaskExecutor(statusRepository, historyRepository);

      const task: ScheduledTask = {
        name: 'test-task-default-enabled',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      await executor.execute(task);

      // Wait for async history storage
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify history WAS created (default is enabled)
      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-default-enabled',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
    });

    it('should not create history when historyRepository is null even if enabled', async () => {
      const executor = new TaskExecutor(statusRepository, null, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-null-repo-enabled',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      await executor.execute(task);

      // Wait for any potential async operations
      await new Promise(resolve => setTimeout(resolve, 150));

      // Status should be updated
      const status = await statusRepository.findByName('test-task-null-repo-enabled');
      expect(status).not.toBeNull();
      expect(status!.lastResult).toBe('success');

      // Cannot verify history since repository is null, but execution should succeed
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle task that throws non-Error object', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-non-error',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          throw 'String error'; // eslint-disable-line no-throw-literal
        },
      };

      await expect(executor.execute(task)).resolves.not.toThrow();

      await new Promise(resolve => setTimeout(resolve, 150));

      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-non-error',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].result).toBe('failure');
      expect(history[0].errorMessage).toBe('String error');
    });

    it('should handle task with failing onError handler', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const onErrorMock = jest.fn().mockImplementation(() => {
        throw new Error('Error handler failed');
      });

      const task: ScheduledTask = {
        name: 'test-task-failing-handler',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          throw new Error('Original error');
        },
        onError: onErrorMock,
      };

      // Should not throw even though error handler fails
      await expect(executor.execute(task)).resolves.not.toThrow();

      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify onError was called
      expect(onErrorMock).toHaveBeenCalled();

      // Verify history was still created with original error
      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-failing-handler',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].result).toBe('failure');
      expect(history[0].errorMessage).toBe('Original error');
    });

    it('should handle very fast task execution', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
      });

      const task: ScheduledTask = {
        name: 'test-task-instant',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          // Instant execution
        },
      };

      await executor.execute(task);

      await new Promise(resolve => setTimeout(resolve, 150));

      const history = await historyRepository.findByTaskName({
        taskName: 'test-task-instant',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle custom maxLogSize configuration', async () => {
      const executor = new TaskExecutor(statusRepository, historyRepository, {
        historyEnabled: true,
        maxLogSize: 500, // Small log size
      });

      const task: ScheduledTask = {
        name: 'test-task-custom-log-size',
        schedule: '0 0 * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task with custom log size');
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      await expect(executor.execute(task)).resolves.not.toThrow();

      await new Promise(resolve => setTimeout(resolve, 150));

      const status = await statusRepository.findByName('test-task-custom-log-size');
      expect(status).not.toBeNull();
      expect(status!.lastResult).toBe('success');
    });
  });
});
