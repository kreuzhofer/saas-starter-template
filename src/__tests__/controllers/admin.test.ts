import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestToken } from '../helpers/testAuth';
import { hashPassword } from '../../services/auth';

const app = createTestApp();
const db = getTestDb();

describe('Admin API Endpoints', () => {
  let adminToken: string;
  let adminAccountId: string;
  let regularUserToken: string;
  let regularUserId: string;

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

  describe('GET /api/admin/users', () => {
    it('should list all users when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(2); // At least admin + regular user
      expect(response.body.total).toBeGreaterThanOrEqual(2);

      // Verify our test users are in the list
      const testAdmin = response.body.users.find((u: any) => u.username === 'testadmin@example.com');
      const testUser = response.body.users.find((u: any) => u.username === 'user@example.com');
      expect(testAdmin).toBeTruthy();
      expect(testUser).toBeTruthy();

      // Verify user data structure
      const user = response.body.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('isActive');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
      expect(user).not.toHaveProperty('passwordHash'); // Should not include password
    });

    it('should return 403 when authenticated as non-admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should get specific user details when authenticated as admin', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', regularUserId);
      expect(response.body).toHaveProperty('username', 'user@example.com');
      expect(response.body).toHaveProperty('role', 'account_owner');
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 404 when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should return 403 when authenticated as non-admin', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('should update user role when authenticated as admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${regularUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', regularUserId);
      expect(response.body).toHaveProperty('role', 'admin');

      // Verify role was updated in database
      const updatedUser = await db.account.findUnique({
        where: { id: regularUserId },
      });
      expect(updatedUser?.role).toBe('admin');
    });

    it('should return 400 when role is invalid', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${regularUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid_role' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .patch(`/api/admin/users/${fakeId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 when authenticated as non-admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${regularUserId}/role`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 when admin tries to change own role to non-admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${adminAccountId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'account_owner' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Cannot change your own admin role');

      // Verify role is still admin in database
      const adminAccount = await db.account.findUnique({
        where: { id: adminAccountId },
      });
      expect(adminAccount?.role).toBe('admin');
    });
  });

  describe('PATCH /api/admin/users/:id/email', () => {
    it('should update user email when authenticated as admin', async () => {
      const newEmail = 'newemail@example.com';
      const response = await request(app)
        .patch(`/api/admin/users/${regularUserId}/email`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: newEmail });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', regularUserId);
      expect(response.body).toHaveProperty('username', newEmail);

      // Verify email was updated in database
      const updatedUser = await db.account.findUnique({
        where: { id: regularUserId },
      });
      expect(updatedUser?.username).toBe(newEmail);
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${regularUserId}/email`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 when email is already in use', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${regularUserId}/email`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'testadmin@example.com' }); // Admin's email

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already in use');
    });

    it('should return 404 when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .patch(`/api/admin/users/${fakeId}/email`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@example.com' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 when authenticated as non-admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${regularUserId}/email`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ email: 'new@example.com' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/admin/users/:id/reset-password', () => {
    it('should initiate password reset when authenticated as admin', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${regularUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Password reset email sent');

      // Verify password reset token was created in database
      const resetToken = await db.passwordResetToken.findFirst({
        where: { accountId: regularUserId },
      });
      expect(resetToken).toBeTruthy();
    });

    it('should return 404 when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/admin/users/${fakeId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 when authenticated as non-admin', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${regularUserId}/reset-password`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${regularUserId}/reset-password`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
