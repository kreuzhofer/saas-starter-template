import { generateTestEmail } from '../helpers/testData';
import { updateUserRole, getUserById } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { hashPassword } from '../../services/auth';
import { AccountRole, ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 31: Role update authorization for other accounts
 * Validates: Requirements 13.2
 * 
 * For any admin account updating another account's role (where the target account is not the requesting admin),
 * the system should allow the operation and persist the new role.
 */

describe('Role Update Authorization for Other Accounts', () => {
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

  describe('Admin Role Updates', () => {
    it.each(ACCOUNT_ROLES)('should allow admin to update account to %s role', async (newRole) => {
      const admin = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-admin'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const target = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-target'),
          passwordHash: testPasswordHash,
          role: 'account_user',
          isActive: true,
        },
      });

      try {
        const updatedAccount = await updateUserRole(target.id, newRole, admin.id);
        expect(updatedAccount.role).toBe(newRole);

        const dbAccount = await prisma.account.findUnique({ where: { id: target.id } });
        expect(dbAccount!.role).toBe(newRole);

        const queriedUser = await getUserById(target.id);
        expect(queriedUser!.role).toBe(newRole);

        const adminAfterUpdate = await getUserById(admin.id);
        expect(adminAfterUpdate!.role).toBe('admin');
      } finally {
        await prisma.account.delete({ where: { id: target.id } }).catch(() => {});
        await prisma.account.delete({ where: { id: admin.id } }).catch(() => {});
      }
    });
  });

  describe('Admin Granting Admin Role', () => {
    const nonAdminRoles: AccountRole[] = ['account_owner', 'account_user'];

    it.each(nonAdminRoles)('should allow admin to grant admin role to %s', async (currentRole) => {
      const admin = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-admin'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const target = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-target'),
          passwordHash: testPasswordHash,
          role: currentRole,
          isActive: true,
        },
      });

      try {
        const updatedAccount = await updateUserRole(target.id, 'admin', admin.id);
        expect(updatedAccount.role).toBe('admin');

        const dbAccount = await prisma.account.findUnique({ where: { id: target.id } });
        expect(dbAccount!.role).toBe('admin');
      } finally {
        await prisma.account.delete({ where: { id: target.id } }).catch(() => {});
        await prisma.account.delete({ where: { id: admin.id } }).catch(() => {});
      }
    });
  });

  describe('Admin Demoting Other Admins', () => {
    const nonAdminRoles: AccountRole[] = ['account_owner', 'account_user'];

    it.each(nonAdminRoles)('should allow admin to demote other admin to %s', async (newRole) => {
      const admin = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-admin'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const targetAdmin = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-target-admin'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      try {
        const updatedAccount = await updateUserRole(targetAdmin.id, newRole, admin.id);
        expect(updatedAccount.role).toBe(newRole);

        const dbAccount = await prisma.account.findUnique({ where: { id: targetAdmin.id } });
        expect(dbAccount!.role).toBe(newRole);

        const requestingAdmin = await getUserById(admin.id);
        expect(requestingAdmin!.role).toBe('admin');
      } finally {
        await prisma.account.delete({ where: { id: targetAdmin.id } }).catch(() => {});
        await prisma.account.delete({ where: { id: admin.id } }).catch(() => {});
      }
    });
  });

  describe('Field Preservation', () => {
    it.each([true, false])('should preserve other fields when updating role (isActive=%s)', async (isActive) => {
      const admin = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-admin'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const target = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-target'),
          passwordHash: testPasswordHash,
          role: 'account_user',
          isActive,
        },
      });

      try {
        const originalUsername = target.username;
        const originalPasswordHash = target.passwordHash;
        const originalCreatedAt = target.createdAt;

        await updateUserRole(target.id, 'account_owner', admin.id);

        const dbAccount = await prisma.account.findUnique({ where: { id: target.id } });
        expect(dbAccount!.role).toBe('account_owner');
        expect(dbAccount!.username).toBe(originalUsername);
        expect(dbAccount!.passwordHash).toBe(originalPasswordHash);
        expect(dbAccount!.isActive).toBe(isActive);
        expect(dbAccount!.createdAt.getTime()).toBe(originalCreatedAt.getTime());
      } finally {
        await prisma.account.delete({ where: { id: target.id } }).catch(() => {});
        await prisma.account.delete({ where: { id: admin.id } }).catch(() => {});
      }
    });
  });

  describe('Idempotent Updates', () => {
    it.each(ACCOUNT_ROLES)('should allow idempotent update to same role (%s)', async (role) => {
      const admin = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-admin'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const target = await prisma.account.create({
        data: {
          username: generateTestEmail('role-auth-target'),
          passwordHash: testPasswordHash,
          role,
          isActive: true,
        },
      });

      try {
        const updatedAccount = await updateUserRole(target.id, role, admin.id);
        expect(updatedAccount.role).toBe(role);

        const dbAccount = await prisma.account.findUnique({ where: { id: target.id } });
        expect(dbAccount!.role).toBe(role);
      } finally {
        await prisma.account.delete({ where: { id: target.id } }).catch(() => {});
        await prisma.account.delete({ where: { id: admin.id } }).catch(() => {});
      }
    });
  });
});
