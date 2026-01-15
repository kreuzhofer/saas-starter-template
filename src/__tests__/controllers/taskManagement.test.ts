import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestToken } from '../helpers/testAuth';
import { hashPassword } from '../../services/auth';
import { scheduler } from '../../scheduler';
import { ScheduledTask } from '../../scheduler/types';

const app = createTestApp();
const db = getTestDb();

describe('Task Management API Endpoints', () => {
  let adminToken: string;
  let adminAccountId: string;
  let regularUserToken: string;
  let regularUserId: string;
  let testTaskName: string;

  beforeAll(async () => {
    // Register a test task once for all tests
    testTaskName = `test-task-${Date.now()}`;
    const testTask: ScheduledTask = {
      name: testTaskName,
      schedule: '*/5 * * * *', // Every 5 minutes
      enabled: true,
      execute: async () => {
        // Test task implementation
      },
    };
    
    try {
      scheduler.registerTask(testTask);
    } catch (error) {
      // Task might already be registered, ignore
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await cleanupTestDb();

    // Create admin account
    const adminPasswordHash = await hashPassword('adminpass123');
    const adminAccount = await db.account.create({
      data: {
        username: 'testadmin@example.com',
        passwordHash: adminPasswordHash,
        role: 'admin',
        isActive: true,
      },
    });
    adminAccountId = adminAccount.id;
    adminToken = generateTestToken({
      accountId: adminAccount.id,
      username: adminAccount.username,
      role: 'admin',
    });

    // Create regular user account
    const userPasswordHash = await hashPassword('userpass123');
    const userAccount = await db.account.create({
      data: {
        username: 'user@example.com',
        passwordHash: userPasswordHash,
        role: 'account_owner',
        isActive: true,
      },
    });
    regularUserId = userAccount.id;
    regularUserToken = generateTestToken({
      accountId: userAccount.id,
      username: userAccount.username,
      role: 'account_owner',
    });
  });

  afterEach(async () => {
    // Clean up test data - delete task status if it exists
    try {
      await db.$executeRaw`DELETE FROM scheduled_task_status WHERE "taskName" = ${testTaskName}`;
    } catch (error) {
      // Ignore errors if table doesn't exist or record not found
    }
  });

  describe('GET /api/admin/tasks', () => {
    it('should list all task statuses when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/admin/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);

      // If tasks exist, verify structure
      if (response.body.tasks.length > 0) {
        const task = response.body.tasks[0];
        expect(task).toHaveProperty('taskName');
        expect(task).toHaveProperty('enabled');
        expect(task).toHaveProperty('lastRun');
        expect(task).toHaveProperty('nextRun');
        expect(task).toHaveProperty('lastResult');
        expect(task).toHaveProperty('lastError');
        expect(task).toHaveProperty('lastDuration');
      }
    });

    it('should return 403 when authenticated as non-admin', async () => {
      const response = await request(app)
        .get('/api/admin/tasks')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/tasks');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('POST /api/admin/tasks/:name/trigger', () => {
    it('should manually trigger a task when authenticated as admin', async () => {
      const response = await request(app)
        .post(`/api/admin/tasks/${testTaskName}/trigger`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('triggered successfully');
    });

    it('should return 404 when task does not exist', async () => {
      const response = await request(app)
        .post('/api/admin/tasks/non-existent-task/trigger')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Task not found');
    });

    it('should return 403 when authenticated as non-admin', async () => {
      const response = await request(app)
        .post(`/api/admin/tasks/${testTaskName}/trigger`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`/api/admin/tasks/${testTaskName}/trigger`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('PATCH /api/admin/tasks/:name/enable', () => {
    it('should enable a task when authenticated as admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/tasks/${testTaskName}/enable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('enabled successfully');
    });

    it('should disable a task when authenticated as admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/tasks/${testTaskName}/enable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('disabled successfully');
    });

    it('should return 400 when enabled parameter is missing', async () => {
      const response = await request(app)
        .patch(`/api/admin/tasks/${testTaskName}/enable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when enabled parameter is not a boolean', async () => {
      const response = await request(app)
        .patch(`/api/admin/tasks/${testTaskName}/enable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: 'true' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid request body');
    });

    it('should return 404 when task does not exist', async () => {
      const response = await request(app)
        .patch('/api/admin/tasks/non-existent-task/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Task not found');
    });

    it('should return 403 when authenticated as non-admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/tasks/${testTaskName}/enable`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .patch(`/api/admin/tasks/${testTaskName}/enable`)
        .send({ enabled: true });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('GET /api/admin/tasks/:name/logs', () => {
    it('should retrieve task logs when authenticated as admin', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/logs`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('taskName');
      expect(response.body.taskName).toBe(testTaskName);
      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);

      // If logs exist, verify structure
      if (response.body.logs.length > 0) {
        const log = response.body.logs[0];
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('result');
        expect(log).toHaveProperty('duration');
        expect(log).toHaveProperty('error');
      }
    });

    it('should support limit query parameter', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/logs?limit=5`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('should return 400 when limit parameter is invalid', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/logs?limit=invalid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid limit parameter');
    });

    it('should return 400 when limit parameter is out of range', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/logs?limit=200`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid limit parameter');
    });

    it('should return 404 when task does not exist', async () => {
      const response = await request(app)
        .get('/api/admin/tasks/non-existent-task/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Task not found');
    });

    it('should return 403 when authenticated as non-admin', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/logs`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/logs`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('GET /api/admin/tasks/:name/history', () => {
    beforeEach(async () => {
      // Clean up any existing execution history for the test task
      await db.taskExecutionHistory.deleteMany({
        where: { taskName: testTaskName },
      });
    });

    it('should retrieve task execution history successfully', async () => {
      // Create some execution history records
      const now = new Date();
      await db.taskExecutionHistory.create({
        data: {
          taskName: testTaskName,
          startedAt: new Date(now.getTime() - 10000),
          completedAt: new Date(now.getTime() - 5000),
          result: 'success',
          errorMessage: null,
          duration: 5000,
          capturedLogs: 'Test log output',
        },
      });

      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('taskName', testTaskName);
      expect(response.body).toHaveProperty('executions');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');
      expect(Array.isArray(response.body.executions)).toBe(true);
      expect(response.body.executions.length).toBe(1);
      expect(response.body.total).toBe(1);

      // Verify execution record structure
      const execution = response.body.executions[0];
      expect(execution).toHaveProperty('id');
      expect(execution).toHaveProperty('startedAt');
      expect(execution).toHaveProperty('completedAt');
      expect(execution).toHaveProperty('result', 'success');
      expect(execution).toHaveProperty('errorMessage', null);
      expect(execution).toHaveProperty('duration', 5000);
      expect(execution).toHaveProperty('capturedLogs', 'Test log output');
    });

    it('should support limit parameter with default value', async () => {
      // Create 15 execution history records
      const now = new Date();
      for (let i = 0; i < 15; i++) {
        await db.taskExecutionHistory.create({
          data: {
            taskName: testTaskName,
            startedAt: new Date(now.getTime() - (i + 1) * 1000),
            completedAt: new Date(now.getTime() - i * 1000),
            result: 'success',
            errorMessage: null,
            duration: 1000,
            capturedLogs: `Log ${i}`,
          },
        });
      }

      // Test default limit (10)
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.executions.length).toBe(10);
      expect(response.body.total).toBe(15);
      expect(response.body.limit).toBe(10);
      expect(response.body.offset).toBe(0);
    });

    it('should support custom limit parameter', async () => {
      // Create 10 execution history records
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        await db.taskExecutionHistory.create({
          data: {
            taskName: testTaskName,
            startedAt: new Date(now.getTime() - (i + 1) * 1000),
            completedAt: new Date(now.getTime() - i * 1000),
            result: 'success',
            errorMessage: null,
            duration: 1000,
            capturedLogs: `Log ${i}`,
          },
        });
      }

      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history?limit=5`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.executions.length).toBe(5);
      expect(response.body.total).toBe(10);
      expect(response.body.limit).toBe(5);
    });

    it('should validate limit parameter minimum value', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history?limit=0`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit must be between 1 and 100');
    });

    it('should validate limit parameter maximum value', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history?limit=101`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit must be between 1 and 100');
    });

    it('should validate limit parameter is a number', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history?limit=invalid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit must be between 1 and 100');
    });

    it('should support offset parameter', async () => {
      // Create 15 execution history records
      const now = new Date();
      for (let i = 0; i < 15; i++) {
        await db.taskExecutionHistory.create({
          data: {
            taskName: testTaskName,
            startedAt: new Date(now.getTime() - (i + 1) * 1000),
            completedAt: new Date(now.getTime() - i * 1000),
            result: 'success',
            errorMessage: null,
            duration: 1000,
            capturedLogs: `Log ${i}`,
          },
        });
      }

      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history?limit=5&offset=10`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.executions.length).toBe(5);
      expect(response.body.total).toBe(15);
      expect(response.body.limit).toBe(5);
      expect(response.body.offset).toBe(10);
    });

    it('should validate offset parameter is non-negative', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history?offset=-1`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('offset must be non-negative');
    });

    it('should validate offset parameter is a number', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history?offset=invalid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('offset must be non-negative');
    });

    it('should return empty array for non-existent task', async () => {
      const response = await request(app)
        .get('/api/admin/tasks/non-existent-task/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('taskName', 'non-existent-task');
      expect(response.body).toHaveProperty('executions');
      expect(response.body.executions).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication required');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return response format matching specification', async () => {
      // Create execution history with various scenarios
      const now = new Date();
      await db.taskExecutionHistory.create({
        data: {
          taskName: testTaskName,
          startedAt: new Date(now.getTime() - 10000),
          completedAt: new Date(now.getTime() - 5000),
          result: 'success',
          errorMessage: null,
          duration: 5000,
          capturedLogs: 'Success log',
        },
      });

      await db.taskExecutionHistory.create({
        data: {
          taskName: testTaskName,
          startedAt: new Date(now.getTime() - 20000),
          completedAt: new Date(now.getTime() - 15000),
          result: 'failure',
          errorMessage: 'Test error message',
          duration: 5000,
          capturedLogs: 'Error log',
        },
      });

      const response = await request(app)
        .get(`/api/admin/tasks/${testTaskName}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      
      // Verify top-level response structure
      expect(response.body).toMatchObject({
        taskName: testTaskName,
        executions: expect.any(Array),
        total: 2,
        limit: 10,
        offset: 0,
      });

      // Verify each execution has all required fields
      response.body.executions.forEach((execution: any) => {
        expect(execution).toHaveProperty('id');
        expect(typeof execution.id).toBe('string');
        
        expect(execution).toHaveProperty('startedAt');
        expect(typeof execution.startedAt).toBe('string');
        expect(new Date(execution.startedAt).toISOString()).toBe(execution.startedAt);
        
        expect(execution).toHaveProperty('completedAt');
        expect(typeof execution.completedAt).toBe('string');
        expect(new Date(execution.completedAt).toISOString()).toBe(execution.completedAt);
        
        expect(execution).toHaveProperty('result');
        expect(['success', 'failure']).toContain(execution.result);
        
        expect(execution).toHaveProperty('errorMessage');
        expect(execution).toHaveProperty('duration');
        expect(typeof execution.duration).toBe('number');
        
        expect(execution).toHaveProperty('capturedLogs');
      });

      // Verify executions are ordered by startedAt descending (most recent first)
      const executions = response.body.executions;
      for (let i = 0; i < executions.length - 1; i++) {
        const current = new Date(executions[i].startedAt).getTime();
        const next = new Date(executions[i + 1].startedAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });
});
