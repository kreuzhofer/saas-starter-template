/**
 * Task Executor
 * 
 * Executes tasks with error handling, logging, and status updates.
 */

import { ScheduledTask, TaskExecutionContext, TaskResult, TaskStatus } from './types';
import { TaskStatusRepository } from './TaskStatusRepository';
import logger from '../utils/logger';

/**
 * TaskExecutor class
 * 
 * Handles task execution with comprehensive error handling and status tracking.
 */
export class TaskExecutor {
  private statusRepository: TaskStatusRepository;

  constructor(statusRepository: TaskStatusRepository) {
    this.statusRepository = statusRepository;
  }

  /**
   * Executes a task with full error handling and logging
   * 
   * @param task - Task to execute
   */
  async execute(task: ScheduledTask): Promise<void> {
    const startTime = new Date();
    
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

    // Update task status in database
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
