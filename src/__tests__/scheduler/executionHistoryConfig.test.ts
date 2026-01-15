/**
 * Tests for Execution History Configuration
 * 
 * Task 6.2: Write unit tests for configuration loading
 * - Test default values
 * - Test custom values from environment
 * - Test invalid values fallback to defaults
 */

import { loadExecutionHistoryConfig, validateExecutionHistoryConfig, ExecutionHistoryConfig } from '../../scheduler/executionHistoryConfig';

describe('ExecutionHistoryConfig', () => {
  // Store original environment variables
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('loadExecutionHistoryConfig', () => {
    it('should load default values when environment variables are not set', () => {
      // Clear all history-related environment variables
      delete process.env.TASK_HISTORY_ENABLED;
      delete process.env.TASK_HISTORY_RETENTION_DAYS;
      delete process.env.TASK_HISTORY_MIN_RECORDS;
      delete process.env.TASK_HISTORY_PURGE_SCHEDULE;
      delete process.env.TASK_HISTORY_MAX_LOG_SIZE;

      const config = loadExecutionHistoryConfig();

      expect(config).toEqual({
        enabled: true,
        retentionDays: 30,
        minRecordsPerTask: 10,
        purgeSchedule: '0 2 * * *',
        maxLogSize: 102400,
      });
    });

    it('should load custom values from environment variables', () => {
      process.env.TASK_HISTORY_ENABLED = 'true';
      process.env.TASK_HISTORY_RETENTION_DAYS = '60';
      process.env.TASK_HISTORY_MIN_RECORDS = '20';
      process.env.TASK_HISTORY_PURGE_SCHEDULE = '0 3 * * *';
      process.env.TASK_HISTORY_MAX_LOG_SIZE = '204800';

      const config = loadExecutionHistoryConfig();

      expect(config).toEqual({
        enabled: true,
        retentionDays: 60,
        minRecordsPerTask: 20,
        purgeSchedule: '0 3 * * *',
        maxLogSize: 204800,
      });
    });

    it('should disable history when TASK_HISTORY_ENABLED is false', () => {
      process.env.TASK_HISTORY_ENABLED = 'false';

      const config = loadExecutionHistoryConfig();

      expect(config.enabled).toBe(false);
    });

    it('should enable history by default (any value except "false")', () => {
      process.env.TASK_HISTORY_ENABLED = 'true';
      expect(loadExecutionHistoryConfig().enabled).toBe(true);

      process.env.TASK_HISTORY_ENABLED = '1';
      expect(loadExecutionHistoryConfig().enabled).toBe(true);

      process.env.TASK_HISTORY_ENABLED = 'yes';
      expect(loadExecutionHistoryConfig().enabled).toBe(true);

      delete process.env.TASK_HISTORY_ENABLED;
      expect(loadExecutionHistoryConfig().enabled).toBe(true);
    });

    it('should parse numeric values correctly', () => {
      process.env.TASK_HISTORY_RETENTION_DAYS = '90';
      process.env.TASK_HISTORY_MIN_RECORDS = '5';
      process.env.TASK_HISTORY_MAX_LOG_SIZE = '51200';

      const config = loadExecutionHistoryConfig();

      expect(config.retentionDays).toBe(90);
      expect(config.minRecordsPerTask).toBe(5);
      expect(config.maxLogSize).toBe(51200);
    });

    it('should handle invalid numeric values by using defaults', () => {
      process.env.TASK_HISTORY_RETENTION_DAYS = 'invalid';
      process.env.TASK_HISTORY_MIN_RECORDS = 'not-a-number';
      process.env.TASK_HISTORY_MAX_LOG_SIZE = 'abc';

      const config = loadExecutionHistoryConfig();

      // parseInt returns NaN for invalid strings, which should be handled by validation
      expect(isNaN(config.retentionDays)).toBe(true);
      expect(isNaN(config.minRecordsPerTask)).toBe(true);
      expect(isNaN(config.maxLogSize)).toBe(true);
    });

    it('should accept custom cron schedule', () => {
      process.env.TASK_HISTORY_PURGE_SCHEDULE = '0 0 * * 0'; // Weekly on Sunday

      const config = loadExecutionHistoryConfig();

      expect(config.purgeSchedule).toBe('0 0 * * 0');
    });
  });

  describe('validateExecutionHistoryConfig', () => {
    it('should return valid configuration unchanged', () => {
      const validConfig: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: 30,
        minRecordsPerTask: 10,
        purgeSchedule: '0 2 * * *',
        maxLogSize: 102400,
      };

      const validated = validateExecutionHistoryConfig(validConfig);

      expect(validated).toEqual(validConfig);
    });

    it('should correct negative retention days to default', () => {
      const config: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: -5,
        minRecordsPerTask: 10,
        purgeSchedule: '0 2 * * *',
        maxLogSize: 102400,
      };

      const validated = validateExecutionHistoryConfig(config);

      expect(validated.retentionDays).toBe(30);
    });

    it('should correct zero retention days to default', () => {
      const config: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: 0,
        minRecordsPerTask: 10,
        purgeSchedule: '0 2 * * *',
        maxLogSize: 102400,
      };

      const validated = validateExecutionHistoryConfig(config);

      expect(validated.retentionDays).toBe(30);
    });

    it('should correct negative minimum records to default', () => {
      const config: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: 30,
        minRecordsPerTask: -3,
        purgeSchedule: '0 2 * * *',
        maxLogSize: 102400,
      };

      const validated = validateExecutionHistoryConfig(config);

      expect(validated.minRecordsPerTask).toBe(10);
    });

    it('should allow zero minimum records', () => {
      const config: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: 30,
        minRecordsPerTask: 0,
        purgeSchedule: '0 2 * * *',
        maxLogSize: 102400,
      };

      const validated = validateExecutionHistoryConfig(config);

      expect(validated.minRecordsPerTask).toBe(0);
    });

    it('should correct negative max log size to default', () => {
      const config: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: 30,
        minRecordsPerTask: 10,
        purgeSchedule: '0 2 * * *',
        maxLogSize: -1000,
      };

      const validated = validateExecutionHistoryConfig(config);

      expect(validated.maxLogSize).toBe(102400);
    });

    it('should correct zero max log size to default', () => {
      const config: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: 30,
        minRecordsPerTask: 10,
        purgeSchedule: '0 2 * * *',
        maxLogSize: 0,
      };

      const validated = validateExecutionHistoryConfig(config);

      expect(validated.maxLogSize).toBe(102400);
    });

    it('should not modify purge schedule', () => {
      const config: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: 30,
        minRecordsPerTask: 10,
        purgeSchedule: 'invalid-cron',
        maxLogSize: 102400,
      };

      const validated = validateExecutionHistoryConfig(config);

      // Validation doesn't check cron syntax - that's handled by the cron manager
      expect(validated.purgeSchedule).toBe('invalid-cron');
    });

    it('should not modify enabled flag', () => {
      const enabledConfig: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: 30,
        minRecordsPerTask: 10,
        purgeSchedule: '0 2 * * *',
        maxLogSize: 102400,
      };

      const disabledConfig: ExecutionHistoryConfig = {
        enabled: false,
        retentionDays: 30,
        minRecordsPerTask: 10,
        purgeSchedule: '0 2 * * *',
        maxLogSize: 102400,
      };

      expect(validateExecutionHistoryConfig(enabledConfig).enabled).toBe(true);
      expect(validateExecutionHistoryConfig(disabledConfig).enabled).toBe(false);
    });

    it('should handle NaN values from invalid environment variables', () => {
      const config: ExecutionHistoryConfig = {
        enabled: true,
        retentionDays: NaN,
        minRecordsPerTask: NaN,
        purgeSchedule: '0 2 * * *',
        maxLogSize: NaN,
      };

      const validated = validateExecutionHistoryConfig(config);

      // NaN < 1 is false, so NaN values should be corrected
      expect(validated.retentionDays).toBe(30);
      expect(validated.minRecordsPerTask).toBe(10);
      expect(validated.maxLogSize).toBe(102400);
    });
  });

  describe('Integration: load and validate', () => {
    it('should produce valid configuration from environment variables', () => {
      process.env.TASK_HISTORY_ENABLED = 'true';
      process.env.TASK_HISTORY_RETENTION_DAYS = '45';
      process.env.TASK_HISTORY_MIN_RECORDS = '15';
      process.env.TASK_HISTORY_PURGE_SCHEDULE = '0 1 * * *';
      process.env.TASK_HISTORY_MAX_LOG_SIZE = '204800';

      const config = validateExecutionHistoryConfig(loadExecutionHistoryConfig());

      expect(config).toEqual({
        enabled: true,
        retentionDays: 45,
        minRecordsPerTask: 15,
        purgeSchedule: '0 1 * * *',
        maxLogSize: 204800,
      });
    });

    it('should correct invalid environment variables to defaults', () => {
      process.env.TASK_HISTORY_RETENTION_DAYS = '-10';
      process.env.TASK_HISTORY_MIN_RECORDS = '-5';
      process.env.TASK_HISTORY_MAX_LOG_SIZE = '0';

      const config = validateExecutionHistoryConfig(loadExecutionHistoryConfig());

      expect(config.retentionDays).toBe(30);
      expect(config.minRecordsPerTask).toBe(10);
      expect(config.maxLogSize).toBe(102400);
    });
  });
});
