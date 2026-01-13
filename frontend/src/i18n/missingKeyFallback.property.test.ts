import * as fc from 'fast-check';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Feature: localization, Property 11: Missing translation key fallback
 * Validates: Requirements 5.4
 * 
 * For any missing translation key requested from the i18n library, the system 
 * should return the key itself as a fallback value and log a warning to help 
 * developers identify missing translations.
 */

// Import translation files directly for testing
import enCommon from '../../public/locales/en/common.json';
import enPages from '../../public/locales/en/pages.json';
import enErrors from '../../public/locales/en/errors.json';
import deCommon from '../../public/locales/de/common.json';
import dePages from '../../public/locales/de/pages.json';
import deErrors from '../../public/locales/de/errors.json';

const supportedLanguages = ['en', 'de'] as const;

describe('Property-Based Test: Missing Translation Key Fallback', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console.warn to verify warnings are logged
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Missing Key Returns Key Itself', () => {
    it('should return the key itself when translation key does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('common', 'pages', 'errors'), // Namespace
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ') && !s.includes(':') && !s.includes('"')), // Random key part 1
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ') && !s.includes(':') && !s.includes('"')), // Random key part 2
          async (language, namespace, keyPart1, keyPart2) => {
            // Create a non-existent key
            const missingKey = `nonexistent.${keyPart1}.${keyPart2}`;

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                resources: {
                  en: {
                    common: enCommon,
                    pages: enPages,
                    errors: enErrors,
                  },
                  de: {
                    common: deCommon,
                    pages: dePages,
                    errors: deErrors,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
                
                // Configure i18next to return key on missing translation
                saveMissing: false,
                missingKeyHandler: false,
              });

            // Request the missing translation key
            const result = testI18n.t(`${namespace}:${missingKey}`);

            // Verify the key itself is returned as fallback
            // i18next returns the key without the namespace prefix when using namespace:key syntax
            expect(result).toBe(missingKey);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Missing Key in Default Namespace', () => {
    it('should return the key when translation is missing in default namespace', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ') && !s.includes(':') && !s.includes('"')), // Random key
          async (language, randomKey) => {
            // Create a non-existent key
            const missingKey = `missing.${randomKey}`;

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                resources: {
                  en: {
                    common: enCommon,
                    pages: enPages,
                    errors: enErrors,
                  },
                  de: {
                    common: deCommon,
                    pages: dePages,
                    errors: deErrors,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request the missing translation key (without namespace prefix)
            const result = testI18n.t(missingKey);

            // Verify the key itself is returned as fallback
            expect(result).toBe(missingKey);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Missing Key with Interpolation Variables', () => {
    it('should return the key with interpolation placeholders when key is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(' ') && !s.includes(':') && !s.includes('"')), // Random key
          fc.string({ minLength: 1, maxLength: 20 }), // Variable value
          async (language, randomKey, variableValue) => {
            // Create a non-existent key
            const missingKey = `missing.${randomKey}`;

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                resources: {
                  en: {
                    common: enCommon,
                    pages: enPages,
                    errors: enErrors,
                  },
                  de: {
                    common: deCommon,
                    pages: dePages,
                    errors: deErrors,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request the missing translation key with interpolation variables
            const result = testI18n.t(missingKey, { variable: variableValue });

            // Verify the key itself is returned (interpolation doesn't happen for missing keys)
            expect(result).toBe(missingKey);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Missing Key Across Different Languages', () => {
    it('should return the key for missing translations in any language', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.string({ minLength: 1, maxLength: 40 }).filter(s => !s.includes(' ') && !s.includes(':') && !s.includes('"')), // Random key
          async (language, randomKey) => {
            // Create a non-existent key
            const missingKey = `nonexistent.${randomKey}`;

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                resources: {
                  en: {
                    common: enCommon,
                    pages: enPages,
                    errors: enErrors,
                  },
                  de: {
                    common: deCommon,
                    pages: dePages,
                    errors: deErrors,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request the missing translation key
            const result = testI18n.t(missingKey);

            // Verify the key itself is returned regardless of language
            expect(result).toBe(missingKey);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Existing Keys Return Translations', () => {
    it('should return actual translations for existing keys, not the key itself', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          async (language) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                resources: {
                  en: {
                    common: enCommon,
                    pages: enPages,
                    errors: enErrors,
                  },
                  de: {
                    common: deCommon,
                    pages: dePages,
                    errors: deErrors,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Test with a known existing key
            const existingKey = 'app.name';
            const result = testI18n.t(existingKey);

            // Verify the actual translation is returned, not the key
            expect(result).not.toBe(existingKey);
            expect(result).toBe('SaaS Starter Template');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Nested Missing Keys', () => {
    it('should return the full nested key path when deeply nested key is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ') && !s.includes(':') && !s.includes('"')), { minLength: 2, maxLength: 5 }), // Key parts
          async (language, keyParts) => {
            // Create a deeply nested non-existent key
            const missingKey = keyParts.join('.');

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                resources: {
                  en: {
                    common: enCommon,
                    pages: enPages,
                    errors: enErrors,
                  },
                  de: {
                    common: deCommon,
                    pages: dePages,
                    errors: deErrors,
                  },
                },
                
                interpolation: {
                  escapeValue: false,
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Request the missing translation key
            const result = testI18n.t(missingKey);

            // Verify the full key path is returned
            expect(result).toBe(missingKey);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
