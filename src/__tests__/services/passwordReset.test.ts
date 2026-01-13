import {
  generateSecureToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from '../../services/auth';
import { cleanupTestDb, getTestDb } from '../helpers/testDb';
import { createTestAccount } from '../helpers/testData';
import * as emailService from '../../services/email';

// Mock the email service
jest.mock('../../services/email');

describe('Password Reset Token Management', () => {
  const prisma = getTestDb();

  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  describe('createPasswordResetToken', () => {
    it('should create a token with 1 hour expiration', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });

      const token = await createPasswordResetToken(account.id);

      expect(token).toBeTruthy();

      // Verify token was stored in database
      const storedToken = await prisma.passwordResetToken.findUnique({
        where: { token },
      });

      expect(storedToken).toBeTruthy();
      expect(storedToken!.accountId).toBe(account.id);
      expect(storedToken!.token).toBe(token);
      expect(storedToken!.usedAt).toBeNull();

      // Verify expiration is approximately 1 hour from now
      const now = new Date();
      const expectedExpiration = new Date(now.getTime() + 60 * 60 * 1000);
      const timeDiff = Math.abs(storedToken!.expiresAt.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should create unique tokens for multiple calls', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });

      const token1 = await createPasswordResetToken(account.id);
      const token2 = await createPasswordResetToken(account.id);

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should return account ID for valid token', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });
      const token = await createPasswordResetToken(account.id);

      const accountId = await verifyPasswordResetToken(token);

      expect(accountId).toBe(account.id);
    });

    it('should return null for non-existent token', async () => {
      const accountId = await verifyPasswordResetToken('invalid-token');

      expect(accountId).toBeNull();
    });

    it('should return null for expired token', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });

      // Create token with past expiration
      const token = generateSecureToken();
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2); // 2 hours ago

      await prisma.passwordResetToken.create({
        data: {
          accountId: account.id,
          token,
          expiresAt: expiredDate,
        },
      });

      const accountId = await verifyPasswordResetToken(token);

      expect(accountId).toBeNull();
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email for existing account', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });

      const sendPasswordResetMock = emailService.sendPasswordReset as jest.Mock;

      const result = await requestPasswordReset(account.username);

      expect(result.success).toBe(true);
      expect(sendPasswordResetMock).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetMock).toHaveBeenCalledWith(
        account.username,
        expect.any(String),
        expect.any(String) // language parameter
      );
    });

    it('should return success for non-existent account to prevent enumeration', async () => {
      const sendPasswordResetMock = emailService.sendPasswordReset as jest.Mock;

      const result = await requestPasswordReset('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(sendPasswordResetMock).not.toHaveBeenCalled();
    });

    it('should create password reset token for existing account', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });

      await requestPasswordReset(account.username);

      const tokens = await prisma.passwordResetToken.findMany({
        where: { accountId: account.id },
      });

      expect(tokens).toHaveLength(1);
      expect(tokens[0].expiresAt).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'oldPassword123',
      });

      const token = await createPasswordResetToken(account.id);
      const newPassword = 'newPassword456';

      const result = await resetPassword(token, newPassword, newPassword);

      expect(result.success).toBe(true);

      // Verify password was updated by checking we can't find the token anymore
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token },
      });
      expect(tokenRecord).toBeNull();
    });

    it('should reject password reset with invalid token', async () => {
      await expect(
        resetPassword('invalid-token', 'newPassword123', 'newPassword123')
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should reject password reset with expired token', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });

      // Create expired token
      const token = generateSecureToken();
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);

      await prisma.passwordResetToken.create({
        data: {
          accountId: account.id,
          token,
          expiresAt: expiredDate,
        },
      });

      await expect(
        resetPassword(token, 'newPassword123', 'newPassword123')
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should reject password that is too short', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });

      const token = await createPasswordResetToken(account.id);

      await expect(
        resetPassword(token, 'short', 'short')
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject when password and confirmation do not match', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });

      const token = await createPasswordResetToken(account.id);

      await expect(
        resetPassword(token, 'newPassword123', 'differentPassword456')
      ).rejects.toThrow('Password and confirmation do not match');
    });

    it('should delete token after successful password reset', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'password123',
      });

      const token = await createPasswordResetToken(account.id);

      await resetPassword(token, 'newPassword123', 'newPassword123');

      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token },
      });

      expect(tokenRecord).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      const oldPassword = 'oldPassword123';
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: oldPassword,
      });

      const newPassword = 'newPassword456';

      const result = await changePassword(
        account.id,
        oldPassword,
        newPassword,
        newPassword
      );

      expect(result.success).toBe(true);
    });

    it('should reject change with incorrect current password', async () => {
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: 'correctPassword123',
      });

      await expect(
        changePassword(
          account.id,
          'wrongPassword',
          'newPassword123',
          'newPassword123'
        )
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should reject new password that is too short', async () => {
      const oldPassword = 'oldPassword123';
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: oldPassword,
      });

      await expect(
        changePassword(account.id, oldPassword, 'short', 'short')
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject when new password and confirmation do not match', async () => {
      const oldPassword = 'oldPassword123';
      const { account } = await createTestAccount(prisma, {
        username: 'test@example.com',
        password: oldPassword,
      });

      await expect(
        changePassword(
          account.id,
          oldPassword,
          'newPassword123',
          'differentPassword456'
        )
      ).rejects.toThrow('Password and confirmation do not match');
    });

    it('should reject for non-existent account', async () => {
      // Use a valid UUID format that doesn't exist
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        changePassword(
          nonExistentId,
          'oldPassword123',
          'newPassword123',
          'newPassword123'
        )
      ).rejects.toThrow('Account not found');
    });
  });
});
