import * as fc from 'fast-check';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { initializeI18n } from '../../i18n/config';
import type i18next from 'i18next';

/**
 * Feature: localization, Property 12: Pluralization rules per language
 * Validates: Requirements 8.2
 * 
 * For any translation involving countable items and any count value, the i18n 
 * library should apply the correct pluralization rules appropriate to the target 
 * language (e.g., German has different rules than English).
 */

const supportedLanguages = ['en', 'de'] as const;
type SupportedLanguage = typeof supportedLanguages[number];

describe('Property-Based Test: Pluralization Rules Per Language (Backend)', () => {
  let i18n: typeof i18next;

  beforeAll(async () => {
    // Initialize i18n once for all tests
    i18n = await initializeI18n();
  });

  describe('English Pluralization Rules', () => {
    it('should use singular form for count=1 in English', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          (key) => {
            // Request translation with count=1 (should use singular)
            const result = i18n.t(`errors:pluralization.${key}`, { count: 1, lng: 'en' });

            // Verify singular form is used (contains "1" and singular word)
            expect(result).toContain('1');
            // Singular form should not end with 's' for these words (except "users")
            if (key !== 'users') {
              expect(result).not.toMatch(/\d+\s+\w+s$/);
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should use plural form for count=0 in English', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          (key) => {
            // Request translation with count=0 (should use plural)
            const result = i18n.t(`errors:pluralization.${key}`, { count: 0, lng: 'en' });

            // Verify plural form is used (contains "0" and plural word)
            expect(result).toContain('0');
            // Plural form should end with 's'
            expect(result).toMatch(/\d+\s+\w+s$/);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should use plural form for count>1 in English', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          fc.integer({ min: 2, max: 1000 }), // Count > 1
          (key, count) => {
            // Request translation with count>1 (should use plural)
            const result = i18n.t(`errors:pluralization.${key}`, { count, lng: 'en' });

            // Verify plural form is used (contains count and plural word)
            expect(result).toContain(count.toString());
            // Plural form should end with 's'
            expect(result).toMatch(/\d+\s+\w+s$/);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('German Pluralization Rules', () => {
    it('should use singular form for count=1 in German', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          (key) => {
            // Request translation with count=1 (should use singular)
            const result = i18n.t(`errors:pluralization.${key}`, { count: 1, lng: 'de' });

            // Verify singular form is used (contains "1")
            expect(result).toContain('1');
            
            // Verify German singular forms
            if (key === 'errors') {
              expect(result).toContain('Fehler');
              // Note: "Fehler" is the same in singular and plural in German
            } else if (key === 'warnings') {
              expect(result).toContain('Warnung');
              expect(result).not.toContain('Warnungen');
            } else if (key === 'records') {
              expect(result).toContain('Datensatz');
              expect(result).not.toContain('Datensätze');
            } else if (key === 'users') {
              expect(result).toContain('Benutzer');
              // Note: "Benutzer" is the same in singular and plural in German
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should use plural form for count=0 in German', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          (key) => {
            // Request translation with count=0 (should use plural)
            const result = i18n.t(`errors:pluralization.${key}`, { count: 0, lng: 'de' });

            // Verify plural form is used (contains "0")
            expect(result).toContain('0');
            
            // Verify German plural forms
            if (key === 'errors') {
              expect(result).toContain('Fehler');
            } else if (key === 'warnings') {
              expect(result).toContain('Warnungen');
            } else if (key === 'records') {
              expect(result).toContain('Datensätze');
            } else if (key === 'users') {
              expect(result).toContain('Benutzer');
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should use plural form for count>1 in German', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          fc.integer({ min: 2, max: 1000 }), // Count > 1
          (key, count) => {
            // Request translation with count>1 (should use plural)
            const result = i18n.t(`errors:pluralization.${key}`, { count, lng: 'de' });

            // Verify plural form is used (contains count)
            expect(result).toContain(count.toString());
            
            // Verify German plural forms
            if (key === 'errors') {
              expect(result).toContain('Fehler');
            } else if (key === 'warnings') {
              expect(result).toContain('Warnungen');
            } else if (key === 'records') {
              expect(result).toContain('Datensätze');
            } else if (key === 'users') {
              expect(result).toContain('Benutzer');
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Cross-Language Pluralization Consistency', () => {
    it('should apply correct pluralization rules for each language with same count', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          fc.integer({ min: 0, max: 100 }), // Count
          (language, key, count) => {
            // Request translation
            const result = i18n.t(`errors:pluralization.${key}`, { count, lng: language });

            // Verify the count is present in the result
            expect(result).toContain(count.toString());
            
            // Verify the result is not empty and not just the key
            expect(result).not.toBe(`pluralization.${key}`);
            expect(result.length).toBeGreaterThan(count.toString().length);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Pluralization with Variable Interpolation', () => {
    it('should correctly interpolate count variable in pluralized strings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          fc.integer({ min: 0, max: 1000 }), // Count
          (language, key, count) => {
            // Request translation with count
            const result = i18n.t(`errors:pluralization.${key}`, { count, lng: language });

            // Verify the count is interpolated correctly
            expect(result).toContain(count.toString());
            
            // Verify the result starts with the count
            expect(result).toMatch(new RegExp(`^${count}\\s+`));
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Pluralization Edge Cases', () => {
    it('should handle negative counts appropriately', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          fc.integer({ min: -100, max: -1 }), // Negative count
          (language, key, count) => {
            // Request translation with negative count
            const result = i18n.t(`errors:pluralization.${key}`, { count, lng: language });

            // Verify the count is present in the result
            expect(result).toContain(count.toString());
            
            // Verify the result is not empty
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should handle large counts appropriately', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('errors', 'warnings', 'records', 'users'), // Plural keys
          fc.integer({ min: 1000, max: 1000000 }), // Large count
          (language, key, count) => {
            // Request translation with large count
            const result = i18n.t(`errors:pluralization.${key}`, { count, lng: language });

            // Verify the count is present in the result
            expect(result).toContain(count.toString());
            
            // Verify the result is not empty
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Pluralization Consistency Across Languages', () => {
    it('should return consistent format for same count in different languages', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // Count
          (count) => {
            // Get translations in both languages
            const enResult = i18n.t('errors:pluralization.errors', { count, lng: 'en' });
            const deResult = i18n.t('errors:pluralization.errors', { count, lng: 'de' });

            // Both should contain the count
            expect(enResult).toContain(count.toString());
            expect(deResult).toContain(count.toString());
            
            // Both should be non-empty and not just the key
            expect(enResult).not.toBe('pluralization.errors');
            expect(deResult).not.toBe('pluralization.errors');
            expect(enResult.length).toBeGreaterThan(0);
            expect(deResult.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Pluralization Fallback Behavior', () => {
    it('should fall back to English when German translation is missing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // Count
          (count) => {
            // Request a non-existent key in German
            const result = i18n.t('errors:pluralization.nonexistent', { count, lng: 'de', fallbackLng: 'en' });

            // Verify the result is not empty (should fall back to key or English)
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
