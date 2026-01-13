import * as fc from 'fast-check';
import { adminResetPassword } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { testEmailArbitrary } from '../helpers/testData';
import { hashPassword } from '../../services/auth';
import { ACCOUNT_ROLES } from '../../types/account';
import * as emailService from '../../services/email';

// Mock the email service
jest.mock('../../services/email');

/**
 * Feature: account-management, Property 21: Password reset token generation
 * Validates: Requirements 6.4
 * 
 * For any admin-initiated password reset, the system should generate a password 
 * reset token and send it to the account's email address.
 */

describe('Property-Based Test: Admin Password Reset Token Generation', () => {
  let testPasswordHash: string;

  beforeAll(async () => {
    // Pre-hash password once to avoid expensive bcrypt operations
    testPasswordHash = await hashPassword('TestPassword123!');
  });

  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('should generate a password reset token for any valid account', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('reset-gen'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          isActive: fc.boolean(),
        }),
        async ({ email, role, isActive }) => {
          let accountId: string | null = null;

          try {
            // Clear mocks before each property test iteration
            jest.clearAllMocks();

            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: isActive,
              },
            });
            accountId = account.id;

            // Admin initiates password reset
            const result = await adminResetPassword(account.id);

            // Property 1: The operation should succeed
            expect(result.success).toBe(true);

            // Property 2: A password reset token should be created in the database
            const tokens = await prisma.passwordResetToken.findMany({
              where: { accountId: account.id },
            });
            expect(tokens.length).toBeGreaterThan(0);

            // Property 3: The token should have an expiration date
            const token = tokens[0];
            expect(token.expiresAt).toBeDefined();
            expect(token.expiresAt).toBeInstanceOf(Date);

            // Property 4: The token should expire in the future (approximately 1 hour)
            const now = new Date();
            const expectedExpiration = new Date(now.getTime() + 60 * 60 * 1000);
            const timeDiff = Math.abs(token.expiresAt.getTime() - expectedExpiration.getTime());
            expect(timeDiff).toBeLessThan(5000); // Within 5 seconds

            // Property 5: The token should be associated with the correct account
            expect(token.accountId).toBe(account.id);

            // Property 6: An email should be sent to the account's email address
            const sendPasswordResetMock = emailService.sendPasswordReset as jest.Mock;
            expect(sendPasswordResetMock).toHaveBeenCalledTimes(1);
            expect(sendPasswordResetMock).toHaveBeenCalledWith(
              email,
              expect.any(String)
            );

            // Property 7: The token sent in the email should match the token in the database
            const emailToken = sendPasswordResetMock.mock.calls[0][1];
            expect(emailToken).toBe(token.token);
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.passwordResetToken.deleteMany({
                where: { accountId },
              });
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 60000);

  it('should generate unique tokens for multiple password resets', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('reset-unique'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          resetCount: fc.integer({ min: 2, max: 5 }),
        }),
        async ({ email, role, resetCount }) => {
          let accountId: string | null = null;

          try {
            // Clear mocks before each property test iteration
            jest.clearAllMocks();

            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Generate multiple password reset tokens
            for (let i = 0; i < resetCount; i++) {
              await adminResetPassword(account.id);
            }

            // Get all tokens from the database
            const allTokens = await prisma.passwordResetToken.findMany({
              where: { accountId: account.id },
            });

            // Property: All tokens should be in the database
            expect(allTokens.length).toBe(resetCount);

            // Property: All tokens should be unique
            const tokenStrings = allTokens.map(t => t.token);
            const uniqueTokens = new Set(tokenStrings);
            expect(uniqueTokens.size).toBe(resetCount);

            // Property: Each token should be sent via email
            const sendPasswordResetMock = emailService.sendPasswordReset as jest.Mock;
            expect(sendPasswordResetMock).toHaveBeenCalledTimes(resetCount);
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.passwordResetToken.deleteMany({
                where: { accountId },
              });
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 60000);

  it('should generate tokens for multiple accounts independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            email: testEmailArbitrary('reset-multi'),
            role: fc.constantFrom(...ACCOUNT_ROLES),
          }),
          { minLength: 2, maxLength: 5 }
        ).chain(specs => {
          // Ensure all emails are unique
          const uniqueEmails = new Set(specs.map(s => s.email));
          if (uniqueEmails.size !== specs.length) {
            // If duplicates exist, regenerate with unique emails
            return fc.array(
              fc.record({
                email: testEmailArbitrary('reset-multi'),
                role: fc.constantFrom(...ACCOUNT_ROLES),
              }),
              { minLength: 2, maxLength: 5 }
            ).filter(newSpecs => {
              const emails = newSpecs.map(s => s.email);
              return new Set(emails).size === emails.length;
            });
          }
          return fc.constant(specs);
        }),
        async (accountSpecs) => {
          const createdIds: string[] = [];

          try {
            // Clear mocks before each property test iteration
            jest.clearAllMocks();

            // Create all accounts
            const accounts = await Promise.all(
              accountSpecs.map(spec =>
                prisma.account.create({
                  data: {
                    username: spec.email,
                    passwordHash: testPasswordHash,
                    role: spec.role,
                    isActive: true,
                  },
                })
              )
            );
            createdIds.push(...accounts.map(a => a.id));

            // Generate password reset tokens for all accounts
            for (const account of accounts) {
              await adminResetPassword(account.id);
            }

            // Property: Each account should have exactly one token
            for (const account of accounts) {
              const tokens = await prisma.passwordResetToken.findMany({
                where: { accountId: account.id },
              });
              expect(tokens.length).toBe(1);
              expect(tokens[0].accountId).toBe(account.id);
            }

            // Property: All tokens should be unique across accounts
            const allTokens = await prisma.passwordResetToken.findMany({
              where: { accountId: { in: createdIds } },
            });
            const tokenStrings = allTokens.map(t => t.token);
            const uniqueTokens = new Set(tokenStrings);
            expect(uniqueTokens.size).toBe(accounts.length);

            // Property: Each account should receive an email
            const sendPasswordResetMock = emailService.sendPasswordReset as jest.Mock;
            expect(sendPasswordResetMock).toHaveBeenCalledTimes(accounts.length);

            // Property: Each email should be sent to the correct address
            for (let i = 0; i < accounts.length; i++) {
              const calls = sendPasswordResetMock.mock.calls;
              const emailsSent = calls.map(call => call[0]);
              expect(emailsSent).toContain(accountSpecs[i].email);
            }
          } finally {
            // Cleanup
            if (createdIds.length > 0) {
              await prisma.passwordResetToken.deleteMany({
                where: { accountId: { in: createdIds } },
              });
              await prisma.account.deleteMany({
                where: { id: { in: createdIds } },
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 60000);

  it('should reject password reset for non-existent accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (nonExistentId) => {
          // Ensure the account doesn't exist
          const existingAccount = await prisma.account.findUnique({
            where: { id: nonExistentId },
          });

          // Skip this test case if the UUID happens to exist
          if (existingAccount) {
            return;
          }

          // Property: Attempting to reset password for non-existent account should throw
          await expect(adminResetPassword(nonExistentId)).rejects.toThrow('User not found');

          // Property: No token should be created
          const tokens = await prisma.passwordResetToken.findMany({
            where: { accountId: nonExistentId },
          });
          expect(tokens.length).toBe(0);

          // Property: No email should be sent
          const sendPasswordResetMock = emailService.sendPasswordReset as jest.Mock;
          expect(sendPasswordResetMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  it('should generate valid tokens that can be verified', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('reset-verify'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
          let accountId: string | null = null;

          try {
            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Generate password reset token
            await adminResetPassword(account.id);

            // Get the token from the database
            const tokens = await prisma.passwordResetToken.findMany({
              where: { accountId: account.id },
            });
            expect(tokens.length).toBe(1);

            const token = tokens[0];

            // Property: The token should be verifiable (not expired)
            const now = new Date();
            expect(token.expiresAt.getTime()).toBeGreaterThan(now.getTime());

            // Property: The token should be a non-empty string
            expect(token.token).toBeTruthy();
            expect(typeof token.token).toBe('string');
            expect(token.token.length).toBeGreaterThan(0);

            // Property: The token should not be marked as used
            expect(token.usedAt).toBeNull();
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.passwordResetToken.deleteMany({
                where: { accountId },
              });
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  it('should preserve account data when generating password reset tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('reset-preserve'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          isActive: fc.boolean(),
        }),
        async ({ email, role, isActive }) => {
          let accountId: string | null = null;

          try {
            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: isActive,
              },
            });
            accountId = account.id;

            const originalPasswordHash = account.passwordHash;
            const originalCreatedAt = account.createdAt;

            // Generate password reset token
            await adminResetPassword(account.id);

            // Property: Account data should remain unchanged
            const updatedAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });

            expect(updatedAccount).not.toBeNull();
            expect(updatedAccount!.username).toBe(email);
            expect(updatedAccount!.passwordHash).toBe(originalPasswordHash);
            expect(updatedAccount!.role).toBe(role);
            expect(updatedAccount!.isActive).toBe(isActive);
            expect(updatedAccount!.createdAt.getTime()).toBe(originalCreatedAt.getTime());
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.passwordResetToken.deleteMany({
                where: { accountId },
              });
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);
});
