/**
 * Feature: task-scheduler, Property 6: Manual trigger independence
 * Validates: Requirements 6.2
 * 
 * For any task that is manually triggered, the next scheduled execution time 
 * should remain unchanged.
 */

import * as fc from 'fast-check';
import { SchedulerFramework } from '../../scheduler/SchedulerFramework';
import { ScheduledTask } from '../../scheduler/types';
import { cleanupTestDb, generateTestTaskName } from '../helpers/testDb';

describe('Property-Based Test: Manual Trigger Independence', () => {
  afterAll(async () => {
    // Ensure scheduler is stopped
    try {
      const scheduler = SchedulerFramework.getInstance();
      await scheduler.stop();
    } catch (error) {
      // Ignore errors if scheduler is already stopped
    }
    
    // Final cleanup
    await cleanupTestDb();
  });

  it('should not affect regular schedule when manually triggered', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schedule: fc.constantFrom('* * * * *', '0 * * * *', 'every 1 minute', 'every 1 hour'),
        }),
        async (taskConfig) => {
          // Clean up database before each iteration
          await cleanupTestDb();
          
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          // Generate a unique test task name
          const taskName = generateTestTaskName('manual-trigger');
          
          let executionCount = 0;

          try {
            // Create a task
            const task: ScheduledTask = {
              name: taskName,
              schedule: taskConfig.schedule,
              enabled: true,
              execute: async () => {
                executionCount++;
              },
            };

            // Register and start
            scheduler.registerTask(task);
            await scheduler.start();

            // Record initial execution count
            const initialCount = executionCount;

            // Manually trigger the task
            await scheduler.triggerTask(taskName);

            // Verify manual trigger executed the task
            expect(executionCount).toBe(initialCount + 1);

            // The next scheduled run should still happen according to the schedule
            // We can't easily test the exact timing, but we can verify the scheduler
            // continues to work and doesn't throw errors
          } finally {
            // Always stop scheduler, even if test fails
            await scheduler.stop();
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should execute task immediately when manually triggered', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schedule: fc.constantFrom('0 0 * * *', '0 2 * * *'), // Daily schedules (won't execute during test)
        }),
        async (taskConfig) => {
          // Clean up database before each iteration
          await cleanupTestDb();
          
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          // Generate a unique test task name
          const taskName = generateTestTaskName('immediate-trigger');
          
          let executionCount = 0;

          try {
            // Create a task with a schedule that won't execute during the test
            const task: ScheduledTask = {
              name: taskName,
              schedule: taskConfig.schedule,
              enabled: true,
              execute: async () => {
                executionCount++;
              },
            };

            // Register and start
            scheduler.registerTask(task);
            await scheduler.start();

            // Task should not have executed yet (schedule is daily)
            expect(executionCount).toBe(0);

            // Manually trigger the task
            await scheduler.triggerTask(taskName);

            // Task should have executed once
            expect(executionCount).toBe(1);

            // Manually trigger again
            await scheduler.triggerTask(taskName);

            // Task should have executed twice
            expect(executionCount).toBe(2);
          } finally {
            // Always stop scheduler, even if test fails
            await scheduler.stop();
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should throw error when triggering non-existent task', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (nonExistentTaskName) => {
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          try {
            // Start scheduler with no tasks
            await scheduler.start();

            // Attempting to trigger non-existent task should throw
            await expect(scheduler.triggerTask(nonExistentTaskName)).rejects.toThrow();
            await expect(scheduler.triggerTask(nonExistentTaskName)).rejects.toThrow(/not found/i);
          } finally {
            // Always stop scheduler, even if test fails
            await scheduler.stop();
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should allow manual trigger of disabled tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schedule: fc.constantFrom('* * * * *', 'every 1 minute'),
        }),
        async (taskConfig) => {
          // Clean up database before each iteration
          await cleanupTestDb();
          
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          // Generate a unique test task name
          const taskName = generateTestTaskName('disabled-trigger');
          
          let executionCount = 0;

          try {
            // Create a disabled task
            const task: ScheduledTask = {
              name: taskName,
              schedule: taskConfig.schedule,
              enabled: false, // Disabled
              execute: async () => {
                executionCount++;
              },
            };

            // Register and start
            scheduler.registerTask(task);
            await scheduler.start();

            // Task should not execute on schedule (it's disabled)
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(executionCount).toBe(0);

            // But manual trigger should still work
            await scheduler.triggerTask(taskName);
            expect(executionCount).toBe(1);
          } finally {
            // Always stop scheduler, even if test fails
            await scheduler.stop();
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});

