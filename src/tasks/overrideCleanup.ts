/**
 * Override Cleanup Scheduled Task
 * 
 * Removes expired limit overrides from the database daily at 03:00 UTC.
 * This ensures that expired overrides don't accumulate in the database
 * and that the override lookup remains efficient.
 */

import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';
import db from '../db/client';

export const overrideCleanupTask: ScheduledTask = {
  name: 'override-cleanup',
  schedule: '0 3 * * *', // Daily at 03:00 UTC
  enabled: true,
  execute: async () => {
    logger.info('Override cleanup task started', {
      timestamp: new Date().toISOString(),
    });

    try {
      const now = new Date();

      // Delete all expired overrides
      const result = await db.limitOverride.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      logger.info('Override cleanup task completed', {
        timestamp: new Date().toISOString(),
        deletedCount: result.count,
      });
    } catch (error) {
      logger.error('Override cleanup task failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to trigger onError handler
    }
  },
  onError: (error) => {
    logger.error('Override cleanup task error handler triggered', {
      error: error.message,
      stack: error.stack,
    });
  },
};
