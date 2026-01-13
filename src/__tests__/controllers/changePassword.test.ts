import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestToken } from '../helpers/testAuth';
import * as emailService from '../../services/email';

// Mock the email service
jest.mock('../../services/email');

const app = createTestApp();
const db = getTestDb();

describe('Change Password Endpoint', () => {
  let authToken: string;
  let accountId: string;

  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();

    // Register and activate an account
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test@example.com',
        password: 'oldPassword123',
      });

    const account = await db.account.findUnique({
      where: { username: 'test@example.com' },
    });

    accountId = account!.id;

    await db.account.update({
      where: { id: accountId },
      data: { isActive: true },
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test@example.com',
        password: 'oldPassword123',
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await cleanupTestDb();
    await db.$disconnect();
  });

  describe('PATCH /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword456',
          passwordConfirmation: 'newPassword456',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('changed successfully');
    });

    it('should allow login with new password after change', async () => {
      // Change password
      await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword456',
          passwordConfirmation: 'newPassword456',
        });

      // Try to login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: 'newPassword456',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
    });

    it('should not allow login with old password after change', async () => {
      // Change password
      await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword456',
          passwordConfirmation: 'newPassword456',
        });

      // Try to login with old password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: 'oldPassword123',
        });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.error).toContain('Invalid email or password');
    });

    it('should return 401 when current password is incorrect', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword456',
          passwordConfirmation: 'newPassword456',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Current password is incorrect');
    });

    it('should return 400 when new password is too short', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'short',
          passwordConfirmation: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      // Check for either the validation error or the specific error message
      expect(
        response.body.error === 'Validation failed' || 
        response.body.error.includes('at least 8 characters')
      ).toBe(true);
    });

    it('should return 400 when passwords do not match', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword456',
          passwordConfirmation: 'differentPassword789',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('do not match');
    });

    it('should return 401 when authentication token is missing', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword456',
          passwordConfirmation: 'newPassword456',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication required');
    });

    it('should return 401 when authentication token is invalid', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword456',
          passwordConfirmation: 'newPassword456',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow changing password multiple times', async () => {
      // First change
      const firstChange = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword456',
          passwordConfirmation: 'newPassword456',
        });

      expect(firstChange.status).toBe(200);

      // Login with new password to get new token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: 'newPassword456',
        });

      const newToken = loginResponse.body.token;

      // Second change
      const secondChange = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          currentPassword: 'newPassword456',
          newPassword: 'anotherPassword789',
          passwordConfirmation: 'anotherPassword789',
        });

      expect(secondChange.status).toBe(200);

      // Verify can login with latest password
      const finalLogin = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: 'anotherPassword789',
        });

      expect(finalLogin.status).toBe(200);
    });
  });
});
