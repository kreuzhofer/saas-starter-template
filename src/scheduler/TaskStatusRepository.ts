/**
 * Task Status Repository
 * 
 * Handles persistence of task execution status to the database.
 */

import prisma from '../db/client';
import { TaskStatus, TaskResult } from './types';
import logger from '../utils/logger';

/**
 * Repository for managing scheduled task status in the database
 */
export class TaskStatusRepository {
  /**
   * Creates or updates a task status record
   * 
   * @param status - Task status data to persist
   */
  async upsert(status: TaskStatus): Promise<void> {
    try {
      await prisma.scheduledTaskStatus.upsert({
        where: {
          taskName: status.taskName,
        },
        update: {
          enabled: status.enabled,
          lastRun: status.lastRun,
          nextRun: status.nextRun,
          lastResult: status.lastResult,
          lastError: status.lastError,
          lastDuration: status.lastDuration,
        },
        create: {
          taskName: status.taskName,
          enabled: status.enabled,
          lastRun: status.lastRun,
          nextRun: status.nextRun,
          lastResult: status.lastResult,
          lastError: status.lastError,
          lastDuration: status.lastDuration,
        },
      });
      
      logger.debug('Task status persisted', { taskName: status.taskName });
    } catch (error) {
      logger.error('Failed to persist task status', {
        taskName: status.taskName,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - we don't want database errors to block task execution
    }
  }

  /**
   * Retrieves task status by name
   * 
   * @param taskName - Name of the task
   * @returns Task status or null if not found
   */
  async findByName(taskName: string): Promise<TaskStatus | null> {
    try {
      const record = await prisma.scheduledTaskStatus.findUnique({
        where: {
          taskName,
        },
      });

      if (!record) {
        return null;
      }

      return this.mapToTaskStatus(record);
    } catch (error) {
      logger.error('Failed to retrieve task status', {
        taskName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Retrieves all task statuses
   * 
   * @returns Array of all task statuses
   */
  async findAll(): Promise<TaskStatus[]> {
    try {
      const records = await prisma.scheduledTaskStatus.findMany({
        orderBy: {
          taskName: 'asc',
        },
      });

      return records.map(record => this.mapToTaskStatus(record));
    } catch (error) {
      logger.error('Failed to retrieve all task statuses', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Deletes a task status record
   * 
   * @param taskName - Name of the task to delete
   */
  async delete(taskName: string): Promise<void> {
    try {
      // Check if record exists first to avoid error logs for non-existent records
      const exists = await prisma.scheduledTaskStatus.findUnique({
        where: { taskName },
        select: { id: true },
      });

      if (!exists) {
        logger.debug('Task status not found for deletion', { taskName });
        return;
      }

      await prisma.scheduledTaskStatus.delete({
        where: {
          taskName,
        },
      });
      
      logger.debug('Task status deleted', { taskName });
    } catch (error) {
      logger.error('Failed to delete task status', {
        taskName,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - deletion failures shouldn't be critical
    }
  }

  /**
   * Maps database record to TaskStatus interface
   * 
   * @param record - Database record
   * @returns TaskStatus object
   */
  private mapToTaskStatus(record: any): TaskStatus {
    return {
      taskName: record.taskName,
      enabled: record.enabled,
      lastRun: record.lastRun,
      nextRun: record.nextRun,
      lastResult: record.lastResult as TaskResult | null,
      lastError: record.lastError,
      lastDuration: record.lastDuration,
    };
  }
}

