/**
 * Banner API Integration Tests
 * 
 * Tests complete workflows for banner management including creation, retrieval,
 * updates, deletion, and dismissal. Validates authorization (admin vs non-admin)
 * and validation errors.
 * 
 * Requirements: 11.1-11.7, 14.1-14.6
 * 
 * NOTE: All banners created in these tests use the '[BANNER-API-TEST]' prefix in messages
 * or 'banner-api-test-' prefix in keys to ensure proper cleanup by the test helper.
 */

import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestToken } from '../helpers/testAuth';
import { hashPassword } from '../../services/auth';

const app = createTestApp();
const db = getTestDb();

// Test key prefix for cleanup identification - all banners MUST use this prefix in their key
const TEST_KEY_PREFIX = 'banner-api-test-';

// Helper to generate unique test keys
function testKey(suffix: string): string {
  return `${TEST_KEY_PREFIX}${suffix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

describe('Banner API Integration Tests', () => {
  let adminToken: string;
  let adminAccountId: string;
  let regularUserToken: string;
  let regularUserId: string;

  beforeEach(async () => {
    await cleanupTestDb();

    // Create admin account
    const adminEmail = `admin-${Date.now()}-${Math.random()}@example.com`;
    const adminPasswordHash = await hashPassword('adminpass123');
    const adminAccount = await db.account.create({
      data: {
        username: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'admin',
        isActive: true,
      },
    });
    adminAccountId = adminAccount.id;
    adminToken = generateTestToken({
      accountId: adminAccount.id,
      username: adminAccount.username,
      role: 'admin',
    });

    // Create regular user account
    const regularUserEmail = `user-${Date.now()}-${Math.random()}@example.com`;
    const userPasswordHash = await hashPassword('userpass123');
    const userAccount = await db.account.create({
      data: {
        username: regularUserEmail,
        passwordHash: userPasswordHash,
        role: 'account_owner',
        isActive: true,
      },
    });
    regularUserId = userAccount.id;
    regularUserToken = generateTestToken({
      accountId: userAccount.id,
      username: userAccount.username,
      role: 'account_owner',
    });
  });


  describe('Complete banner workflow (create → retrieve → update → delete)', () => {
    it('should complete full workflow: create, list, get, update, delete', async () => {
      // Step 1: Create a banner
      const bannerKey = testKey('workflow');
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: bannerKey,
          type: 'info',
          message: 'Welcome to our platform!',
          dismissable: true,
          audience: 'all',
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.id).toBeTruthy();
      expect(createResponse.body.type).toBe('info');
      expect(createResponse.body.message).toBe('Welcome to our platform!');
      const bannerId = createResponse.body.id;

      // Step 2: List all banners
      const listResponse = await request(app)
        .get('/api/banners/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.banners.length).toBeGreaterThanOrEqual(1);
      const banner = listResponse.body.banners.find((b: any) => b.id === bannerId);
      expect(banner).toBeTruthy();
      expect(banner.message).toBe('Welcome to our platform!');

      // Step 3: Get banner by ID
      const getResponse = await request(app)
        .get(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(bannerId);
      expect(getResponse.body.message).toBe('Welcome to our platform!');

      // Step 4: Update banner
      const updateResponse = await request(app)
        .put(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'Updated welcome message!',
          type: 'warning',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.message).toBe('Updated welcome message!');
      expect(updateResponse.body.type).toBe('warning');

      // Verify update persisted
      const verifyResponse = await request(app)
        .get(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyResponse.body.message).toBe('Updated welcome message!');
      expect(verifyResponse.body.type).toBe('warning');

      // Step 5: Delete banner
      const deleteResponse = await request(app)
        .delete(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      const getDeletedResponse = await request(app)
        .get(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getDeletedResponse.status).toBe(404);
    });

    it('should handle key-based upsert workflow', async () => {
      const bannerKey = testKey('maintenance-notice');

      // Step 1: Create banner with key
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: bannerKey,
          type: 'warning',
          message: 'Scheduled maintenance at 2 AM',
          dismissable: false,
        });

      expect(createResponse.status).toBe(201);
      const firstBannerId = createResponse.body.id;
      expect(createResponse.body.key).toBe(bannerKey);

      // Step 2: Create another banner with same key (should update)
      const upsertResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: bannerKey,
          type: 'error',
          message: 'Maintenance extended to 4 AM',
          dismissable: false,
        });

      expect(upsertResponse.status).toBe(201);
      expect(upsertResponse.body.id).toBe(firstBannerId);
      expect(upsertResponse.body.message).toBe('Maintenance extended to 4 AM');
      expect(upsertResponse.body.type).toBe('error');

      // Step 3: Verify only one banner exists with this key
      const listResponse = await request(app)
        .get('/api/banners/all')
        .set('Authorization', `Bearer ${adminToken}`);

      const bannersWithKey = listResponse.body.banners.filter(
        (b: any) => b.key === bannerKey
      );
      expect(bannersWithKey.length).toBe(1);

      // Step 4: Delete by key
      const deleteResponse = await request(app)
        .delete(`/api/banners/key/${bannerKey}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.deletedCount).toBe(1);

      // Verify deletion
      const verifyResponse = await request(app)
        .get('/api/banners/all')
        .set('Authorization', `Bearer ${adminToken}`);

      const remainingBannersWithKey = verifyResponse.body.banners.filter(
        (b: any) => b.key === bannerKey
      );
      expect(remainingBannersWithKey.length).toBe(0);
    });

    it('should handle banner with link configuration', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('link-config'),
          type: 'info',
          message: 'Check out our new features',
          dismissable: true,
          link: {
            text: 'Learn More',
            url: 'https://example.com/features',
            external: true,
            style: 'button',
          },
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.link).toBeTruthy();
      expect(createResponse.body.link.text).toBe('Learn More');
      expect(createResponse.body.link.url).toBe('https://example.com/features');
      expect(createResponse.body.link.external).toBe(true);
      expect(createResponse.body.link.style).toBe('button');
    });

    it('should handle banner with custom colors', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('custom-colors'),
          type: 'info',
          message: 'Custom styled banner',
          backgroundColor: '#FF5733',
          textColor: '#FFFFFF',
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.backgroundColor).toBe('#FF5733');
      expect(createResponse.body.textColor).toBe('#FFFFFF');
    });

    it('should handle scheduled banners', async () => {
      const now = new Date();
      const futureStart = new Date(now.getTime() + 3600000);
      const futureEnd = new Date(now.getTime() + 7200000);

      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('scheduled'),
          type: 'info',
          message: 'Scheduled announcement',
          scheduledStart: futureStart.toISOString(),
          scheduledEnd: futureEnd.toISOString(),
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.scheduledStart).toBeTruthy();
      expect(createResponse.body.scheduledEnd).toBeTruthy();
    });
  });


  describe('Authorization (admin vs non-admin)', () => {
    it('should allow admin to create banners', async () => {
      const response = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('admin-create'),
          type: 'info',
          message: 'Admin created banner',
        });

      expect(response.status).toBe(201);
    });

    it('should deny non-admin from creating banners', async () => {
      const response = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          key: testKey('unauthorized'),
          type: 'info',
          message: 'Unauthorized banner',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should deny unauthenticated users from creating banners', async () => {
      const response = await request(app)
        .post('/api/banners')
        .send({
          key: testKey('unauthenticated'),
          type: 'info',
          message: 'Unauthenticated banner',
        });

      expect(response.status).toBe(401);
    });

    it('should deny non-admin from listing all banners', async () => {
      const response = await request(app)
        .get('/api/banners/all')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny non-admin from getting banner by ID', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('get-by-id'),
          type: 'info',
          message: 'Test banner',
        });

      const bannerId = createResponse.body.id;

      const getResponse = await request(app)
        .get(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(getResponse.status).toBe(403);
    });

    it('should deny non-admin from updating banners', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('update-denied'),
          type: 'info',
          message: 'Test banner',
        });

      const bannerId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          message: 'Updated message',
        });

      expect(updateResponse.status).toBe(403);
    });

    it('should deny non-admin from deleting banners', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('delete-denied'),
          type: 'info',
          message: 'Test banner',
        });

      const bannerId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(deleteResponse.status).toBe(403);
    });

    it('should allow authenticated users to get active banners', async () => {
      await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('active-auth'),
          type: 'info',
          message: 'Active banner',
          audience: 'all',
        });

      const response = await request(app)
        .get('/api/banners/active')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.banners).toBeTruthy();
    });

    it('should allow unauthenticated users to get active banners', async () => {
      await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('public'),
          type: 'info',
          message: 'Public banner',
          audience: 'all',
        });

      const response = await request(app).get('/api/banners/active');

      expect(response.status).toBe(200);
      expect(response.body.banners).toBeTruthy();
    });

    it('should allow authenticated users to dismiss banners', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('dismissable'),
          type: 'info',
          message: 'Dismissable banner',
          dismissable: true,
          audience: 'all',
        });

      const bannerId = createResponse.body.id;

      const dismissResponse = await request(app)
        .post(`/api/banners/${bannerId}/dismiss`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(dismissResponse.status).toBe(200);
      expect(dismissResponse.body.success).toBe(true);
    });

    it('should deny unauthenticated users from dismissing banners', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('dismiss-denied'),
          type: 'info',
          message: 'Dismissable banner',
          dismissable: true,
        });

      const bannerId = createResponse.body.id;

      const dismissResponse = await request(app).post(
        `/api/banners/${bannerId}/dismiss`
      );

      expect(dismissResponse.status).toBe(401);
    });
  });


  describe('Validation errors', () => {
    it('should reject banner creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('missing-fields'),
          type: 'info',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeTruthy();
    });

    it('should reject banner creation with invalid type', async () => {
      const response = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('invalid-type'),
          type: 'critical',
          message: 'Test message',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject banner creation with invalid audience', async () => {
      const response = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('invalid-audience'),
          type: 'info',
          message: 'Test message',
          audience: 'everyone',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject banner creation with invalid link URL', async () => {
      const response = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('invalid-link-url'),
          type: 'info',
          message: 'Test message',
          link: {
            text: 'Click here',
            url: 'not-a-valid-url',
            external: true,
            style: 'button',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject banner creation with invalid link style', async () => {
      const response = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('invalid-link-style'),
          type: 'info',
          message: 'Test message',
          link: {
            text: 'Click here',
            url: 'https://example.com',
            external: true,
            style: 'hyperlink',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject banner creation with scheduledEnd before scheduledStart', async () => {
      const now = new Date();
      const start = new Date(now.getTime() + 7200000);
      const end = new Date(now.getTime() + 3600000);

      const response = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('invalid-schedule'),
          type: 'info',
          message: 'Test message',
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject banner creation with message exceeding max length', async () => {
      const longMessage = 'a'.repeat(5001);

      const response = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'info',
          message: longMessage,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject banner update with invalid data', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('update-invalid'),
          type: 'info',
          message: 'Test banner',
        });

      const bannerId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/banners/${bannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'invalid-type',
        });

      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.error).toBe('Validation failed');
    });

    it('should return 404 when updating non-existent banner', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/banners/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'Updated message',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 when deleting non-existent banner', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/banners/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 when dismissing non-existent banner', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/banners/${fakeId}/dismiss`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });


  describe('Banner dismissal workflow', () => {
    it('should allow user to dismiss banner and not see it again', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('dismiss-workflow'),
          type: 'info',
          message: 'Dismissable banner',
          dismissable: true,
          audience: 'all',
        });

      const bannerId = createResponse.body.id;

      const beforeDismiss = await request(app)
        .get('/api/banners/active')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(beforeDismiss.status).toBe(200);
      const bannerBeforeDismiss = beforeDismiss.body.banners.find(
        (b: any) => b.id === bannerId
      );
      expect(bannerBeforeDismiss).toBeTruthy();

      const dismissResponse = await request(app)
        .post(`/api/banners/${bannerId}/dismiss`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(dismissResponse.status).toBe(200);

      const afterDismiss = await request(app)
        .get('/api/banners/active')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(afterDismiss.status).toBe(200);
      const bannerAfterDismiss = afterDismiss.body.banners.find(
        (b: any) => b.id === bannerId
      );
      expect(bannerAfterDismiss).toBeUndefined();
    });

    it('should handle dismissing already dismissed banner', async () => {
      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('double-dismiss'),
          type: 'info',
          message: 'Dismissable banner',
          dismissable: true,
          audience: 'all',
        });

      const bannerId = createResponse.body.id;

      await request(app)
        .post(`/api/banners/${bannerId}/dismiss`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      const secondDismiss = await request(app)
        .post(`/api/banners/${bannerId}/dismiss`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(secondDismiss.status).toBe(200);
      expect(secondDismiss.body.success).toBe(true);
    });

    it('should isolate dismissals between different users', async () => {
      const anotherUserEmail = `banner-test-another-${Date.now()}@example.com`;
      const anotherUserPasswordHash = await hashPassword('password123');
      const anotherUser = await db.account.create({
        data: {
          username: anotherUserEmail,
          passwordHash: anotherUserPasswordHash,
          role: 'account_owner',
          isActive: true,
        },
      });
      const anotherUserToken = generateTestToken({
        accountId: anotherUser.id,
        username: anotherUser.username,
        role: 'account_owner',
      });

      const createResponse = await request(app)
        .post('/api/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: testKey('isolate-dismiss'),
          type: 'info',
          message: 'Dismissable banner',
          dismissable: true,
          audience: 'all',
        });

      const bannerId = createResponse.body.id;

      await request(app)
        .post(`/api/banners/${bannerId}/dismiss`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      const user1Response = await request(app)
        .get('/api/banners/active')
        .set('Authorization', `Bearer ${regularUserToken}`);

      const user1Banner = user1Response.body.banners.find(
        (b: any) => b.id === bannerId
      );
      expect(user1Banner).toBeUndefined();

      const user2Response = await request(app)
        .get('/api/banners/active')
        .set('Authorization', `Bearer ${anotherUserToken}`);

      const user2Banner = user2Response.body.banners.find(
        (b: any) => b.id === bannerId
      );
      expect(user2Banner).toBeTruthy();
    });
  });
});
