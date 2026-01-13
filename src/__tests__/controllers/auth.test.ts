import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestToken } from '../helpers/testAuth';

const app = createTestApp();
const db = getTestDb();

describe('Authentication API Endpoints', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await cleanupTestDb();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', 'test@example.com');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Please confirm your email address');

      // Verify account was created in database
      const account = await db.account.findUnique({
        where: { username: 'test@example.com' },
      });
      expect(account).toBeTruthy();
      expect(account?.isActive).toBe(false); // Should be pending
    });

    it('should return 409 when registering with duplicate username', async () => {
      // Create first account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicate@example.com',
          password: 'password123',
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicate@example.com',
          password: 'password456',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 when password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when username is not a valid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'notanemail',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create and activate a test account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'login@example.com',
          password: 'password123',
        });

      // Activate the account manually
      const account = await db.account.findUnique({
        where: { username: 'login@example.com' },
      });
      if (account) {
        await db.account.update({
          where: { id: account.id },
          data: { isActive: true },
        });
      }
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'login@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('account');
      expect(response.body.account).toHaveProperty('id');
      expect(response.body.account).toHaveProperty('username', 'login@example.com');
      expect(typeof response.body.token).toBe('string');
    });

    it('should return 401 with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should return 401 when username does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should return 403 when account is not activated', async () => {
      // Create an inactive account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'inactive@example.com',
          password: 'password123',
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'inactive@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Email confirmation required');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'login@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validToken: string;
    let accountId: string;

    beforeEach(async () => {
      // Create and activate a test account
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'refresh@example.com',
          password: 'password123',
        });

      const account = await db.account.findUnique({
        where: { username: 'refresh@example.com' },
      });

      if (account) {
        accountId = account.id;
        await db.account.update({
          where: { id: account.id },
          data: { isActive: true },
        });

        // Login to get a valid token
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'refresh@example.com',
            password: 'password123',
          });

        validToken = loginResponse.body.token;
      }
    });

    it('should refresh token successfully with valid token', async () => {
      // Wait a moment to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1100)); // Need 1+ second for JWT exp/iat to differ

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          token: validToken,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token).not.toBe(validToken); // Should be a new token
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          token: 'invalid.token.here',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired token');
    });

    it('should return 401 with expired token', async () => {
      // Generate an expired token
      const expiredToken = generateTestToken({
        accountId,
        username: 'refresh@example.com',
      });

      // Manually create an expired token by signing with negative expiration
      const jwt = require('jsonwebtoken');
      const reallyExpiredToken = jwt.sign(
        { accountId, username: 'refresh@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          token: reallyExpiredToken,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
