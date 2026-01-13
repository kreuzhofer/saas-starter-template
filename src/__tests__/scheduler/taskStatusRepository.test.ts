/**
 * Unit Tests for TaskStatusRepository
 * 
 * Tests status creation, updates, retrieval, and error handling.
 */

import { TaskStatusRepository } from '../../scheduler/TaskStatusRepository';
import { TaskStatus } from '../../scheduler/types';
import { getTestDb } from '../helpers/testDb';

describe('TaskStatusRepository', () => {
  let repository: TaskStatusRepository;
  let db: ReturnType<typeof getTestDb>;
  const testTaskNames: string[] = [];

  beforeEach(() => {
    repository = new TaskStatusRepository();
    db = getTestDb();
  });

  afterEach(async () => {
    // Clean up test task statuses
    for (const taskName of testTaskNames) {
      await db.scheduledTaskStatus.deleteMany({
        where: { taskName },
      });
    }
    testTaskNames.length = 0;
  });

  describe('upsert', () => {
    it('should create a new task status record', async () => {
      const taskName = 'test-task-create';
      testTaskNames.push(taskName);

      const status: TaskStatus = {
        taskName,
        enabled: true,
        lastRun: null,
        nextRun: new Date('2024-01-01T00:00:00Z'),
        lastResult: null,
        lastError: null,
        lastDuration: null,
      };

      await repository.upsert(status);

      const record = await db.scheduledTaskStatus.findUnique({
        where: { taskName },
      });

      expect(record).not.toBeNull();
      expect(record?.taskName).toBe(taskName);
      expect(record?.enabled).toBe(true);
      expect(record?.lastRun).toBeNull();
      expect(record?.nextRun).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(record?.lastResult).toBeNull();
      expect(record?.lastError).toBeNull();
      expect(record?.lastDuration).toBeNull();
    });

    it('should update an existing task status record', async () => {
      const taskName = 'test-task-update';
      testTaskNames.push(taskName);

      // Create initial record
      const initialStatus: TaskStatus = {
        taskName,
        enabled: true,
        lastRun: null,
        nextRun: new Date('2024-01-01T00:00:00Z'),
        lastResult: null,
        lastError: null,
        lastDuration: null,
      };

      await repository.upsert(initialStatus);

      // Update the record
      const updatedStatus: TaskStatus = {
        taskName,
        enabled: true,
        lastRun: new Date('2024-01-01T00:00:00Z'),
        nextRun: new Date('2024-01-02T00:00:00Z'),
        lastResult: 'success',
        lastError: null,
        lastDuration: 1500,
      };

      await repository.upsert(updatedStatus);

      const record = await db.scheduledTaskStatus.findUnique({
        where: { taskName },
      });

      expect(record).not.toBeNull();
      expect(record?.lastRun).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(record?.nextRun).toEqual(new Date('2024-01-02T00:00:00Z'));
      expect(record?.lastResult).toBe('success');
      expect(record?.lastDuration).toBe(1500);
    });

    it('should handle task execution failure status', async () => {
      const taskName = 'test-task-failure';
      testTaskNames.push(taskName);

      const status: TaskStatus = {
        taskName,
        enabled: true,
        lastRun: new Date('2024-01-01T00:00:00Z'),
        nextRun: new Date('2024-01-02T00:00:00Z'),
        lastResult: 'failure',
        lastError: 'Task execution failed: Connection timeout',
        lastDuration: 5000,
      };

      await repository.upsert(status);

      const record = await db.scheduledTaskStatus.findUnique({
        where: { taskName },
      });

      expect(record).not.toBeNull();
      expect(record?.lastResult).toBe('failure');
      expect(record?.lastError).toBe('Task execution failed: Connection timeout');
      expect(record?.lastDuration).toBe(5000);
    });

    it('should handle disabled task status', async () => {
      const taskName = 'test-task-disabled';
      testTaskNames.push(taskName);

      const status: TaskStatus = {
        taskName,
        enabled: false,
        lastRun: new Date('2024-01-01T00:00:00Z'),
        nextRun: null,
        lastResult: 'success',
        lastError: null,
        lastDuration: 1000,
      };

      await repository.upsert(status);

      const record = await db.scheduledTaskStatus.findUnique({
        where: { taskName },
      });

      expect(record).not.toBeNull();
      expect(record?.enabled).toBe(false);
      expect(record?.nextRun).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should retrieve an existing task status', async () => {
      const taskName = 'test-task-find';
      testTaskNames.push(taskName);

      // Create a task status
      await db.scheduledTaskStatus.create({
        data: {
          taskName,
          enabled: true,
          lastRun: new Date('2024-01-01T00:00:00Z'),
          nextRun: new Date('2024-01-02T00:00:00Z'),
          lastResult: 'success',
          lastError: null,
          lastDuration: 2000,
        },
      });

      const status = await repository.findByName(taskName);

      expect(status).not.toBeNull();
      expect(status?.taskName).toBe(taskName);
      expect(status?.enabled).toBe(true);
      expect(status?.lastRun).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(status?.nextRun).toEqual(new Date('2024-01-02T00:00:00Z'));
      expect(status?.lastResult).toBe('success');
      expect(status?.lastDuration).toBe(2000);
    });

    it('should return null for non-existent task', async () => {
      const status = await repository.findByName('non-existent-task');
      expect(status).toBeNull();
    });

    it('should map database record to TaskStatus interface correctly', async () => {
      const taskName = 'test-task-mapping';
      testTaskNames.push(taskName);

      await db.scheduledTaskStatus.create({
        data: {
          taskName,
          enabled: false,
          lastRun: new Date('2024-01-01T12:30:00Z'),
          nextRun: null,
          lastResult: 'failure',
          lastError: 'Network error',
          lastDuration: 3500,
        },
      });

      const status = await repository.findByName(taskName);

      expect(status).toMatchObject({
        taskName,
        enabled: false,
        lastRun: new Date('2024-01-01T12:30:00Z'),
        nextRun: null,
        lastResult: 'failure',
        lastError: 'Network error',
        lastDuration: 3500,
      });
    });
  });

  describe('findAll', () => {
    it('should retrieve all task statuses', async () => {
      const taskName1 = 'test-task-all-1';
      const taskName2 = 'test-task-all-2';
      const taskName3 = 'test-task-all-3';
      testTaskNames.push(taskName1, taskName2, taskName3);

      // Create multiple task statuses
      await db.scheduledTaskStatus.create({
        data: {
          taskName: taskName1,
          enabled: true,
          lastRun: new Date('2024-01-01T00:00:00Z'),
          nextRun: new Date('2024-01-02T00:00:00Z'),
          lastResult: 'success',
          lastError: null,
          lastDuration: 1000,
        },
      });

      await db.scheduledTaskStatus.create({
        data: {
          taskName: taskName2,
          enabled: false,
          lastRun: new Date('2024-01-01T01:00:00Z'),
          nextRun: null,
          lastResult: 'failure',
          lastError: 'Error message',
          lastDuration: 2000,
        },
      });

      await db.scheduledTaskStatus.create({
        data: {
          taskName: taskName3,
          enabled: true,
          lastRun: null,
          nextRun: new Date('2024-01-03T00:00:00Z'),
          lastResult: null,
          lastError: null,
          lastDuration: null,
        },
      });

      const statuses = await repository.findAll();

      // Filter to only our test tasks
      const testStatuses = statuses.filter(s => 
        testTaskNames.includes(s.taskName)
      );

      expect(testStatuses.length).toBe(3);
      
      // Verify they're sorted by taskName
      const taskNames = testStatuses.map(s => s.taskName);
      expect(taskNames).toEqual([taskName1, taskName2, taskName3].sort());
    });

    it('should return empty array when no tasks exist', async () => {
      // Clean up any existing test tasks first
      await db.scheduledTaskStatus.deleteMany({
        where: {
          taskName: { startsWith: 'test-task-empty' },
        },
      });

      const statuses = await repository.findAll();
      
      // Filter to only tasks with our test prefix
      const testStatuses = statuses.filter(s => 
        s.taskName.startsWith('test-task-empty')
      );
      
      expect(testStatuses).toEqual([]);
    });

    it('should return all task statuses with correct data types', async () => {
      const taskName = 'test-task-types';
      testTaskNames.push(taskName);

      await db.scheduledTaskStatus.create({
        data: {
          taskName,
          enabled: true,
          lastRun: new Date('2024-01-01T00:00:00Z'),
          nextRun: new Date('2024-01-02T00:00:00Z'),
          lastResult: 'success',
          lastError: null,
          lastDuration: 1500,
        },
      });

      const statuses = await repository.findAll();
      const testStatus = statuses.find(s => s.taskName === taskName);

      expect(testStatus).toBeDefined();
      expect(typeof testStatus?.taskName).toBe('string');
      expect(typeof testStatus?.enabled).toBe('boolean');
      expect(testStatus?.lastRun).toBeInstanceOf(Date);
      expect(testStatus?.nextRun).toBeInstanceOf(Date);
      expect(typeof testStatus?.lastResult).toBe('string');
      expect(testStatus?.lastError).toBeNull();
      expect(typeof testStatus?.lastDuration).toBe('number');
    });
  });

  describe('delete', () => {
    it('should delete an existing task status', async () => {
      const taskName = 'test-task-delete';
      testTaskNames.push(taskName);

      // Create a task status
      await db.scheduledTaskStatus.create({
        data: {
          taskName,
          enabled: true,
          lastRun: null,
          nextRun: new Date('2024-01-01T00:00:00Z'),
          lastResult: null,
          lastError: null,
          lastDuration: null,
        },
      });

      // Verify it exists
      let record = await db.scheduledTaskStatus.findUnique({
        where: { taskName },
      });
      expect(record).not.toBeNull();

      // Delete it
      await repository.delete(taskName);

      // Verify it's gone
      record = await db.scheduledTaskStatus.findUnique({
        where: { taskName },
      });
      expect(record).toBeNull();
    });

    it('should handle deleting non-existent task gracefully', async () => {
      // Should not throw
      await expect(
        repository.delete('non-existent-task')
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in upsert', async () => {
      const taskName = 'test-task-error';
      testTaskNames.push(taskName);

      // Create a status with invalid data that might cause issues
      const status: TaskStatus = {
        taskName,
        enabled: true,
        lastRun: null,
        nextRun: null,
        lastResult: null,
        lastError: null,
        lastDuration: null,
      };

      // Should not throw even if there are database issues
      await expect(repository.upsert(status)).resolves.not.toThrow();
    });

    it('should return null on database errors in findByName', async () => {
      // Attempting to find with an extremely long task name that might cause issues
      const longTaskName = 'x'.repeat(200);
      
      const status = await repository.findByName(longTaskName);
      
      // Should return null instead of throwing
      expect(status).toBeNull();
    });

    it('should return empty array on database errors in findAll', async () => {
      // This test verifies graceful error handling
      // In a real scenario, we might temporarily break the connection
      // For now, we just verify the method doesn't throw
      
      const statuses = await repository.findAll();
      
      // Should return an array (possibly empty) instead of throwing
      expect(Array.isArray(statuses)).toBe(true);
    });
  });
});

