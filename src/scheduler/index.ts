/**
 * Task Scheduler Framework
 * 
 * A general-purpose task scheduler for executing recurring background jobs.
 * 
 * @example
 * ```typescript
 * import { scheduler } from './scheduler';
 * 
 * // Register a task
 * scheduler.registerTask({
 *   name: 'my-task',
 *   schedule: '0 * * * *',  // Every hour
 *   enabled: true,
 *   execute: async () => {
 *     console.log('Task executed!');
 *   },
 * });
 * 
 * // Start the scheduler
 * await scheduler.start();
 * ```
 */

// Export types
export * from './types';

// Export configuration
export * from './executionHistoryConfig';

// Export scheduler singleton instance
import { SchedulerFramework } from './SchedulerFramework';
import { SchedulerConfig } from './types';

/**
 * Scheduler configuration from environment variables
 */
const schedulerConfig: Partial<SchedulerConfig> = {
  timezone: process.env.SCHEDULER_TIMEZONE || 'UTC',
  shutdownTimeoutMs: parseInt(process.env.SCHEDULER_SHUTDOWN_TIMEOUT_MS || '5000', 10),
  enableStatusPersistence: process.env.SCHEDULER_ENABLE_STATUS_PERSISTENCE !== 'false', // Default to true
};

/**
 * Singleton scheduler instance with configuration from environment variables
 */
export const scheduler = SchedulerFramework.getInstance(schedulerConfig);
