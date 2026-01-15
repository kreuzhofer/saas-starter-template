/**
 * Execution History Configuration
 * 
 * Configuration for task execution history storage, log capture, and retention.
 */

/**
 * Configuration for execution history feature
 */
export interface ExecutionHistoryConfig {
  /** Whether to capture and store execution history (default: true) */
  enabled: boolean;
  
  /** Retention period for execution history in days (default: 30) */
  retentionDays: number;
  
  /** Minimum number of records to keep per task regardless of age (default: 10) */
  minRecordsPerTask: number;
  
  /** Cron schedule for purge task (default: "0 2 * * *" - 2 AM daily) */
  purgeSchedule: string;
  
  /** Maximum log size in bytes (default: 102400 = 100KB) */
  maxLogSize: number;
}

/**
 * Loads execution history configuration from environment variables
 * 
 * @returns Configuration object with defaults applied
 */
export function loadExecutionHistoryConfig(): ExecutionHistoryConfig {
  return {
    enabled: process.env.TASK_HISTORY_ENABLED !== 'false', // Default: true
    retentionDays: parseInt(process.env.TASK_HISTORY_RETENTION_DAYS || '30', 10),
    minRecordsPerTask: parseInt(process.env.TASK_HISTORY_MIN_RECORDS || '10', 10),
    purgeSchedule: process.env.TASK_HISTORY_PURGE_SCHEDULE || '0 2 * * *',
    maxLogSize: parseInt(process.env.TASK_HISTORY_MAX_LOG_SIZE || '102400', 10),
  };
}

/**
 * Validates execution history configuration
 * 
 * @param config - Configuration to validate
 * @returns Validated configuration with corrections applied
 */
export function validateExecutionHistoryConfig(config: ExecutionHistoryConfig): ExecutionHistoryConfig {
  const validated = { ...config };
  
  // Ensure retention days is positive (handle NaN)
  if (isNaN(validated.retentionDays) || validated.retentionDays < 1) {
    validated.retentionDays = 30;
  }
  
  // Ensure minimum records is non-negative (handle NaN)
  if (isNaN(validated.minRecordsPerTask) || validated.minRecordsPerTask < 0) {
    validated.minRecordsPerTask = 10;
  }
  
  // Ensure max log size is positive (handle NaN)
  if (isNaN(validated.maxLogSize) || validated.maxLogSize < 1) {
    validated.maxLogSize = 102400;
  }
  
  return validated;
}
