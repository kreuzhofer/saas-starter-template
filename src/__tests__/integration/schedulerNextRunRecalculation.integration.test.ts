import { scheduler } from '../../scheduler';
import { getTestDb, cleanupTestDb, generateTestTaskName } from '../helpers/testDb';
import logger from '../../utils/logger';

const db = getTestDb();

/**
 * Integration tests for next run time recalculation after task execution
 * Tests that next run times are updated correctly after tasks execute
 * 
 * Requirements: 3.1, 3.3
 */
describe('Scheduler Next Run Recalculation Integration Tests', () => {
  let testTaskName: string;

  beforeEach(async () => {
    await cleanupTestDb();
    testTaskName = generateTestTaskName('recalc');
  });

  afterEach(async () => {
    // Stop scheduler and clean up
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

  describe('Next run time recalculation after execution', () => {
    it('should recalculate next run time after manual task trigger', async () => {
      let executionCount = 0;

      // Register a task with hourly schedule
      scheduler.registerTask({
        name: testTaskName,
        schedule: '0 * * * *', // Every hour
        enabled: true,
        execute: async () => {
          executionCount++;
          logger.info('Task executed', { executionCount });
        },
      });

      await scheduler.start();

      // Get initial next run time
      const initialStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });
      expect(initialStatus?.nextRun).toBeTruthy();
      const initialNextRun = initialStatus!.nextRun!;

      // Wait a moment to ensure time has passed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Manually trigger the task
      await scheduler.triggerTask(testTaskName);

      // Verify task executed
      expect(executionCount).toBe(1);

      // Get updated status
      const updatedStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });

      // Next run time should still be set (manual trigger doesn't affect schedule)
      expect(updatedStatus?.nextRun).toBeTruthy();
      
      // Next run should still be the same as initial (manual trigger doesn't change schedule)
      expect(updatedStatus!.nextRun!.getTime()).toBe(initialNextRun.getTime());
    });

    it('should verify manual trigger does not affect scheduled next run', async () => {
      let executionCount = 0;

      // Register a task with daily schedule
      scheduler.registerTask({
        name: testTaskName,
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        execute: async () => {
          executionCount++;
        },
      });

      await scheduler.start();

      // Get initial next run time
      const initialStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });
      const initialNextRun = initialStatus!.nextRun!;

      // Manually trigger multiple times
      await scheduler.triggerTask(testTaskName);
      await scheduler.triggerTask(testTaskName);
      await scheduler.triggerTask(testTaskName);

      // Verify task executed 3 times
      expect(executionCount).toBe(3);

      // Get final status
      const finalStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });

      // Next run should still be the same (manual triggers don't affect schedule)
      expect(finalStatus!.nextRun!.getTime()).toBe(initialNextRun.getTime());
    });

    it('should maintain next run time alignment after manual trigger', async () => {
      // Register a task with 5-minute interval
      scheduler.registerTask({
        name: testTaskName,
        schedule: '*/5 * * * *', // Every 5 minutes
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();

      // Get initial next run time
      const initialStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });
      
      // Verify initial next run aligns to 5-minute boundary
      const initialMinute = initialStatus!.nextRun!.getUTCMinutes();
      expect(initialMinute % 5).toBe(0);

      // Manually trigger the task
      await scheduler.triggerTask(testTaskName);

      // Get updated status
      const updatedStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });

      // Next run should still align to 5-minute boundary
      const updatedMinute = updatedStatus!.nextRun!.getUTCMinutes();
      expect(updatedMinute % 5).toBe(0);
    });
  });

  describe('Next run time for different schedules', () => {
    it('should handle every minute schedule correctly', async () => {
      scheduler.registerTask({
        name: testTaskName,
        schedule: '* * * * *', // Every minute
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();

      const status = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });

      expect(status?.nextRun).toBeTruthy();
      
      // Next run should be within the next 2 minutes
      const now = new Date();
      const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);
      expect(status!.nextRun!.getTime()).toBeLessThan(twoMinutesFromNow.getTime());
    });

    it('should handle hourly schedule correctly', async () => {
      scheduler.registerTask({
        name: testTaskName,
        schedule: '0 * * * *', // Every hour
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();

      const status = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });

      expect(status?.nextRun).toBeTruthy();
      
      // Next run should be at minute 0
      expect(status!.nextRun!.getUTCMinutes()).toBe(0);
      expect(status!.nextRun!.getUTCSeconds()).toBe(0);
    });

    it('should handle daily schedule correctly', async () => {
      scheduler.registerTask({
        name: testTaskName,
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();

      const status = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });

      expect(status?.nextRun).toBeTruthy();
      
      // Next run should be at midnight (hour 0, minute 0)
      expect(status!.nextRun!.getUTCHours()).toBe(0);
      expect(status!.nextRun!.getUTCMinutes()).toBe(0);
      expect(status!.nextRun!.getUTCSeconds()).toBe(0);
    });

    it('should handle interval format schedules correctly', async () => {
      const intervalTaskName = generateTestTaskName('interval');

      scheduler.registerTask({
        name: intervalTaskName,
        schedule: 'every 1 hour', // Interval format
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();

      const status = await db.scheduledTaskStatus.findUnique({
        where: { taskName: intervalTaskName },
      });

      expect(status?.nextRun).toBeTruthy();
      
      // Should be converted to hourly cron and align to hour boundary
      expect(status!.nextRun!.getUTCMinutes()).toBe(0);
      expect(status!.nextRun!.getUTCSeconds()).toBe(0);
    });
  });

  describe('Multiple tasks with different schedules', () => {
    it('should maintain independent next run times for multiple tasks', async () => {
      const task1Name = generateTestTaskName('multi-1');
      const task2Name = generateTestTaskName('multi-2');
      const task3Name = generateTestTaskName('multi-3');

      // Register tasks with different schedules
      scheduler.registerTask({
        name: task1Name,
        schedule: '* * * * *', // Every minute
        enabled: true,
        execute: async () => {
          logger.info('Task 1 executed');
        },
      });

      scheduler.registerTask({
        name: task2Name,
        schedule: '0 * * * *', // Every hour
        enabled: true,
        execute: async () => {
          logger.info('Task 2 executed');
        },
      });

      scheduler.registerTask({
        name: task3Name,
        schedule: '*/5 * * * *', // Every 5 minutes
        enabled: true,
        execute: async () => {
          logger.info('Task 3 executed');
        },
      });

      await scheduler.start();

      // Get all task statuses
      const task1Status = await db.scheduledTaskStatus.findUnique({
        where: { taskName: task1Name },
      });
      const task2Status = await db.scheduledTaskStatus.findUnique({
        where: { taskName: task2Name },
      });
      const task3Status = await db.scheduledTaskStatus.findUnique({
        where: { taskName: task3Name },
      });

      // All should have next run times
      expect(task1Status?.nextRun).toBeTruthy();
      expect(task2Status?.nextRun).toBeTruthy();
      expect(task3Status?.nextRun).toBeTruthy();

      // Verify each aligns to its schedule
      expect(task2Status!.nextRun!.getUTCMinutes()).toBe(0); // Hourly
      expect(task3Status!.nextRun!.getUTCMinutes() % 5).toBe(0); // Every 5 min

      // Manually trigger task 1
      await scheduler.triggerTask(task1Name);

      // Get updated statuses
      const task1Updated = await db.scheduledTaskStatus.findUnique({
        where: { taskName: task1Name },
      });
      const task2Updated = await db.scheduledTaskStatus.findUnique({
        where: { taskName: task2Name },
      });
      const task3Updated = await db.scheduledTaskStatus.findUnique({
        where: { taskName: task3Name },
      });

      // Task 1's next run should remain unchanged (manual trigger doesn't affect schedule)
      expect(task1Updated!.nextRun!.getTime()).toBe(task1Status!.nextRun!.getTime());

      // Other tasks should be unaffected
      expect(task2Updated!.nextRun!.getTime()).toBe(task2Status!.nextRun!.getTime());
      expect(task3Updated!.nextRun!.getTime()).toBe(task3Status!.nextRun!.getTime());
    });
  });
});
