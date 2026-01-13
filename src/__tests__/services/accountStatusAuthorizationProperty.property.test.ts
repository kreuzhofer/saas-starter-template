import crypto from 'crypto';
import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestEmail } from '../helpers/testData';
import { generateTestToken } from '../helpers/testAuth';
import { hashPassword } from '../../services/auth';
import { AccountRole } from '../../types/account';

const randomUUID = () => crypto.randomUUID();

/**
 * Feature: account-management, Property 29: Account status management authorization
 * Validates: Requirements 12.6
 * 
 * For any non-admin account attempting to activate or deactivate any account,
 * the system should return HTTP status 403.
 */

const app = createTestApp();
const db = getTestDb();

describe('Account Status Management Authorization', () => {
  let testPasswordHash: string;

  beforeAll(async () => {
    testPasswordHash = await hashPassword('TestPassword123!');
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await db.$disconnect();
  });

  const nonAdminRoles: AccountRole[] = ['account_owner', 'account_user'];
  const operations = ['activate', 'deactivate'] as const;

  describe('Non-Admin Activation/Deactivation Denial', () => {
    it.each(nonAdminRoles)('should deny %s from activating users', async (role) => {
      const targetUser = await db.account.create({
        data: {
          username: generateTestEmail('status-target'),
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: false,
        },
      });

      try {
        const token = generateTestToken({
          accountId: randomUUID(),
          username: generateTestEmail('status-user'),
          role,
        });

        const response = await request(app)
          .patch(`/api/admin/users/${targetUser.id}/activate`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Insufficient permissions');

        const unchangedUser = await db.account.findUnique({ where: { id: targetUser.id } });
        expect(unchangedUser!.isActive).toBe(false);
      } finally {
        await db.account.delete({ where: { id: targetUser.id } }).catch(() => {});
      }
    });

    it.each(nonAdminRoles)('should deny %s from deactivating users', async (role) => {
      const targetUser = await db.account.create({
        data: {
          username: generateTestEmail('status-target'),
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });

      try {
        const token = generateTestToken({
          accountId: randomUUID(),
          username: generateTestEmail('status-user'),
          role,
        });

        const response = await request(app)
          .patch(`/api/admin/users/${targetUser.id}/deactivate`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Insufficient permissions');

        const unchangedUser = await db.account.findUnique({ where: { id: targetUser.id } });
        expect(unchangedUser!.isActive).toBe(true);
      } finally {
        await db.account.delete({ where: { id: targetUser.id } }).catch(() => {});
      }
    });
  });

  describe('Non-Admin Self-Status Change Denial', () => {
    it.each(nonAdminRoles)('should deny %s from activating their own account', async (role) => {
      const user = await db.account.create({
        data: {
          username: generateTestEmail('status-self'),
          passwordHash: testPasswordHash,
          role,
          isActive: false,
        },
      });

      try {
        const token = generateTestToken({
          accountId: user.id,
          username: user.username,
          role,
        });

        const response = await request(app)
          .patch(`/api/admin/users/${user.id}/activate`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Insufficient permissions');

        const unchangedUser = await db.account.findUnique({ where: { id: user.id } });
        expect(unchangedUser!.isActive).toBe(false);
      } finally {
        await db.account.delete({ where: { id: user.id } }).catch(() => {});
      }
    });

    it.each(nonAdminRoles)('should deny %s from deactivating their own account', async (role) => {
      const user = await db.account.create({
        data: {
          username: generateTestEmail('status-self'),
          passwordHash: testPasswordHash,
          role,
          isActive: true,
        },
      });

      try {
        const token = generateTestToken({
          accountId: user.id,
          username: user.username,
          role,
        });

        const response = await request(app)
          .patch(`/api/admin/users/${user.id}/deactivate`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Insufficient permissions');

        const unchangedUser = await db.account.findUnique({ where: { id: user.id } });
        expect(unchangedUser!.isActive).toBe(true);
      } finally {
        await db.account.delete({ where: { id: user.id } }).catch(() => {});
      }
    });
  });

  describe('Non-Admin Denial Across Target Roles', () => {
    const targetRoles: AccountRole[] = ['admin', 'account_owner', 'account_user'];

    it.each(
      nonAdminRoles.flatMap(attackerRole =>
        targetRoles.flatMap(targetRole =>
          operations.map(op => ({ attackerRole, targetRole, op }))
        )
      )
    )('should deny $attackerRole from ${op}ing $targetRole', async ({ attackerRole, targetRole, op }) => {
      const targetUser = await db.account.create({
        data: {
          username: generateTestEmail('status-target'),
          passwordHash: testPasswordHash,
          role: targetRole,
          isActive: op === 'activate' ? false : true,
        },
      });

      try {
        const token = generateTestToken({
          accountId: randomUUID(),
          username: generateTestEmail('status-attacker'),
          role: attackerRole,
        });

        const response = await request(app)
          .patch(`/api/admin/users/${targetUser.id}/${op}`)
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Insufficient permissions');
      } finally {
        await db.account.delete({ where: { id: targetUser.id } }).catch(() => {});
      }
    });
  });

  describe('Authorization Check Before Status Change', () => {
    it.each(
      nonAdminRoles.flatMap(role => operations.map(op => ({ role, op })))
    )('should return 403 (not 404) for $role attempting to $op non-existent user', async ({ role, op }) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('status-user'),
        role,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${randomUUID()}/${op}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('Admin Access Allowed', () => {
    it.each(operations)('should allow admin to %s users', async (op) => {
      const targetUser = await db.account.create({
        data: {
          username: generateTestEmail('status-target'),
          passwordHash: testPasswordHash,
          role: 'account_owner',
          isActive: op === 'activate' ? false : true,
        },
      });

      try {
        const adminToken = generateTestToken({
          accountId: randomUUID(),
          username: generateTestEmail('status-admin'),
          role: 'admin',
        });

        const response = await request(app)
          .patch(`/api/admin/users/${targetUser.id}/${op}`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Admin should not get 403
        expect(response.status).not.toBe(403);
      } finally {
        await db.account.delete({ where: { id: targetUser.id } }).catch(() => {});
      }
    });
  });
});
