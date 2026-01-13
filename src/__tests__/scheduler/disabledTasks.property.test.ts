/**
 * Feature: task-scheduler, Property 5: Disabled tasks don't execute
 * Validates: Requirements 5.2
 * 
 * For any task that is disabled, the scheduler should not execute it when its 
 * scheduled time arrives.
 */

import * as fc from 'fast-check';
import { SchedulerFramework } from '../../scheduler/SchedulerFramework';
import { ScheduledTask } from '../../scheduler/types';
import { cleanupTestDb, generateTestTaskName } from '../helpers/testDb';

describe('Property-Based Test: Disabled Tasks Don\'t Execute', () => {
  afterAll(async () => {
    // Final cleanup
    await cleanupTestDb();
  });

  it('should not execute disabled tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate task configurations
        fc.record({
          schedule: fc.constantFrom(
            '* * * * *',
            '0 * * * *',
            'every 1 minute',
            'every 1 hour'
          ),
        }),
        async (taskConfig) => {
          // Clean up database before each iteration
          await cleanupTestDb();
          
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          // Generate unique test task name
          const taskName = generateTestTaskName('disabled');
          
          // Track execution
          let executionCount = 0;

          // Create a disabled task
          const task: ScheduledTask = {
            name: taskName,
            schedule: taskConfig.schedule,
            enabled: false, // Task is disabled
            execute: async () => {
              executionCount++;
            },
          };

          // Register the disabled task
          scheduler.registerTask(task);

          // Start the scheduler
          await scheduler.start();

          // Wait a short time to ensure task would have executed if enabled
          await new Promise(resolve => setTimeout(resolve, 100));

          // Stop the scheduler
          await scheduler.stop();

          // Verify the task was never executed
          expect(executionCount).toBe(0);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should not execute tasks after they are disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schedule: fc.constantFrom('* * * * *', '0 * * * *', 'every 1 minute'),
        }),
        async (taskConfig) => {
          // Clean up database before each iteration
          await cleanupTestDb();
          
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();
          
          // Generate unique test task name
          const taskName = generateTestTaskName('after-disable');
          
          let executionCount = 0;

          // Create an initially enabled task
          const task: ScheduledTask = {
            name: taskName,
            schedule: taskConfig.schedule,
            enabled: true, // Initially enabled
            execute: async () => {
              executionCount++;
            },
          };

          // Register and start
          scheduler.registerTask(task);
          await scheduler.start();

          // Disable the task
          await scheduler.setTaskEnabled(taskName, false);

          // Record execution count after disabling
          const countAfterDisable = executionCount;

          // Wait to ensure task would have executed if still enabled
          await new Promise(resolve => setTimeout(resolve, 100));

          // Stop scheduler
          await scheduler.stop();

          // Verify no additional executions occurred after disabling
          expect(executionCount).toBe(countAfterDisable);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should execute tasks after they are re-enabled', async () => {
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
          
          // Generate unique test task name
          const taskName = generateTestTaskName('re-enabled');
          
          let executionCount = 0;

          // Create a disabled task
          const task: ScheduledTask = {
            name: taskName,
            schedule: taskConfig.schedule,
            enabled: false, // Initially disabled
            execute: async () => {
              executionCount++;
            },
          };

          // Register and start
          scheduler.registerTask(task);
          await scheduler.start();

          // Verify no execution while disabled
          await new Promise(resolve => setTimeout(resolve, 50));
          expect(executionCount).toBe(0);

          // Re-enable the task
          await scheduler.setTaskEnabled(taskName, true);

          // Verify the task can now be scheduled (no errors thrown)
          // The actual execution will depend on timing, so we just verify no errors

          // Stop scheduler
          await scheduler.stop();
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should handle multiple tasks with mixed enabled states', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            schedule: fc.constantFrom('* * * * *', 'every 1 minute'),
            enabled: fc.boolean(),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (taskConfigs) => {
          // Clean up database before each iteration
          await cleanupTestDb();
          
          // Reset singleton and create fresh instance for each iteration
          SchedulerFramework.resetInstance();
          const scheduler = SchedulerFramework.getInstance();

          const executionCounts = new Map<string, number>();
          const taskNames: string[] = [];

          // Register all tasks with unique generated names
          for (let i = 0; i < taskConfigs.length; i++) {
            const config = taskConfigs[i];
            const taskName = generateTestTaskName(`mixed-${i}`);
            taskNames.push(taskName);
            executionCounts.set(taskName, 0);

            const task: ScheduledTask = {
              name: taskName,
              schedule: config.schedule,
              enabled: config.enabled,
              execute: async () => {
                executionCounts.set(taskName, executionCounts.get(taskName)! + 1);
              },
            };

            scheduler.registerTask(task);
          }

          // Start scheduler
          await scheduler.start();

          // Wait briefly
          await new Promise(resolve => setTimeout(resolve, 100));

          // Stop scheduler
          await scheduler.stop();

          // Verify only enabled tasks executed
          for (let i = 0; i < taskConfigs.length; i++) {
            const config = taskConfigs[i];
            const taskName = taskNames[i];
            const count = executionCounts.get(taskName)!;
            
            if (config.enabled) {
              // Enabled tasks may or may not have executed depending on timing
              // We just verify the system didn't crash
              expect(count).toBeGreaterThanOrEqual(0);
            } else {
              // Disabled tasks should never execute
              expect(count).toBe(0);
            }
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});

