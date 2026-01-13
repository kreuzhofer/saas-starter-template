/**
 * Tests for Admin Account Deletion Service
 * 
 * Feature: admin-account-deletion
 * 
 * Property 4: Backend Rejects Self-Deletion
 * Property 3: Backend Rejects Active Account Deletion
 * 
 * Validates: Requirements 5.3, 5.4, 6.1, 6.3
 */

import { getTestDb, cleanupTestDb, registerTestEntity } from '../helpers/testDb';
import { generateTestEmail } from '../helpers/testData';
import { hashPassword } from '../../services/auth';
import { AccountRole } from '../../types/account';
import { 
  deleteUser, 
  SelfDeletionError, 
  ActiveAccountDeletionError 
} from '../../services/admin';

const db = getTestDb();

describe('Admin Account Deletion Service', () => {
  let testPasswordHash: string;

  beforeAll(async () => {
    testPasswordHash = await hashPassword('testpassword123');
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  describe('Self-Deletion Rejection', () => {
    it.each([true, false])('should reject self-deletion when isActive=%s', async (isActive) => {
      const account = await db.account.create({
        data: {
          username: generateTestEmail('self-delete'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive,
        },
      });
      registerTestEntity('accounts', account.id);

      await expect(deleteUser(account.id, account.id)).rejects.toThrow(SelfDeletionError);
      await expect(deleteUser(account.id, account.id)).rejects.toThrow('Cannot delete your own account');

      const accountStillExists = await db.account.findUnique({ where: { id: account.id } });
      expect(accountStillExists).not.toBeNull();
    });

    const allRoles: AccountRole[] = ['admin', 'account_owner', 'account_user'];

    it.each(allRoles)('should reject self-deletion for %s role', async (role) => {
      const account = await db.account.create({
        data: {
          username: generateTestEmail('role-self-delete'),
          passwordHash: testPasswordHash,
          role,
          isActive: false,
        },
      });
      registerTestEntity('accounts', account.id);

      await expect(deleteUser(account.id, account.id)).rejects.toThrow(SelfDeletionError);

      const accountStillExists = await db.account.findUnique({ where: { id: account.id } });
      expect(accountStillExists).not.toBeNull();
    });
  });

  describe('Active Account Deletion Rejection', () => {
    const targetRoles: AccountRole[] = ['admin', 'account_owner', 'account_user'];

    it.each(targetRoles)('should reject deletion of active %s account', async (targetRole) => {
      const adminAccount = await db.account.create({
        data: {
          username: generateTestEmail('active-admin'),
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });
      registerTestEntity('accounts', adminAccount.id);

      const targetAccount = await db.account.create({
        data: {
          username: generateTestEmail('active-target'),
          passwordHash: testPasswordHash,
          role: targetRole,
          isActive: true,
        },
      });
      registerTestEntity('accounts', targetAccount.id);

      await expect(deleteUser(targetAccount.id, adminAccount.id)).rejects.toThrow(ActiveAccountDeletionError);
      await expect(deleteUser(targetAccount.id, adminAccount.id)).rejects.toThrow('Cannot delete an active account');

      const accountStillExists = await db.account.findUnique({ where: { id: targetAccount.id } });
      expect(accountStillExists).not.toBeNull();
      expect(accountStillExists!.isActive).toBe(true);
    });
  });
});
