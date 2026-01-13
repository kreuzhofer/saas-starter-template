/**
 * Property-Based Tests for Banner Data Persistence
 * 
 * Feature: 031-notification-banner-system, Property 15: Banner Data Round-Trip
 * Validates: Requirements 7.1-7.12
 */

import * as fc from 'fast-check';
import { getTestDb, cleanupTestDb, registerTestEntity } from '../helpers/testDb';
import { createTestAccount } from '../helpers/testData';

const db = getTestDb();

describe('Banner Repository - Property-Based Tests', () => {
  let testAccount: any;

  beforeEach(async () => {
    await cleanupTestDb();
    
    const result = await createTestAccount(db, {
      username: `banner-test-${Date.now()}@example.com`,
      password: 'password123',
    });
    testAccount = result.account;
    
    await db.account.update({
      where: { id: testAccount.id },
      data: { isActive: true },
    });
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('Property 15: Banner Data Round-Trip', () => {
    /**
     * For any valid banner with all optional fields populated (key, link, colors, scheduling),
     * when created in the database and then retrieved, all field values should match the original input.
     */
    it('should preserve all banner fields through create and retrieve operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random banner data
          fc.record({
            key: fc.option(fc.string({ minLength: 1, maxLength: 255 }), { nil: undefined }),
            useAccountId: fc.boolean(), // Whether to use test account or null
            type: fc.oneof(
              fc.constant('error'),
              fc.constant('warning'),
              fc.constant('info')
            ),
            message: fc.string({ minLength: 1, maxLength: 1000 }),
            dismissable: fc.boolean(),
            audience: fc.oneof(
              fc.constant('authenticated'),
              fc.constant('unauthenticated'),
              fc.constant('all')
            ),
            // Link configuration (optional)
            linkText: fc.option(fc.string({ minLength: 1, maxLength: 255 }), { nil: undefined }),
            linkUrl: fc.option(
              fc.webUrl({ validSchemes: ['http', 'https'] }),
              { nil: undefined }
            ),
            linkExternal: fc.boolean(),
            linkStyle: fc.option(
              fc.oneof(fc.constant('inline'), fc.constant('button')),
              { nil: undefined }
            ),
            // Custom colors (optional)
            backgroundColor: fc.option(
              fc.oneof(
                fc.constant('#FF0000'),
                fc.constant('#00FF00'),
                fc.constant('#0000FF'),
                fc.constant('rgb(255, 0, 0)'),
                fc.constant('blue'),
                fc.constant('red')
              ),
              { nil: undefined }
            ),
            textColor: fc.option(
              fc.oneof(
                fc.constant('#FFFFFF'),
                fc.constant('#000000'),
                fc.constant('#FFFF00'),
                fc.constant('rgb(255, 255, 255)'),
                fc.constant('white'),
                fc.constant('black')
              ),
              { nil: undefined }
            ),
            // Scheduling (optional)
            scheduledStart: fc.option(
              fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }).filter(d => !isNaN(d.getTime())),
              { nil: undefined }
            ),
            scheduledEnd: fc.option(
              fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }).filter(d => !isNaN(d.getTime())),
              { nil: undefined }
            ),
          }),
          async (bannerData) => {
            // Determine accountId based on flag
            const accountId = bannerData.useAccountId ? testAccount.id : null;
            
            // Ensure link fields are consistent (all present or all absent)
            const hasLink = bannerData.linkText !== undefined && bannerData.linkUrl !== undefined;
            const linkText = hasLink ? bannerData.linkText : null;
            const linkUrl = hasLink ? bannerData.linkUrl : null;
            const linkExternal = hasLink ? bannerData.linkExternal : false;
            const linkStyle = hasLink && bannerData.linkStyle ? bannerData.linkStyle : null;

            // Ensure scheduledEnd is after scheduledStart if both are present
            let scheduledStart = bannerData.scheduledStart || null;
            let scheduledEnd = bannerData.scheduledEnd || null;
            
            if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
              // Swap them or set scheduledEnd to null
              scheduledEnd = new Date(scheduledStart.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
            }

            // Create banner in database
            const createdBanner = await db.banner.create({
              data: {
                key: bannerData.key || null,
                accountId: accountId,
                type: bannerData.type,
                message: bannerData.message,
                dismissable: bannerData.dismissable,
                audience: bannerData.audience,
                linkText,
                linkUrl,
                linkExternal,
                linkStyle,
                backgroundColor: bannerData.backgroundColor || null,
                textColor: bannerData.textColor || null,
                scheduledStart,
                scheduledEnd,
              },
            });

            // Register for cleanup
            registerTestEntity('banners', createdBanner.id);

            // Retrieve banner from database
            const retrievedBanner = await db.banner.findUnique({
              where: { id: createdBanner.id },
            });

            // Verify banner was retrieved
            expect(retrievedBanner).not.toBeNull();
            if (!retrievedBanner) return; // Type guard

            // Verify all fields match
            expect(retrievedBanner.key).toBe(bannerData.key || null);
            expect(retrievedBanner.accountId).toBe(accountId);
            expect(retrievedBanner.type).toBe(bannerData.type);
            expect(retrievedBanner.message).toBe(bannerData.message);
            expect(retrievedBanner.dismissable).toBe(bannerData.dismissable);
            expect(retrievedBanner.audience).toBe(bannerData.audience);
            
            // Verify link fields
            expect(retrievedBanner.linkText).toBe(linkText);
            expect(retrievedBanner.linkUrl).toBe(linkUrl);
            expect(retrievedBanner.linkExternal).toBe(linkExternal);
            expect(retrievedBanner.linkStyle).toBe(linkStyle);
            
            // Verify color fields
            expect(retrievedBanner.backgroundColor).toBe(bannerData.backgroundColor || null);
            expect(retrievedBanner.textColor).toBe(bannerData.textColor || null);
            
            // Verify scheduling fields (compare timestamps)
            if (scheduledStart) {
              expect(retrievedBanner.scheduledStart?.getTime()).toBe(scheduledStart.getTime());
            } else {
              expect(retrievedBanner.scheduledStart).toBeNull();
            }
            
            if (scheduledEnd) {
              expect(retrievedBanner.scheduledEnd?.getTime()).toBe(scheduledEnd.getTime());
            } else {
              expect(retrievedBanner.scheduledEnd).toBeNull();
            }
            
            // Verify timestamps exist
            expect(retrievedBanner.createdAt).toBeInstanceOf(Date);
            expect(retrievedBanner.updatedAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000); // 2 minute timeout for property test

    it('should handle banners with minimal required fields only', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.oneof(
              fc.constant('error'),
              fc.constant('warning'),
              fc.constant('info')
            ),
            message: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async (bannerData) => {
            // Create banner with only required fields
            const createdBanner = await db.banner.create({
              data: {
                type: bannerData.type,
                message: bannerData.message,
                // All other fields should use defaults or be null
              },
            });

            // Register for cleanup
            registerTestEntity('banners', createdBanner.id);

            // Retrieve banner from database
            const retrievedBanner = await db.banner.findUnique({
              where: { id: createdBanner.id },
            });

            // Verify banner was retrieved
            expect(retrievedBanner).not.toBeNull();
            if (!retrievedBanner) return; // Type guard

            // Verify required fields
            expect(retrievedBanner.type).toBe(bannerData.type);
            expect(retrievedBanner.message).toBe(bannerData.message);
            
            // Verify defaults
            expect(retrievedBanner.dismissable).toBe(true); // Default value
            expect(retrievedBanner.audience).toBe('authenticated'); // Default value
            expect(retrievedBanner.linkExternal).toBe(false); // Default value
            
            // Verify optional fields are null
            expect(retrievedBanner.key).toBeNull();
            expect(retrievedBanner.accountId).toBeNull();
            expect(retrievedBanner.linkText).toBeNull();
            expect(retrievedBanner.linkUrl).toBeNull();
            expect(retrievedBanner.linkStyle).toBeNull();
            expect(retrievedBanner.backgroundColor).toBeNull();
            expect(retrievedBanner.textColor).toBeNull();
            expect(retrievedBanner.scheduledStart).toBeNull();
            expect(retrievedBanner.scheduledEnd).toBeNull();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle banners with account associations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.oneof(
              fc.constant('error'),
              fc.constant('warning'),
              fc.constant('info')
            ),
            message: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async (bannerData) => {
            // Create banner associated with test account
            const createdBanner = await db.banner.create({
              data: {
                accountId: testAccount.id,
                type: bannerData.type,
                message: bannerData.message,
              },
            });

            // Register for cleanup
            registerTestEntity('banners', createdBanner.id);

            // Retrieve banner with account relation
            const retrievedBanner = await db.banner.findUnique({
              where: { id: createdBanner.id },
              include: { account: true },
            });

            // Verify banner was retrieved
            expect(retrievedBanner).not.toBeNull();
            if (!retrievedBanner) return; // Type guard

            // Verify account association
            expect(retrievedBanner.accountId).toBe(testAccount.id);
            expect(retrievedBanner.account).not.toBeNull();
            expect(retrievedBanner.account?.id).toBe(testAccount.id);
            expect(retrievedBanner.account?.username).toBe(testAccount.username);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
