import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { createEmailConfirmationToken } from '../../services/auth';
import * as emailService from '../../services/email';

// Mock the email service
jest.mock('../../services/email');

const app = createTestApp();
const db = getTestDb();

// Helper to generate unique test emails
const generateUniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

describe('Email Confirmation Endpoint', () => {
  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await db.$disconnect();
  });

  describe('POST /api/auth/confirm-email', () => {
    it('should confirm email with valid token', async () => {
      const testEmail = generateUniqueEmail('test-confirm');
      
      // Register a new account
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: testEmail,
          password: 'password123',
        });

      expect(registerResponse.status).toBe(201);

      // Get the account
      const account = await db.account.findUnique({
        where: { username: testEmail },
      });

      expect(account).toBeTruthy();
      expect(account!.isActive).toBe(false);

      // Get the confirmation token
      const tokenRecord = await db.emailConfirmationToken.findFirst({
        where: { accountId: account!.id },
      });

      expect(tokenRecord).toBeTruthy();

      // Confirm email
      const confirmResponse = await request(app)
        .post('/api/auth/confirm-email')
        .send({
          token: tokenRecord!.token,
        });

      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body).toHaveProperty('message');
      expect(confirmResponse.body.message).toContain('confirmed successfully');

      // Verify account is now active
      const updatedAccount = await db.account.findUnique({
        where: { id: account!.id },
      });

      expect(updatedAccount!.isActive).toBe(true);
    });

    it('should delete token after successful confirmation', async () => {
      const testEmail = generateUniqueEmail('test-delete');
      
      // Register a new account
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: testEmail,
          password: 'password123',
        });

      expect(registerResponse.status).toBe(201);

      const account = await db.account.findUnique({
        where: { username: testEmail },
      });

      expect(account).toBeTruthy();

      const tokenRecord = await db.emailConfirmationToken.findFirst({
        where: { accountId: account!.id },
      });

      expect(tokenRecord).toBeTruthy();

      // Confirm email
      await request(app)
        .post('/api/auth/confirm-email')
        .send({
          token: tokenRecord!.token,
        });

      // Verify token was deleted
      const deletedToken = await db.emailConfirmationToken.findUnique({
        where: { token: tokenRecord!.token },
      });

      expect(deletedToken).toBeNull();
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/confirm-email')
        .send({
          token: 'invalid-token-123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should return 400 for expired token', async () => {
      const testEmail = generateUniqueEmail('test-expired');
      
      // Register a new account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: testEmail,
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: testEmail },
      });

      // Update token to be expired
      const tokenRecord = await db.emailConfirmationToken.findFirst({
        where: { accountId: account!.id },
      });

      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago

      await db.emailConfirmationToken.update({
        where: { id: tokenRecord!.id },
        data: { expiresAt: expiredDate },
      });

      // Try to confirm with expired token
      const response = await request(app)
        .post('/api/auth/confirm-email')
        .send({
          token: tokenRecord!.token,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should return 400 when token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/confirm-email')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow login after email confirmation', async () => {
      const testEmail = generateUniqueEmail('test-login');
      
      // Register a new account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: testEmail,
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: testEmail },
      });

      const tokenRecord = await db.emailConfirmationToken.findFirst({
        where: { accountId: account!.id },
      });

      // Confirm email
      await request(app)
        .post('/api/auth/confirm-email')
        .send({
          token: tokenRecord!.token,
        });

      // Try to login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testEmail,
          password: 'password123',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('account');
    });

    it('should not allow using the same token twice', async () => {
      const testEmail = generateUniqueEmail('test-twice');
      
      // Register a new account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: testEmail,
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: testEmail },
      });

      const tokenRecord = await db.emailConfirmationToken.findFirst({
        where: { accountId: account!.id },
      });

      // Confirm email first time
      const firstResponse = await request(app)
        .post('/api/auth/confirm-email')
        .send({
          token: tokenRecord!.token,
        });

      expect(firstResponse.status).toBe(200);

      // Try to use the same token again
      const secondResponse = await request(app)
        .post('/api/auth/confirm-email')
        .send({
          token: tokenRecord!.token,
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error).toContain('Invalid or expired');
    });
  });
});
