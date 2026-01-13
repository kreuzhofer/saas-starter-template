/**
 * Unit tests for admin service
 * Tests user management functions for admin operations
 */

import {
  listAllUsers,
  getUserById,
  updateUserRole,
  updateUserEmail,
  adminResetPassword,
  setUserPassword,
  activateUser,
  deactivateUser,
} from '../../services/admin';
import prisma from '../../db/client';
import { hashPassword, verifyPassword } from '../../services/auth';
import { cleanupTestDb } from '../helpers/testDb';

describe('Admin Service', () => {
  const testPassword = 'TestPassword123!';
  let testPasswordHash: string;

  beforeAll(async () => {
    // Pre-hash password once to avoid expensive bcrypt operations
    testPasswordHash = await hashPassword(testPassword);
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  describe('listAllUsers', () => {
    it('should return all users with role information', async () => {
      // Get initial count
      const initialUsers = await listAllUsers();
      const initialCount = initialUsers.length;

      // Create test accounts
      const account1 = await prisma.account.create({
        data: {
          username: 'user1@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const account2 = await prisma.account.create({
        data: {
          username: 'user2@example.com',
          passwordHash: testPasswordHash,
          role: 'account_user',
          isActive: false,
        },
      });

      const users = await listAllUsers();

      expect(users).toHaveLength(initialCount + 2);
      
      // Find our test accounts in the list
      const testUser1 = users.find(u => u.username === 'user1@example.com');
      const testUser2 = users.find(u => u.username === 'user2@example.com');
      
      expect(testUser1).toBeDefined();
      expect(testUser1!.id).toBeDefined();
      expect(testUser1!.username).toBe('user1@example.com');
      expect(testUser1!.role).toBe('account_owner');
      expect(testUser1!.isActive).toBe(true);
      expect(testUser1!.createdAt).toBeDefined();
      expect(testUser1!.updatedAt).toBeDefined();
      
      expect(testUser2).toBeDefined();
      expect(testUser2!.role).toBe('account_user');
      expect(testUser2!.isActive).toBe(false);
      
      // Verify password hash is not included for any user
      for (const user of users) {
        expect((user as any).passwordHash).toBeUndefined();
      }
    });

    it('should return array of existing users when called', async () => {
      const users = await listAllUsers();
      expect(Array.isArray(users)).toBe(true);
      
      // Verify all users have required fields
      for (const user of users) {
        expect(user.id).toBeDefined();
        expect(user.username).toBeDefined();
        expect(user.role).toBeDefined();
        expect(user.isActive).toBeDefined();
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
        expect((user as any).passwordHash).toBeUndefined();
      }
    });

    it('should order users by creation date descending', async () => {
      // Create accounts with slight delay to ensure different timestamps
      const account1 = await prisma.account.create({
        data: {
          username: 'first@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const account2 = await prisma.account.create({
        data: {
          username: 'second@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const users = await listAllUsers();

      // Find our test accounts
      const firstUser = users.find(u => u.username === 'first@example.com');
      const secondUser = users.find(u => u.username === 'second@example.com');
      
      expect(firstUser).toBeDefined();
      expect(secondUser).toBeDefined();
      
      // Find their positions in the list
      const firstIndex = users.findIndex(u => u.username === 'first@example.com');
      const secondIndex = users.findIndex(u => u.username === 'second@example.com');
      
      // Most recent (second) should come before first in the list
      expect(secondIndex).toBeLessThan(firstIndex);
      
      // Verify the second account was created after the first
      expect(secondUser!.createdAt.getTime()).toBeGreaterThan(firstUser!.createdAt.getTime());
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const user = await getUserById(account.id);

      expect(user).not.toBeNull();
      expect(user!.id).toBe(account.id);
      expect(user!.username).toBe('test@example.com');
      expect(user!.role).toBe('account_owner');
      expect(user!.isActive).toBe(true);
      
      // Verify password hash is not included
      expect((user as any).passwordHash).toBeUndefined();
    });

    it('should return null for non-existent user', async () => {
      const user = await getUserById('00000000-0000-0000-0000-000000000000');
      expect(user).toBeNull();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const updated = await updateUserRole(account.id, 'admin');

      expect(updated.id).toBe(account.id);
      expect(updated.role).toBe('admin');

      // Verify in database
      const dbAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });
      expect(dbAccount!.role).toBe('admin');
    });

    it('should throw error for invalid role', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      await expect(updateUserRole(account.id, 'superadmin')).rejects.toThrow(
        'Invalid role: superadmin'
      );
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        updateUserRole('00000000-0000-0000-0000-000000000000', 'admin')
      ).rejects.toThrow('User not found');
    });

    it('should throw error when admin tries to change own role to non-admin', async () => {
      const adminAccount = await prisma.account.create({
        data: {
          username: 'self-demotion-admin@example.com',
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      await expect(
        updateUserRole(adminAccount.id, 'account_owner', adminAccount.id)
      ).rejects.toThrow('Cannot change your own admin role to a non-admin role');

      // Verify role is still admin
      const account = await prisma.account.findUnique({
        where: { id: adminAccount.id },
      });

      expect(account!.role).toBe('admin');
    });

    it('should allow admin to change own role to admin (no-op)', async () => {
      const adminAccount = await prisma.account.create({
        data: {
          username: 'no-op-admin@example.com',
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const updated = await updateUserRole(adminAccount.id, 'admin', adminAccount.id);

      expect(updated.id).toBe(adminAccount.id);
      expect(updated.role).toBe('admin');
    });

    it('should allow admin to change another user role to admin', async () => {
      const adminAccount = await prisma.account.create({
        data: {
          username: 'promote-admin@example.com',
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const targetAccount = await prisma.account.create({
        data: {
          username: 'promote-target@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const updated = await updateUserRole(targetAccount.id, 'admin', adminAccount.id);

      expect(updated.id).toBe(targetAccount.id);
      expect(updated.role).toBe('admin');

      // Verify in database
      const dbAccount = await prisma.account.findUnique({
        where: { id: targetAccount.id },
      });
      expect(dbAccount!.role).toBe('admin');
    });

    it('should allow non-admin to change own role when requestingAdminId not provided', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'user@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      // Without requestingAdminId, no self-protection check
      const updated = await updateUserRole(account.id, 'account_user');

      expect(updated.id).toBe(account.id);
      expect(updated.role).toBe('account_user');
    });
  });

  describe('updateUserEmail', () => {
    it('should update user email successfully', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'old@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const updated = await updateUserEmail(account.id, 'new@example.com');

      expect(updated.id).toBe(account.id);
      expect(updated.username).toBe('new@example.com');

      // Verify in database
      const dbAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });
      expect(dbAccount!.username).toBe('new@example.com');
    });

    it('should throw error for invalid email format', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      await expect(updateUserEmail(account.id, 'invalid-email')).rejects.toThrow(
        'Invalid email address format'
      );
    });

    it('should throw error if email already in use by another account', async () => {
      const account1 = await prisma.account.create({
        data: {
          username: 'user1@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const account2 = await prisma.account.create({
        data: {
          username: 'user2@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      await expect(
        updateUserEmail(account1.id, 'user2@example.com')
      ).rejects.toThrow('Email address already in use');
    });

    it('should allow updating to same email (no-op)', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const updated = await updateUserEmail(account.id, 'test@example.com');

      expect(updated.username).toBe('test@example.com');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        updateUserEmail('00000000-0000-0000-0000-000000000000', 'new@example.com')
      ).rejects.toThrow('User not found');
    });
  });

  describe('adminResetPassword', () => {
    it('should generate password reset token for user', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const result = await adminResetPassword(account.id);

      expect(result.success).toBe(true);

      // Verify token was created in database
      const tokens = await prisma.passwordResetToken.findMany({
        where: { accountId: account.id },
      });

      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        adminResetPassword('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('User not found');
    });
  });

  describe('setUserPassword', () => {
    it('should set new password for user directly', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const newPassword = 'NewPassword123!';
      const result = await setUserPassword(account.id, newPassword);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password updated successfully');

      // Verify password was updated in database
      const updatedAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });

      expect(updatedAccount).not.toBeNull();
      expect(updatedAccount!.passwordHash).not.toBe(testPasswordHash);

      // Verify new password works
      const passwordValid = await verifyPassword(newPassword, updatedAccount!.passwordHash);
      expect(passwordValid).toBe(true);

      // Verify old password no longer works
      const oldPasswordValid = await verifyPassword(testPassword, updatedAccount!.passwordHash);
      expect(oldPasswordValid).toBe(false);
    });

    it('should throw error for password less than 8 characters', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      await expect(setUserPassword(account.id, 'short')).rejects.toThrow(
        'Password must be at least 8 characters'
      );
    });

    it('should throw error for empty password', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      await expect(setUserPassword(account.id, '')).rejects.toThrow(
        'Password must be at least 8 characters'
      );
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        setUserPassword('00000000-0000-0000-0000-000000000000', 'ValidPassword123!')
      ).rejects.toThrow('User not found');
    });

    it('should hash password before storing', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const newPassword = 'NewPassword123!';
      await setUserPassword(account.id, newPassword);

      // Verify password is hashed (not stored in plain text)
      const updatedAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });

      expect(updatedAccount!.passwordHash).not.toBe(newPassword);
      expect(updatedAccount!.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should not send email notification', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      // This test verifies no password reset token is created
      const result = await setUserPassword(account.id, 'NewPassword123!');

      expect(result.success).toBe(true);

      // Verify no password reset token was created
      const tokens = await prisma.passwordResetToken.findMany({
        where: { accountId: account.id },
      });

      expect(tokens.length).toBe(0);
    });
  });

  describe('activateUser', () => {
    it('should activate an inactive user', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: false,
        },
      });

      const result = await activateUser(account.id);

      expect(result.id).toBe(account.id);
      expect(result.isActive).toBe(true);

      // Verify in database
      const updatedAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });

      expect(updatedAccount!.isActive).toBe(true);
    });

    it('should activate an already active user without error', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const result = await activateUser(account.id);

      expect(result.id).toBe(account.id);
      expect(result.isActive).toBe(true);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        activateUser('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('User not found');
    });

    it('should not include password hash in response', async () => {
      const account = await prisma.account.create({
        data: {
          username: 'test@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: false,
        },
      });

      const result = await activateUser(account.id);

      expect((result as any).passwordHash).toBeUndefined();
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate an active user', async () => {
      const adminAccount = await prisma.account.create({
        data: {
          username: 'deactivate-admin1@example.com',
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const targetAccount = await prisma.account.create({
        data: {
          username: 'deactivate-target1@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const result = await deactivateUser(targetAccount.id, adminAccount.id);

      expect(result.id).toBe(targetAccount.id);
      expect(result.isActive).toBe(false);

      // Verify in database
      const updatedAccount = await prisma.account.findUnique({
        where: { id: targetAccount.id },
      });

      expect(updatedAccount!.isActive).toBe(false);
    });

    it('should deactivate an already inactive user without error', async () => {
      const adminAccount = await prisma.account.create({
        data: {
          username: 'deactivate-admin2@example.com',
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const targetAccount = await prisma.account.create({
        data: {
          username: 'deactivate-target2@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: false,
        },
      });

      const result = await deactivateUser(targetAccount.id, adminAccount.id);

      expect(result.id).toBe(targetAccount.id);
      expect(result.isActive).toBe(false);
    });

    it('should throw error when admin tries to deactivate own account', async () => {
      const adminAccount = await prisma.account.create({
        data: {
          username: 'deactivate-admin3@example.com',
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      await expect(
        deactivateUser(adminAccount.id, adminAccount.id)
      ).rejects.toThrow('Cannot deactivate your own account');

      // Verify account is still active
      const account = await prisma.account.findUnique({
        where: { id: adminAccount.id },
      });

      expect(account!.isActive).toBe(true);
    });

    it('should throw error for non-existent user', async () => {
      const adminAccount = await prisma.account.create({
        data: {
          username: 'deactivate-admin4@example.com',
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      await expect(
        deactivateUser('00000000-0000-0000-0000-000000000000', adminAccount.id)
      ).rejects.toThrow('User not found');
    });

    it('should not include password hash in response', async () => {
      const adminAccount = await prisma.account.create({
        data: {
          username: 'deactivate-admin5@example.com',
          passwordHash: testPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });

      const targetAccount = await prisma.account.create({
        data: {
          username: 'deactivate-target5@example.com',
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      const result = await deactivateUser(targetAccount.id, adminAccount.id);

      expect((result as any).passwordHash).toBeUndefined();
    });
  });
});
