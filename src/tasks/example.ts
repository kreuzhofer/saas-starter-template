/**
 * Example Scheduled Task
 * 
 * A simple example task for testing the scheduler framework.
 * This task logs a message and completes successfully.
 */

import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';

export const exampleTask: ScheduledTask = {
  name: 'example-task',
  schedule: '* * * * *', // Every minute (standard cron format)
  enabled: true,
  execute: async () => {
    logger.info('Example task started', {
      timestamp: new Date().toISOString(),
    });
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    logger.info('Example task completed successfully', {
      timestamp: new Date().toISOString(),
    });
  },
  onError: (error) => {
    logger.error('Example task failed', { 
      error: error.message,
      stack: error.stack,
    });
  },
};
