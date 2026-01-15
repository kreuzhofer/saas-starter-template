/**
 * ExecutionHistoryRepository Unit Tests
 * 
 * Tests CRUD operations for task execution history.
 * Validates Requirements: 1.2, 3.4
 * 
 * Task 2.6: Edge case tests for ExecutionHistoryRepository
 * - Test empty logs (null capturedLogs)
 * - Test zero duration
 * - Test non-existent task queries
 * - Test database errors
 */

import { ExecutionHistoryRepository, ExecutionHistoryRecord } from '../../scheduler/ExecutionHistoryRepository';
import { getTestDb } from '../helpers/testDb';

const db = getTestDb();
const repository = new ExecutionHistoryRepository();

describe('ExecutionHistoryRepository - Edge Cases', () => {
  afterEach(async () => {
    // Clean up test execution history records
    await db.taskExecutionHistory.deleteMany({
      where: {
        taskName: {
          startsWith: 'test-task-',
        },
      },
    });
  });

  describe('empty logs (null capturedLogs)', () => {
    it('should handle null capturedLogs gracefully', async () => {
      const record: ExecutionHistoryRecord = {
        taskName: 'test-task-null-logs',
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'success',
        errorMessage: null,
        duration: 100,
        capturedLogs: null,
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: 'test-task-null-logs',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].capturedLogs).toBeNull();
    });

    it('should handle empty string capturedLogs', async () => {
      const record: ExecutionHistoryRecord = {
        taskName: 'test-task-empty-logs',
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'success',
        errorMessage: null,
        duration: 100,
        capturedLogs: '',
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: 'test-task-empty-logs',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].capturedLogs).toBe('');
    });
  });

  describe('zero duration', () => {
    it('should handle zero duration correctly', async () => {
      const record: ExecutionHistoryRecord = {
        taskName: 'test-task-zero-duration',
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'success',
        errorMessage: null,
        duration: 0,
        capturedLogs: 'Instant execution',
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: 'test-task-zero-duration',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].duration).toBe(0);
    });

    it('should handle negative duration values', async () => {
      const record: ExecutionHistoryRecord = {
        taskName: 'test-task-negative-duration',
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'success',
        errorMessage: null,
        duration: -100, // Negative duration (shouldn't happen but testing edge case)
        capturedLogs: 'Test log',
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: 'test-task-negative-duration',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].duration).toBe(-100);
    });
  });

  describe('non-existent task queries', () => {
    it('should return empty array for non-existent task in findByTaskName', async () => {
      const history = await repository.findByTaskName({
        taskName: 'test-task-nonexistent',
        limit: 10,
        offset: 0,
      });

      expect(history).toEqual([]);
    });

    it('should return 0 for non-existent task in countByTaskName', async () => {
      const count = await repository.countByTaskName('test-task-nonexistent-count');
      expect(count).toBe(0);
    });

    it('should handle queries with special characters in task name', async () => {
      const history = await repository.findByTaskName({
        taskName: 'test-task-!@#$%^&*()',
        limit: 10,
        offset: 0,
      });

      expect(history).toEqual([]);
    });

    it('should handle queries with very long task names', async () => {
      const longTaskName = 'test-task-' + 'x'.repeat(200);
      const history = await repository.findByTaskName({
        taskName: longTaskName,
        limit: 10,
        offset: 0,
      });

      expect(history).toEqual([]);
    });
  });

  describe('database errors', () => {
    it('should handle database errors gracefully in create', async () => {
      // Create a record with an invalid taskName that exceeds database limit
      // The VARCHAR(100) constraint should cause a database error
      const record: ExecutionHistoryRecord = {
        taskName: 'x'.repeat(200), // Exceeds VARCHAR(100) limit
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'success',
        errorMessage: null,
        duration: 100,
        capturedLogs: 'Test log',
      };

      // Should not throw - errors are caught and logged
      await expect(repository.create(record)).resolves.not.toThrow();
    });

    it('should return empty array on database error in findByTaskName', async () => {
      // Mock a database error by using a spy
      const originalFindMany = db.taskExecutionHistory.findMany;
      const mockFindMany = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      db.taskExecutionHistory.findMany = mockFindMany as any;

      const history = await repository.findByTaskName({
        taskName: 'test-task-error',
        limit: 10,
        offset: 0,
      });

      expect(history).toEqual([]);
      expect(mockFindMany).toHaveBeenCalled();

      // Restore original method
      db.taskExecutionHistory.findMany = originalFindMany;
    });

    it('should return 0 on database error in countByTaskName', async () => {
      // Mock a database error
      const originalCount = db.taskExecutionHistory.count;
      const mockCount = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      db.taskExecutionHistory.count = mockCount as any;

      const count = await repository.countByTaskName('test-task-error');

      expect(count).toBe(0);
      expect(mockCount).toHaveBeenCalled();

      // Restore original method
      db.taskExecutionHistory.count = originalCount;
    });

    it('should return 0 on database error in deleteOlderThan', async () => {
      // Mock a database error
      const originalFindMany = db.taskExecutionHistory.findMany;
      const mockFindMany = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      db.taskExecutionHistory.findMany = mockFindMany as any;

      const cutoffDate = new Date();
      const deletedCount = await repository.deleteOlderThan(cutoffDate, 10);

      expect(deletedCount).toBe(0);
      expect(mockFindMany).toHaveBeenCalled();

      // Restore original method
      db.taskExecutionHistory.findMany = originalFindMany;
    });
  });

  describe('additional edge cases', () => {
    it('should handle very large log content', async () => {
      const largeLogs = 'x'.repeat(50000); // 50KB of logs
      const record: ExecutionHistoryRecord = {
        taskName: 'test-task-large-logs',
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'success',
        errorMessage: null,
        duration: 1000,
        capturedLogs: largeLogs,
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: 'test-task-large-logs',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].capturedLogs).toBe(largeLogs);
    });

    it('should handle special characters in task names', async () => {
      const specialTaskName = 'test-task-special-!@#$%^&*()';
      const record: ExecutionHistoryRecord = {
        taskName: specialTaskName,
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'success',
        errorMessage: null,
        duration: 100,
        capturedLogs: 'Test log',
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: specialTaskName,
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].taskName).toBe(specialTaskName);
    });

    it('should handle very long error messages', async () => {
      const longErrorMessage = 'Error: ' + 'x'.repeat(10000);
      const record: ExecutionHistoryRecord = {
        taskName: 'test-task-long-error',
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'failure',
        errorMessage: longErrorMessage,
        duration: 100,
        capturedLogs: 'Test log',
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: 'test-task-long-error',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].errorMessage).toBe(longErrorMessage);
    });

    it('should handle completedAt before startedAt', async () => {
      const startedAt = new Date('2024-01-01T10:00:00Z');
      const completedAt = new Date('2024-01-01T09:00:00Z'); // Before startedAt
      
      const record: ExecutionHistoryRecord = {
        taskName: 'test-task-time-anomaly',
        startedAt,
        completedAt,
        result: 'success',
        errorMessage: null,
        duration: 100,
        capturedLogs: 'Test log',
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: 'test-task-time-anomaly',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].startedAt.toISOString()).toBe(startedAt.toISOString());
      expect(history[0].completedAt.toISOString()).toBe(completedAt.toISOString());
    });

    it('should handle null error message for successful execution', async () => {
      const record: ExecutionHistoryRecord = {
        taskName: 'test-task-null-error',
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'success',
        errorMessage: null,
        duration: 100,
        capturedLogs: 'Test log',
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: 'test-task-null-error',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].errorMessage).toBeNull();
    });

    it('should handle empty error message string', async () => {
      const record: ExecutionHistoryRecord = {
        taskName: 'test-task-empty-error',
        startedAt: new Date(),
        completedAt: new Date(),
        result: 'failure',
        errorMessage: '',
        duration: 100,
        capturedLogs: 'Test log',
      };

      await repository.create(record);

      const history = await repository.findByTaskName({
        taskName: 'test-task-empty-error',
        limit: 10,
        offset: 0,
      });

      expect(history).toHaveLength(1);
      expect(history[0].errorMessage).toBe('');
    });
  });
});
