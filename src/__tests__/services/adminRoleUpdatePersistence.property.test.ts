import * as fc from 'fast-check';
import { updateUserRole, getUserById } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { testEmailArbitrary } from '../helpers/testData';
import { hashPassword } from '../../services/auth';
import { ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 9: Admin role update persistence
 * Validates: Requirements 6.2
 * 
 * For any valid role update performed by an admin account, the new role should be 
 * persisted to the database and reflected in subsequent queries.
 */

describe('Property-Based Test: Admin Role Update Persistence', () => {
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

  it('should persist role updates and reflect them in subsequent queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random initial and target roles
        fc.record({
          initialRole: fc.constantFrom(...ACCOUNT_ROLES),
          newRole: fc.constantFrom(...ACCOUNT_ROLES),
          email: testEmailArbitrary('role-persist'),
        }),
        async ({ initialRole, newRole, email }) => {
          let accountId: string | null = null;

          try {
            // Create an account with initial role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: initialRole,
                isActive: true,
              },
            });
            accountId = account.id;

            // Update the role
            const updated = await updateUserRole(account.id, newRole);

            // Property 1: The update function should return the new role
            expect(updated.role).toBe(newRole);
            expect(updated.id).toBe(account.id);

            // Property 2: The role should be persisted in the database
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.role).toBe(newRole);

            // Property 3: Subsequent queries should reflect the new role
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.role).toBe(newRole);

            // Property 4: The role should remain consistent across multiple reads
            const secondQuery = await getUserById(account.id);
            expect(secondQuery).not.toBeNull();
            expect(secondQuery!.role).toBe(newRole);

            // Property 5: Direct database query should also show the new role
            const directDbQuery = await prisma.account.findUnique({
              where: { id: account.id },
              select: { role: true },
            });
            expect(directDbQuery).not.toBeNull();
            expect(directDbQuery!.role).toBe(newRole);
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

  it('should persist role updates for multiple sequential changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of role changes
        fc.record({
          email: testEmailArbitrary('role-seq'),
          roleSequence: fc.array(fc.constantFrom(...ACCOUNT_ROLES), { minLength: 2, maxLength: 5 }),
        }),
        async ({ email, roleSequence }) => {
          let accountId: string | null = null;

          try {
            // Create an account with the first role in the sequence
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: roleSequence[0],
                isActive: true,
              },
            });
            accountId = account.id;

            // Apply each role change in sequence
            for (let i = 1; i < roleSequence.length; i++) {
              const newRole = roleSequence[i];

              // Update the role
              await updateUserRole(account.id, newRole);

              // Verify persistence after each update
              const dbAccount = await prisma.account.findUnique({
                where: { id: account.id },
              });
              expect(dbAccount).not.toBeNull();
              expect(dbAccount!.role).toBe(newRole);

              // Verify via service layer
              const queriedUser = await getUserById(account.id);
              expect(queriedUser).not.toBeNull();
              expect(queriedUser!.role).toBe(newRole);
            }

            // Final verification: role should be the last in the sequence
            const finalUser = await getUserById(account.id);
            expect(finalUser).not.toBeNull();
            expect(finalUser!.role).toBe(roleSequence[roleSequence.length - 1]);
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

  it('should persist role updates independently for multiple accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple accounts with role updates
        fc.array(
          fc.record({
            email: testEmailArbitrary('role-multi'),
            initialRole: fc.constantFrom(...ACCOUNT_ROLES),
            newRole: fc.constantFrom(...ACCOUNT_ROLES),
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
                    role: spec.initialRole,
                    isActive: true,
                  },
                })
              )
            );
            createdIds.push(...accounts.map(a => a.id));

            // Update each account's role
            for (let i = 0; i < accounts.length; i++) {
              await updateUserRole(accounts[i].id, accountSpecs[i].newRole);
            }

            // Verify each account has the correct role
            for (let i = 0; i < accounts.length; i++) {
              const user = await getUserById(accounts[i].id);
              expect(user).not.toBeNull();
              expect(user!.role).toBe(accountSpecs[i].newRole);

              // Also verify in database
              const dbAccount = await prisma.account.findUnique({
                where: { id: accounts[i].id },
              });
              expect(dbAccount).not.toBeNull();
              expect(dbAccount!.role).toBe(accountSpecs[i].newRole);
            }

            // Verify no cross-contamination: each account should have its own role
            const allUsers = await Promise.all(
              accounts.map(a => getUserById(a.id))
            );
            for (let i = 0; i < allUsers.length; i++) {
              expect(allUsers[i]!.role).toBe(accountSpecs[i].newRole);
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

  it('should handle idempotent role updates (updating to same role)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('role-idempotent'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
          let accountId: string | null = null;

          try {
            // Create an account with a specific role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Update to the same role (idempotent operation)
            const updated = await updateUserRole(account.id, role);

            // Property: Role should remain the same
            expect(updated.role).toBe(role);

            // Verify persistence
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.role).toBe(role);

            // Verify via service layer
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.role).toBe(role);
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

  it('should reject invalid roles and not persist them', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('role-invalid'),
          initialRole: fc.constantFrom(...ACCOUNT_ROLES),
          invalidRole: fc.string().filter(s => !ACCOUNT_ROLES.includes(s as any)),
        }),
        async ({ email, initialRole, invalidRole }) => {
          let accountId: string | null = null;

          try {
            // Create an account with initial role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: initialRole,
                isActive: true,
              },
            });
            accountId = account.id;

            // Attempt to update to invalid role
            await expect(updateUserRole(account.id, invalidRole)).rejects.toThrow();

            // Property: Original role should be preserved after failed update
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.role).toBe(initialRole);

            // Verify via service layer
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.role).toBe(initialRole);
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

  it('should preserve other account fields when updating role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('role-preserve'),
          initialRole: fc.constantFrom(...ACCOUNT_ROLES),
          newRole: fc.constantFrom(...ACCOUNT_ROLES),
          isActive: fc.boolean(),
        }),
        async ({ email, initialRole, newRole, isActive }) => {
          let accountId: string | null = null;

          try {
            // Create an account with specific properties
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: initialRole,
                isActive: isActive,
              },
            });
            accountId = account.id;

            const originalCreatedAt = account.createdAt;
            const originalUsername = account.username;
            const originalPasswordHash = account.passwordHash;

            // Update the role
            await updateUserRole(account.id, newRole);

            // Property: Other fields should remain unchanged
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.role).toBe(newRole);
            expect(dbAccount!.username).toBe(originalUsername);
            expect(dbAccount!.passwordHash).toBe(originalPasswordHash);
            expect(dbAccount!.isActive).toBe(isActive);
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
});
