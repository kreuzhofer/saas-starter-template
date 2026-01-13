/**
 * Task Registry
 * 
 * Manages the collection of registered tasks and validates configurations.
 */

import { ScheduledTask, TaskName } from './types';
import logger from '../utils/logger';

/**
 * TaskRegistry class
 * 
 * Stores and manages all registered tasks with validation.
 */
export class TaskRegistry {
  private tasks: Map<TaskName, ScheduledTask>;

  constructor() {
    this.tasks = new Map();
  }

  /**
   * Registers a task with the registry
   * 
   * @param task - Task to register
   * @throws Error if task configuration is invalid or task name already exists
   */
  register(task: ScheduledTask): void {
    // Validate the task configuration
    this.validate(task);

    // Check for duplicate task names
    if (this.tasks.has(task.name)) {
      const error = `Task with name "${task.name}" is already registered`;
      logger.error(error);
      throw new Error(error);
    }

    // Store the task
    this.tasks.set(task.name, task);
    logger.debug(`Task registered: ${task.name}`);
  }

  /**
   * Gets a task by name
   * 
   * @param name - Task name
   * @returns Task or undefined if not found
   */
  get(name: TaskName): ScheduledTask | undefined {
    return this.tasks.get(name);
  }

  /**
   * Gets all registered tasks
   * 
   * @returns Array of all tasks
   */
  getAll(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Checks if a task exists
   * 
   * @param name - Task name
   * @returns True if task exists
   */
  has(name: TaskName): boolean {
    return this.tasks.has(name);
  }

  /**
   * Validates task configuration
   * 
   * @param task - Task to validate
   * @throws Error if configuration is invalid
   */
  validate(task: ScheduledTask): void {
    const errors: string[] = [];

    // Validate task name
    if (!task.name || typeof task.name !== 'string') {
      errors.push('Task name must be a non-empty string');
    } else if (task.name.trim().length === 0) {
      errors.push('Task name cannot be empty or whitespace only');
    }

    // Validate schedule
    if (!task.schedule || typeof task.schedule !== 'string') {
      errors.push('Task schedule must be a non-empty string');
    } else if (task.schedule.trim().length === 0) {
      errors.push('Task schedule cannot be empty or whitespace only');
    }

    // Validate enabled flag
    if (typeof task.enabled !== 'boolean') {
      errors.push('Task enabled must be a boolean');
    }

    // Validate execute function
    if (!task.execute || typeof task.execute !== 'function') {
      errors.push('Task execute must be a function');
    }

    // Validate onError if provided
    if (task.onError !== undefined && typeof task.onError !== 'function') {
      errors.push('Task onError must be a function if provided');
    }

    // Throw error if any validation failed
    if (errors.length > 0) {
      const errorMessage = `Invalid task configuration: ${errors.join(', ')}`;
      logger.error(errorMessage, { taskName: task.name });
      throw new Error(errorMessage);
    }
  }

  /**
   * Clears all registered tasks (useful for testing)
   */
  clear(): void {
    this.tasks.clear();
  }

  /**
   * Gets the number of registered tasks
   * 
   * @returns Number of tasks
   */
  size(): number {
    return this.tasks.size;
  }
}
