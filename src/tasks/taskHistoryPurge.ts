/**
 * Task History Purge Scheduled Task
 * 
 * Scheduled task that purges old execution history records based on the configured
 * retention period. Preserves at least the minimum number of records per task
 * regardless of age.
 */

import { ScheduledTask } from '../scheduler/types';
import { ExecutionHistoryRepository } from '../scheduler/ExecutionHistoryRepository';
import { loadExecutionHistoryConfig, validateExecutionHistoryConfig } from '../scheduler/executionHistoryConfig';
import logger from '../utils/logger';

// Create repository instance for the purge task
const historyRepository = new ExecutionHistoryRepository();

// Load and validate configuration
const config = validateExecutionHistoryConfig(loadExecutionHistoryConfig());

/**
 * Task history purge scheduled task
 * 
 * Runs on the configured schedule (default: daily at 2 AM) to clean up
 * old execution history records based on the retention period.
 */
export const taskHistoryPurgeTask: ScheduledTask = {
  name: 'task-history-purge',
  schedule: config.purgeSchedule,
  enabled: config.enabled,
  execute: async () => {
    logger.info('Task history purge started', {
      retentionDays: config.retentionDays,
      minRecordsPerTask: config.minRecordsPerTask,
    });

    try {
      // Calculate cutoff date based on retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

      // Delete old records while preserving minimum per task
      const deletedCount = await historyRepository.deleteOlderThan(
        cutoffDate,
        config.minRecordsPerTask
      );

      logger.info('Task history purge completed', {
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: config.retentionDays,
        minRecordsPerTask: config.minRecordsPerTask,
      });
    } catch (error) {
      logger.error('Task history purge failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
  onError: (error) => {
    logger.error('Task history purge encountered an error', {
      error: error.message,
      stack: error.stack,
    });
  },
};
