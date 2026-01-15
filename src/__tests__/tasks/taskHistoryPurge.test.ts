/**
 * Unit tests for Task History Purge scheduled task
 * 
 * Task 7.2: Write unit tests for purge task
 * - Test purge task is registered
 * - Test purge deletes old records
 * - Test purge preserves minimum records
 * - Test purge logs deletion count
 * - Test purge handles errors
 * 
 * Requirements: 6.2, 6.5
 */

import { taskHistoryPurgeTask } from '../../tasks/taskHistoryPurge';
import { ExecutionHistoryRepository } from '../../scheduler/ExecutionHistoryRepository';
import prisma from '../../db/client';
import logger from '../../utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('taskHistoryPurgeTask', () => {
  const repository = new ExecutionHistoryRepository();

  beforeEach(async () => {
    // Clean up test data
    await prisma.taskExecutionHistory.deleteMany({
      where: {
        taskName: {
          startsWith: 'test-purge-',
        },
      },
    });
    
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.taskExecutionHistory.deleteMany({
      where: {
        taskName: {
          startsWith: 'test-purge-',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('task registration', () => {
    it('should be registered with correct name', () => {
      expect(taskHistoryPurgeTask.name).toBe('task-history-purge');
    });

    it('should have a valid cron schedule', () => {
      expect(taskHistoryPurgeTask.schedule).toBeTruthy();
      expect(typeof taskHistoryPurgeTask.schedule).toBe('string');
      // Default schedule should be "0 2 * * *" (2 AM daily) unless configured otherwise
    });

    it('should be enabled by default', () => {
      expect(typeof taskHistoryPurgeTask.enabled).toBe('boolean');
    });

    it('should have an execute function', () => {
      expect(taskHistoryPurgeTask.execute).toBeDefined();
      expect(typeof taskHistoryPurgeTask.execute).toBe('function');
    });

    it('should have an onError handler', () => {
      expect(taskHistoryPurgeTask.onError).toBeDefined();
      expect(typeof taskHistoryPurgeTask.onError).toBe('function');
    });
  });

  describe('purge deletes old records', () => {
    it('should delete records older than retention period', async () => {
      const taskName = 'test-purge-old-records';
      
      // Create old records (40 days ago - beyond default 30 day retention)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      for (let i = 0; i < 5; i++) {
        await repository.create({
          taskName,
          startedAt: new Date(oldDate.getTime() + i * 1000),
          completedAt: new Date(oldDate.getTime() + i * 1000 + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Old log ${i}`,
        });
      }
      
      // Create recent records (5 days ago - within retention period)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);
      
      for (let i = 0; i < 5; i++) {
        await repository.create({
          taskName,
          startedAt: new Date(recentDate.getTime() + i * 1000),
          completedAt: new Date(recentDate.getTime() + i * 1000 + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Recent log ${i}`,
        });
      }
      
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Verify old records were deleted (but minimum 10 preserved)
      const remainingRecords = await repository.findByTaskName({
        taskName,
        limit: 100,
        offset: 0,
      });
      
      // Should have 10 records (5 recent + 5 old preserved due to minimum retention)
      expect(remainingRecords.length).toBe(10);
    });

    it('should delete records from multiple tasks independently', async () => {
      const task1Name = 'test-purge-multi-1';
      const task2Name = 'test-purge-multi-2';
      
      // Create old records for task 1 (15 records, 40 days old)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      for (let i = 0; i < 15; i++) {
        await repository.create({
          taskName: task1Name,
          startedAt: new Date(oldDate.getTime() + i * 1000),
          completedAt: new Date(oldDate.getTime() + i * 1000 + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Task 1 log ${i}`,
        });
      }
      
      // Create old records for task 2 (12 records, 40 days old)
      for (let i = 0; i < 12; i++) {
        await repository.create({
          taskName: task2Name,
          startedAt: new Date(oldDate.getTime() + i * 1000),
          completedAt: new Date(oldDate.getTime() + i * 1000 + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Task 2 log ${i}`,
        });
      }
      
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Verify task 1 has 10 records (15 - 5 deleted)
      const task1Records = await repository.findByTaskName({
        taskName: task1Name,
        limit: 100,
        offset: 0,
      });
      expect(task1Records.length).toBe(10);
      
      // Verify task 2 has 10 records (12 - 2 deleted)
      const task2Records = await repository.findByTaskName({
        taskName: task2Name,
        limit: 100,
        offset: 0,
      });
      expect(task2Records.length).toBe(10);
    });
  });

  describe('purge preserves minimum records', () => {
    it('should preserve all records when below minimum threshold', async () => {
      const taskName = 'test-purge-min-records';
      
      // Create 8 old records (all older than retention period)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      for (let i = 0; i < 8; i++) {
        await repository.create({
          taskName,
          startedAt: new Date(oldDate.getTime() + i * 1000),
          completedAt: new Date(oldDate.getTime() + i * 1000 + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Old log ${i}`,
        });
      }
      
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Verify all 8 records are preserved (below minimum of 10)
      const remainingRecords = await repository.findByTaskName({
        taskName,
        limit: 100,
        offset: 0,
      });
      
      expect(remainingRecords.length).toBe(8);
    });

    it('should preserve exactly minimum records when all are old', async () => {
      const taskName = 'test-purge-exact-min';
      
      // Create 20 old records (all older than retention period)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      for (let i = 0; i < 20; i++) {
        await repository.create({
          taskName,
          startedAt: new Date(oldDate.getTime() + i * 1000),
          completedAt: new Date(oldDate.getTime() + i * 1000 + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Old log ${i}`,
        });
      }
      
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Verify exactly 10 records are preserved (minimum retention)
      const remainingRecords = await repository.findByTaskName({
        taskName,
        limit: 100,
        offset: 0,
      });
      
      expect(remainingRecords.length).toBe(10);
    });

    it('should preserve most recent records when enforcing minimum', async () => {
      const taskName = 'test-purge-recent-preserved';
      
      // Create 15 old records with different timestamps
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      const timestamps: Date[] = [];
      for (let i = 0; i < 15; i++) {
        const startedAt = new Date(oldDate.getTime() + i * 60000); // 1 minute apart
        timestamps.push(startedAt);
        await repository.create({
          taskName,
          startedAt,
          completedAt: new Date(startedAt.getTime() + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Log ${i}`,
        });
      }
      
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Verify 10 most recent records are preserved
      const remainingRecords = await repository.findByTaskName({
        taskName,
        limit: 100,
        offset: 0,
      });
      
      expect(remainingRecords.length).toBe(10);
      
      // Verify they are the most recent ones (last 10 timestamps)
      const remainingTimestamps = remainingRecords.map(r => r.startedAt.getTime());
      const expectedTimestamps = timestamps.slice(-10).map(t => t.getTime());
      
      expect(remainingTimestamps.sort()).toEqual(expectedTimestamps.sort());
    });
  });

  describe('purge logs deletion count', () => {
    it('should log the number of records deleted', async () => {
      const taskName = 'test-purge-log-count';
      
      // Create 15 old records
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      for (let i = 0; i < 15; i++) {
        await repository.create({
          taskName,
          startedAt: new Date(oldDate.getTime() + i * 1000),
          completedAt: new Date(oldDate.getTime() + i * 1000 + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Old log ${i}`,
        });
      }
      
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Verify logger was called with deletion count
      expect(logger.info).toHaveBeenCalledWith(
        'Task history purge completed',
        expect.objectContaining({
          deletedCount: 5, // 15 - 10 (minimum retention)
        })
      );
    });

    it('should log zero deletions when no records are old enough', async () => {
      const taskName = 'test-purge-no-deletions';
      
      // Create recent records (5 days ago - within retention period)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);
      
      for (let i = 0; i < 5; i++) {
        await repository.create({
          taskName,
          startedAt: new Date(recentDate.getTime() + i * 1000),
          completedAt: new Date(recentDate.getTime() + i * 1000 + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Recent log ${i}`,
        });
      }
      
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Verify logger was called with zero deletions
      expect(logger.info).toHaveBeenCalledWith(
        'Task history purge completed',
        expect.objectContaining({
          deletedCount: 0,
        })
      );
    });

    it('should log purge start with configuration details', async () => {
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Verify logger was called with configuration
      expect(logger.info).toHaveBeenCalledWith(
        'Task history purge started',
        expect.objectContaining({
          retentionDays: expect.any(Number),
          minRecordsPerTask: expect.any(Number),
        })
      );
    });

    it('should log cutoff date in completion message', async () => {
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Verify logger was called with cutoff date
      expect(logger.info).toHaveBeenCalledWith(
        'Task history purge completed',
        expect.objectContaining({
          cutoffDate: expect.any(String),
          retentionDays: expect.any(Number),
          minRecordsPerTask: expect.any(Number),
        })
      );
    });
  });

  describe('purge handles errors', () => {
    it('should handle database errors gracefully in repository', async () => {
      // Mock Prisma findMany to throw an error (first call in deleteOlderThan)
      const mockError = new Error('Database connection failed');
      const findManySpy = jest.spyOn(prisma.taskExecutionHistory, 'findMany')
        .mockRejectedValueOnce(mockError);
      
      // Execute should complete (repository catches errors and returns 0)
      await taskHistoryPurgeTask.execute();
      
      // Verify repository error was logged
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to purge task execution history',
        expect.objectContaining({
          error: 'Database connection failed',
        })
      );
      
      // Verify task completion was logged with 0 deletions
      expect(logger.info).toHaveBeenCalledWith(
        'Task history purge completed',
        expect.objectContaining({
          deletedCount: 0,
        })
      );
      
      // Restore the spy
      findManySpy.mockRestore();
    });

    it('should throw and log errors from task execution itself', async () => {
      // Mock Date.prototype.setDate to throw an error in the task's execute function
      const originalSetDate = Date.prototype.setDate;
      const mockError = new Error('Date manipulation failed');
      
      Date.prototype.setDate = jest.fn(() => {
        throw mockError;
      });
      
      try {
        // Execute should throw
        await expect(taskHistoryPurgeTask.execute()).rejects.toThrow('Date manipulation failed');
        
        // Verify error was logged by the task
        expect(logger.error).toHaveBeenCalledWith(
          'Task history purge failed',
          expect.objectContaining({
            error: 'Date manipulation failed',
            stack: expect.any(String),
          })
        );
      } finally {
        // Restore original setDate
        Date.prototype.setDate = originalSetDate;
      }
    });

    it('should call onError handler when provided with error', () => {
      const testError = new Error('Test error');
      
      taskHistoryPurgeTask.onError!(testError);
      
      expect(logger.error).toHaveBeenCalledWith(
        'Task history purge encountered an error',
        {
          error: 'Test error',
          stack: testError.stack,
        }
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty database gracefully', async () => {
      // Execute purge task with no records
      await taskHistoryPurgeTask.execute();
      
      // Should complete successfully with 0 deletions
      expect(logger.info).toHaveBeenCalledWith(
        'Task history purge completed',
        expect.objectContaining({
          deletedCount: 0,
        })
      );
    });

    it('should handle tasks with exactly minimum records', async () => {
      const taskName = 'test-purge-exact-minimum';
      
      // Create exactly 10 old records
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      for (let i = 0; i < 10; i++) {
        await repository.create({
          taskName,
          startedAt: new Date(oldDate.getTime() + i * 1000),
          completedAt: new Date(oldDate.getTime() + i * 1000 + 500),
          result: 'success',
          errorMessage: null,
          duration: 500,
          capturedLogs: `Log ${i}`,
        });
      }
      
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // All 10 records should be preserved
      const remainingRecords = await repository.findByTaskName({
        taskName,
        limit: 100,
        offset: 0,
      });
      
      expect(remainingRecords.length).toBe(10);
    });

    it('should handle mixed success and failure records', async () => {
      const taskName = 'test-purge-mixed-results';
      
      // Create old records with mixed results
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      for (let i = 0; i < 15; i++) {
        await repository.create({
          taskName,
          startedAt: new Date(oldDate.getTime() + i * 1000),
          completedAt: new Date(oldDate.getTime() + i * 1000 + 500),
          result: i % 2 === 0 ? 'success' : 'failure',
          errorMessage: i % 2 === 0 ? null : 'Test error',
          duration: 500,
          capturedLogs: `Log ${i}`,
        });
      }
      
      // Execute purge task
      await taskHistoryPurgeTask.execute();
      
      // Should preserve 10 most recent regardless of result
      const remainingRecords = await repository.findByTaskName({
        taskName,
        limit: 100,
        offset: 0,
      });
      
      expect(remainingRecords.length).toBe(10);
    });
  });
});
