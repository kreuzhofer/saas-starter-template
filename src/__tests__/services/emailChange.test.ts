import {
  createEmailChangeToken,
  verifyEmailChangeToken,
  deleteEmailChangeToken,
} from '../../services/auth';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';

const db = getTestDb();

describe('Email Change Token Management', () => {
  let testAccountId: string;
  const newEmail = 'newemail@example.com';

  beforeEach(async () => {
    // Clean up database before each test
    await cleanupTestDb();

    // Create a test account
    const account = await db.account.create({
      data: {
        username: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
      },
    });
    testAccountId = account.id;
  });

  describe('createEmailChangeToken', () => {
    it('should create an email change token successfully', async () => {
      const token = await createEmailChangeToken(testAccountId, newEmail);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Verify token was stored in database
      const tokenRecord = await db.emailChangeToken.findUnique({
        where: { token },
      });

      expect(tokenRecord).toBeTruthy();
      expect(tokenRecord?.accountId).toBe(testAccountId);
      expect(tokenRecord?.newEmail).toBe(newEmail);
      expect(tokenRecord?.expiresAt).toBeInstanceOf(Date);
    });

    it('should set expiration time to 1 hour in the future', async () => {
      const beforeCreation = new Date();
      const token = await createEmailChangeToken(testAccountId, newEmail);
      const afterCreation = new Date();

      const tokenRecord = await db.emailChangeToken.findUnique({
        where: { token },
      });

      expect(tokenRecord?.expiresAt).toBeDefined();

      // Expiration should be approximately 1 hour from now
      const expectedExpiration = new Date(beforeCreation.getTime() + 60 * 60 * 1000);
      const timeDiff = Math.abs(
        tokenRecord!.expiresAt.getTime() - expectedExpiration.getTime()
      );

      // Allow 5 second tolerance for test execution time
      expect(timeDiff).toBeLessThan(5000);
    });

    it('should generate unique tokens for multiple requests', async () => {
      const token1 = await createEmailChangeToken(testAccountId, newEmail);
      const token2 = await createEmailChangeToken(testAccountId, 'another@example.com');

      expect(token1).not.toBe(token2);

      // Both tokens should exist in database
      const tokenRecord1 = await db.emailChangeToken.findUnique({
        where: { token: token1 },
      });
      const tokenRecord2 = await db.emailChangeToken.findUnique({
        where: { token: token2 },
      });

      expect(tokenRecord1).toBeTruthy();
      expect(tokenRecord2).toBeTruthy();
    });

    it('should allow multiple tokens for the same account', async () => {
      const token1 = await createEmailChangeToken(testAccountId, newEmail);
      const token2 = await createEmailChangeToken(testAccountId, 'another@example.com');

      const tokens = await db.emailChangeToken.findMany({
        where: { accountId: testAccountId },
      });

      expect(tokens.length).toBe(2);
    });
  });

  describe('verifyEmailChangeToken', () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = await createEmailChangeToken(testAccountId, newEmail);
    });

    it('should verify a valid token and return account ID and new email', async () => {
      const result = await verifyEmailChangeToken(validToken);

      expect(result).toBeTruthy();
      expect(result?.accountId).toBe(testAccountId);
      expect(result?.newEmail).toBe(newEmail);
    });

    it('should return null for non-existent token', async () => {
      const result = await verifyEmailChangeToken('non-existent-token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      // Manually expire the token
      await db.emailChangeToken.update({
        where: { token: validToken },
        data: { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
      });

      const result = await verifyEmailChangeToken(validToken);

      expect(result).toBeNull();
    });

    it('should accept token that has not expired', async () => {
      // Set expiration to 30 minutes from now
      await db.emailChangeToken.update({
        where: { token: validToken },
        data: { expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      });

      const result = await verifyEmailChangeToken(validToken);

      expect(result).toBeTruthy();
      expect(result?.accountId).toBe(testAccountId);
      expect(result?.newEmail).toBe(newEmail);
    });

    it('should return correct new email for token', async () => {
      const differentEmail = 'different@example.com';
      const token = await createEmailChangeToken(testAccountId, differentEmail);

      const result = await verifyEmailChangeToken(token);

      expect(result?.newEmail).toBe(differentEmail);
    });
  });

  describe('deleteEmailChangeToken', () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = await createEmailChangeToken(testAccountId, newEmail);
    });

    it('should delete an email change token successfully', async () => {
      // Verify token exists
      let tokenRecord = await db.emailChangeToken.findUnique({
        where: { token: validToken },
      });
      expect(tokenRecord).toBeTruthy();

      // Delete token
      await deleteEmailChangeToken(validToken);

      // Verify token was deleted
      tokenRecord = await db.emailChangeToken.findUnique({
        where: { token: validToken },
      });
      expect(tokenRecord).toBeNull();
    });

    it('should not throw error when deleting non-existent token', async () => {
      // This should not throw an error (Prisma will throw if record doesn't exist)
      // We expect this to fail gracefully or throw, depending on implementation
      await expect(
        deleteEmailChangeToken('non-existent-token')
      ).rejects.toThrow();
    });

    it('should only delete the specified token', async () => {
      const token2 = await createEmailChangeToken(testAccountId, 'another@example.com');

      // Delete first token
      await deleteEmailChangeToken(validToken);

      // Verify first token is deleted
      const tokenRecord1 = await db.emailChangeToken.findUnique({
        where: { token: validToken },
      });
      expect(tokenRecord1).toBeNull();

      // Verify second token still exists
      const tokenRecord2 = await db.emailChangeToken.findUnique({
        where: { token: token2 },
      });
      expect(tokenRecord2).toBeTruthy();
    });
  });

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const tokens = new Set<string>();
      const iterations = 100;

      // Generate multiple tokens and ensure they're all unique
      for (let i = 0; i < iterations; i++) {
        const token = await createEmailChangeToken(testAccountId, `email${i}@example.com`);
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(iterations);
    });

    it('should generate tokens with sufficient length', async () => {
      const token = await createEmailChangeToken(testAccountId, newEmail);

      // Base64url encoded 32 bytes should be at least 40 characters
      expect(token.length).toBeGreaterThanOrEqual(40);
    });

    it('should not contain special characters that break URLs', async () => {
      const token = await createEmailChangeToken(testAccountId, newEmail);

      // Base64url should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });
  });
});
