import * as fc from 'fast-check';
import { listAllUsers } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { testEmailArbitrary } from '../helpers/testData';
import { hashPassword } from '../../services/auth';
import { AccountRole, ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 8: Admin user list completeness
 * Validates: Requirements 6.1, 6.8
 * 
 * For any admin account requesting the user list, the response should include all accounts 
 * with username, role, active status, and creation date, but never password hashes.
 */

describe('Property-Based Test: Admin User List Completeness', () => {
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

  it('should return all accounts with complete information and no password hashes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random set of accounts with various properties
        fc.array(
          fc.record({
            email: testEmailArbitrary('userlist'),
            role: fc.constantFrom(...ACCOUNT_ROLES),
            isActive: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (accountSpecs) => {
          const createdIds: string[] = [];

          try {
            // Get initial count
            const initialUsers = await listAllUsers();
            const initialCount = initialUsers.length;

            // Create all accounts in the database
            for (const spec of accountSpecs) {
              const account = await prisma.account.create({
                data: {
                  username: spec.email,
                  passwordHash: testPasswordHash,
                  role: spec.role,
                  isActive: spec.isActive,
                },
              });
              createdIds.push(account.id);
            }

            // Call listAllUsers
            const users = await listAllUsers();

            // Property 1: All created accounts should be in the list (plus any existing ones)
            expect(users.length).toBe(initialCount + accountSpecs.length);

            // Property 2: Each user should have all required fields
            for (const user of users) {
              expect(user.id).toBeDefined();
              expect(typeof user.id).toBe('string');
              
              expect(user.username).toBeDefined();
              expect(typeof user.username).toBe('string');
              
              expect(user.role).toBeDefined();
              expect(ACCOUNT_ROLES).toContain(user.role);
              
              expect(user.tier).toBeDefined();
              expect(typeof user.tier).toBe('string');
              
              expect(user.isActive).toBeDefined();
              expect(typeof user.isActive).toBe('boolean');
              
              expect(user.createdAt).toBeDefined();
              expect(user.createdAt).toBeInstanceOf(Date);
              
              expect(user.updatedAt).toBeDefined();
              expect(user.updatedAt).toBeInstanceOf(Date);
            }

            // Property 3: Password hashes should never be included
            for (const user of users) {
              expect((user as any).passwordHash).toBeUndefined();
            }

            // Property 4: All created accounts should be present in the list
            const userIds = users.map(u => u.id);
            for (const id of createdIds) {
              expect(userIds).toContain(id);
            }

            // Property 5: Each account's data should match what was created
            for (let i = 0; i < accountSpecs.length; i++) {
              const spec = accountSpecs[i];
              const user = users.find(u => u.username === spec.email);
              
              expect(user).toBeDefined();
              expect(user!.role).toBe(spec.role);
              expect(user!.isActive).toBe(spec.isActive);
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

  it('should return complete list regardless of role distribution', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate accounts with specific role distributions
        fc.record({
          admins: fc.integer({ min: 0, max: 3 }),
          owners: fc.integer({ min: 0, max: 5 }),
          users: fc.integer({ min: 0, max: 5 }),
          testId: fc.integer({ min: 1000, max: 9999 }), // Unique test ID
        }).filter(counts => counts.admins + counts.owners + counts.users > 0),
        async (roleCounts) => {
          const createdIds: string[] = [];
          const totalAccounts = roleCounts.admins + roleCounts.owners + roleCounts.users;

          try {
            // Get initial count
            const initialUsers = await listAllUsers();
            const initialCount = initialUsers.length;

            // Create admin accounts
            for (let i = 0; i < roleCounts.admins; i++) {
              const account = await prisma.account.create({
                data: {
                  username: `test${roleCounts.testId}-admin${i}@example.com`,
                  passwordHash: testPasswordHash,
                  role: 'admin',
                  isActive: true,
                },
              });
              createdIds.push(account.id);
            }

            // Create account_owner accounts
            for (let i = 0; i < roleCounts.owners; i++) {
              const account = await prisma.account.create({
                data: {
                  username: `test${roleCounts.testId}-owner${i}@example.com`,
                  passwordHash: testPasswordHash,
                  role: 'account_owner',
                  isActive: true,
                },
              });
              createdIds.push(account.id);
            }

            // Create account_user accounts
            for (let i = 0; i < roleCounts.users; i++) {
              const account = await prisma.account.create({
                data: {
                  username: `test${roleCounts.testId}-user${i}@example.com`,
                  passwordHash: testPasswordHash,
                  role: 'account_user',
                  isActive: true,
                },
              });
              createdIds.push(account.id);
            }

            // Call listAllUsers
            const users = await listAllUsers();

            // Verify completeness (including initial accounts)
            expect(users.length).toBe(initialCount + totalAccounts);

            // Verify role distribution for our test accounts
            const testPrefix = `test${roleCounts.testId}-`;
            const testUsers = users.filter(u => u.username.startsWith(testPrefix));
            const adminCount = testUsers.filter(u => u.role === 'admin').length;
            const ownerCount = testUsers.filter(u => u.role === 'account_owner').length;
            const userCount = testUsers.filter(u => u.role === 'account_user').length;

            expect(adminCount).toBe(roleCounts.admins);
            expect(ownerCount).toBe(roleCounts.owners);
            expect(userCount).toBe(roleCounts.users);

            // Verify no password hashes
            for (const user of users) {
              expect((user as any).passwordHash).toBeUndefined();
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

  it('should return complete list with mixed active/inactive accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            email: testEmailArbitrary('userlist-mixed'),
            role: fc.constantFrom(...ACCOUNT_ROLES),
            isActive: fc.boolean(),
          }),
          { minLength: 2, maxLength: 8 }
        ).filter(specs => {
          // Ensure we have at least one active and one inactive
          const hasActive = specs.some(a => a.isActive);
          const hasInactive = specs.some(a => !a.isActive);
          return hasActive && hasInactive;
        }),
        async (accountSpecs) => {
          const createdIds: string[] = [];

          try {
            // Get initial count
            const initialUsers = await listAllUsers();
            const initialCount = initialUsers.length;

            // Create all accounts
            for (const spec of accountSpecs) {
              const account = await prisma.account.create({
                data: {
                  username: spec.email,
                  passwordHash: testPasswordHash,
                  role: spec.role,
                  isActive: spec.isActive,
                },
              });
              createdIds.push(account.id);
            }

            // Call listAllUsers
            const users = await listAllUsers();

            // Verify all accounts are returned regardless of active status
            expect(users.length).toBe(initialCount + accountSpecs.length);

            // Verify active status is correctly reported for our test accounts
            const activeCount = accountSpecs.filter(a => a.isActive).length;
            const inactiveCount = accountSpecs.filter(a => !a.isActive).length;

            // Filter to only our test accounts
            const testUsers = users.filter(u => u.username.startsWith('userlist-mixed'));
            const returnedActiveCount = testUsers.filter(u => u.isActive).length;
            const returnedInactiveCount = testUsers.filter(u => !u.isActive).length;

            expect(returnedActiveCount).toBe(activeCount);
            expect(returnedInactiveCount).toBe(inactiveCount);

            // Verify no password hashes
            for (const user of users) {
              expect((user as any).passwordHash).toBeUndefined();
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

  it('should return array (possibly empty) when called', async () => {
    // This is a specific edge case property
    const users = await listAllUsers();
    expect(Array.isArray(users)).toBe(true);
    // Verify all returned users have required fields
    for (const user of users) {
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.tier).toBeDefined();
      expect(user.isActive).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect((user as any).passwordHash).toBeUndefined();
    }
  });

  it('should include all required fields for every account regardless of data variations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            email: testEmailArbitrary('userlist-fields'),
            role: fc.constantFrom(...ACCOUNT_ROLES),
            isActive: fc.boolean(),
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
                  passwordHash: testPasswordHash,
                  role: spec.role,
                  isActive: spec.isActive,
                },
              });
              createdIds.push(account.id);
            }

            // Call listAllUsers
            const users = await listAllUsers();

            // Verify every user has exactly the required fields and no sensitive data
            for (const user of users) {
              const userKeys = Object.keys(user);
              
              // Required fields must be present
              expect(userKeys).toContain('id');
              expect(userKeys).toContain('username');
              expect(userKeys).toContain('role');
              expect(userKeys).toContain('tier');
              expect(userKeys).toContain('isActive');
              expect(userKeys).toContain('createdAt');
              expect(userKeys).toContain('updatedAt');
              
              // Sensitive fields must not be present
              expect(userKeys).not.toContain('passwordHash');
              expect(userKeys).not.toContain('password');
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
});
