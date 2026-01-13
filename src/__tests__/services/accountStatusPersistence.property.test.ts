import * as fc from 'fast-check';
import { activateUser, deactivateUser, getUserById } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { testEmailArbitrary } from '../helpers/testData';
import { hashPassword } from '../../services/auth';
import { ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 26: Account activation and deactivation persistence
 * Validates: Requirements 12.1, 12.2
 * 
 * For any admin account activating or deactivating another account (not their own),
 * the system should persist the new active status to the database immediately and
 * reflect it in subsequent queries.
 */

describe('Property-Based Test: Account Status Persistence', () => {
  let testPasswordHash: string;
  let adminAccountId: string;

  beforeAll(async () => {
    // Pre-hash password once to avoid expensive bcrypt operations
    testPasswordHash = await hashPassword('TestPassword123!');
  });

  beforeEach(async () => {
    await cleanupTestDb();
    
    // Create an admin account for operations that require admin ID
    const adminAccount = await prisma.account.create({
      data: {
        username: 'admin@test.com',
        passwordHash: testPasswordHash,
        role: 'admin',
        isActive: true,
      },
    });
    adminAccountId = adminAccount.id;
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('should persist activation and reflect it in subsequent queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('status-activate'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
          let accountId: string | null = null;

          try {
            // Create an inactive account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: false,
              },
            });
            accountId = account.id;

            // Activate the account
            const activated = await activateUser(account.id);

            // Property 1: The activation function should return isActive: true
            expect(activated.isActive).toBe(true);
            expect(activated.id).toBe(account.id);

            // Property 2: The status should be persisted in the database
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.isActive).toBe(true);

            // Property 3: Subsequent queries should reflect the active status
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.isActive).toBe(true);

            // Property 4: The status should remain consistent across multiple reads
            const secondQuery = await getUserById(account.id);
            expect(secondQuery).not.toBeNull();
            expect(secondQuery!.isActive).toBe(true);

            // Property 5: Direct database query should also show active status
            const directDbQuery = await prisma.account.findUnique({
              where: { id: account.id },
              select: { isActive: true },
            });
            expect(directDbQuery).not.toBeNull();
            expect(directDbQuery!.isActive).toBe(true);
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

  it('should persist deactivation and reflect it in subsequent queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('status-deactivate'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
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

            // Deactivate the account (using admin ID to avoid self-deactivation check)
            const deactivated = await deactivateUser(account.id, adminAccountId);

            // Property 1: The deactivation function should return isActive: false
            expect(deactivated.isActive).toBe(false);
            expect(deactivated.id).toBe(account.id);

            // Property 2: The status should be persisted in the database
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.isActive).toBe(false);

            // Property 3: Subsequent queries should reflect the inactive status
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.isActive).toBe(false);

            // Property 4: The status should remain consistent across multiple reads
            const secondQuery = await getUserById(account.id);
            expect(secondQuery).not.toBeNull();
            expect(secondQuery!.isActive).toBe(false);

            // Property 5: Direct database query should also show inactive status
            const directDbQuery = await prisma.account.findUnique({
              where: { id: account.id },
              select: { isActive: true },
            });
            expect(directDbQuery).not.toBeNull();
            expect(directDbQuery!.isActive).toBe(false);
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

  it('should handle multiple sequential status changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('status-seq'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          statusSequence: fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }),
        }),
        async ({ email, role, statusSequence }) => {
          let accountId: string | null = null;

          try {
            // Create an account with the first status in the sequence
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: statusSequence[0],
              },
            });
            accountId = account.id;

            // Apply each status change in sequence
            for (let i = 1; i < statusSequence.length; i++) {
              const newStatus = statusSequence[i];

              // Update the status
              if (newStatus) {
                await activateUser(account.id);
              } else {
                await deactivateUser(account.id, adminAccountId);
              }

              // Verify persistence after each update
              const dbAccount = await prisma.account.findUnique({
                where: { id: account.id },
              });
              expect(dbAccount).not.toBeNull();
              expect(dbAccount!.isActive).toBe(newStatus);

              // Verify via service layer
              const queriedUser = await getUserById(account.id);
              expect(queriedUser).not.toBeNull();
              expect(queriedUser!.isActive).toBe(newStatus);
            }

            // Final verification: status should be the last in the sequence
            const finalUser = await getUserById(account.id);
            expect(finalUser).not.toBeNull();
            expect(finalUser!.isActive).toBe(statusSequence[statusSequence.length - 1]);
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

  it('should persist status changes independently for multiple accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            email: testEmailArbitrary('status-multi'),
            role: fc.constantFrom(...ACCOUNT_ROLES),
            initialStatus: fc.boolean(),
            newStatus: fc.boolean(),
          }),
          { minLength: 2, maxLength: 5 }
        ),
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
                    isActive: spec.initialStatus,
                  },
                })
              )
            );
            createdIds.push(...accounts.map(a => a.id));

            // Update each account's status
            for (let i = 0; i < accounts.length; i++) {
              if (accountSpecs[i].newStatus) {
                await activateUser(accounts[i].id);
              } else {
                await deactivateUser(accounts[i].id, adminAccountId);
              }
            }

            // Verify each account has the correct status
            for (let i = 0; i < accounts.length; i++) {
              const user = await getUserById(accounts[i].id);
              expect(user).not.toBeNull();
              expect(user!.isActive).toBe(accountSpecs[i].newStatus);

              // Also verify in database
              const dbAccount = await prisma.account.findUnique({
                where: { id: accounts[i].id },
              });
              expect(dbAccount).not.toBeNull();
              expect(dbAccount!.isActive).toBe(accountSpecs[i].newStatus);
            }

            // Verify no cross-contamination: each account should have its own status
            const allUsers = await Promise.all(
              accounts.map(a => getUserById(a.id))
            );
            for (let i = 0; i < allUsers.length; i++) {
              expect(allUsers[i]!.isActive).toBe(accountSpecs[i].newStatus);
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
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should handle idempotent status changes (activating already active account)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('status-idempotent-act'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
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

            // Activate an already active account (idempotent operation)
            const activated = await activateUser(account.id);

            // Property: Status should remain active
            expect(activated.isActive).toBe(true);

            // Verify persistence
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.isActive).toBe(true);

            // Verify via service layer
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.isActive).toBe(true);
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

  it('should handle idempotent status changes (deactivating already inactive account)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('status-idempotent-deact'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
          let accountId: string | null = null;

          try {
            // Create an inactive account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: false,
              },
            });
            accountId = account.id;

            // Deactivate an already inactive account (idempotent operation)
            const deactivated = await deactivateUser(account.id, adminAccountId);

            // Property: Status should remain inactive
            expect(deactivated.isActive).toBe(false);

            // Verify persistence
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.isActive).toBe(false);

            // Verify via service layer
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.isActive).toBe(false);
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

  it('should preserve other account fields when changing status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('status-preserve'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          initialStatus: fc.boolean(),
          newStatus: fc.boolean(),
        }),
        async ({ email, role, initialStatus, newStatus }) => {
          let accountId: string | null = null;

          try {
            // Create an account with specific properties
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: initialStatus,
              },
            });
            accountId = account.id;

            const originalCreatedAt = account.createdAt;
            const originalUsername = account.username;
            const originalRole = account.role;
            const originalPasswordHash = account.passwordHash;

            // Update the status
            if (newStatus) {
              await activateUser(account.id);
            } else {
              await deactivateUser(account.id, adminAccountId);
            }

            // Property: Other fields should remain unchanged
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.isActive).toBe(newStatus);
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

  it('should reject activation for non-existent accounts', async () => {
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

          // Property: Attempting to activate non-existent account should throw
          await expect(activateUser(nonExistentId)).rejects.toThrow('User not found');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should reject deactivation for non-existent accounts', async () => {
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

          // Property: Attempting to deactivate non-existent account should throw
          await expect(deactivateUser(nonExistentId, adminAccountId)).rejects.toThrow('User not found');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should handle activation and deactivation round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('status-roundtrip'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          initialStatus: fc.boolean(),
        }),
        async ({ email, role, initialStatus }) => {
          let accountId: string | null = null;

          try {
            // Create an account with initial status
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: initialStatus,
              },
            });
            accountId = account.id;

            // Perform round-trip: change status and change back
            if (initialStatus) {
              // Active -> Inactive -> Active
              await deactivateUser(account.id, adminAccountId);
              const afterDeactivate = await getUserById(account.id);
              expect(afterDeactivate!.isActive).toBe(false);

              await activateUser(account.id);
              const afterReactivate = await getUserById(account.id);
              expect(afterReactivate!.isActive).toBe(true);
            } else {
              // Inactive -> Active -> Inactive
              await activateUser(account.id);
              const afterActivate = await getUserById(account.id);
              expect(afterActivate!.isActive).toBe(true);

              await deactivateUser(account.id, adminAccountId);
              const afterDeactivate = await getUserById(account.id);
              expect(afterDeactivate!.isActive).toBe(false);
            }

            // Property: Final status should match initial status
            const finalAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(finalAccount).not.toBeNull();
            expect(finalAccount!.isActive).toBe(initialStatus);
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
