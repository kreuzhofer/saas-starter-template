/**
 * Property Tests for Admin Override Management API
 * 
 * Tests the override management endpoints including:
 * - Property 15: Override Limit Name Validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestToken } from '../helpers/testAuth';
import { getLimitNames } from '../../config/tierConfig';

const app = createTestApp();
const db = getTestDb();

describe('Admin Override Management API Properties', () => {
  let adminToken: string;
  let adminId: string;
  const testAccountIds: string[] = [];

  beforeAll(async () => {
    // Clean up database
    await cleanupTestDb();

    // Create admin account
    const admin = await db.account.create({
      data: {
        username: `admin-override-test-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        isActive: true,
        role: 'admin',
        tier: 'enterprise',
      },
    });
    testAccountIds.push(admin.id);

    adminId = admin.id;
    adminToken = generateTestToken({
      accountId: admin.id,
      username: admin.username,
      role: admin.role as 'admin',
    });
  });

  afterAll(async () => {
    // Clean up test accounts and their related data
    if (testAccountIds.length > 0) {
      await db.limitOverride.deleteMany({
        where: { accountId: { in: testAccountIds } },
      });
      await db.usageRecord.deleteMany({
        where: { accountId: { in: testAccountIds } },
      });
      await db.account.deleteMany({
        where: { id: { in: testAccountIds } },
      });
    }
  });

  beforeEach(async () => {
    // Clean up overrides before each test
    if (testAccountIds.length > 0) {
      await db.limitOverride.deleteMany({
        where: { accountId: { in: testAccountIds } },
      });
    }
  });

  /**
   * Helper to create a test account
   */
  async function createTestAccount(): Promise<string> {
    const account = await db.account.create({
      data: {
        username: `test-admin-override-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: 'test-hash',
        isActive: true,
        tier: 'starter',
      },
    });
    testAccountIds.push(account.id);
    return account.id;
  }

  /**
   * Property 15: Override Limit Name Validation
   * 
   * The API should:
   * - Accept valid limit names from the configuration
   * - Reject invalid limit names with 400 status
   */
  describe('Property 15: Override Limit Name Validation', () => {
    it('should accept valid limit names', async () => {
      const validLimitNames = getLimitNames();
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validLimitNames),
          fc.integer({ min: 1, max: 10000 }),
          async (limitName, value) => {
            const accountId = await createTestAccount();

            const response = await request(app)
              .post(`/api/admin/users/${accountId}/overrides`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ limitName, value });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.override.limitName).toBe(limitName);
            expect(response.body.override.overrideValue).toBe(value);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should reject invalid limit names with 400 status', async () => {
      const validLimitNames = getLimitNames();
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !validLimitNames.includes(s)),
          fc.integer({ min: 1, max: 10000 }),
          async (invalidLimitName, value) => {
            const accountId = await createTestAccount();

            const response = await request(app)
              .post(`/api/admin/users/${accountId}/overrides`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ limitName: invalidLimitName, value });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid limit name');
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('Override CRUD Operations via API', () => {
    it('should create, read, and delete overrides', async () => {
      const accountId = await createTestAccount();
      const limitName = 'short_urls_total';
      const value = 500;

      // Create override
      const createResponse = await request(app)
        .post(`/api/admin/users/${accountId}/overrides`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limitName, value });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      // Read overrides
      const getResponse = await request(app)
        .get(`/api/admin/users/${accountId}/overrides`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.overrides.length).toBe(1);
      expect(getResponse.body.overrides[0].limitName).toBe(limitName);
      expect(getResponse.body.overrides[0].overrideValue).toBe(value);

      // Delete override
      const deleteResponse = await request(app)
        .delete(`/api/admin/users/${accountId}/overrides/${limitName}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/admin/users/${accountId}/overrides`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.overrides.length).toBe(0);
    });

    it('should create override with expiration date', async () => {
      const accountId = await createTestAccount();
      const limitName = 'short_urls_total';
      const value = 1000;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      const response = await request(app)
        .post(`/api/admin/users/${accountId}/overrides`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limitName, value, expiresAt });

      expect(response.status).toBe(201);
      expect(response.body.override.isPermanent).toBe(false);
      expect(response.body.override.expiresAt).toBeTruthy();
    });

    it('should create permanent override when expiresAt is null', async () => {
      const accountId = await createTestAccount();
      const limitName = 'short_urls_total';
      const value = 1000;

      const response = await request(app)
        .post(`/api/admin/users/${accountId}/overrides`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limitName, value, expiresAt: null });

      expect(response.status).toBe(201);
      expect(response.body.override.isPermanent).toBe(true);
      expect(response.body.override.expiresAt).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/admin/users/${fakeUserId}/overrides`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should require authentication', async () => {
      const accountId = await createTestAccount();

      const response = await request(app)
        .get(`/api/admin/users/${accountId}/overrides`);

      expect(response.status).toBe(401);
    });

    it('should identify expiring soon overrides', async () => {
      const accountId = await createTestAccount();
      const limitName = 'short_urls_total';
      const value = 1000;
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days

      await request(app)
        .post(`/api/admin/users/${accountId}/overrides`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limitName, value, expiresAt });

      const response = await request(app)
        .get(`/api/admin/users/${accountId}/overrides`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.overrides[0].isExpiringSoon).toBe(true);
    });
  });
});
