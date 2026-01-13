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
 * Feature: account-management, Property 24: Password setting authorization
 * Validates: Requirements 11.4
 * 
 * For any non-admin account attempting to set a password for another account,
 * the system should return HTTP status 403.
 */

const app = createTestApp();
const db = getTestDb();

describe('Password Setting Authorization', () => {
  let targetUserId: string;
  let testPasswordHash: string;

  beforeAll(async () => {
    testPasswordHash = await hashPassword('TestPassword123!');
  });

  beforeEach(async () => {
    await cleanupTestDb();

    const targetUser = await db.account.create({
      data: {
        username: 'target@example.com',
        passwordHash: testPasswordHash,
        role: 'account_owner',
        isActive: true,
      },
    });
    targetUserId = targetUser.id;
  });

  afterAll(async () => {
    await cleanupTestDb();
    await db.$disconnect();
  });

  const nonAdminRoles: AccountRole[] = ['account_owner', 'account_user'];
  const targetRoles: AccountRole[] = ['admin', 'account_owner', 'account_user'];

  describe('Non-Admin Password Setting Denial', () => {
    it.each(nonAdminRoles)('should deny %s from setting passwords', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('pwd-auth-deny'),
        role,
      });

      const response = await request(app)
        .post(`/api/admin/users/${targetUserId}/set-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'NewPassword123!' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');

      const unchangedUser = await db.account.findUnique({ where: { id: targetUserId } });
      expect(unchangedUser!.passwordHash).toBe(testPasswordHash);
    });
  });

  describe('Non-Admin Denial Across Target Roles', () => {
    it.each(
      nonAdminRoles.flatMap(attackerRole =>
        targetRoles.map(targetRole => ({ attackerRole, targetRole }))
      )
    )('should deny $attackerRole from setting password for $targetRole', async ({ attackerRole, targetRole }) => {
      const targetUser = await db.account.create({
        data: {
          username: generateTestEmail('pwd-auth-target'),
          passwordHash: testPasswordHash,
          role: targetRole,
          isActive: true,
        },
      });

      try {
        const token = generateTestToken({
          accountId: randomUUID(),
          username: generateTestEmail('pwd-auth-nonadmin'),
          role: attackerRole,
        });

        const response = await request(app)
          .post(`/api/admin/users/${targetUser.id}/set-password`)
          .set('Authorization', `Bearer ${token}`)
          .send({ password: 'NewPassword123!' });

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Insufficient permissions');

        const unchangedUser = await db.account.findUnique({ where: { id: targetUser.id } });
        expect(unchangedUser!.passwordHash).toBe(testPasswordHash);
      } finally {
        await db.account.delete({ where: { id: targetUser.id } }).catch(() => {});
      }
    });
  });

  describe('Non-Admin Self Password Setting Denial', () => {
    it.each(nonAdminRoles)('should deny %s from setting their own password via admin endpoint', async (role) => {
      const user = await db.account.create({
        data: {
          username: generateTestEmail('pwd-auth-self'),
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
          .post(`/api/admin/users/${user.id}/set-password`)
          .set('Authorization', `Bearer ${token}`)
          .send({ password: 'NewPassword123!' });

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Insufficient permissions');

        const unchangedUser = await db.account.findUnique({ where: { id: user.id } });
        expect(unchangedUser!.passwordHash).toBe(testPasswordHash);
      } finally {
        await db.account.delete({ where: { id: user.id } }).catch(() => {});
      }
    });
  });

  describe('Authorization Check Before Validation', () => {
    it.each(nonAdminRoles)('should return 403 (not 400) for %s with invalid password', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('pwd-auth-validate'),
        role,
      });

      const response = await request(app)
        .post(`/api/admin/users/${targetUserId}/set-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'short' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it.each(nonAdminRoles)('should return 403 (not 400) for %s with missing body', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('pwd-auth-body'),
        role,
      });

      const response = await request(app)
        .post(`/api/admin/users/${targetUserId}/set-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('Admin Access Allowed', () => {
    it('should allow admin to set passwords', async () => {
      const adminToken = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('pwd-auth-admin'),
        role: 'admin',
      });

      const response = await request(app)
        .post(`/api/admin/users/${targetUserId}/set-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'NewPassword123!' });

      expect(response.status).not.toBe(403);
    });
  });
});
