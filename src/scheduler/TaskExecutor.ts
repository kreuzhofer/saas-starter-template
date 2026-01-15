/**
 * Task Executor
 * 
 * Executes tasks with error handling, logging, and status updates.
 */

import { ScheduledTask, TaskResult, TaskStatus } from './types';
import { TaskStatusRepository } from './TaskStatusRepository';
import { ExecutionHistoryRepository } from './ExecutionHistoryRepository';
import { LogCaptureStream } from './LogCaptureStream';
import logger from '../utils/logger';

/**
 * Configuration for TaskExecutor
 */
export interface TaskExecutorConfig {
  /** Whether to capture and store execution history (default: true) */
  historyEnabled?: boolean;
  
  /** Maximum log size in bytes (default: 102400 = 100KB) */
  maxLogSize?: number;
}

/**
 * TaskExecutor class
 * 
 * Handles task execution with comprehensive error handling and status tracking.
 * Optionally captures logs and stores execution history.
 */
export class TaskExecutor {
  private statusRepository: TaskStatusRepository;
  private historyRepository: ExecutionHistoryRepository | null;
  private historyEnabled: boolean;
  private maxLogSize: number;

  constructor(
    statusRepository: TaskStatusRepository,
    historyRepository: ExecutionHistoryRepository | null = null,
    config: TaskExecutorConfig = {}
  ) {
    this.statusRepository = statusRepository;
    this.historyRepository = historyRepository;
    this.historyEnabled = config.historyEnabled ?? true;
    this.maxLogSize = config.maxLogSize ?? 102400; // Default: 100KB
  }

  /**
   * Executes a task with full error handling and logging
   * 
   * @param task - Task to execute
   */
  async execute(task: ScheduledTask): Promise<void> {
    const startTime = new Date();
    
    // Create log capture stream if history is enabled
    let logCapture: LogCaptureStream | null = null;
    if (this.historyEnabled && this.historyRepository) {
      try {
        logCapture = new LogCaptureStream({ maxSize: this.maxLogSize });
        logger.add(logCapture);
      } catch (captureError) {
        // Log capture initialization failed - continue without it
        logger.error('Failed to initialize log capture', {
          taskName: task.name,
          error: captureError instanceof Error ? captureError.message : String(captureError),
        });
        logCapture = null;
      }
    }
    
    // Log task start
    logger.info(`Task execution started: ${task.name}`, {
      taskName: task.name,
      startTime: startTime.toISOString(),
    });

    let result: TaskResult = 'success';
    let error: Error | undefined;
    let endTime: Date;
    let duration: number;

    try {
      // Execute the task function
      await task.execute();
      
      // Task completed successfully
      endTime = new Date();
      duration = endTime.getTime() - startTime.getTime();
      result = 'success';
      
      logger.info(`Task execution completed: ${task.name}`, {
        taskName: task.name,
        duration,
        result,
      });
    } catch (err) {
      // Task failed - catch error to prevent propagation
      endTime = new Date();
      duration = endTime.getTime() - startTime.getTime();
      result = 'failure';
      error = err instanceof Error ? err : new Error(String(err));
      
      // Log the error with full details
      logger.error(`Task execution failed: ${task.name}`, {
        taskName: task.name,
        duration,
        error: error.message,
        stack: error.stack,
      });
      
      // Call the task's error handler if provided
      if (task.onError) {
        try {
          task.onError(error);
        } catch (handlerError) {
          // Log if error handler itself fails, but don't propagate
          logger.error(`Task error handler failed: ${task.name}`, {
            taskName: task.name,
            handlerError: handlerError instanceof Error ? handlerError.message : String(handlerError),
          });
        }
      }
    }

    // Capture logs and detach log capture stream
    let capturedLogs: string | null = null;
    if (logCapture) {
      try {
        // Wait for Winston to process all pending logs
        // Winston uses setImmediate internally, so we need to yield multiple times
        // to ensure all logs from the task execution are processed
        await new Promise(resolve => setImmediate(resolve));
        await new Promise(resolve => setImmediate(resolve));
        
        capturedLogs = logCapture.getFormattedLogs();
        logger.remove(logCapture);
      } catch (captureError) {
        // Log capture retrieval failed - continue without logs
        logger.error('Failed to retrieve captured logs', {
          taskName: task.name,
          error: captureError instanceof Error ? captureError.message : String(captureError),
        });
        try {
          logger.remove(logCapture);
        } catch (removeError) {
          // Ignore errors when removing transport
        }
      }
    }

    // Store execution history (asynchronous, non-blocking)
    if (this.historyEnabled && this.historyRepository) {
      // Use Promise.resolve().then() to make this truly non-blocking
      Promise.resolve().then(async () => {
        try {
          await this.historyRepository!.create({
            taskName: task.name,
            startedAt: startTime,
            completedAt: endTime,
            result,
            errorMessage: error ? error.message : null,
            duration,
            capturedLogs,
          });
        } catch (historyError) {
          // History storage failed - log but don't propagate
          logger.error('Failed to store execution history', {
            taskName: task.name,
            error: historyError instanceof Error ? historyError.message : String(historyError),
          });
        }
      });
    }

    // Update task status in database (existing behavior - critical path)
    await this.updateStatus(task.name, {
      taskName: task.name,
      enabled: task.enabled,
      lastRun: startTime,
      nextRun: null, // Will be set by scheduler
      lastResult: result,
      lastError: error ? error.message : null,
      lastDuration: duration,
    });
  }

  /**
   * Updates task status in database
   * 
   * @param taskName - Name of the task
   * @param status - Status update data
   */
  async updateStatus(taskName: string, status: Partial<TaskStatus>): Promise<void> {
    // Get current status to preserve fields that aren't being updated
    const currentStatus = await this.statusRepository.findByName(taskName);
    
    // Merge current status with updates
    const fullStatus: TaskStatus = {
      taskName,
      enabled: status.enabled ?? currentStatus?.enabled ?? true,
      lastRun: status.lastRun !== undefined ? status.lastRun : (currentStatus?.lastRun ?? null),
      nextRun: status.nextRun !== undefined ? status.nextRun : (currentStatus?.nextRun ?? null),
      lastResult: status.lastResult !== undefined ? status.lastResult : (currentStatus?.lastResult ?? null),
      lastError: status.lastError !== undefined ? status.lastError : (currentStatus?.lastError ?? null),
      lastDuration: status.lastDuration !== undefined ? status.lastDuration : (currentStatus?.lastDuration ?? null),
    };

    await this.statusRepository.upsert(fullStatus);
  }

  /**
   * Gets task status from database
   * 
   * @param taskName - Name of the task
   * @returns Task status or null if not found
   */
  async getStatus(taskName: string): Promise<TaskStatus | null> {
    return await this.statusRepository.findByName(taskName);
  }
}
