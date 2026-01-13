import * as fc from 'fast-check';
import { testEmailArbitrary } from '../helpers/testData';
import { deactivateUser, getUserById } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { hashPassword } from '../../services/auth';
import { ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 27: Self-deactivation prevention
 * Validates: Requirements 12.3
 * 
 * For any admin account attempting to deactivate their own account,
 * the system should reject the operation and return an error message.
 */

describe('Property-Based Test: Self-Deactivation Prevention', () => {
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

  it('should reject any admin attempting to deactivate their own account', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('self-deact'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          isActive: fc.boolean(),
        }),
        async ({ email, role, isActive }) => {
          let accountId: string | null = null;

          try {
            // Create an account with any role and any active status
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: isActive,
              },
            });
            accountId = account.id;

            // Property: Attempting to deactivate own account should always throw error
            await expect(
              deactivateUser(account.id, account.id)
            ).rejects.toThrow('Cannot deactivate your own account');

            // Property: Account status should remain unchanged after failed deactivation
            const accountAfterAttempt = await getUserById(account.id);
            expect(accountAfterAttempt).not.toBeNull();
            expect(accountAfterAttempt!.isActive).toBe(isActive);

            // Property: Database should also reflect unchanged status
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.isActive).toBe(isActive);
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

  it('should reject self-deactivation regardless of account role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('self-deact'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
          let accountId: string | null = null;

          try {
            // Create an active account with any role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Property: Self-deactivation should be rejected for all roles
            await expect(
              deactivateUser(account.id, account.id)
            ).rejects.toThrow('Cannot deactivate your own account');

            // Property: Account should remain active
            const accountAfterAttempt = await getUserById(account.id);
            expect(accountAfterAttempt).not.toBeNull();
            expect(accountAfterAttempt!.isActive).toBe(true);
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

  it('should allow admin to deactivate other accounts but not their own', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          adminEmail: testEmailArbitrary('self-deact'),
          targetEmail: testEmailArbitrary('self-deact'),
          targetRole: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ adminEmail, targetEmail, targetRole }) => {
          // Ensure emails are different
          fc.pre(adminEmail !== targetEmail);

          let adminId: string | null = null;
          let targetId: string | null = null;

          try {
            // Create admin account
            const admin = await prisma.account.create({
              data: {
                username: adminEmail,
                passwordHash: testPasswordHash,
                role: 'admin',
                isActive: true,
              },
            });
            adminId = admin.id;

            // Create target account
            const target = await prisma.account.create({
              data: {
                username: targetEmail,
                passwordHash: testPasswordHash,
                role: targetRole,
                isActive: true,
              },
            });
            targetId = target.id;

            // Property 1: Admin should NOT be able to deactivate their own account
            await expect(
              deactivateUser(admin.id, admin.id)
            ).rejects.toThrow('Cannot deactivate your own account');

            // Property 2: Admin should remain active after failed self-deactivation
            const adminAfterAttempt = await getUserById(admin.id);
            expect(adminAfterAttempt).not.toBeNull();
            expect(adminAfterAttempt!.isActive).toBe(true);

            // Property 3: Admin SHOULD be able to deactivate other accounts
            const deactivatedTarget = await deactivateUser(target.id, admin.id);
            expect(deactivatedTarget.isActive).toBe(false);

            // Property 4: Target account should be deactivated
            const targetAfterDeactivation = await getUserById(target.id);
            expect(targetAfterDeactivation).not.toBeNull();
            expect(targetAfterDeactivation!.isActive).toBe(false);

            // Property 5: Admin should still be active after deactivating another account
            const adminAfterDeactivatingOther = await getUserById(admin.id);
            expect(adminAfterDeactivatingOther).not.toBeNull();
            expect(adminAfterDeactivatingOther!.isActive).toBe(true);
          } finally {
            // Cleanup
            if (targetId) {
              await prisma.account.delete({
                where: { id: targetId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
            if (adminId) {
              await prisma.account.delete({
                where: { id: adminId },
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

  it('should reject multiple consecutive self-deactivation attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('self-deact'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          attemptCount: fc.integer({ min: 2, max: 5 }),
        }),
        async ({ email, role, attemptCount }) => {
          let accountId: string | null = null;

          try {
            // Create an active account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Property: Multiple self-deactivation attempts should all fail
            for (let i = 0; i < attemptCount; i++) {
              await expect(
                deactivateUser(account.id, account.id)
              ).rejects.toThrow('Cannot deactivate your own account');

              // Verify account remains active after each attempt
              const accountAfterAttempt = await getUserById(account.id);
              expect(accountAfterAttempt).not.toBeNull();
              expect(accountAfterAttempt!.isActive).toBe(true);
            }

            // Property: After all attempts, account should still be active
            const finalAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(finalAccount).not.toBeNull();
            expect(finalAccount!.isActive).toBe(true);
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

  it('should preserve all account fields when self-deactivation is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('self-deact'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          isActive: fc.boolean(),
        }),
        async ({ email, role, isActive }) => {
          let accountId: string | null = null;

          try {
            // Create an account with specific properties
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
            const originalPasswordHash = account.passwordHash;
            const originalIsActive = account.isActive;

            // Attempt self-deactivation
            await expect(
              deactivateUser(account.id, account.id)
            ).rejects.toThrow('Cannot deactivate your own account');

            // Property: All fields should remain unchanged after rejected deactivation
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.isActive).toBe(originalIsActive);
            expect(dbAccount!.username).toBe(originalUsername);
            expect(dbAccount!.role).toBe(originalRole);
            expect(dbAccount!.passwordHash).toBe(originalPasswordHash);
            expect(dbAccount!.createdAt.getTime()).toBe(originalCreatedAt.getTime());
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

  it('should provide clear error message for self-deactivation attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('self-deact'),
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

            // Property: Error message should be clear and specific
            try {
              await deactivateUser(account.id, account.id);
              // Should not reach here
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              const errorMessage = (error as Error).message;
              expect(errorMessage).toBe('Cannot deactivate your own account');
              // Verify message is clear and mentions "own account"
              expect(errorMessage.toLowerCase()).toContain('own');
              expect(errorMessage.toLowerCase()).toContain('account');
            }
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

  it('should reject self-deactivation even when account is already inactive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('self-deact'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
          let accountId: string | null = null;

          try {
            // Create an already inactive account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: false,
              },
            });
            accountId = account.id;

            // Property: Self-deactivation should be rejected even for inactive accounts
            await expect(
              deactivateUser(account.id, account.id)
            ).rejects.toThrow('Cannot deactivate your own account');

            // Property: Account should remain inactive (unchanged)
            const accountAfterAttempt = await getUserById(account.id);
            expect(accountAfterAttempt).not.toBeNull();
            expect(accountAfterAttempt!.isActive).toBe(false);
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
