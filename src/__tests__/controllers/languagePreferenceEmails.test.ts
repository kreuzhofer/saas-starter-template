import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/testApp';
import { cleanupTestDb } from '../helpers/testDb';
import * as emailService from '../../services/email';

// Mock email service
jest.mock('../../services/email');

describe('Language Preference in Emails', () => {
  let app: Express;
  const sendEmailConfirmationMock = emailService.sendEmailConfirmation as jest.MockedFunction<
    typeof emailService.sendEmailConfirmation
  >;
  const sendPasswordResetMock = emailService.sendPasswordReset as jest.MockedFunction<
    typeof emailService.sendPasswordReset
  >;
  const sendEmailChangeConfirmationMock = emailService.sendEmailChangeConfirmation as jest.MockedFunction<
    typeof emailService.sendEmailChangeConfirmation
  >;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('Signup Email', () => {
    it('should send confirmation email in user language from Accept-Language header', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'de-DE,de;q=0.9')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(sendEmailConfirmationMock).toHaveBeenCalledTimes(1);
      expect(sendEmailConfirmationMock).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'de' // Should use German
      );
    });

    it('should send confirmation email in English when no Accept-Language header', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(sendEmailConfirmationMock).toHaveBeenCalledTimes(1);
      expect(sendEmailConfirmationMock).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'en' // Should default to English
      );
    });
  });

  describe('Password Reset Email', () => {
    it('should send password reset email in user stored language preference', async () => {
      // Register user with German language
      await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'de-DE,de;q=0.9')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      jest.clearAllMocks();

      // Request password reset
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          username: 'test@example.com',
        });

      expect(response.status).toBe(200);
      expect(sendPasswordResetMock).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetMock).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'de' // Should use stored German preference
      );
    });

    it('should send password reset email in English for user with English preference', async () => {
      // Register user with English language
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      jest.clearAllMocks();

      // Request password reset
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          username: 'test@example.com',
        });

      expect(response.status).toBe(200);
      expect(sendPasswordResetMock).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetMock).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'en' // Should use stored English preference
      );
    });
  });

  describe('Email Change Confirmation', () => {
    it('should send email change confirmation in user stored language preference', async () => {
      // Register user with German language
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'de-DE,de;q=0.9')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      // Activate account
      const accountId = registerResponse.body.id;
      const prisma = (await import('../../db/client')).default;
      await prisma.account.update({
        where: { id: accountId },
        data: { isActive: true },
      });

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.token;
      jest.clearAllMocks();

      // Request email change
      const response = await request(app)
        .post('/api/profile/request-email-change')
        .set('Authorization', `Bearer ${token}`)
        .send({
          newEmail: 'newemail@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(sendEmailChangeConfirmationMock).toHaveBeenCalledTimes(1);
      expect(sendEmailChangeConfirmationMock).toHaveBeenCalledWith(
        'newemail@example.com',
        expect.any(String),
        'de' // Should use stored German preference
      );
    });

    it('should send email change confirmation in English for user with English preference', async () => {
      // Register user with English language
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      // Activate account
      const accountId = registerResponse.body.id;
      const prisma = (await import('../../db/client')).default;
      await prisma.account.update({
        where: { id: accountId },
        data: { isActive: true },
      });

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.token;
      jest.clearAllMocks();

      // Request email change
      const response = await request(app)
        .post('/api/profile/request-email-change')
        .set('Authorization', `Bearer ${token}`)
        .send({
          newEmail: 'newemail@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(sendEmailChangeConfirmationMock).toHaveBeenCalledTimes(1);
      expect(sendEmailChangeConfirmationMock).toHaveBeenCalledWith(
        'newemail@example.com',
        expect.any(String),
        'en' // Should use stored English preference
      );
    });
  });
});
