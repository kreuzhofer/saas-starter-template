/**
 * Task Scheduler Framework Types
 * 
 * This file defines the core types and interfaces for the task scheduler framework.
 */

// Core types
export type TaskName = string;
export type CronExpression = string;
export type TaskResult = 'success' | 'failure';

/**
 * Scheduled Task Configuration
 * 
 * Defines a task that can be registered with the scheduler.
 */
export interface ScheduledTask {
  /** Unique task identifier */
  name: TaskName;
  
  /** Cron expression or interval string (e.g., "0 2 * * *" or "every 1 hour") */
  schedule: CronExpression;
  
  /** Whether the task should run on its schedule */
  enabled: boolean;
  
  /** Task execution function */
  execute: () => Promise<void>;
  
  /** Optional error handler called when task fails */
  onError?: (error: Error) => void;
}

/**
 * Task Status
 * 
 * Represents the current state of a scheduled task.
 * Matches the database model for persistence.
 */
export interface TaskStatus {
  /** Task name */
  taskName: TaskName;
  
  /** Whether the task is enabled */
  enabled: boolean;
  
  /** Last execution timestamp */
  lastRun: Date | null;
  
  /** Next scheduled execution timestamp */
  nextRun: Date | null;
  
  /** Result of last execution */
  lastResult: TaskResult | null;
  
  /** Error message from last failed execution */
  lastError: string | null;
  
  /** Duration of last execution in milliseconds */
  lastDuration: number | null;
}

/**
 * Task Execution Context
 * 
 * Internal context used during task execution.
 */
export interface TaskExecutionContext {
  /** Task name */
  taskName: TaskName;
  
  /** Execution start time */
  startTime: Date;
  
  /** Execution end time */
  endTime?: Date;
  
  /** Execution duration in milliseconds */
  duration?: number;
  
  /** Error if execution failed */
  error?: Error;
  
  /** Execution result */
  result: TaskResult;
}

/**
 * Scheduler Configuration
 * 
 * Configuration options for the scheduler framework.
 */
export interface SchedulerConfig {
  /** Timezone for cron expressions (default: 'UTC') */
  timezone: string;
  
  /** Timeout for graceful shutdown in milliseconds (default: 5000) */
  shutdownTimeoutMs: number;
  
  /** Whether to persist task status to database (default: true) */
  enableStatusPersistence: boolean;
}

/**
 * Cron Job Interface
 * 
 * Represents a node-cron job instance.
 */
export interface CronJob {
  /** Start the cron job */
  start: () => void;
  
  /** Stop the cron job */
  stop: () => void;
  
  /** Get the current status of the job */
  getStatus: () => 'running' | 'stopped';
}
