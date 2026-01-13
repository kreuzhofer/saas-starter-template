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
 * Feature: account-management, Property 11: Non-admin access denial
 * Validates: Requirements 6.5, 6.6
 * 
 * For any account without the admin role attempting to access admin endpoints 
 * (user list, user updates), the system should return HTTP status 403.
 */

const app = createTestApp();
const db = getTestDb();

describe('Non-Admin Access Denial', () => {
  let testUserId: string;

  beforeEach(async () => {
    await cleanupTestDb();

    const passwordHash = await hashPassword('testpass123');
    const testUser = await db.account.create({
      data: {
        username: 'target@example.com',
        passwordHash: passwordHash,
        role: 'account_owner',
        isActive: true,
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await cleanupTestDb();
    await db.$disconnect();
  });

  const nonAdminRoles: AccountRole[] = ['account_owner', 'account_user'];

  describe('Admin Endpoint Access Denial', () => {
    it.each(nonAdminRoles)('should deny %s access to GET /api/admin/users', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('access-denial'),
        role,
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it.each(nonAdminRoles)('should deny %s access to GET /api/admin/users/:id', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('access-denial'),
        role,
      });

      const response = await request(app)
        .get(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it.each(nonAdminRoles)('should deny %s access to PATCH /api/admin/users/:id/role', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('access-denial'),
        role,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it.each(nonAdminRoles)('should deny %s access to PATCH /api/admin/users/:id/email', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('access-denial'),
        role,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${testUserId}/email`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newemail@example.com' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it.each(nonAdminRoles)('should deny %s access to POST /api/admin/users/:id/reset-password', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('access-denial'),
        role,
      });

      const response = await request(app)
        .post(`/api/admin/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('Authorization Check Before Business Logic', () => {
    it.each(nonAdminRoles)('should return 403 (not 400) for %s with invalid role payload', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('access-logic'),
        role,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'invalid_role' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it.each(nonAdminRoles)('should return 403 (not 400) for %s with invalid email payload', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('access-logic'),
        role,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${testUserId}/email`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it.each(nonAdminRoles)('should return 403 (not 400) for %s with missing body', async (role) => {
      const token = generateTestToken({
        accountId: randomUUID(),
        username: generateTestEmail('access-logic'),
        role,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });
});
