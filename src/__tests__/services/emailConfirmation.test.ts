import {
  generateSecureToken,
  createEmailConfirmationToken,
  verifyEmailConfirmationToken,
  deleteEmailConfirmationTokens,
} from '../../services/auth';
import { cleanupTestDb, getTestDb } from '../helpers/testDb';
import { createTestAccount } from '../helpers/testData';

describe('Email Confirmation Token Management', () => {
  const prisma = getTestDb();

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  describe('generateSecureToken', () => {
    it('should generate a unique token', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should generate URL-safe tokens', () => {
      const token = generateSecureToken();
      // base64url format should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  describe('createEmailConfirmationToken', () => {
    it('should create a token with 24 hour expiration', async () => {
      const { account } = await createTestAccount(prisma, { username: 'test@example.com', password: 'password123' });
      
      const token = await createEmailConfirmationToken(account.id);

      expect(token).toBeTruthy();

      // Verify token was stored in database
      const storedToken = await prisma.emailConfirmationToken.findUnique({
        where: { token },
      });

      expect(storedToken).toBeTruthy();
      expect(storedToken!.accountId).toBe(account.id);
      expect(storedToken!.token).toBe(token);

      // Verify expiration is approximately 24 hours from now
      const now = new Date();
      const expectedExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(storedToken!.expiresAt.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should create unique tokens for multiple calls', async () => {
      const { account } = await createTestAccount(prisma, { username: 'test@example.com', password: 'password123' });
      
      const token1 = await createEmailConfirmationToken(account.id);
      const token2 = await createEmailConfirmationToken(account.id);

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyEmailConfirmationToken', () => {
    it('should return account ID for valid token', async () => {
      const { account } = await createTestAccount(prisma, { username: 'test@example.com', password: 'password123' });
      const token = await createEmailConfirmationToken(account.id);

      const accountId = await verifyEmailConfirmationToken(token);

      expect(accountId).toBe(account.id);
    });

    it('should return null for non-existent token', async () => {
      const accountId = await verifyEmailConfirmationToken('invalid-token');

      expect(accountId).toBeNull();
    });

    it('should return null for expired token', async () => {
      const { account } = await createTestAccount(prisma, { username: 'test@example.com', password: 'password123' });
      
      // Create token with past expiration
      const token = generateSecureToken();
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1); // 1 hour ago

      await prisma.emailConfirmationToken.create({
        data: {
          accountId: account.id,
          token,
          expiresAt: expiredDate,
        },
      });

      const accountId = await verifyEmailConfirmationToken(token);

      expect(accountId).toBeNull();
    });
  });

  describe('deleteEmailConfirmationTokens', () => {
    it('should delete all tokens for an account', async () => {
      const { account } = await createTestAccount(prisma, { username: 'test@example.com', password: 'password123' });
      
      // Create multiple tokens
      const token1 = await createEmailConfirmationToken(account.id);
      const token2 = await createEmailConfirmationToken(account.id);

      // Verify tokens exist
      let tokens = await prisma.emailConfirmationToken.findMany({
        where: { accountId: account.id },
      });
      expect(tokens.length).toBe(2);

      // Delete tokens
      await deleteEmailConfirmationTokens(account.id);

      // Verify tokens are deleted
      tokens = await prisma.emailConfirmationToken.findMany({
        where: { accountId: account.id },
      });
      expect(tokens.length).toBe(0);
    });

    it('should not affect tokens for other accounts', async () => {
      const { account: account1 } = await createTestAccount(prisma, { username: 'test1@example.com', password: 'password123' });
      const { account: account2 } = await createTestAccount(prisma, { username: 'test2@example.com', password: 'password123' });
      
      const token1 = await createEmailConfirmationToken(account1.id);
      const token2 = await createEmailConfirmationToken(account2.id);

      // Delete tokens for account1
      await deleteEmailConfirmationTokens(account1.id);

      // Verify account1 tokens are deleted
      const tokens1 = await prisma.emailConfirmationToken.findMany({
        where: { accountId: account1.id },
      });
      expect(tokens1.length).toBe(0);

      // Verify account2 tokens still exist
      const tokens2 = await prisma.emailConfirmationToken.findMany({
        where: { accountId: account2.id },
      });
      expect(tokens2.length).toBe(1);
    });
  });
});
