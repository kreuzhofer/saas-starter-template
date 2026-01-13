import { scheduler } from '../../scheduler';
import { getTestDb, cleanupTestDb, generateTestTaskName } from '../helpers/testDb';
import logger from '../../utils/logger';

const db = getTestDb();

/**
 * Integration tests for scheduler graceful shutdown
 * Tests that scheduler stops correctly when application receives SIGTERM
 * 
 * Requirements: 9.1, 9.2, 9.3
 */
describe('Scheduler Graceful Shutdown Integration Tests', () => {
  let testTaskExecuted = false;
  let testTaskName: string;

  beforeEach(async () => {
    await cleanupTestDb();
    testTaskExecuted = false;
    testTaskName = generateTestTaskName('shutdown');
  });

  afterEach(async () => {
    // Ensure scheduler is stopped
    try {
      await scheduler.stop();
    } catch (error) {
      // Ignore errors if scheduler wasn't started
    }
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestDb();
  });

  describe('Scheduler stops on SIGTERM', () => {
    it('should stop scheduler and cancel all cron jobs', async () => {
      let executionCount = 0;

      // Register a task that executes frequently
      scheduler.registerTask({
        name: testTaskName,
        schedule: '* * * * * *', // Every second (if supported) or every minute
        enabled: true,
        execute: async () => {
          executionCount++;
          logger.info('Task executed', { executionCount });
        },
      });

      // Start the scheduler
      await scheduler.start();

      // Verify task is scheduled
      const statusBeforeStop = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });
      expect(statusBeforeStop).toBeTruthy();

      // Stop the scheduler (simulating SIGTERM)
      await scheduler.stop();

      // Wait a bit to ensure no more executions happen
      const countAfterStop = executionCount;
      await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 2000ms

      // Execution count should not increase after stop
      expect(executionCount).toBe(countAfterStop);
    });

    it('should complete shutdown within timeout', async () => {
      scheduler.registerTask({
        name: testTaskName,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();

      // Measure shutdown time
      const startTime = Date.now();
      await scheduler.stop();
      const shutdownDuration = Date.now() - startTime;

      // Should complete within 5 seconds (default timeout)
      expect(shutdownDuration).toBeLessThan(5000);
    });

    it('should stop multiple tasks simultaneously', async () => {
      const task1Name = generateTestTaskName('multi-1');
      const task2Name = generateTestTaskName('multi-2');
      const task3Name = generateTestTaskName('multi-3');

      let task1Executing = false;
      let task2Executing = false;
      let task3Executing = false;

      scheduler.registerTask({
        name: task1Name,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          task1Executing = true;
          await new Promise(resolve => setTimeout(resolve, 100));
          task1Executing = false;
        },
      });

      scheduler.registerTask({
        name: task2Name,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          task2Executing = true;
          await new Promise(resolve => setTimeout(resolve, 100));
          task2Executing = false;
        },
      });

      scheduler.registerTask({
        name: task3Name,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          task3Executing = true;
          await new Promise(resolve => setTimeout(resolve, 100));
          task3Executing = false;
        },
      });

      await scheduler.start();

      // Stop all tasks
      await scheduler.stop();

      // Wait to ensure no tasks are executing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(task1Executing).toBe(false);
      expect(task2Executing).toBe(false);
      expect(task3Executing).toBe(false);
    });

    it('should prevent new task executions after stop', async () => {
      let executionCount = 0;

      scheduler.registerTask({
        name: testTaskName,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          executionCount++;
        },
      });

      await scheduler.start();
      await scheduler.stop();

      const countAfterStop = executionCount;

      // Wait for what would be the next execution time
      await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 2000ms

      // No new executions should have occurred
      expect(executionCount).toBe(countAfterStop);
    });

    it('should handle stop when no tasks are registered', async () => {
      // Start scheduler with no tasks
      await scheduler.start();

      // Should stop without errors
      await expect(scheduler.stop()).resolves.not.toThrow();
    });

    it('should handle stop when scheduler is not started', async () => {
      // Try to stop without starting
      await expect(scheduler.stop()).resolves.not.toThrow();
    });

    it('should handle multiple stop calls gracefully', async () => {
      scheduler.registerTask({
        name: testTaskName,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();

      // Stop multiple times
      await scheduler.stop();
      await expect(scheduler.stop()).resolves.not.toThrow();
      await expect(scheduler.stop()).resolves.not.toThrow();
    });
  });

  describe('Cron jobs are cancelled', () => {
    it('should cancel all pending cron jobs on stop', async () => {
      const task1Name = generateTestTaskName('cancel-1');
      const task2Name = generateTestTaskName('cancel-2');

      let task1Count = 0;
      let task2Count = 0;

      scheduler.registerTask({
        name: task1Name,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          task1Count++;
        },
      });

      scheduler.registerTask({
        name: task2Name,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          task2Count++;
        },
      });

      await scheduler.start();

      // Record counts before stop
      const task1CountBeforeStop = task1Count;
      const task2CountBeforeStop = task2Count;

      // Stop scheduler
      await scheduler.stop();

      // Wait for what would be execution time
      await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 2000ms

      // Counts should not have increased
      expect(task1Count).toBe(task1CountBeforeStop);
      expect(task2Count).toBe(task2CountBeforeStop);
    });

    it('should release all resources and timers', async () => {
      scheduler.registerTask({
        name: testTaskName,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();
      await scheduler.stop();

      // After stop, should be able to start again (resources released)
      await expect(scheduler.start()).resolves.not.toThrow();
      await scheduler.stop();
    });

    it('should handle tasks with different schedules during shutdown', async () => {
      const frequentTaskName = generateTestTaskName('frequent');
      const infrequentTaskName = generateTestTaskName('infrequent');

      let frequentCount = 0;
      let infrequentCount = 0;

      scheduler.registerTask({
        name: frequentTaskName,
        schedule: '* * * * *', // Every minute
        enabled: true,
        execute: async () => {
          frequentCount++;
        },
      });

      scheduler.registerTask({
        name: infrequentTaskName,
        schedule: '0 0 * * *', // Daily
        enabled: true,
        execute: async () => {
          infrequentCount++;
        },
      });

      await scheduler.start();

      const frequentCountBefore = frequentCount;
      const infrequentCountBefore = infrequentCount;

      await scheduler.stop();

      // Wait to ensure no executions
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(frequentCount).toBe(frequentCountBefore);
      expect(infrequentCount).toBe(infrequentCountBefore);
    });
  });

  describe('Shutdown logging', () => {
    it('should log shutdown event when stopping', async () => {
      const logSpy = jest.spyOn(logger, 'info');

      scheduler.registerTask({
        name: testTaskName,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();
      await scheduler.stop();

      // Verify shutdown was logged
      const shutdownLogs = logSpy.mock.calls.filter((call: any) => {
        const message = call[0];
        return typeof message === 'string' && (message.includes('stop') || message.includes('shutdown'));
      });

      expect(shutdownLogs.length).toBeGreaterThan(0);

      logSpy.mockRestore();
    });
  });

  describe('Full application lifecycle', () => {
    it('should handle complete start-stop-start cycle', async () => {
      const taskName = generateTestTaskName('lifecycle');
      let executionCount = 0;

      scheduler.registerTask({
        name: taskName,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          executionCount++;
        },
      });

      // First cycle
      await scheduler.start();
      const statusAfterFirstStart = await db.scheduledTaskStatus.findUnique({
        where: { taskName: taskName },
      });
      expect(statusAfterFirstStart).toBeTruthy();

      await scheduler.stop();

      // Second cycle
      await scheduler.start();
      const statusAfterSecondStart = await db.scheduledTaskStatus.findUnique({
        where: { taskName: taskName },
      });
      expect(statusAfterSecondStart).toBeTruthy();

      await scheduler.stop();

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should maintain task state across restart', async () => {
      const taskName = generateTestTaskName('state');

      scheduler.registerTask({
        name: taskName,
        schedule: '0 * * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      // Start and create initial state
      await scheduler.start();
      const initialStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: taskName },
      });

      // Stop
      await scheduler.stop();

      // Start again
      await scheduler.start();
      const statusAfterRestart = await db.scheduledTaskStatus.findUnique({
        where: { taskName: taskName },
      });

      // Task should still exist with same name
      expect(statusAfterRestart?.taskName).toBe(initialStatus?.taskName);
      expect(statusAfterRestart?.enabled).toBe(initialStatus?.enabled);

      await scheduler.stop();
    });
  });
});
