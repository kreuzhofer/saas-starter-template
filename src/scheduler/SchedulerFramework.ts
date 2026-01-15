/**
 * Scheduler Framework
 * 
 * Central orchestrator that manages task registration, scheduling, and execution.
 */

import { ScheduledTask, TaskStatus, SchedulerConfig } from './types';
import { TaskRegistry } from './TaskRegistry';
import { CronManager } from './CronManager';
import { TaskExecutor } from './TaskExecutor';
import { TaskStatusRepository } from './TaskStatusRepository';
import { ExecutionHistoryRepository } from './ExecutionHistoryRepository';
import { loadExecutionHistoryConfig, validateExecutionHistoryConfig, ExecutionHistoryConfig } from './executionHistoryConfig';
import logger from '../utils/logger';

/**
 * SchedulerFramework class
 * 
 * Singleton class that orchestrates the entire task scheduling system.
 */
export class SchedulerFramework {
  private static instance: SchedulerFramework | null = null;
  
  private registry: TaskRegistry;
  private cronManager: CronManager;
  private executor: TaskExecutor;
  private statusRepository: TaskStatusRepository;
  private historyRepository: ExecutionHistoryRepository;
  private config: SchedulerConfig;
  private historyConfig: ExecutionHistoryConfig;
  private isRunning: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config?: Partial<SchedulerConfig>) {
    // Initialize configuration with defaults
    this.config = {
      timezone: config?.timezone || 'UTC',
      shutdownTimeoutMs: config?.shutdownTimeoutMs || 5000,
      enableStatusPersistence: config?.enableStatusPersistence ?? true,
    };

    // Load and validate execution history configuration
    this.historyConfig = validateExecutionHistoryConfig(loadExecutionHistoryConfig());

    // Initialize components
    this.statusRepository = new TaskStatusRepository();
    this.historyRepository = new ExecutionHistoryRepository();
    this.registry = new TaskRegistry();
    this.cronManager = new CronManager();
    
    // Initialize TaskExecutor with history repository and configuration
    this.executor = new TaskExecutor(
      this.statusRepository,
      this.historyRepository,
      {
        historyEnabled: this.historyConfig.enabled,
        maxLogSize: this.historyConfig.maxLogSize,
      }
    );

    logger.debug('SchedulerFramework initialized', { 
      config: this.config,
      historyConfig: this.historyConfig,
    });
  }

  /**
   * Gets the singleton instance of the scheduler
   * 
   * @param config - Optional configuration
   * @returns Scheduler instance
   */
  public static getInstance(config?: Partial<SchedulerConfig>): SchedulerFramework {
    if (!SchedulerFramework.instance) {
      SchedulerFramework.instance = new SchedulerFramework(config);
    }
    return SchedulerFramework.instance;
  }

  /**
   * Registers a task with the scheduler
   * 
   * @param task - Task configuration and execution function
   * @throws Error if task configuration is invalid
   */
  public registerTask(task: ScheduledTask): void {
    // Validate and register the task
    this.registry.register(task);
    
    // Log task registration with name and schedule
    logger.info(`Task registered: ${task.name}`, {
      taskName: task.name,
      schedule: task.schedule,
      enabled: task.enabled,
    });
  }

  /**
   * Starts the scheduler and all enabled tasks
   * Initializes cron jobs and persists initial status
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting scheduler...');

    const tasks = this.registry.getAll();
    const enabledTasks = tasks.filter(task => task.enabled);

    logger.info(`Scheduler starting with ${tasks.length} registered tasks (${enabledTasks.length} enabled)`);

    // Schedule each enabled task
    for (const task of enabledTasks) {
      try {
        // Parse the schedule to get cron expression
        const cronExpression = this.cronManager.parseSchedule(task.schedule);
        
        // Calculate next run time
        const nextRun = this.cronManager.getNextRun(cronExpression);
        
        // Create cron job that executes the task
        this.cronManager.schedule(task, async () => {
          await this.executor.execute(task);
          
          // Update next run time after execution
          const updatedNextRun = this.cronManager.getNextRun(cronExpression);
          await this.executor.updateStatus(task.name, {
            nextRun: updatedNextRun,
          });
        });
        
        // Persist initial status with next run time
        // Note: We don't set lastRun, lastResult, lastError, lastDuration here
        // to preserve existing execution history across restarts
        await this.executor.updateStatus(task.name, {
          taskName: task.name,
          enabled: task.enabled,
          nextRun,
        });
        
        logger.info(`Task scheduled: ${task.name}`, {
          taskName: task.name,
          schedule: task.schedule,
          cronExpression,
          nextRun: nextRun.toISOString(),
        });
      } catch (error) {
        logger.error(`Failed to schedule task: ${task.name}`, {
          taskName: task.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.isRunning = true;
    logger.info('Scheduler started successfully');
  }

  /**
   * Stops the scheduler and cancels all tasks
   * Waits for running tasks to complete (with timeout)
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    logger.info('Stopping scheduler...');

    // Create a timeout handle that we can clear
    let timeoutHandle: NodeJS.Timeout | null = null;

    // Create a promise that resolves when shutdown is complete
    const shutdownPromise = new Promise<void>((resolve) => {
      // Stop all cron jobs
      this.cronManager.stopAll();
      
      logger.info('All cron jobs stopped');
      
      // Clear the timeout since we completed successfully
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      
      resolve();
    });

    // Create a timeout promise
    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutHandle = setTimeout(() => {
        logger.warn(`Scheduler shutdown timeout reached (${this.config.shutdownTimeoutMs}ms)`);
        resolve();
      }, this.config.shutdownTimeoutMs);
    });

    // Wait for either shutdown completion or timeout
    await Promise.race([shutdownPromise, timeoutPromise]);

    // Clear timeout if it's still pending
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    this.isRunning = false;
    logger.info('Scheduler stopped successfully');
  }

  /**
   * Manually triggers a task execution (for testing)
   * 
   * @param taskName - Name of the task to execute
   * @throws Error if task not found
   */
  public async triggerTask(taskName: string): Promise<void> {
    const task = this.registry.get(taskName);
    
    if (!task) {
      const error = `Task not found: ${taskName}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`Manually triggering task: ${taskName}`);
    
    // Get the current next run time before execution
    const currentStatus = await this.executor.getStatus(taskName);
    const preservedNextRun = currentStatus?.nextRun || null;
    
    // Execute the task immediately
    await this.executor.execute(task);
    
    // Restore the next run time (manual triggers should not affect the regular schedule)
    if (preservedNextRun) {
      await this.executor.updateStatus(taskName, {
        nextRun: preservedNextRun,
      });
    }
  }

  /**
   * Gets status of all registered tasks
   * 
   * @returns Array of task statuses from database
   */
  public async getTaskStatuses(): Promise<TaskStatus[]> {
    return await this.statusRepository.findAll();
  }

  /**
   * Enables or disables a task
   * 
   * @param taskName - Name of the task
   * @param enabled - Whether to enable or disable
   */
  public async setTaskEnabled(taskName: string, enabled: boolean): Promise<void> {
    const task = this.registry.get(taskName);
    
    if (!task) {
      const error = `Task not found: ${taskName}`;
      logger.error(error);
      throw new Error(error);
    }

    // Update the task's enabled flag
    task.enabled = enabled;

    // Update status in database
    await this.executor.updateStatus(taskName, {
      enabled,
    });

    if (enabled) {
      // Start the cron job if scheduler is running
      if (this.isRunning && !this.cronManager.has(taskName)) {
        const cronExpression = this.cronManager.parseSchedule(task.schedule);
        const nextRun = this.cronManager.getNextRun(cronExpression);
        
        this.cronManager.schedule(task, async () => {
          await this.executor.execute(task);
          
          const updatedNextRun = this.cronManager.getNextRun(cronExpression);
          await this.executor.updateStatus(task.name, {
            nextRun: updatedNextRun,
          });
        });
        
        await this.executor.updateStatus(taskName, {
          nextRun,
        });
        
        logger.info(`Task enabled and scheduled: ${taskName}`);
      } else {
        logger.info(`Task enabled: ${taskName}`);
      }
    } else {
      // Stop the cron job
      this.cronManager.stop(taskName);
      
      // Clear next run time
      await this.executor.updateStatus(taskName, {
        nextRun: null,
      });
      
      logger.info(`Task disabled: ${taskName}`);
    }
  }

  /**
   * Checks if the scheduler is running
   * 
   * @returns True if scheduler is running
   */
  public isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Gets the number of registered tasks
   * 
   * @returns Number of tasks
   */
  public getTaskCount(): number {
    return this.registry.size();
  }

  /**
   * Checks if a task is registered
   * 
   * @param taskName - Name of the task
   * @returns True if task is registered
   */
  public hasTask(taskName: string): boolean {
    return this.registry.has(taskName);
  }

  /**
   * Gets the execution history configuration
   * 
   * @returns Execution history configuration
   */
  public getHistoryConfig(): ExecutionHistoryConfig {
    return this.historyConfig;
  }

  /**
   * Resets the singleton instance (for testing only)
   */
  public static resetInstance(): void {
    SchedulerFramework.instance = null;
  }
}

