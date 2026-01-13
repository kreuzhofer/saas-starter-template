import { scheduler } from '../../scheduler';
import { getTestDb, cleanupTestDb, generateTestTaskName } from '../helpers/testDb';
import logger from '../../utils/logger';

const db = getTestDb();

/**
 * Integration tests for scheduler application startup
 * Tests that scheduler initializes correctly when the application starts
 * 
 * Requirements: 8.1, 8.2
 */
describe('Scheduler Application Startup Integration Tests', () => {
  let testTaskExecuted = false;
  let testTaskName: string;

  beforeEach(async () => {
    await cleanupTestDb();
    testTaskExecuted = false;
    testTaskName = generateTestTaskName('startup');
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

  describe('Scheduler initialization on app start', () => {
    it('should initialize scheduler and load registered tasks', async () => {
      // Register a test task
      scheduler.registerTask({
        name: testTaskName,
        schedule: '* * * * *', // Every minute
        enabled: true,
        execute: async () => {
          testTaskExecuted = true;
        },
      });

      // Start the scheduler (simulating app startup)
      await scheduler.start();

      // Verify task status was created in database
      const taskStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: testTaskName },
      });

      expect(taskStatus).toBeTruthy();
      expect(taskStatus?.taskName).toBe(testTaskName);
      expect(taskStatus?.enabled).toBe(true);
      expect(taskStatus?.nextRun).toBeTruthy();
    });

    it('should schedule multiple tasks on startup', async () => {
      const task1Name = generateTestTaskName('multi-1');
      const task2Name = generateTestTaskName('multi-2');

      // Register multiple tasks
      scheduler.registerTask({
        name: task1Name,
        schedule: '0 * * * *', // Every hour
        enabled: true,
        execute: async () => {
          logger.info('Task 1 executed');
        },
      });

      scheduler.registerTask({
        name: task2Name,
        schedule: '0 0 * * *', // Daily
        enabled: true,
        execute: async () => {
          logger.info('Task 2 executed');
        },
      });

      // Start the scheduler
      await scheduler.start();

      // Verify both tasks are in database
      const task1Status = await db.scheduledTaskStatus.findUnique({
        where: { taskName: task1Name },
      });
      const task2Status = await db.scheduledTaskStatus.findUnique({
        where: { taskName: task2Name },
      });

      expect(task1Status).toBeTruthy();
      expect(task1Status?.enabled).toBe(true);
      expect(task1Status?.nextRun).toBeTruthy();

      expect(task2Status).toBeTruthy();
      expect(task2Status?.enabled).toBe(true);
      expect(task2Status?.nextRun).toBeTruthy();
    });

    it('should not schedule disabled tasks on startup', async () => {
      const disabledTaskName = generateTestTaskName('disabled');

      // Register a disabled task
      scheduler.registerTask({
        name: disabledTaskName,
        schedule: '* * * * *',
        enabled: false,
        execute: async () => {
          testTaskExecuted = true;
        },
      });

      // Start the scheduler
      await scheduler.start();

      // Disabled tasks are not persisted to database during startup
      // (only enabled tasks are scheduled and persisted)
      const taskStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: disabledTaskName },
      });

      // Task status should not exist for disabled tasks
      expect(taskStatus).toBeNull();

      // Wait a bit to ensure task doesn't execute
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(testTaskExecuted).toBe(false);
    });

    it('should calculate next run times for all enabled tasks', async () => {
      const taskName = generateTestTaskName('next-run');

      scheduler.registerTask({
        name: taskName,
        schedule: '0 2 * * *', // Daily at 2 AM
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();

      const taskStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: taskName },
      });

      expect(taskStatus?.nextRun).toBeTruthy();
      expect(taskStatus?.nextRun).toBeInstanceOf(Date);
      
      // Next run should be in the future
      const now = new Date();
      expect(taskStatus?.nextRun!.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should calculate accurate next run times matching cron schedules', async () => {
      const hourlyTaskName = generateTestTaskName('hourly');
      const dailyTaskName = generateTestTaskName('daily');
      const everyFiveMinTaskName = generateTestTaskName('every-five-min');

      // Register tasks with different schedules
      scheduler.registerTask({
        name: hourlyTaskName,
        schedule: '0 * * * *', // Every hour at minute 0
        enabled: true,
        execute: async () => {
          logger.info('Hourly task executed');
        },
      });

      scheduler.registerTask({
        name: dailyTaskName,
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
        execute: async () => {
          logger.info('Daily task executed');
        },
      });

      scheduler.registerTask({
        name: everyFiveMinTaskName,
        schedule: '*/5 * * * *', // Every 5 minutes
        enabled: true,
        execute: async () => {
          logger.info('Every 5 min task executed');
        },
      });

      await scheduler.start();

      // Verify all tasks have next run times
      const hourlyStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: hourlyTaskName },
      });
      const dailyStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: dailyTaskName },
      });
      const everyFiveMinStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: everyFiveMinTaskName },
      });

      expect(hourlyStatus?.nextRun).toBeTruthy();
      expect(dailyStatus?.nextRun).toBeTruthy();
      expect(everyFiveMinStatus?.nextRun).toBeTruthy();

      // Verify next run times are in the future
      const now = new Date();
      expect(hourlyStatus?.nextRun!.getTime()).toBeGreaterThan(now.getTime());
      expect(dailyStatus?.nextRun!.getTime()).toBeGreaterThan(now.getTime());
      expect(everyFiveMinStatus?.nextRun!.getTime()).toBeGreaterThan(now.getTime());

      // Verify hourly task aligns to hour boundary (minute should be 0)
      expect(hourlyStatus?.nextRun!.getUTCMinutes()).toBe(0);
      expect(hourlyStatus?.nextRun!.getUTCSeconds()).toBe(0);

      // Verify daily task aligns to day boundary (hour and minute should be 0)
      expect(dailyStatus?.nextRun!.getUTCHours()).toBe(0);
      expect(dailyStatus?.nextRun!.getUTCMinutes()).toBe(0);
      expect(dailyStatus?.nextRun!.getUTCSeconds()).toBe(0);

      // Verify every 5 min task aligns to 5-minute boundary
      const everyFiveMinMinute = everyFiveMinStatus?.nextRun!.getUTCMinutes();
      expect(everyFiveMinMinute! % 5).toBe(0);
      expect(everyFiveMinStatus?.nextRun!.getUTCSeconds()).toBe(0);
    });

    it('should handle scheduler restart gracefully', async () => {
      const taskName = generateTestTaskName('restart');

      scheduler.registerTask({
        name: taskName,
        schedule: '* * * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      // Start scheduler
      await scheduler.start();

      const firstStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: taskName },
      });
      expect(firstStatus).toBeTruthy();

      // Stop scheduler
      await scheduler.stop();

      // Start again
      await scheduler.start();

      const secondStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: taskName },
      });
      expect(secondStatus).toBeTruthy();
      expect(secondStatus?.taskName).toBe(taskName);
    });

    it('should persist task status to database on startup', async () => {
      const taskName = generateTestTaskName('persist');

      scheduler.registerTask({
        name: taskName,
        schedule: '0 * * * *',
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      await scheduler.start();

      // Query database directly to verify persistence
      const allStatuses = await db.scheduledTaskStatus.findMany({
        where: { taskName: taskName },
      });

      expect(allStatuses.length).toBe(1);
      expect(allStatuses[0].taskName).toBe(taskName);
      expect(allStatuses[0].enabled).toBe(true);
    });
  });

  describe('Error handling during startup', () => {
    it('should handle invalid cron expressions gracefully', async () => {
      const invalidTaskName = generateTestTaskName('invalid-cron');

      // Registration succeeds (validation happens during scheduling)
      scheduler.registerTask({
        name: invalidTaskName,
        schedule: 'invalid cron',
        enabled: true,
        execute: async () => {
          logger.info('Task executed');
        },
      });

      // Start scheduler - invalid cron will be logged as error but won't crash
      await expect(scheduler.start()).resolves.not.toThrow();

      // Task with invalid cron should not be scheduled
      const taskStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: invalidTaskName },
      });

      // Task status should not exist because scheduling failed
      expect(taskStatus).toBeNull();
    });

    it('should continue startup even if one task fails to register', async () => {
      const validTaskName = generateTestTaskName('valid');

      // Register a valid task
      scheduler.registerTask({
        name: validTaskName,
        schedule: '0 * * * *',
        enabled: true,
        execute: async () => {
          logger.info('Valid task executed');
        },
      });

      // Try to register an invalid task (should throw)
      try {
        scheduler.registerTask({
          name: 'invalid-task',
          schedule: 'not a cron',
          enabled: true,
          execute: async () => {
            logger.info('Invalid task executed');
          },
        });
      } catch (error) {
        // Expected to throw
      }

      // Start scheduler - valid task should still work
      await scheduler.start();

      const validTaskStatus = await db.scheduledTaskStatus.findUnique({
        where: { taskName: validTaskName },
      });

      expect(validTaskStatus).toBeTruthy();
    });
  });
});
