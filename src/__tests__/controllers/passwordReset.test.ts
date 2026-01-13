import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { createPasswordResetToken } from '../../services/auth';
import * as emailService from '../../services/email';

// Mock the email service
jest.mock('../../services/email');

const app = createTestApp();
const db = getTestDb();

describe('Password Reset Endpoints', () => {
  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await db.$disconnect();
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('should send password reset email for existing account', async () => {
      // Register and activate an account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: 'test@example.com' },
      });

      await db.account.update({
        where: { id: account!.id },
        data: { isActive: true },
      });

      const sendPasswordResetMock = emailService.sendPasswordReset as jest.Mock;

      // Request password reset
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          username: 'test@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('check your email');
      expect(sendPasswordResetMock).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetMock).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'en' // Language parameter
      );
    });

    it('should return success for non-existent account to prevent enumeration', async () => {
      const sendPasswordResetMock = emailService.sendPasswordReset as jest.Mock;

      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          username: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(sendPasswordResetMock).not.toHaveBeenCalled();
    });

    it('should create password reset token in database', async () => {
      // Register and activate an account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: 'test@example.com' },
      });

      await db.account.update({
        where: { id: account!.id },
        data: { isActive: true },
      });

      // Request password reset
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          username: 'test@example.com',
        });

      // Verify token was created
      const tokens = await db.passwordResetToken.findMany({
        where: { accountId: account!.id },
      });

      expect(tokens).toHaveLength(1);
      expect(tokens[0].expiresAt).toBeDefined();
      expect(tokens[0].usedAt).toBeNull();
    });

    it('should return 400 when username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
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

      await db.account.update({
        where: { id: account!.id },
        data: { isActive: true },
      });

      // Create password reset token
      const token = await createPasswordResetToken(account!.id);

      // Reset password
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
          newPassword: 'newPassword456',
          passwordConfirmation: 'newPassword456',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('reset successfully');
    });

    it('should allow login with new password after reset', async () => {
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

      await db.account.update({
        where: { id: account!.id },
        data: { isActive: true },
      });

      // Create password reset token
      const token = await createPasswordResetToken(account!.id);

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
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

    it('should not allow login with old password after reset', async () => {
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

      await db.account.update({
        where: { id: account!.id },
        data: { isActive: true },
      });

      // Create password reset token
      const token = await createPasswordResetToken(account!.id);

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
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

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newPassword123',
          passwordConfirmation: 'newPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should return 400 for expired token', async () => {
      // Register an account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: 'test@example.com' },
      });

      // Create expired token
      const token = await createPasswordResetToken(account!.id);

      // Update token to be expired
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);

      await db.passwordResetToken.update({
        where: { token },
        data: { expiresAt: expiredDate },
      });

      // Try to reset password
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
          newPassword: 'newPassword123',
          passwordConfirmation: 'newPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should return 400 when password is too short', async () => {
      // Register an account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: 'test@example.com' },
      });

      const token = await createPasswordResetToken(account!.id);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
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
      // Register an account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: 'test@example.com' },
      });

      const token = await createPasswordResetToken(account!.id);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
          newPassword: 'newPassword123',
          passwordConfirmation: 'differentPassword456',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('do not match');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should delete token after successful password reset', async () => {
      // Register an account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: 'test@example.com' },
      });

      await db.account.update({
        where: { id: account!.id },
        data: { isActive: true },
      });

      const token = await createPasswordResetToken(account!.id);

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
          newPassword: 'newPassword123',
          passwordConfirmation: 'newPassword123',
        });

      // Verify token was deleted
      const tokenRecord = await db.passwordResetToken.findUnique({
        where: { token },
      });

      expect(tokenRecord).toBeNull();
    });
  });
});
