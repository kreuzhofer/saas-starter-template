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
});
