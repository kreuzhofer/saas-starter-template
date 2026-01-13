// **Feature: youtube-daily-statistics, Property 13: View count formatting**
// **Validates: Requirements 4.7**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatNumber } from './formatting';

describe('formatNumber - Property-Based Tests', () => {
  describe('Property 13: View count formatting', () => {
    it('should format numbers >= 1000 with thousand separators', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 999999999 }),
          fc.constantFrom('en', 'de'),
          (viewCount, locale) => {
            const formatted = formatNumber(viewCount, locale);
            
            // For numbers >= 1000, the formatted string should contain a separator
            // English uses comma (,), German uses period (.)
            const separator = locale === 'en' ? ',' : '.';
            
            // The formatted string should contain at least one separator
            expect(formatted).toContain(separator);
            
            // The formatted string should not contain the original number as-is
            // (unless it's a small number that doesn't need formatting)
            if (viewCount >= 1000) {
              expect(formatted).not.toBe(viewCount.toString());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format numbers < 1000 without thousand separators', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999 }),
          fc.constantFrom('en', 'de'),
          (viewCount, locale) => {
            const formatted = formatNumber(viewCount, locale);
            
            // For numbers < 1000, the formatted string should be the number itself
            expect(formatted).toBe(viewCount.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent formatting for the same number and locale', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999999999 }),
          fc.constantFrom('en', 'de'),
          (viewCount, locale) => {
            const formatted1 = formatNumber(viewCount, locale);
            const formatted2 = formatNumber(viewCount, locale);
            
            // Formatting should be deterministic
            expect(formatted1).toBe(formatted2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          (locale) => {
            const formatted = formatNumber(0, locale);
            
            // Zero should be formatted as "0"
            expect(formatted).toBe('0');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format large numbers correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000, max: 999999999 }),
          fc.constantFrom('en', 'de'),
          (viewCount, locale) => {
            const formatted = formatNumber(viewCount, locale);
            const separator = locale === 'en' ? ',' : '.';
            
            // Large numbers should have multiple separators
            const separatorCount = (formatted.match(new RegExp(`\\${separator}`, 'g')) || []).length;
            
            // For numbers >= 1,000,000, we expect at least 2 separators
            if (viewCount >= 1000000) {
              expect(separatorCount).toBeGreaterThanOrEqual(2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve the numeric value when parsing back', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999999999 }),
          fc.constantFrom('en', 'de'),
          (viewCount, locale) => {
            const formatted = formatNumber(viewCount, locale);
            
            // Remove separators and parse back to number
            const separator = locale === 'en' ? ',' : '.';
            const parsed = parseInt(formatted.replace(new RegExp(`\\${separator}`, 'g'), ''), 10);
            
            // The parsed value should equal the original
            expect(parsed).toBe(viewCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
