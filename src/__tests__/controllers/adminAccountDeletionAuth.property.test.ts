/**
 * Tests for Admin Account Deletion Authorization
 * 
 * Feature: admin-account-deletion, Property 6: Admin Authorization Required
 * Validates: Requirements 5.2
 * 
 * For any DELETE request to /api/admin/users/:id from a non-admin user,
 * the backend SHALL return a 401 or 403 error and the account SHALL remain in the database.
 */

import crypto from 'crypto';
import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestEmail } from '../helpers/testData';
import { generateTestToken } from '../helpers/testAuth';
import { hashPassword } from '../../services/auth';
import { AccountRole } from '../../types/account';

const randomUUID = () => crypto.randomUUID();

const app = createTestApp();
const db = getTestDb();

describe('Admin Authorization Required for Account Deletion', () => {
  let targetUser: { id: string };

  beforeAll(async () => {
    const passwordHash = await hashPassword('testpass123');
    targetUser = await db.account.create({
      data: {
        username: generateTestEmail('target-delete'),
        passwordHash: passwordHash,
        role: 'account_owner',
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    await db.account.delete({ where: { id: targetUser.id } }).catch(() => {});
    await cleanupTestDb();
    await db.$disconnect();
  });

  const nonAdminRoles: AccountRole[] = ['account_owner', 'account_user'];

  describe('Non-Admin Deletion Denial', () => {
    it.each(nonAdminRoles)('should deny %s from deleting users via admin endpoint', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('delete-auth'),
        role,
      });

      const response = await request(app)
        .delete(`/api/admin/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');

      const accountStillExists = await db.account.findUnique({
        where: { id: targetUser.id },
      });
      expect(accountStillExists).not.toBeNull();
    });
  });

  describe('Unauthenticated Deletion Denial', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${randomUUID()}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authorization Check Before Business Logic', () => {
    it.each(nonAdminRoles)('should return 403 (not 404) for %s deleting non-existent user', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('delete-auth-logic'),
        role,
      });

      const response = await request(app)
        .delete(`/api/admin/users/non-existent-user-id`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });
});
