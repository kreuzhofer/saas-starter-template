import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestToken } from '../helpers/testAuth';
import { hashPassword } from '../../services/auth';

const app = createTestApp();
const db = getTestDb();

describe('New Admin Endpoints', () => {
  let adminToken: string;
  let adminId: string;
  let testUserId: string;

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
    adminId = adminAccount.id;
    adminToken = generateTestToken({
      accountId: adminAccount.id,
      username: adminAccount.username,
      role: 'admin',
    });

    // Create test user
    const userPasswordHash = await hashPassword('userpass123');
    const userAccount = await db.account.create({
      data: {
        username: 'testuser@example.com',
        passwordHash: userPasswordHash,
        role: 'account_owner',
        isActive: true,
      },
    });
    testUserId = userAccount.id;
  });

  describe('POST /api/admin/users/:id/set-password', () => {
    it('should set password directly', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${testUserId}/set-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'newpassword123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password updated successfully');
    });

    it('should reject password less than 8 characters', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${testUserId}/set-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'short' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when user does not exist', async () => {
      const response = await request(app)
        .post('/api/admin/users/00000000-0000-0000-0000-000000000000/set-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'newpassword123' });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/users/:id/activate', () => {
    it('should activate user account', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(true);
    });

    it('should return 404 when user does not exist', async () => {
      const response = await request(app)
        .patch('/api/admin/users/00000000-0000-0000-0000-000000000000/activate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/users/:id/deactivate', () => {
    it('should deactivate user account', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${testUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });

    it('should prevent admin from deactivating own account', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${adminId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot deactivate your own account');
    });

    it('should return 404 when user does not exist', async () => {
      const response = await request(app)
        .patch('/api/admin/users/00000000-0000-0000-0000-000000000000/deactivate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
