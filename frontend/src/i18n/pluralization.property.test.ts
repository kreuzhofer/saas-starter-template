import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Feature: localization, Property 12: Pluralization rules per language
 * Validates: Requirements 8.2
 * 
 * For any translation involving countable items and any count value, the i18n 
 * library should apply the correct pluralization rules appropriate to the target 
 * language (e.g., German has different rules than English).
 */

// Import translation files directly for testing
import enCommon from '../../public/locales/en/common.json';
import deCommon from '../../public/locales/de/common.json';

const supportedLanguages = ['en', 'de'] as const;

describe('Property-Based Test: Pluralization Rules Per Language', () => {
  describe('English Pluralization Rules', () => {
    it('should use singular form for count=1 in English', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          async (key) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: 'en',
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation with count=1 (should use singular)
            const result = testI18n.t(`pluralization.${key}`, { count: 1 });

            // Verify singular form is used (contains "1" and singular word)
            expect(result).toContain('1');
            // Singular form should not end with 's' for these words (except "URLs")
            if (key !== 'urls') {
              expect(result).not.toMatch(/\d+\s+\w+s$/);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should use plural form for count=0 in English', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          async (key) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: 'en',
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation with count=0 (should use plural)
            const result = testI18n.t(`pluralization.${key}`, { count: 0 });

            // Verify plural form is used (contains "0" and plural word)
            expect(result).toContain('0');
            // Plural form should end with 's'
            expect(result).toMatch(/\d+\s+\w+s$/);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should use plural form for count>1 in English', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          fc.integer({ min: 2, max: 1000 }), // Count > 1
          async (key, count) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: 'en',
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation with count>1 (should use plural)
            const result = testI18n.t(`pluralization.${key}`, { count });

            // Verify plural form is used (contains count and plural word)
            expect(result).toContain(count.toString());
            // Plural form should end with 's'
            expect(result).toMatch(/\d+\s+\w+s$/);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('German Pluralization Rules', () => {
    it('should use singular form for count=1 in German', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          async (key) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: 'de',
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation with count=1 (should use singular)
            const result = testI18n.t(`pluralization.${key}`, { count: 1 });

            // Verify singular form is used (contains "1")
            expect(result).toContain('1');
            
            // Verify German singular forms
            if (key === 'clicks') {
              expect(result).toContain('Klick');
              expect(result).not.toContain('Klicks');
            } else if (key === 'items') {
              expect(result).toContain('Element');
              expect(result).not.toContain('Elemente');
            } else if (key === 'results') {
              expect(result).toContain('Ergebnis');
              expect(result).not.toContain('Ergebnisse');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should use plural form for count=0 in German', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          async (key) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: 'de',
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation with count=0 (should use plural)
            const result = testI18n.t(`pluralization.${key}`, { count: 0 });

            // Verify plural form is used (contains "0")
            expect(result).toContain('0');
            
            // Verify German plural forms
            if (key === 'clicks') {
              expect(result).toContain('Klicks');
            } else if (key === 'items') {
              expect(result).toContain('Elemente');
            } else if (key === 'results') {
              expect(result).toContain('Ergebnisse');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should use plural form for count>1 in German', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          fc.integer({ min: 2, max: 1000 }), // Count > 1
          async (key, count) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: 'de',
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation with count>1 (should use plural)
            const result = testI18n.t(`pluralization.${key}`, { count });

            // Verify plural form is used (contains count)
            expect(result).toContain(count.toString());
            
            // Verify German plural forms
            if (key === 'clicks') {
              expect(result).toContain('Klicks');
            } else if (key === 'items') {
              expect(result).toContain('Elemente');
            } else if (key === 'results') {
              expect(result).toContain('Ergebnisse');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Cross-Language Pluralization Consistency', () => {
    it('should apply correct pluralization rules for each language with same count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          fc.integer({ min: 0, max: 100 }), // Count
          async (language, key, count) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation
            const result = testI18n.t(`pluralization.${key}`, { count });

            // Verify the count is present in the result
            expect(result).toContain(count.toString());
            
            // Verify the result is not empty and not just the key
            expect(result).not.toBe(`pluralization.${key}`);
            expect(result.length).toBeGreaterThan(count.toString().length);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Pluralization with Variable Interpolation', () => {
    it('should correctly interpolate count variable in pluralized strings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          fc.integer({ min: 0, max: 1000 }), // Count
          async (language, key, count) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation with count
            const result = testI18n.t(`pluralization.${key}`, { count });

            // Verify the count is interpolated correctly
            expect(result).toContain(count.toString());
            
            // Verify the result starts with the count
            expect(result).toMatch(new RegExp(`^${count}\\s+`));
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Pluralization Edge Cases', () => {
    it('should handle negative counts appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          fc.integer({ min: -100, max: -1 }), // Negative count
          async (language, key, count) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation with negative count
            const result = testI18n.t(`pluralization.${key}`, { count });

            // Verify the count is present in the result
            expect(result).toContain(count.toString());
            
            // Verify the result is not empty
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should handle large counts appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('clicks', 'urls', 'items', 'results'), // Plural keys
          fc.integer({ min: 1000, max: 1000000 }), // Large count
          async (language, key, count) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                resources: {
                  en: {
                    common: enCommon,
                  },
                  de: {
                    common: deCommon,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request translation with large count
            const result = testI18n.t(`pluralization.${key}`, { count });

            // Verify the count is present in the result
            expect(result).toContain(count.toString());
            
            // Verify the result is not empty and contains more than just the count
            expect(result.length).toBeGreaterThan(count.toString().length);
            
            // For English, verify plural form ends with 's'
            if (language === 'en') {
              expect(result).toMatch(/\d+\s+\w+s$/);
            }
            
            // For German, verify specific plural forms
            if (language === 'de') {
              if (key === 'clicks') {
                expect(result).toContain('Klicks');
              } else if (key === 'items') {
                expect(result).toContain('Elemente');
              } else if (key === 'results') {
                expect(result).toContain('Ergebnisse');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
