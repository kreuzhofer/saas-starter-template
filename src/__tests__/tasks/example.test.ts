/**
 * Tests for the example task
 */

import { exampleTask } from '../../tasks/example';
import logger from '../../utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Example Task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct configuration', () => {
    expect(exampleTask.name).toBe('example-task');
    expect(exampleTask.schedule).toBe('* * * * *');
    expect(exampleTask.enabled).toBe(true);
    expect(typeof exampleTask.execute).toBe('function');
    expect(typeof exampleTask.onError).toBe('function');
  });

  it('should execute successfully and log messages', async () => {
    await exampleTask.execute();

    // Verify logging
    expect(logger.info).toHaveBeenCalledWith(
      'Example task started',
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Example task completed successfully',
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );
  });

  it('should call onError handler when provided with an error', () => {
    const testError = new Error('Test error');
    
    exampleTask.onError!(testError);

    expect(logger.error).toHaveBeenCalledWith(
      'Example task failed',
      expect.objectContaining({
        error: 'Test error',
        stack: expect.any(String),
      })
    );
  });

  it('should complete execution within reasonable time', async () => {
    const startTime = Date.now();
    await exampleTask.execute();
    const duration = Date.now() - startTime;

    // Should complete in less than 500ms (task has 100ms delay)
    expect(duration).toBeLessThan(500);
  });
});
