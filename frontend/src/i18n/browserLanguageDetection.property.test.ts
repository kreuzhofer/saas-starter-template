import * as fc from 'fast-check';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Feature: localization, Property 3: Browser language detection on first visit
 * Validates: Requirements 1.3
 * 
 * For any browser language setting when no stored preference exists, the Frontend 
 * Application should detect and use the browser's language if supported, otherwise 
 * fall back to English.
 */

// Import translation files directly for testing
import enCommon from '../../public/locales/en/common.json';
import enPages from '../../public/locales/en/pages.json';
import enErrors from '../../public/locales/en/errors.json';
import deCommon from '../../public/locales/de/common.json';
import dePages from '../../public/locales/de/pages.json';
import deErrors from '../../public/locales/de/errors.json';

const supportedLanguages = ['en', 'de'] as const;

describe('Property-Based Test: Browser Language Detection on First Visit', () => {
  beforeEach(() => {
    // Clear localStorage to simulate first visit
    localStorage.clear();
    
    // Clear any mocks
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Supported Browser Language Detection', () => {
    it('should detect and use supported browser language when no stored preference exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Browser language
          async (browserLanguage) => {
            // Clear localStorage to simulate first visit
            localStorage.clear();

            // Mock navigator.language
            Object.defineProperty(window.navigator, 'language', {
              writable: true,
              configurable: true,
              value: browserLanguage,
            });

            // Mock navigator.languages
            Object.defineProperty(window.navigator, 'languages', {
              writable: true,
              configurable: true,
              value: [browserLanguage],
            });

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(LanguageDetector)
              .use(initReactI18next)
              .init({
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                detection: {
                  order: ['localStorage', 'navigator'],
                  caches: ['localStorage'],
                  lookupLocalStorage: 'i18nextLng',
                },
                
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

            // Verify the detected language matches the browser language
            expect(testI18n.language).toBe(browserLanguage);
            
            // Verify no localStorage was set initially (first visit)
            // Note: i18next-browser-languagedetector will cache after detection
            // but we're testing the initial detection behavior
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Unsupported Browser Language Fallback', () => {
    it('should fall back to English when browser language is not supported', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('fr', 'es', 'it', 'pt', 'ja', 'zh', 'ru', 'ar'), // Unsupported languages
          async (unsupportedLanguage) => {
            // Clear localStorage to simulate first visit
            localStorage.clear();

            // Mock navigator.language with unsupported language
            Object.defineProperty(window.navigator, 'language', {
              writable: true,
              configurable: true,
              value: unsupportedLanguage,
            });

            // Mock navigator.languages
            Object.defineProperty(window.navigator, 'languages', {
              writable: true,
              configurable: true,
              value: [unsupportedLanguage],
            });

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(LanguageDetector)
              .use(initReactI18next)
              .init({
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                detection: {
                  order: ['localStorage', 'navigator'],
                  caches: ['localStorage'],
                  lookupLocalStorage: 'i18nextLng',
                },
                
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

            // Verify the language fell back to English
            expect(testI18n.language).toBe('en');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Browser Language with Region Code', () => {
    it('should extract base language from region-specific codes (e.g., de-DE -> de)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Base language
          fc.constantFrom('US', 'GB', 'DE', 'AT', 'CH'), // Region code
          async (baseLanguage, regionCode) => {
            // Clear localStorage to simulate first visit
            localStorage.clear();

            // Create language with region code (e.g., en-US, de-DE)
            const languageWithRegion = `${baseLanguage}-${regionCode}`;

            // Mock navigator.language with region code
            Object.defineProperty(window.navigator, 'language', {
              writable: true,
              configurable: true,
              value: languageWithRegion,
            });

            // Mock navigator.languages
            Object.defineProperty(window.navigator, 'languages', {
              writable: true,
              configurable: true,
              value: [languageWithRegion],
            });

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(LanguageDetector)
              .use(initReactI18next)
              .init({
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                detection: {
                  order: ['localStorage', 'navigator'],
                  caches: ['localStorage'],
                  lookupLocalStorage: 'i18nextLng',
                },
                
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

            // Verify the base language was extracted and used
            expect(testI18n.language).toBe(baseLanguage);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('No Stored Preference Requirement', () => {
    it('should only use browser language when localStorage is empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Browser language
          fc.constantFrom(...supportedLanguages), // Stored preference (different)
          async (browserLanguage, storedLanguage) => {
            // Assume they are different for this test
            fc.pre(browserLanguage !== storedLanguage);

            // Set a stored preference
            localStorage.setItem('i18nextLng', storedLanguage);

            // Mock navigator.language
            Object.defineProperty(window.navigator, 'language', {
              writable: true,
              configurable: true,
              value: browserLanguage,
            });

            // Mock navigator.languages
            Object.defineProperty(window.navigator, 'languages', {
              writable: true,
              configurable: true,
              value: [browserLanguage],
            });

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(LanguageDetector)
              .use(initReactI18next)
              .init({
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                detection: {
                  order: ['localStorage', 'navigator'],
                  caches: ['localStorage'],
                  lookupLocalStorage: 'i18nextLng',
                },
                
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

            // Verify the stored preference takes precedence over browser language
            expect(testI18n.language).toBe(storedLanguage);
            
            // Clean up
            localStorage.clear();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Multiple Browser Languages Priority', () => {
    it('should use the first supported language from navigator.languages array', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // First supported language
          async (firstSupportedLanguage) => {
            // Clear localStorage to simulate first visit
            localStorage.clear();

            // Create a languages array with unsupported language first, then supported
            const languagesArray = ['fr', firstSupportedLanguage, 'es'];

            // Mock navigator.language
            Object.defineProperty(window.navigator, 'language', {
              writable: true,
              configurable: true,
              value: 'fr', // Unsupported
            });

            // Mock navigator.languages with multiple languages
            Object.defineProperty(window.navigator, 'languages', {
              writable: true,
              configurable: true,
              value: languagesArray,
            });

            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(LanguageDetector)
              .use(initReactI18next)
              .init({
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common', 'pages', 'errors'],
                
                detection: {
                  order: ['localStorage', 'navigator'],
                  caches: ['localStorage'],
                  lookupLocalStorage: 'i18nextLng',
                },
                
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

            // Verify the first supported language from the array was used
            expect(testI18n.language).toBe(firstSupportedLanguage);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
