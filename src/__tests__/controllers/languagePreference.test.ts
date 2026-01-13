import request from 'supertest';
import { register, login } from '../../services/auth';
import { createTestApp } from '../helpers/testApp';
import { cleanupTestDb } from '../helpers/testDb';
import prisma from '../../db/client';

describe('Language Preference API Endpoints', () => {
  let app: any;
  const testEmail = 'langtest@example.com';
  const testPassword = 'password123';

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('GET /api/profile', () => {
    it('should return language preference in profile', async () => {
      // Register and activate account
      await register(testEmail, testPassword, 'de');
      await prisma.account.update({
        where: { username: testEmail },
        data: { isActive: true },
      });

      // Login to get token
      const loginResult = await login(testEmail, testPassword);

      // Get profile
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${loginResult.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('language', 'de');
    });

    it('should default to en when no language specified during registration', async () => {
      // Register without language (should default to 'en')
      await register(testEmail, testPassword);
      await prisma.account.update({
        where: { username: testEmail },
        data: { isActive: true },
      });

      // Login to get token
      const loginResult = await login(testEmail, testPassword);

      // Get profile
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${loginResult.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('language', 'en');
    });
  });

  describe('PATCH /api/profile/language', () => {
    it('should update language preference successfully', async () => {
      // Register and activate account
      await register(testEmail, testPassword, 'en');
      await prisma.account.update({
        where: { username: testEmail },
        data: { isActive: true },
      });

      // Login to get token
      const loginResult = await login(testEmail, testPassword);

      // Update language preference
      const response = await request(app)
        .patch('/api/profile/language')
        .set('Authorization', `Bearer ${loginResult.token}`)
        .send({ language: 'de' })
        .expect(200);

      expect(response.body).toHaveProperty('language', 'de');
      expect(response.body).toHaveProperty('message', 'Language preference updated successfully');

      // Verify in database
      const account = await prisma.account.findUnique({
        where: { username: testEmail },
      });
      expect(account?.language).toBe('de');
    });

    it('should reject unsupported language', async () => {
      // Register and activate account
      await register(testEmail, testPassword, 'en');
      await prisma.account.update({
        where: { username: testEmail },
        data: { isActive: true },
      });

      // Login to get token
      const loginResult = await login(testEmail, testPassword);

      // Try to update with unsupported language
      const response = await request(app)
        .patch('/api/profile/language')
        .set('Authorization', `Bearer ${loginResult.token}`)
        .send({ language: 'fr' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details[0].message).toContain('Unsupported language');
    });

    it('should require authentication', async () => {
      // Try to update without token
      await request(app)
        .patch('/api/profile/language')
        .send({ language: 'de' })
        .expect(401);
    });

    it('should reject invalid token', async () => {
      // Try to update with invalid token
      await request(app)
        .patch('/api/profile/language')
        .set('Authorization', 'Bearer invalid-token')
        .send({ language: 'de' })
        .expect(401);
    });

    it('should reject empty language', async () => {
      // Register and activate account
      await register(testEmail, testPassword, 'en');
      await prisma.account.update({
        where: { username: testEmail },
        data: { isActive: true },
      });

      // Login to get token
      const loginResult = await login(testEmail, testPassword);

      // Try to update with empty language
      const response = await request(app)
        .patch('/api/profile/language')
        .set('Authorization', `Bearer ${loginResult.token}`)
        .send({ language: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('Account creation with language', () => {
    it('should persist language preference from registration', async () => {
      // Register with German language
      const result = await register(testEmail, testPassword, 'de');

      // Verify in database
      const account = await prisma.account.findUnique({
        where: { id: result.id },
      });

      expect(account?.language).toBe('de');
    });

    it('should use default language when not specified', async () => {
      // Register without language
      const result = await register(testEmail, testPassword);

      // Verify in database
      const account = await prisma.account.findUnique({
        where: { id: result.id },
      });

      expect(account?.language).toBe('en');
    });
  });
});
