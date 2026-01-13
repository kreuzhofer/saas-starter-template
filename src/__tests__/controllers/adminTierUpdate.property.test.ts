/**
 * Tests for Admin Tier Update Validation
 * 
 * Feature: account-tiers-and-limits, Property 4: Tier Update Validation
 * Validates: Requirements 2.6
 * 
 * For any tier update request, the update shall succeed if and only if
 * the provided tier value is one of the four valid tiers (starter, pro, business, enterprise).
 */

import crypto from 'crypto';
import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { generateTestEmail } from '../helpers/testData';
import { generateJWT } from '../../services/auth';
import { ACCOUNT_TIERS, type AccountTier } from '../../types/accountTier';
import { AccountRole } from '../../types/account';

const randomUUID = () => crypto.randomUUID();

const app = createTestApp();
const db = getTestDb();

describe('Tier Update Validation', () => {
  afterEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  const validTiers: AccountTier[] = ['starter', 'pro', 'business', 'enterprise'];
  const nonAdminRoles: AccountRole[] = ['account_owner', 'account_user'];

  describe('Valid Tier Updates', () => {
    it.each(validTiers)('should accept tier update to %s', async (newTier) => {
      const adminAccount = await db.account.create({
        data: {
          username: generateTestEmail('tier-admin'),
          passwordHash: 'hashed_password',
          role: 'admin',
          isActive: true,
        },
      });

      const targetAccount = await db.account.create({
        data: {
          username: generateTestEmail('tier-target'),
          passwordHash: 'hashed_password',
          role: 'account_owner',
          tier: 'starter',
          isActive: true,
        },
      });

      try {
        const token = generateJWT(adminAccount.id, adminAccount.username, 'admin');

        const response = await request(app)
          .patch(`/api/admin/users/${targetAccount.id}/tier`)
          .set('Authorization', `Bearer ${token}`)
          .send({ tier: newTier });

        expect(response.status).toBe(200);
        expect(response.body.tier).toBe(newTier);

        const updatedAccount = await db.account.findUnique({ where: { id: targetAccount.id } });
        expect(updatedAccount?.tier).toBe(newTier);
      } finally {
        await db.account.delete({ where: { id: targetAccount.id } }).catch(() => {});
        await db.account.delete({ where: { id: adminAccount.id } }).catch(() => {});
      }
    });
  });

  describe('Invalid Tier Rejection', () => {
    const invalidTiers = ['invalid', 'premium', 'free', 'gold', ''];

    it.each(invalidTiers)('should reject invalid tier value: "%s"', async (invalidTier) => {
      const adminAccount = await db.account.create({
        data: {
          username: generateTestEmail('tier-admin'),
          passwordHash: 'hashed_password',
          role: 'admin',
          isActive: true,
        },
      });

      const targetAccount = await db.account.create({
        data: {
          username: generateTestEmail('tier-target'),
          passwordHash: 'hashed_password',
          role: 'account_owner',
          tier: 'starter',
          isActive: true,
        },
      });

      try {
        const token = generateJWT(adminAccount.id, adminAccount.username, 'admin');

        const response = await request(app)
          .patch(`/api/admin/users/${targetAccount.id}/tier`)
          .set('Authorization', `Bearer ${token}`)
          .send({ tier: invalidTier });

        expect(response.status).toBe(400);
        expect(response.body.error.toLowerCase()).toContain('invalid tier');

        const unchangedAccount = await db.account.findUnique({ where: { id: targetAccount.id } });
        expect(unchangedAccount?.tier).toBe('starter');
      } finally {
        await db.account.delete({ where: { id: targetAccount.id } }).catch(() => {});
        await db.account.delete({ where: { id: adminAccount.id } }).catch(() => {});
      }
    });
  });

  describe('Non-String Tier Rejection', () => {
    const nonStringValues = [123, true, null, ['starter'], { tier: 'starter' }];

    it.each(nonStringValues)('should reject non-string tier value: %p', async (invalidValue) => {
      const adminAccount = await db.account.create({
        data: {
          username: generateTestEmail('tier-admin'),
          passwordHash: 'hashed_password',
          role: 'admin',
          isActive: true,
        },
      });

      const targetAccount = await db.account.create({
        data: {
          username: generateTestEmail('tier-target'),
          passwordHash: 'hashed_password',
          role: 'account_owner',
          tier: 'starter',
          isActive: true,
        },
      });

      try {
        const token = generateJWT(adminAccount.id, adminAccount.username, 'admin');

        const response = await request(app)
          .patch(`/api/admin/users/${targetAccount.id}/tier`)
          .set('Authorization', `Bearer ${token}`)
          .send({ tier: invalidValue });

        expect(response.status).toBe(400);

        const unchangedAccount = await db.account.findUnique({ where: { id: targetAccount.id } });
        expect(unchangedAccount?.tier).toBe('starter');
      } finally {
        await db.account.delete({ where: { id: targetAccount.id } }).catch(() => {});
        await db.account.delete({ where: { id: adminAccount.id } }).catch(() => {});
      }
    });
  });

  describe('Non-Existent User', () => {
    it('should return 404 for non-existent user', async () => {
      const adminAccount = await db.account.create({
        data: {
          username: generateTestEmail('tier-admin'),
          passwordHash: 'hashed_password',
          role: 'admin',
          isActive: true,
        },
      });

      try {
        const token = generateJWT(adminAccount.id, adminAccount.username, 'admin');

        const response = await request(app)
          .patch(`/api/admin/users/${randomUUID()}/tier`)
          .set('Authorization', `Bearer ${token}`)
          .send({ tier: 'pro' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBeDefined();
      } finally {
        await db.account.delete({ where: { id: adminAccount.id } }).catch(() => {});
      }
    });
  });

  describe('Non-Admin Authorization Denial', () => {
    it.each(nonAdminRoles)('should deny %s from updating tiers', async (role) => {
      const nonAdminAccount = await db.account.create({
        data: {
          username: generateTestEmail('tier-nonadmin'),
          passwordHash: 'hashed_password',
          role,
          isActive: true,
        },
      });

      const targetAccount = await db.account.create({
        data: {
          username: generateTestEmail('tier-target'),
          passwordHash: 'hashed_password',
          role: 'account_owner',
          tier: 'starter',
          isActive: true,
        },
      });

      try {
        const token = generateJWT(nonAdminAccount.id, nonAdminAccount.username, role);

        const response = await request(app)
          .patch(`/api/admin/users/${targetAccount.id}/tier`)
          .set('Authorization', `Bearer ${token}`)
          .send({ tier: 'pro' });

        expect(response.status).toBe(403);

        const unchangedAccount = await db.account.findUnique({ where: { id: targetAccount.id } });
        expect(unchangedAccount?.tier).toBe('starter');
      } finally {
        await db.account.delete({ where: { id: targetAccount.id } }).catch(() => {});
        await db.account.delete({ where: { id: nonAdminAccount.id } }).catch(() => {});
      }
    });
  });
});
