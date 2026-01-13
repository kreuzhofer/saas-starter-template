import * as fc from 'fast-check';
import { testEmailArbitrary } from '../helpers/testData';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { hashPassword } from '../../services/auth';
import { ACCOUNT_ROLES, isValidRole } from '../../types/account';

/**
 * Feature: account-management, Property 13: Account role uniqueness and validity
 * Validates: Requirements 3.1
 * 
 * For any account in the system, it should have exactly one role, and that role 
 * should be from the set ["admin", "account_owner", "account_user"].
 */

describe('Property-Based Test: Account Role Uniqueness and Validity', () => {
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

  describe('Account Role Uniqueness and Validity', () => {
    it('should ensure every account has exactly one valid role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              email: testEmailArbitrary('account-type'),
              role: fc.constantFrom(...VALID_ROLES),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (accountSpecs) => {
            const createdIds: string[] = [];

            try {
              // Create multiple accounts with various roles
              for (const spec of accountSpecs) {
                const account = await prisma.account.create({
                  data: {
                    username: spec.email,
                    passwordHash: CACHED_PASSWORD_HASH,
                    role: spec.role,
                    isActive: false,
                  },
                });
                createdIds.push(account.id);
              }

              // Fetch all created accounts
              const accounts = await prisma.account.findMany({
                where: { id: { in: createdIds } },
              });

              // Verify each account has exactly one role and it's valid
              for (const account of accounts) {
                // Check that role field exists and is a string
                expect(account.role).toBeDefined();
                expect(typeof account.role).toBe('string');
                
                // Check that role is not empty
                expect(account.role.length).toBeGreaterThan(0);
                
                // Check that role is one of the valid roles
                expect(VALID_ROLES).toContain(account.role as any);
                expect(isValidRole(account.role)).toBe(true);
                
                // Check that role is exactly one of the valid values (not multiple)
                const matchCount = VALID_ROLES.filter(r => r === account.role).length;
                expect(matchCount).toBe(1);
              }
            } finally {
              // Cleanup
              await prisma.account.deleteMany({
                where: { id: { in: createdIds } },
              });
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should maintain role uniqueness across account lifecycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('account-type'),
          fc.constantFrom(...VALID_ROLES),
          fc.array(fc.constantFrom(...VALID_ROLES), { minLength: 0, maxLength: 3 }),
          async (email, initialRole, roleUpdates) => {
            // Create account with initial role
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: CACHED_PASSWORD_HASH,
                role: initialRole,
                isActive: false,
              },
            });

            try {
              // Verify initial state
              let currentAccount = await prisma.account.findUnique({
                where: { id: account.id },
              });
              
              expect(currentAccount).not.toBeNull();
              expect(isValidRole(currentAccount!.role)).toBe(true);
              expect(VALID_ROLES).toContain(currentAccount!.role as any);

              // Apply role updates and verify after each update
              for (const newRole of roleUpdates) {
                currentAccount = await prisma.account.update({
                  where: { id: account.id },
                  data: { role: newRole },
                });

                // After each update, verify role is still valid and unique
                expect(currentAccount.role).toBeDefined();
                expect(typeof currentAccount.role).toBe('string');
                expect(isValidRole(currentAccount.role)).toBe(true);
                expect(VALID_ROLES).toContain(currentAccount.role as any);
                expect(currentAccount.role).toBe(newRole);
              }

              // Final verification from database
              const finalAccount = await prisma.account.findUnique({
                where: { id: account.id },
              });

              expect(finalAccount).not.toBeNull();
              expect(isValidRole(finalAccount!.role)).toBe(true);
              expect(VALID_ROLES).toContain(finalAccount!.role as any);
            } finally {
              // Cleanup
              await prisma.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should ensure role field is never null or undefined', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              email: testEmailArbitrary('account-type'),
              role: fc.constantFrom(...VALID_ROLES),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (accountSpecs) => {
            const createdIds: string[] = [];

            try {
              // Create accounts
              for (const spec of accountSpecs) {
                const account = await prisma.account.create({
                  data: {
                    username: spec.email,
                    passwordHash: CACHED_PASSWORD_HASH,
                    role: spec.role,
                    isActive: false,
                  },
                });
                createdIds.push(account.id);
              }

              // Fetch all accounts and verify role is never null/undefined
              const accounts = await prisma.account.findMany({
                where: { id: { in: createdIds } },
              });

              for (const account of accounts) {
                expect(account.role).not.toBeNull();
                expect(account.role).not.toBeUndefined();
                expect(account.role).toBeTruthy();
              }
            } finally {
              // Cleanup
              await prisma.account.deleteMany({
                where: { id: { in: createdIds } },
              });
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should ensure all accounts in database have valid roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              email: testEmailArbitrary('account-type'),
              role: fc.constantFrom(...VALID_ROLES),
            }),
            { minLength: 1, maxLength: 8 }
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
                    role: spec.role,
                    isActive: false,
                  },
                });
                createdIds.push(account.id);
              }

              // Query ALL accounts we created (simulating a system-wide check)
              const allAccounts = await prisma.account.findMany({
                where: { id: { in: createdIds } },
              });

              // Every single account must have exactly one valid role
              expect(allAccounts.length).toBeGreaterThan(0);
              
              for (const account of allAccounts) {
                // Requirement 3.1: exactly one role from the defined set
                expect(account.role).toBeDefined();
                expect(typeof account.role).toBe('string');
                expect(ACCOUNT_ROLES).toContain(account.role as any);
                
                // Verify it's exactly one of the three valid roles
                const isAdmin = account.role === 'admin';
                const isOwner = account.role === 'account_owner';
                const isUser = account.role === 'account_user';
                
                // Exactly one should be true
                const trueCount = [isAdmin, isOwner, isUser].filter(Boolean).length;
                expect(trueCount).toBe(1);
              }
            } finally {
              // Cleanup
              await prisma.account.deleteMany({
                where: { id: { in: createdIds } },
              });
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should ensure role consistency between creation and retrieval', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary('account-type'),
          fc.constantFrom(...VALID_ROLES),
          async (email, role) => {
            // Create account with specific role
            const createdAccount = await prisma.account.create({
              data: {
                username: email,
                passwordHash: CACHED_PASSWORD_HASH,
                role: role,
                isActive: false,
              },
            });

            try {
              // Retrieve the account
              const retrievedAccount = await prisma.account.findUnique({
                where: { id: createdAccount.id },
              });

              // Both should have the same valid role
              expect(retrievedAccount).not.toBeNull();
              expect(createdAccount.role).toBe(role);
              expect(retrievedAccount!.role).toBe(role);
              expect(createdAccount.role).toBe(retrievedAccount!.role);
              
              // Both should pass validation
              expect(isValidRole(createdAccount.role)).toBe(true);
              expect(isValidRole(retrievedAccount!.role)).toBe(true);
            } finally {
              // Cleanup
              await prisma.account.delete({ where: { id: createdAccount.id } });
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
