/**
 * Execution History Repository
 * 
 * Handles persistence of task execution history to the database.
 * Provides CRUD operations for querying historical task executions.
 */

import prisma from '../db/client';
import { TaskResult } from './types';
import logger from '../utils/logger';

/**
 * Execution history record data
 */
export interface ExecutionHistoryRecord {
  taskName: string;
  startedAt: Date;
  completedAt: Date;
  result: TaskResult;
  errorMessage: string | null;
  duration: number;
  capturedLogs: string | null;
}

/**
 * Query parameters for execution history
 */
export interface ExecutionHistoryQuery {
  taskName: string;
  limit: number;
  offset: number;
}

/**
 * Execution history record with ID
 */
export interface ExecutionHistoryRecordWithId extends ExecutionHistoryRecord {
  id: string;
  createdAt: Date;
}

/**
 * Repository for managing task execution history in the database
 */
export class ExecutionHistoryRepository {
  /**
   * Creates a new execution history record
   * 
   * @param record - Execution history data to persist
   */
  async create(record: ExecutionHistoryRecord): Promise<void> {
    try {
      await prisma.taskExecutionHistory.create({
        data: {
          taskName: record.taskName,
          startedAt: record.startedAt,
          completedAt: record.completedAt,
          result: record.result,
          errorMessage: record.errorMessage,
          duration: record.duration,
          capturedLogs: record.capturedLogs,
        },
      });
      
      logger.debug('Task execution history created', { 
        taskName: record.taskName,
        result: record.result,
        duration: record.duration,
      });
    } catch (error) {
      logger.error('Failed to create task execution history', {
        taskName: record.taskName,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - we don't want database errors to block task execution
    }
  }

  /**
   * Queries execution history for a task with pagination
   * 
   * @param query - Query parameters including taskName, limit, and offset
   * @returns Array of execution history records ordered by startedAt descending
   */
  async findByTaskName(query: ExecutionHistoryQuery): Promise<ExecutionHistoryRecordWithId[]> {
    try {
      const records = await prisma.taskExecutionHistory.findMany({
        where: {
          taskName: query.taskName,
        },
        orderBy: {
          startedAt: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      });

      return records.map(record => this.mapToExecutionHistoryRecord(record));
    } catch (error) {
      logger.error('Failed to retrieve task execution history', {
        taskName: query.taskName,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Counts total execution records for a task
   * 
   * @param taskName - Name of the task
   * @returns Total count of execution records
   */
  async countByTaskName(taskName: string): Promise<number> {
    try {
      const count = await prisma.taskExecutionHistory.count({
        where: {
          taskName,
        },
      });

      return count;
    } catch (error) {
      logger.error('Failed to count task execution history', {
        taskName,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Deletes execution records older than the specified date
   * Preserves at least minRecordsToKeep per task regardless of age
   * 
   * @param cutoffDate - Delete records with startedAt older than this date
   * @param minRecordsToKeep - Minimum number of records to preserve per task
   * @returns Number of records deleted
   */
  async deleteOlderThan(
    cutoffDate: Date,
    minRecordsToKeep: number
  ): Promise<number> {
    try {
      // Get all unique task names
      const tasks = await prisma.taskExecutionHistory.findMany({
        select: {
          taskName: true,
        },
        distinct: ['taskName'],
      });

      let totalDeleted = 0;

      // Process each task separately to respect minimum retention
      for (const task of tasks) {
        const taskName = task.taskName;

        // Get total count for this task
        const totalCount = await this.countByTaskName(taskName);

        // If total count is at or below minimum, skip deletion for this task
        if (totalCount <= minRecordsToKeep) {
          logger.debug('Skipping purge for task - at minimum retention', {
            taskName,
            totalCount,
            minRecordsToKeep,
          });
          continue;
        }

        // Get IDs of records to keep (most recent minRecordsToKeep)
        const recordsToKeep = await prisma.taskExecutionHistory.findMany({
          where: {
            taskName,
          },
          select: {
            id: true,
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: minRecordsToKeep,
        });

        const idsToKeep = recordsToKeep.map(r => r.id);

        // Delete old records that are not in the keep list
        const deleteResult = await prisma.taskExecutionHistory.deleteMany({
          where: {
            taskName,
            startedAt: {
              lt: cutoffDate,
            },
            id: {
              notIn: idsToKeep,
            },
          },
        });

        totalDeleted += deleteResult.count;

        if (deleteResult.count > 0) {
          logger.debug('Purged old execution history for task', {
            taskName,
            deletedCount: deleteResult.count,
            cutoffDate: cutoffDate.toISOString(),
          });
        }
      }

      logger.info('Task execution history purge completed', {
        totalDeleted,
        cutoffDate: cutoffDate.toISOString(),
        minRecordsToKeep,
      });

      return totalDeleted;
    } catch (error) {
      logger.error('Failed to purge task execution history', {
        cutoffDate: cutoffDate.toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Maps database record to ExecutionHistoryRecordWithId interface
   * 
   * @param record - Database record
   * @returns ExecutionHistoryRecordWithId object
   */
  private mapToExecutionHistoryRecord(record: any): ExecutionHistoryRecordWithId {
    return {
      id: record.id,
      taskName: record.taskName,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      result: record.result as TaskResult,
      errorMessage: record.errorMessage,
      duration: record.duration,
      capturedLogs: record.capturedLogs,
      createdAt: record.createdAt,
    };
  }
}
