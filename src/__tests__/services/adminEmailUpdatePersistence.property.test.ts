import * as fc from 'fast-check';
import { updateUserEmail, getUserById } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { testEmailArbitrary } from '../helpers/testData';
import { hashPassword } from '../../services/auth';
import { ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 10: Admin email update persistence
 * Validates: Requirements 6.3
 * 
 * For any email update performed by an admin account, the new email should be 
 * persisted as the username and reflected in subsequent queries.
 */

describe('Property-Based Test: Admin Email Update Persistence', () => {
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

  it('should persist email updates and reflect them in subsequent queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random initial and new email addresses
        fc.record({
          initialEmail: testEmailArbitrary('email-init'),
          newEmail: testEmailArbitrary('email-new'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ initialEmail, newEmail, role }) => {
          let accountId: string | null = null;

          try {
            // Create an account with initial email
            const account = await prisma.account.create({
              data: {
                username: initialEmail,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Update the email
            const updated = await updateUserEmail(account.id, newEmail);

            // Property 1: The update function should return the new email
            expect(updated.username).toBe(newEmail);
            expect(updated.id).toBe(account.id);

            // Property 2: The email should be persisted in the database
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.username).toBe(newEmail);

            // Property 3: Subsequent queries should reflect the new email
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.username).toBe(newEmail);

            // Property 4: The email should remain consistent across multiple reads
            const secondQuery = await getUserById(account.id);
            expect(secondQuery).not.toBeNull();
            expect(secondQuery!.username).toBe(newEmail);

            // Property 5: Direct database query should also show the new email
            const directDbQuery = await prisma.account.findUnique({
              where: { id: account.id },
              select: { username: true },
            });
            expect(directDbQuery).not.toBeNull();
            expect(directDbQuery!.username).toBe(newEmail);

            // Property 6: Should be able to find account by new email
            const accountByEmail = await prisma.account.findUnique({
              where: { username: newEmail },
            });
            expect(accountByEmail).not.toBeNull();
            expect(accountByEmail!.id).toBe(account.id);
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

  it('should persist email updates for multiple sequential changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of email changes
        fc.record({
          emailSequence: fc.array(testEmailArbitrary('email-seq'), { minLength: 2, maxLength: 5 }),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ emailSequence, role }) => {
          let accountId: string | null = null;

          try {
            // Create an account with the first email in the sequence
            const account = await prisma.account.create({
              data: {
                username: emailSequence[0],
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Apply each email change in sequence
            for (let i = 1; i < emailSequence.length; i++) {
              const newEmail = emailSequence[i];

              // Update the email
              await updateUserEmail(account.id, newEmail);

              // Verify persistence after each update
              const dbAccount = await prisma.account.findUnique({
                where: { id: account.id },
              });
              expect(dbAccount).not.toBeNull();
              expect(dbAccount!.username).toBe(newEmail);

              // Verify via service layer
              const queriedUser = await getUserById(account.id);
              expect(queriedUser).not.toBeNull();
              expect(queriedUser!.username).toBe(newEmail);
            }

            // Final verification: email should be the last in the sequence
            const finalUser = await getUserById(account.id);
            expect(finalUser).not.toBeNull();
            expect(finalUser!.username).toBe(emailSequence[emailSequence.length - 1]);
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

  it('should persist email updates independently for multiple accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple accounts with email updates
        fc.array(
          fc.record({
            initialEmail: testEmailArbitrary('email-multi-init'),
            newEmail: testEmailArbitrary('email-multi-new'),
            role: fc.constantFrom(...ACCOUNT_ROLES),
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
                    username: spec.initialEmail,
                    passwordHash: testPasswordHash,
                    role: spec.role,
                    isActive: true,
                  },
                })
              )
            );
            createdIds.push(...accounts.map(a => a.id));

            // Update each account's email
            for (let i = 0; i < accounts.length; i++) {
              await updateUserEmail(accounts[i].id, accountSpecs[i].newEmail);
            }

            // Verify each account has the correct email
            for (let i = 0; i < accounts.length; i++) {
              const user = await getUserById(accounts[i].id);
              expect(user).not.toBeNull();
              expect(user!.username).toBe(accountSpecs[i].newEmail);

              // Also verify in database
              const dbAccount = await prisma.account.findUnique({
                where: { id: accounts[i].id },
              });
              expect(dbAccount).not.toBeNull();
              expect(dbAccount!.username).toBe(accountSpecs[i].newEmail);
            }

            // Verify no cross-contamination: each account should have its own email
            const allUsers = await Promise.all(
              accounts.map(a => getUserById(a.id))
            );
            for (let i = 0; i < allUsers.length; i++) {
              expect(allUsers[i]!.username).toBe(accountSpecs[i].newEmail);
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

  it('should handle idempotent email updates (updating to same email)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('email-idempotent'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
          let accountId: string | null = null;

          try {
            // Create an account with a specific email
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Update to the same email (idempotent operation)
            const updated = await updateUserEmail(account.id, email);

            // Property: Email should remain the same
            expect(updated.username).toBe(email);

            // Verify persistence
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.username).toBe(email);

            // Verify via service layer
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.username).toBe(email);
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

  it('should reject invalid email formats and not persist them', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialEmail: testEmailArbitrary('email-invalid-init'),
          invalidEmail: fc.string().filter(s => !s.includes('@') || !s.includes('.')),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ initialEmail, invalidEmail, role }) => {
          let accountId: string | null = null;

          try {
            // Create an account with initial email
            const account = await prisma.account.create({
              data: {
                username: initialEmail,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Attempt to update to invalid email
            await expect(updateUserEmail(account.id, invalidEmail)).rejects.toThrow();

            // Property: Original email should be preserved after failed update
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.username).toBe(initialEmail);

            // Verify via service layer
            const queriedUser = await getUserById(account.id);
            expect(queriedUser).not.toBeNull();
            expect(queriedUser!.username).toBe(initialEmail);
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

  it('should preserve other account fields when updating email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialEmail: testEmailArbitrary('email-preserve-init'),
          newEmail: testEmailArbitrary('email-preserve-new'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          isActive: fc.boolean(),
        }),
        async ({ initialEmail, newEmail, role, isActive }) => {
          let accountId: string | null = null;

          try {
            // Create an account with specific properties
            const account = await prisma.account.create({
              data: {
                username: initialEmail,
                passwordHash: testPasswordHash,
                role: role,
                isActive: isActive,
              },
            });
            accountId = account.id;

            const originalCreatedAt = account.createdAt;
            const originalRole = account.role;
            const originalPasswordHash = account.passwordHash;

            // Update the email
            await updateUserEmail(account.id, newEmail);

            // Property: Other fields should remain unchanged
            const dbAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(dbAccount).not.toBeNull();
            expect(dbAccount!.username).toBe(newEmail);
            expect(dbAccount!.role).toBe(originalRole);
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

  it('should prevent email conflicts when updating to an existing email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email1: testEmailArbitrary('email-conflict1'),
          email2: testEmailArbitrary('email-conflict2'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }).filter(({ email1, email2 }) => email1 !== email2),
        async ({ email1, email2, role }) => {
          const createdIds: string[] = [];

          try {
            // Create two accounts with different emails
            const account1 = await prisma.account.create({
              data: {
                username: email1,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            createdIds.push(account1.id);

            const account2 = await prisma.account.create({
              data: {
                username: email2,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            createdIds.push(account2.id);

            // Attempt to update account1's email to account2's email
            await expect(updateUserEmail(account1.id, email2)).rejects.toThrow(
              'Email address already in use'
            );

            // Property: Both accounts should retain their original emails
            const dbAccount1 = await prisma.account.findUnique({
              where: { id: account1.id },
            });
            expect(dbAccount1).not.toBeNull();
            expect(dbAccount1!.username).toBe(email1);

            const dbAccount2 = await prisma.account.findUnique({
              where: { id: account2.id },
            });
            expect(dbAccount2).not.toBeNull();
            expect(dbAccount2!.username).toBe(email2);
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
});
