/**
 * Cron Manager
 * 
 * Manages node-cron jobs and schedule parsing.
 */

import * as cron from 'node-cron';
import parser from 'cron-parser';
import { CronExpression, CronJob, ScheduledTask, TaskName } from './types';
import logger from '../utils/logger';

/**
 * CronManager class
 * 
 * Handles cron job creation, schedule parsing, and validation.
 */
export class CronManager {
  private jobs: Map<TaskName, cron.ScheduledTask>;

  constructor() {
    this.jobs = new Map();
  }

  /**
   * Creates and starts a cron job for a task
   * 
   * @param task - Task to schedule
   * @param onTick - Callback function to execute on schedule
   * @returns Cron job instance
   * @throws Error if schedule is invalid
   */
  schedule(task: ScheduledTask, onTick: () => void | Promise<void>): CronJob {
    // Parse and validate the schedule
    const cronExpression = this.parseSchedule(task.schedule);

    // Create the cron job
    const job = cron.schedule(cronExpression, onTick, {
      timezone: 'UTC',
      name: task.name,
    });

    // Store the job
    this.jobs.set(task.name, job);

    // Start the job
    job.start();

    logger.debug(`Cron job scheduled for task: ${task.name} with expression: ${cronExpression}`);

    // Return a simplified interface
    return {
      start: () => job.start(),
      stop: () => job.stop(),
      getStatus: () => {
        // node-cron doesn't expose status directly, so we track it
        // For now, we assume if it's in the map, it's running
        return this.jobs.has(task.name) ? 'running' : 'stopped';
      },
    };
  }

  /**
   * Stops a cron job
   * 
   * @param taskName - Name of the task
   */
  stop(taskName: TaskName): void {
    const job = this.jobs.get(taskName);
    if (job) {
      job.stop();
      this.jobs.delete(taskName);
      logger.debug(`Cron job stopped for task: ${taskName}`);
    }
  }

  /**
   * Stops all cron jobs
   */
  stopAll(): void {
    for (const [taskName, job] of this.jobs.entries()) {
      job.stop();
      logger.debug(`Cron job stopped for task: ${taskName}`);
    }
    this.jobs.clear();
  }

  /**
   * Parses schedule string to cron expression
   * 
   * Supports:
   * - Standard cron expressions (e.g., "0 2 * * *")
   * - Interval strings (e.g., "every 1 hour", "every 5 minutes")
   * 
   * @param schedule - Schedule string (cron or interval)
   * @returns Valid cron expression
   * @throws Error if schedule is invalid
   */
  parseSchedule(schedule: string): CronExpression {
    const trimmed = schedule.trim();

    // Check if it's an interval string
    if (trimmed.toLowerCase().startsWith('every ')) {
      return this.parseInterval(trimmed);
    }

    // Assume it's a cron expression - validate it
    if (!this.isValidCron(trimmed)) {
      throw new Error(`Invalid cron expression: ${schedule}`);
    }

    return trimmed;
  }

  /**
   * Parses interval string to cron expression
   * 
   * @param interval - Interval string
   * @returns Cron expression
   * @throws Error if interval format is invalid
   */
  private parseInterval(interval: string): CronExpression {
    const trimmed = interval.trim().toLowerCase();
    
    // Match pattern: "every X minute(s)/hour(s)/day(s)"
    const match = trimmed.match(/^every\s+(\d+)\s+(minute|minutes|hour|hours|day|days)$/);
    
    if (!match) {
      throw new Error(`Invalid interval format: ${interval}. Expected format: "every X minutes/hours/days"`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    // Validate value
    if (value <= 0) {
      throw new Error(`Interval value must be positive: ${value}`);
    }

    // Convert to cron expression based on unit
    if (unit === 'minute' || unit === 'minutes') {
      if (value === 1) {
        return '* * * * *'; // Every minute
      } else if (value > 59) {
        throw new Error(`Minute interval cannot exceed 59: ${value}`);
      }
      return `*/${value} * * * *`; // Every X minutes
    } else if (unit === 'hour' || unit === 'hours') {
      if (value === 1) {
        return '0 * * * *'; // Every hour
      } else if (value > 23) {
        throw new Error(`Hour interval cannot exceed 23: ${value}`);
      }
      return `0 */${value} * * *`; // Every X hours
    } else if (unit === 'day' || unit === 'days') {
      if (value === 1) {
        return '0 0 * * *'; // Every day
      } else if (value > 31) {
        throw new Error(`Day interval cannot exceed 31: ${value}`);
      }
      return `0 0 */${value} * *`; // Every X days
    }

    throw new Error(`Unsupported interval unit: ${unit}`);
  }

  /**
   * Calculates next run time for a cron expression
   * 
   * @param cronExpression - Cron expression
   * @param currentDate - Optional reference date (defaults to current time, useful for testing)
   * @returns Next execution date
   * @throws Error if cron expression is invalid
   */
  getNextRun(cronExpression: CronExpression, currentDate?: Date): Date {
    // Validate cron expression
    if (!this.isValidCron(cronExpression)) {
      const error = `Invalid cron expression: ${cronExpression}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      // Parse the cron expression with UTC timezone
      const options = {
        currentDate: currentDate || new Date(),
        tz: 'UTC',
      };
      
      const interval = parser.parse(cronExpression, options);
      
      // Get the next occurrence
      const nextRun = interval.next().toDate();
      
      logger.debug(`Calculated next run time for cron expression: ${cronExpression}`, {
        cronExpression,
        currentDate: options.currentDate.toISOString(),
        nextRun: nextRun.toISOString(),
      });
      
      return nextRun;
    } catch (error) {
      const message = `Failed to calculate next run time for expression "${cronExpression}": ${
        error instanceof Error ? error.message : String(error)
      }`;
      logger.error(message, { cronExpression, error });
      throw new Error(message);
    }
  }

  /**
   * Validates cron expression
   * 
   * @param cronExpression - Expression to validate
   * @returns True if valid
   */
  isValidCron(cronExpression: string): boolean {
    try {
      // Use node-cron's validate method
      return cron.validate(cronExpression);
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the number of active jobs
   * 
   * @returns Number of jobs
   */
  size(): number {
    return this.jobs.size;
  }

  /**
   * Checks if a job exists for a task
   * 
   * @param taskName - Task name
   * @returns True if job exists
   */
  has(taskName: TaskName): boolean {
    return this.jobs.has(taskName);
  }
}
