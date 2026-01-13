import { login, register } from '../../services/auth';
import prisma from '../../db/client';
import * as emailService from '../../services/email';
import { cleanupTestDb } from '../helpers/testDb';

// Mock the email service
jest.mock('../../services/email');

describe('Login with Account Activation Check', () => {
  const testEmail = 'logintest@example.com';
  const testPassword = 'testPassword123';

  beforeEach(async () => {
    // Clean up test data
    await cleanupTestDb();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  describe('Account Activation Check', () => {
    it('should reject login for inactive account with 403 error', async () => {
      // Register a new account (which creates an inactive account)
      await register(testEmail, testPassword);

      // Verify account is inactive
      const account = await prisma.account.findUnique({
        where: { username: testEmail },
      });
      expect(account?.isActive).toBe(false);

      // Attempt to login should fail with specific error
      await expect(login(testEmail, testPassword)).rejects.toThrow(
        'Email confirmation required'
      );
    });

    it('should include role from database in JWT token', async () => {
      // Register a new account
      await register(testEmail, testPassword);

      // Manually activate the account
      await prisma.account.update({
        where: { username: testEmail },
        data: { isActive: true },
      });

      // Verify account has account_owner role
      const account = await prisma.account.findUnique({
        where: { username: testEmail },
      });
      expect(account?.role).toBe('account_owner');

      // Login should succeed and return JWT
      const result = await login(testEmail, testPassword);

      // Decode JWT to verify role is included
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(result.token) as any;
      
      expect(decoded.role).toBe('account_owner');
      expect(decoded.accountId).toBe(account?.id);
      expect(decoded.username).toBe(testEmail);
    });

    it('should allow login for active account', async () => {
      // Register a new account
      await register(testEmail, testPassword);

      // Manually activate the account
      await prisma.account.update({
        where: { username: testEmail },
        data: { isActive: true },
      });

      // Login should succeed
      const result = await login(testEmail, testPassword);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.account.username).toBe(testEmail);
    });

    it('should check activation status before password verification', async () => {
      // Register a new account
      await register(testEmail, testPassword);

      // Verify account is inactive
      const account = await prisma.account.findUnique({
        where: { username: testEmail },
      });
      expect(account?.isActive).toBe(false);

      // Attempt to login with wrong password should still fail with activation error
      // This verifies that activation check happens before password check
      await expect(login(testEmail, 'wrongPassword')).rejects.toThrow(
        'Email confirmation required'
      );
    });

    it('should return proper error for invalid credentials on active account', async () => {
      // Register and activate account
      await register(testEmail, testPassword);
      await prisma.account.update({
        where: { username: testEmail },
        data: { isActive: true },
      });

      // Login with wrong password should fail with invalid credentials
      await expect(login(testEmail, 'wrongPassword')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should return proper error for non-existent account', async () => {
      // Login with non-existent account should fail
      await expect(login('nonexistent@example.com', testPassword)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });
});
