import { generateTestEmail } from '../helpers/testData';
import { updateUserRole, getUserById } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { hashPassword } from '../../services/auth';
import { AccountRole, ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 30: Self-demotion prevention
 * Validates: Requirements 13.1, 13.4
 * 
 * For any admin account attempting to change their own role to a non-admin role,
 * the system should reject the operation and return a clear error message explaining the restriction.
 */

describe('Self-Demotion Prevention', () => {
  let testPasswordHash: string;

  beforeAll(async () => {
    testPasswordHash = await hashPassword('TestPassword123!');
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  const nonAdminRoles: AccountRole[] = ['account_owner', 'account_user'];

  describe('Self-Demotion Rejection', () => {
    it.each(nonAdminRoles)('should reject admin self-demotion to %s', async (targetRole) => {
      const account = await prisma.account.create({
        data: {
          username: generateTestEmail('self-demote'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      try {
        await expect(
          updateUserRole(account.id, targetRole, account.id)
        ).rejects.toThrow('Cannot change your own admin role to a non-admin role');

        const accountAfterAttempt = await getUserById(account.id);
        expect(accountAfterAttempt!.role).toBe('admin');

        const dbAccount = await prisma.account.findUnique({ where: { id: account.id } });
        expect(dbAccount!.role).toBe('admin');
      } finally {
        await prisma.account.delete({ where: { id: account.id } }).catch(() => {});
      }
    });

    it.each([true, false])('should reject self-demotion when isActive=%s', async (isActive) => {
      const account = await prisma.account.create({
        data: {
          username: generateTestEmail('self-demote'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive,
        },
      });

      try {
        await expect(
          updateUserRole(account.id, 'account_owner', account.id)
        ).rejects.toThrow('Cannot change your own admin role to a non-admin role');

        const dbAccount = await prisma.account.findUnique({ where: { id: account.id } });
        expect(dbAccount!.role).toBe('admin');
      } finally {
        await prisma.account.delete({ where: { id: account.id } }).catch(() => {});
      }
    });
  });

  describe('Admin Self-Update to Admin (No-Op)', () => {
    it('should allow admin to update their own role to admin', async () => {
      const account = await prisma.account.create({
        data: {
          username: generateTestEmail('self-demote'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      try {
        const updatedAccount = await updateUserRole(account.id, 'admin', account.id);
        expect(updatedAccount.role).toBe('admin');

        const accountAfterUpdate = await getUserById(account.id);
        expect(accountAfterUpdate!.role).toBe('admin');
      } finally {
        await prisma.account.delete({ where: { id: account.id } }).catch(() => {});
      }
    });
  });

  describe('Admin Updating Other Accounts', () => {
    it.each(ACCOUNT_ROLES)('should allow admin to change other account to %s', async (targetRole) => {
      const admin = await prisma.account.create({
        data: {
          username: generateTestEmail('self-demote-admin'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const target = await prisma.account.create({
        data: {
          username: generateTestEmail('self-demote-target'),
          passwordHash: testPasswordHash,
          role: 'account_user',
          isActive: true,
        },
      });

      try {
        // Admin should NOT be able to demote themselves
        await expect(
          updateUserRole(admin.id, 'account_owner', admin.id)
        ).rejects.toThrow('Cannot change your own admin role to a non-admin role');

        // Admin SHOULD be able to change other accounts' roles
        const updatedTarget = await updateUserRole(target.id, targetRole, admin.id);
        expect(updatedTarget.role).toBe(targetRole);

        // Admin should still be admin
        const adminAfterChangingOther = await getUserById(admin.id);
        expect(adminAfterChangingOther!.role).toBe('admin');
      } finally {
        await prisma.account.delete({ where: { id: target.id } }).catch(() => {});
        await prisma.account.delete({ where: { id: admin.id } }).catch(() => {});
      }
    });
  });

  describe('Field Preservation on Rejection', () => {
    it.each([true, false])('should preserve all fields when self-demotion is rejected (isActive=%s)', async (isActive) => {
      const account = await prisma.account.create({
        data: {
          username: generateTestEmail('self-demote'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive,
        },
      });

      try {
        const originalCreatedAt = account.createdAt;
        const originalUsername = account.username;
        const originalPasswordHash = account.passwordHash;

        await expect(
          updateUserRole(account.id, 'account_owner', account.id)
        ).rejects.toThrow('Cannot change your own admin role to a non-admin role');

        const dbAccount = await prisma.account.findUnique({ where: { id: account.id } });
        expect(dbAccount!.role).toBe('admin');
        expect(dbAccount!.username).toBe(originalUsername);
        expect(dbAccount!.passwordHash).toBe(originalPasswordHash);
        expect(dbAccount!.isActive).toBe(isActive);
        expect(dbAccount!.createdAt.getTime()).toBe(originalCreatedAt.getTime());
      } finally {
        await prisma.account.delete({ where: { id: account.id } }).catch(() => {});
      }
    });
  });

  describe('Backward Compatibility', () => {
    it.each(nonAdminRoles)('should allow demotion when requestingAdminId is not provided (%s)', async (targetRole) => {
      const account = await prisma.account.create({
        data: {
          username: generateTestEmail('self-demote'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      try {
        // When requestingAdminId is not provided, should allow (backward compatibility)
        const updatedAccount = await updateUserRole(account.id, targetRole);
        expect(updatedAccount.role).toBe(targetRole);

        const accountAfterUpdate = await getUserById(account.id);
        expect(accountAfterUpdate!.role).toBe(targetRole);
      } finally {
        await prisma.account.delete({ where: { id: account.id } }).catch(() => {});
      }
    });
  });
});
