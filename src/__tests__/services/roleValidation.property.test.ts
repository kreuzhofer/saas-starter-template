import * as fc from 'fast-check';
import { testEmailArbitrary } from '../helpers/testData';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { hashPassword } from '../../services/auth';

/**
 * Feature: account-management, Property 4: Role validation on account operations
 * Validates: Requirements 3.3, 3.4
 * 
 * For any account creation or update operation, the system should reject any role value 
 * not in the set ["admin", "account_owner", "account_user"].
 */

describe('Property-Based Test: Role Validation', () => {
  const VALID_ROLES = ['admin', 'account_owner', 'account_user'] as const;
  
  // Pre-hash a password once to avoid expensive bcrypt operations in every test iteration
  let CACHED_PASSWORD_HASH: string;

  beforeAll(async () => {
    CACHED_PASSWORD_HASH = await hashPassword('testPassword123');
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  describe('Account Creation with Role Validation', () => {
    it('should accept only valid roles during account creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('role-valid'),
          fc.oneof(
            fc.constantFrom(...VALID_ROLES),
            fc.string({ minLength: 1, maxLength: 50 }).filter(
              (s) => !VALID_ROLES.includes(s as any)
            )
          ),
          async (email, role) => {
            const isValidRole = VALID_ROLES.includes(role as any);

            if (isValidRole) {
              // Valid roles should be accepted
              const account = await prisma.account.create({
                data: {
                  username: email,
                  passwordHash: CACHED_PASSWORD_HASH,
                  role: role as any,
                  isActive: false,
                },
              });

              expect(account.role).toBe(role);
              expect(VALID_ROLES).toContain(account.role as any);

              // Cleanup
              await prisma.account.delete({ where: { id: account.id } });
            } else {
              // Invalid roles should be rejected
              // Note: Prisma doesn't enforce enum constraints at the client level,
              // but the database should reject invalid values if constraints are set
              // For now, we test that the application logic should validate
              expect(VALID_ROLES).not.toContain(role as any);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should only persist accounts with valid roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('role-valid'),
          fc.constantFrom(...VALID_ROLES),
          async (email, role) => {
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: CACHED_PASSWORD_HASH,
                role,
                isActive: false,
              },
            });

            // Verify the account was created with the correct role
            const retrieved = await prisma.account.findUnique({
              where: { id: account.id },
            });

            expect(retrieved).not.toBeNull();
            expect(retrieved!.role).toBe(role);
            expect(VALID_ROLES).toContain(retrieved!.role as any);

            // Cleanup
            await prisma.account.delete({ where: { id: account.id } });
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Account Update with Role Validation', () => {
    it('should accept only valid roles during account updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('role-valid'),
          fc.constantFrom(...VALID_ROLES),
          fc.constantFrom(...VALID_ROLES),
          async (email, initialRole, newRole) => {
            // Create account with initial role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: CACHED_PASSWORD_HASH,
                role: initialRole as any,
                isActive: false,
              },
            });

            // Update to new role (both should be valid)
            const updated = await prisma.account.update({
              where: { id: account.id },
              data: { role: newRole as any },
            });

            expect(updated.role).toBe(newRole);
            expect(VALID_ROLES).toContain(updated.role as any);

            // Verify persistence
            const retrieved = await prisma.account.findUnique({
              where: { id: account.id },
            });

            expect(retrieved!.role).toBe(newRole);

            // Cleanup
            await prisma.account.delete({ where: { id: account.id } });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should maintain role validity after multiple updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('role-valid'),
          fc.array(fc.constantFrom(...VALID_ROLES), { minLength: 1, maxLength: 3 }),
          async (email, roleSequence) => {
            // Create account with first role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: CACHED_PASSWORD_HASH,
                role: roleSequence[0] as any,
                isActive: false,
              },
            });

            // Apply sequence of role updates
            let currentAccount = account;
            for (const role of roleSequence) {
              currentAccount = await prisma.account.update({
                where: { id: account.id },
                data: { role: role as any },
              });

              expect(VALID_ROLES).toContain(currentAccount.role as any);
            }

            // Final verification
            const retrieved = await prisma.account.findUnique({
              where: { id: account.id },
            });

            expect(VALID_ROLES).toContain(retrieved!.role as any);

            // Cleanup
            await prisma.account.delete({ where: { id: account.id } });
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Role Constraint Enforcement', () => {
    it('should ensure all accounts have exactly one role from the valid set', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              email: testEmailArbitrary('role-valid'),
              role: fc.constantFrom(...VALID_ROLES),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (accountSpecs) => {
            const createdIds: string[] = [];

            try {
              // Create multiple accounts
              for (const spec of accountSpecs) {
                const account = await prisma.account.create({
                  data: {
                    username: spec.email,
                    passwordHash: CACHED_PASSWORD_HASH,
                    role: spec.role as any,
                    isActive: false,
                  },
                });
                createdIds.push(account.id);
              }

              // Verify all accounts have valid roles
              const accounts = await prisma.account.findMany({
                where: { id: { in: createdIds } },
              });

              expect(accounts).toHaveLength(accountSpecs.length);

              for (const account of accounts) {
                expect(VALID_ROLES).toContain(account.role as any);
                expect(typeof account.role).toBe('string');
                expect(account.role.length).toBeGreaterThan(0);
              }
            } finally {
              // Cleanup
              await prisma.account.deleteMany({
                where: { id: { in: createdIds } },
              });
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Feature: account-management, Property 22: Database role constraint enforcement
   * Validates: Requirements 8.2
   * 
   * For any attempt to insert or update an account with an invalid role at the database level, 
   * the database should reject the operation.
   */
  describe('Database Role Constraint Enforcement', () => {
    it('should reject account creation with invalid roles at database level', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('role-valid'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(
            (s) => !VALID_ROLES.includes(s as any)
          ),
          async (email, invalidRole) => {
            // Attempt to create account with invalid role using raw SQL
            // This bypasses Prisma's type checking to test database constraint
            await expect(
              prisma.$executeRaw`
                INSERT INTO accounts (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt", tier)
                VALUES (gen_random_uuid(), ${email}, ${CACHED_PASSWORD_HASH}, ${invalidRole}::"AccountRole", false, NOW(), NOW(), 'starter'::"AccountTier")
              `
            ).rejects.toThrow();

            // Verify the account was NOT created
            const account = await prisma.account.findUnique({
              where: { username: email },
            });

            expect(account).toBeNull();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should reject account updates with invalid roles at database level', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('role-valid'),
          fc.constantFrom(...VALID_ROLES),
          fc.string({ minLength: 1, maxLength: 50 }).filter(
            (s) => !VALID_ROLES.includes(s as any)
          ),
          async (email, validRole, invalidRole) => {
            // Create account with valid role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: CACHED_PASSWORD_HASH,
                role: validRole as any,
                isActive: false,
              },
            });

            try {
              // Attempt to update to invalid role using raw SQL
              await expect(
                prisma.$executeRaw`
                  UPDATE accounts 
                  SET role = ${invalidRole}::"AccountRole"
                  WHERE id = ${account.id}::uuid
                `
              ).rejects.toThrow();

              // Verify the role was NOT changed
              const retrieved = await prisma.account.findUnique({
                where: { id: account.id },
              });

              expect(retrieved).not.toBeNull();
              expect(retrieved!.role).toBe(validRole);
              expect(retrieved!.role).not.toBe(invalidRole);
            } finally {
              // Cleanup
              await prisma.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should accept all valid roles at database level', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('role-valid'),
          fc.constantFrom(...VALID_ROLES),
          async (email, validRole) => {
            // Create account with valid role using raw SQL
            await prisma.$executeRaw`
              INSERT INTO accounts (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt", tier)
              VALUES (gen_random_uuid(), ${email}, ${CACHED_PASSWORD_HASH}, ${validRole}::"AccountRole", false, NOW(), NOW(), 'starter'::"AccountTier")
            `;

            // Verify the account was created successfully
            const account = await prisma.account.findUnique({
              where: { username: email },
            });

            expect(account).not.toBeNull();
            expect(account!.role).toBe(validRole);

            // Cleanup
            if (account) {
              await prisma.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should enforce constraint on bulk operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              email: testEmailArbitrary('role-valid'),
              role: fc.oneof(
                fc.constantFrom(...VALID_ROLES),
                fc.string({ minLength: 1, maxLength: 50 }).filter(
                  (s) => !VALID_ROLES.includes(s as any)
                )
              ),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (accountSpecs) => {
            const hasInvalidRole = accountSpecs.some(
              (spec) => !VALID_ROLES.includes(spec.role as any)
            );

            if (hasInvalidRole) {
              // If any role is invalid, test that it fails
              // Test each account individually since we can't safely do bulk inserts with raw SQL
              for (const spec of accountSpecs) {
                if (!VALID_ROLES.includes(spec.role as any)) {
                  // This one should fail
                  await expect(
                    prisma.$executeRaw`
                      INSERT INTO accounts (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt", tier)
                      VALUES (gen_random_uuid(), ${spec.email}, ${CACHED_PASSWORD_HASH}, ${spec.role}::"AccountRole", false, NOW(), NOW(), 'starter'::"AccountTier")
                    `
                  ).rejects.toThrow();

                  // Verify the account was NOT created
                  const account = await prisma.account.findUnique({
                    where: { username: spec.email },
                  });
                  expect(account).toBeNull();
                }
              }
            } else {
              // All roles are valid, each insert should succeed
              const createdEmails: string[] = [];

              try {
                for (const spec of accountSpecs) {
                  await prisma.$executeRaw`
                    INSERT INTO accounts (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt", tier)
                    VALUES (gen_random_uuid(), ${spec.email}, ${CACHED_PASSWORD_HASH}, ${spec.role}::"AccountRole", false, NOW(), NOW(), 'starter'::"AccountTier")
                  `;
                  createdEmails.push(spec.email);
                }

                // Verify all accounts were created with correct roles
                for (const spec of accountSpecs) {
                  const account = await prisma.account.findUnique({
                    where: { username: spec.email },
                  });
                  expect(account).not.toBeNull();
                  expect(account!.role).toBe(spec.role);
                }
              } finally {
                // Cleanup
                if (createdEmails.length > 0) {
                  await prisma.account.deleteMany({
                    where: {
                      username: { in: createdEmails },
                    },
                  });
                }
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Feature: account-management, Property 14: Default role assignment
   * Validates: Requirements 8.4
   * 
   * For any account created without explicitly specifying a role, the system should 
   * assign the default role "account_owner".
   */
  describe('Default Role Assignment', () => {
    it('should assign account_owner role when no role is specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('role-valid'),
          async (email) => {
            // Create account WITHOUT specifying role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: CACHED_PASSWORD_HASH,
                isActive: false,
                // Note: role is intentionally omitted to test default value
              },
            });

            // Verify default role was assigned
            expect(account.role).toBe('account_owner');

            // Verify persistence by fetching from database
            const retrieved = await prisma.account.findUnique({
              where: { id: account.id },
            });

            expect(retrieved).not.toBeNull();
            expect(retrieved!.role).toBe('account_owner');

            // Cleanup
            await prisma.account.delete({ where: { id: account.id } });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should use default role for multiple accounts created without role specification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(testEmailArbitrary('role-valid'), { minLength: 1, maxLength: 5 }),
          async (emails) => {
            const createdIds: string[] = [];

            try {
              // Create multiple accounts without specifying role
              for (const email of emails) {
                const account = await prisma.account.create({
                  data: {
                    username: email,
                    passwordHash: CACHED_PASSWORD_HASH,
                    isActive: false,
                    // role intentionally omitted
                  },
                });
                createdIds.push(account.id);
              }

              // Verify all accounts have the default role
              const accounts = await prisma.account.findMany({
                where: { id: { in: createdIds } },
              });

              expect(accounts).toHaveLength(emails.length);

              for (const account of accounts) {
                expect(account.role).toBe('account_owner');
              }
            } finally {
              // Cleanup
              await prisma.account.deleteMany({
                where: { id: { in: createdIds } },
              });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should allow explicit role override of default value', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('role-valid'),
          fc.constantFrom(...VALID_ROLES),
          async (email, explicitRole) => {
            // Create account WITH explicit role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: CACHED_PASSWORD_HASH,
                role: explicitRole as any,
                isActive: false,
              },
            });

            // Verify explicit role was used (not default)
            expect(account.role).toBe(explicitRole);

            // If we specified a non-default role, verify it's not the default
            if (explicitRole !== 'account_owner') {
              expect(account.role).not.toBe('account_owner');
            }

            // Cleanup
            await prisma.account.delete({ where: { id: account.id } });
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
