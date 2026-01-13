import * as fc from 'fast-check';
import { setUserPassword } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { testEmailArbitrary } from '../helpers/testData';
import { hashPassword, verifyPassword } from '../../services/auth';
import { ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 23: Direct password setting without email
 * Validates: Requirements 11.1, 11.2, 11.3
 * 
 * For any admin account setting a password for another account with a valid password,
 * the system should hash and persist the password immediately, return success confirmation,
 * and not send any email notification.
 */

describe('Property-Based Test: Direct Password Setting', () => {
  let testPasswordHash: string;

  beforeAll(async () => {
    // Pre-hash password once to avoid expensive bcrypt operations
    testPasswordHash = await hashPassword('TestPassword123!');
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('should set password directly for any valid account with valid password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-direct'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          isActive: fc.boolean(),
          newPassword: fc.string({ minLength: 8, maxLength: 50 }),
        }),
        async ({ email, role, isActive, newPassword }) => {
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

            // Set new password directly
            const result = await setUserPassword(account.id, newPassword);

            // Property 1: The operation should return success
            expect(result.success).toBe(true);
            expect(result.message).toBe('Password updated successfully');

            // Property 2: The password should be persisted to the database
            const updatedAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(updatedAccount).not.toBeNull();

            // Property 3: The password should be hashed (not stored in plain text)
            expect(updatedAccount!.passwordHash).not.toBe(newPassword);
            expect(updatedAccount!.passwordHash).not.toBe(originalPasswordHash);
            expect(updatedAccount!.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash format

            // Property 4: The new password should be verifiable
            const passwordValid = await verifyPassword(newPassword, updatedAccount!.passwordHash);
            expect(passwordValid).toBe(true);

            // Property 5: The old password should no longer work
            const oldPasswordValid = await verifyPassword('TestPassword123!', updatedAccount!.passwordHash);
            expect(oldPasswordValid).toBe(false);

            // Property 6: No password reset token should be created
            const tokens = await prisma.passwordResetToken.findMany({
              where: { accountId: account.id },
            });
            expect(tokens.length).toBe(0);

            // Property 7: Other account fields should remain unchanged
            expect(updatedAccount!.username).toBe(email);
            expect(updatedAccount!.role).toBe(role);
            expect(updatedAccount!.isActive).toBe(isActive);
            expect(updatedAccount!.createdAt.getTime()).toBe(account.createdAt.getTime());
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should reject passwords shorter than 8 characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-short'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          shortPassword: fc.string({ minLength: 0, maxLength: 7 }),
        }),
        async ({ email, role, shortPassword }) => {
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

            const originalPasswordHash = account.passwordHash;

            // Attempt to set short password
            await expect(setUserPassword(account.id, shortPassword)).rejects.toThrow(
              'Password must be at least 8 characters'
            );

            // Property: Original password should remain unchanged
            const unchangedAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(unchangedAccount).not.toBeNull();
            expect(unchangedAccount!.passwordHash).toBe(originalPasswordHash);

            // Property: No password reset token should be created
            const tokens = await prisma.passwordResetToken.findMany({
              where: { accountId: account.id },
            });
            expect(tokens.length).toBe(0);
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should set passwords independently for multiple accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            email: testEmailArbitrary('pwd-multi'),
            role: fc.constantFrom(...ACCOUNT_ROLES),
            newPassword: fc.string({ minLength: 8, maxLength: 50 }),
          }),
          { minLength: 2, maxLength: 3 }
        ).chain(specs => {
          // Ensure all emails are unique
          const uniqueEmails = new Set(specs.map(s => s.email));
          if (uniqueEmails.size !== specs.length) {
            // If duplicates exist, regenerate with unique emails
            return fc.array(
              fc.record({
                email: testEmailArbitrary('pwd-multi'),
                role: fc.constantFrom(...ACCOUNT_ROLES),
                newPassword: fc.string({ minLength: 8, maxLength: 50 }),
              }),
              { minLength: 2, maxLength: 3 }
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

            // Set passwords for all accounts
            for (let i = 0; i < accounts.length; i++) {
              const result = await setUserPassword(accounts[i].id, accountSpecs[i].newPassword);
              expect(result.success).toBe(true);
            }

            // Verify each account has the correct password
            for (let i = 0; i < accounts.length; i++) {
              const account = await prisma.account.findUnique({
                where: { id: accounts[i].id },
              });
              expect(account).not.toBeNull();

              // Verify the new password works
              const passwordValid = await verifyPassword(
                accountSpecs[i].newPassword,
                account!.passwordHash
              );
              expect(passwordValid).toBe(true);

              // Verify the old password doesn't work
              const oldPasswordValid = await verifyPassword(
                'TestPassword123!',
                account!.passwordHash
              );
              expect(oldPasswordValid).toBe(false);
            }

            // Property: No password reset tokens should be created for any account
            const allTokens = await prisma.passwordResetToken.findMany({
              where: { accountId: { in: createdIds } },
            });
            expect(allTokens.length).toBe(0);
          } finally {
            // Cleanup
            if (createdIds.length > 0) {
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

  it('should handle multiple password changes for the same account', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-seq'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          passwordSequence: fc.array(
            fc.string({ minLength: 8, maxLength: 50 }),
            { minLength: 2, maxLength: 3 }
          ),
        }),
        async ({ email, role, passwordSequence }) => {
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

            // Apply each password change in sequence
            for (let i = 0; i < passwordSequence.length; i++) {
              const newPassword = passwordSequence[i];

              // Set the password
              const result = await setUserPassword(account.id, newPassword);
              expect(result.success).toBe(true);

              // Verify the password was updated
              const updatedAccount = await prisma.account.findUnique({
                where: { id: account.id },
              });
              expect(updatedAccount).not.toBeNull();

              // Verify the current password works
              const currentPasswordValid = await verifyPassword(
                newPassword,
                updatedAccount!.passwordHash
              );
              expect(currentPasswordValid).toBe(true);

              // Only verify the most recent previous password doesn't work (to save time)
              if (i > 0) {
                const previousPasswordValid = await verifyPassword(
                  passwordSequence[i - 1],
                  updatedAccount!.passwordHash
                );
                expect(previousPasswordValid).toBe(false);
              }
            }

            // Final verification: only the last password should work
            const finalAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(finalAccount).not.toBeNull();

            const lastPassword = passwordSequence[passwordSequence.length - 1];
            const lastPasswordValid = await verifyPassword(
              lastPassword,
              finalAccount!.passwordHash
            );
            expect(lastPasswordValid).toBe(true);

            // Property: No password reset tokens should be created
            const tokens = await prisma.passwordResetToken.findMany({
              where: { accountId: account.id },
            });
            expect(tokens.length).toBe(0);
          } finally {
            // Cleanup
            if (accountId) {
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

  it('should reject password setting for non-existent accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nonExistentId: fc.uuid(),
          password: fc.string({ minLength: 8, maxLength: 50 }),
        }),
        async ({ nonExistentId, password }) => {
          // Ensure the account doesn't exist
          const existingAccount = await prisma.account.findUnique({
            where: { id: nonExistentId },
          });

          // Skip this test case if the UUID happens to exist
          if (existingAccount) {
            return;
          }

          // Property: Attempting to set password for non-existent account should throw
          await expect(setUserPassword(nonExistentId, password)).rejects.toThrow('User not found');

          // Property: No password reset token should be created
          const tokens = await prisma.passwordResetToken.findMany({
            where: { accountId: nonExistentId },
          });
          expect(tokens.length).toBe(0);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should generate unique password hashes for the same password across different accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          password: fc.string({ minLength: 8, maxLength: 50 }),
          accountCount: fc.integer({ min: 2, max: 3 }),
        }),
        async ({ password, accountCount }) => {
          const createdIds: string[] = [];

          try {
            // Create multiple accounts
            const accounts = await Promise.all(
              Array.from({ length: accountCount }, (_, i) =>
                prisma.account.create({
                  data: {
                    username: `user${i}-${Date.now()}@example.com`,
                    passwordHash: testPasswordHash,
                    role: 'account_owner',
                    isActive: true,
                  },
                })
              )
            );
            createdIds.push(...accounts.map(a => a.id));

            // Set the same password for all accounts
            for (const account of accounts) {
              await setUserPassword(account.id, password);
            }

            // Retrieve all accounts
            const updatedAccounts = await prisma.account.findMany({
              where: { id: { in: createdIds } },
            });

            // Property: All password hashes should be unique (bcrypt uses salt)
            const passwordHashes = updatedAccounts.map(a => a.passwordHash);
            const uniqueHashes = new Set(passwordHashes);
            expect(uniqueHashes.size).toBe(accountCount);

            // Property: All accounts should be able to authenticate with the same password
            for (const account of updatedAccounts) {
              const passwordValid = await verifyPassword(password, account.passwordHash);
              expect(passwordValid).toBe(true);
            }
          } finally {
            // Cleanup
            if (createdIds.length > 0) {
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

  it('should preserve account metadata when setting password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-meta'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          isActive: fc.boolean(),
          newPassword: fc.string({ minLength: 8, maxLength: 50 }),
        }),
        async ({ email, role, isActive, newPassword }) => {
          let accountId: string | null = null;

          try {
            // Create an account with specific metadata
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: isActive,
              },
            });
            accountId = account.id;

            const originalCreatedAt = account.createdAt;
            const originalUsername = account.username;
            const originalRole = account.role;
            const originalIsActive = account.isActive;

            // Set new password
            await setUserPassword(account.id, newPassword);

            // Property: All metadata should remain unchanged
            const updatedAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(updatedAccount).not.toBeNull();
            expect(updatedAccount!.username).toBe(originalUsername);
            expect(updatedAccount!.role).toBe(originalRole);
            expect(updatedAccount!.isActive).toBe(originalIsActive);
            expect(updatedAccount!.createdAt.getTime()).toBe(originalCreatedAt.getTime());

            // Property: Only the password hash should change
            expect(updatedAccount!.passwordHash).not.toBe(testPasswordHash);
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});
