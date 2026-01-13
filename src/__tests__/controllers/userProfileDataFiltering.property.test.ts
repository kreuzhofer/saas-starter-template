import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb, registerTestEntity } from '../helpers/testDb';
import { generateTestEmail } from '../helpers/testData';
import { hashPassword, generateJWT } from '../../services/auth';
import { AccountRole } from '../../types/account';

const app = createTestApp();
const db = getTestDb();

/**
 * Feature: account-management, Property 12: User profile data filtering
 * 
 * For any authenticated account requesting their own profile information,
 * the response should include username, active status, and creation date,
 * but never the password hash or role.
 * 
 * Validates: Requirements 7.1, 7.2
 */
describe('User Profile Data Filtering', () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  const allRoles: AccountRole[] = ['admin', 'account_owner', 'account_user'];

  describe('Sensitive Data Exclusion', () => {
    it.each(allRoles)('should never include passwordHash or role for %s', async (role) => {
      const password = 'TestPassword123!';
      const passwordHash = await hashPassword(password);

      const account = await db.account.create({
        data: {
          username: generateTestEmail('profile-filter'),
          passwordHash,
          role,
          isActive: true,
        },
      });
      registerTestEntity('accounts', account.id);

      const token = generateJWT(account.id, account.username, role);

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', account.id);
      expect(response.body).toHaveProperty('username', account.username);
      expect(response.body).toHaveProperty('isActive', true);
      expect(response.body).toHaveProperty('createdAt');

      // Verify response NEVER includes sensitive fields
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('role');
      expect(response.body).not.toHaveProperty('password');

      // Verify the response doesn't contain the password hash value anywhere
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain(passwordHash);
      expect(responseString).not.toContain(role);
    });
  });

  describe('Required Fields Presence', () => {
    it.each([true, false])('should include required fields when isActive=%s', async (isActive) => {
      const passwordHash = await hashPassword('TestPassword123!');

      const account = await db.account.create({
        data: {
          username: generateTestEmail('profile-fields'),
          passwordHash,
          role: 'account_owner',
          isActive,
        },
      });
      registerTestEntity('accounts', account.id);

      const token = generateJWT(account.id, account.username, 'account_owner');

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Check that response has exactly the expected keys
      const responseKeys = Object.keys(response.body).sort();
      const expectedKeys = ['id', 'username', 'isActive', 'createdAt', 'language', 'firstName', 'lastName'].sort();

      expect(responseKeys).toEqual(expectedKeys);

      // Verify types
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.username).toBe('string');
      expect(typeof response.body.isActive).toBe('boolean');
      expect(typeof response.body.createdAt).toBe('string');
      expect(typeof response.body.language).toBe('string');
      expect(response.body.firstName === null || typeof response.body.firstName === 'string').toBe(true);
      expect(response.body.lastName === null || typeof response.body.lastName === 'string').toBe(true);

      // Verify createdAt is a valid date
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
      expect(isNaN(new Date(response.body.createdAt).getTime())).toBe(false);
    });
  });
});
