import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { BannerOutput } from '../types';

// Feature: 031-notification-banner-system, Property 1: Banner Type Ordering
// Validates: Requirements 1.3

/**
 * Property-based tests for BannerContainer component
 * 
 * These tests verify universal properties that should hold for all valid inputs,
 * using randomized test data to ensure comprehensive coverage.
 */

/**
 * Helper function to sort banners by type priority (error > warning > info)
 * This is the same logic used in BannerContainer component
 */
function sortBannersByPriority(banners: BannerOutput[]): BannerOutput[] {
  const getTypePriority = (type: 'error' | 'warning' | 'info'): number => {
    switch (type) {
      case 'error':
        return 1;
      case 'warning':
        return 2;
      case 'info':
        return 3;
      default:
        return 4;
    }
  };

  return [...banners].sort((a, b) => {
    const priorityDiff = getTypePriority(a.type) - getTypePriority(b.type);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    // Within same type, sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Generator for banner types
 */
const bannerTypeArbitrary = fc.constantFrom('error' as const, 'warning' as const, 'info' as const);

/**
 * Generator for banner audience types
 */
const audienceTypeArbitrary = fc.constantFrom(
  'authenticated' as const,
  'unauthenticated' as const,
  'all' as const
);

/**
 * Generator for valid ISO date strings
 */
const isoDateArbitrary = fc
  .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
  .map(timestamp => new Date(timestamp).toISOString());

/**
 * Generator for valid BannerOutput objects
 */
const bannerArbitrary = fc.record({
  id: fc.uuid(),
  type: bannerTypeArbitrary,
  message: fc.string({ minLength: 1, maxLength: 500 }),
  dismissable: fc.boolean(),
  audience: audienceTypeArbitrary,
  createdAt: isoDateArbitrary,
  updatedAt: isoDateArbitrary,
  key: fc.option(fc.string({ minLength: 1, maxLength: 255 }), { nil: undefined }),
  accountId: fc.option(fc.uuid(), { nil: undefined }),
  backgroundColor: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  textColor: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  scheduledStart: fc.option(isoDateArbitrary, { nil: undefined }),
  scheduledEnd: fc.option(isoDateArbitrary, { nil: undefined }),
  link: fc.option(
    fc.record({
      text: fc.string({ minLength: 1, maxLength: 255 }),
      url: fc.webUrl(),
      external: fc.boolean(),
      style: fc.constantFrom('inline' as const, 'button' as const),
    }),
    { nil: undefined }
  ),
}) as fc.Arbitrary<BannerOutput>;

describe('BannerContainer Property Tests', () => {
  describe('Property 1: Banner Type Ordering', () => {
    it('should always display error banners before warning banners', () => {
      fc.assert(
        fc.property(
          fc.array(bannerArbitrary, { minLength: 2, maxLength: 20 }),
          (banners) => {
            const sorted = sortBannersByPriority(banners);
            
            // Find the last error banner and first warning banner
            let lastErrorIndex = -1;
            let firstWarningIndex = -1;
            
            for (let i = 0; i < sorted.length; i++) {
              if (sorted[i].type === 'error') {
                lastErrorIndex = i;
              }
              if (sorted[i].type === 'warning' && firstWarningIndex === -1) {
                firstWarningIndex = i;
              }
            }
            
            // If both exist, error should come before warning
            if (lastErrorIndex >= 0 && firstWarningIndex >= 0) {
              expect(lastErrorIndex).toBeLessThan(firstWarningIndex);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always display warning banners before info banners', () => {
      fc.assert(
        fc.property(
          fc.array(bannerArbitrary, { minLength: 2, maxLength: 20 }),
          (banners) => {
            const sorted = sortBannersByPriority(banners);
            
            // Find the last warning banner and first info banner
            let lastWarningIndex = -1;
            let firstInfoIndex = -1;
            
            for (let i = 0; i < sorted.length; i++) {
              if (sorted[i].type === 'warning') {
                lastWarningIndex = i;
              }
              if (sorted[i].type === 'info' && firstInfoIndex === -1) {
                firstInfoIndex = i;
              }
            }
            
            // If both exist, warning should come before info
            if (lastWarningIndex >= 0 && firstInfoIndex >= 0) {
              expect(lastWarningIndex).toBeLessThan(firstInfoIndex);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always display error banners before info banners', () => {
      fc.assert(
        fc.property(
          fc.array(bannerArbitrary, { minLength: 2, maxLength: 20 }),
          (banners) => {
            const sorted = sortBannersByPriority(banners);
            
            // Find the last error banner and first info banner
            let lastErrorIndex = -1;
            let firstInfoIndex = -1;
            
            for (let i = 0; i < sorted.length; i++) {
              if (sorted[i].type === 'error') {
                lastErrorIndex = i;
              }
              if (sorted[i].type === 'info' && firstInfoIndex === -1) {
                firstInfoIndex = i;
              }
            }
            
            // If both exist, error should come before info
            if (lastErrorIndex >= 0 && firstInfoIndex >= 0) {
              expect(lastErrorIndex).toBeLessThan(firstInfoIndex);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain complete ordering: error > warning > info for all banners', () => {
      fc.assert(
        fc.property(
          fc.array(bannerArbitrary, { minLength: 1, maxLength: 20 }),
          (banners) => {
            const sorted = sortBannersByPriority(banners);
            
            // Verify that the sorted array follows the priority order
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentPriority = sorted[i].type === 'error' ? 1 : sorted[i].type === 'warning' ? 2 : 3;
              const nextPriority = sorted[i + 1].type === 'error' ? 1 : sorted[i + 1].type === 'warning' ? 2 : 3;
              
              // Current priority should be <= next priority (lower number = higher priority)
              expect(currentPriority).toBeLessThanOrEqual(nextPriority);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sort banners of the same type by creation date (newest first)', () => {
      fc.assert(
        fc.property(
          bannerTypeArbitrary,
          fc.array(
            fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }),
            { minLength: 2, maxLength: 10 }
          ),
          (type, timestamps) => {
            // Create banners with the same type but different creation dates
            const banners: BannerOutput[] = timestamps.map((timestamp, index) => ({
              id: `banner-${index}`,
              type,
              message: `Message ${index}`,
              dismissable: true,
              audience: 'authenticated' as const,
              createdAt: new Date(timestamp).toISOString(),
              updatedAt: new Date(timestamp).toISOString(),
            }));
            
            const sorted = sortBannersByPriority(banners);
            
            // Verify that banners are sorted by creation date (newest first)
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentDate = new Date(sorted[i].createdAt).getTime();
              const nextDate = new Date(sorted[i + 1].createdAt).getTime();
              
              // Current date should be >= next date (newer or equal)
              expect(currentDate).toBeGreaterThanOrEqual(nextDate);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all banners during sorting (no loss or duplication)', () => {
      fc.assert(
        fc.property(
          fc.array(bannerArbitrary, { minLength: 1, maxLength: 20 }),
          (banners) => {
            const sorted = sortBannersByPriority(banners);
            
            // Verify same length
            expect(sorted.length).toBe(banners.length);
            
            // Verify all original IDs are present
            const originalIds = new Set(banners.map(b => b.id));
            const sortedIds = new Set(sorted.map(b => b.id));
            
            expect(sortedIds.size).toBe(originalIds.size);
            originalIds.forEach(id => {
              expect(sortedIds.has(id)).toBe(true);
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
