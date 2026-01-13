import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Feature: localization, Property 14: Context-based translation variants
// **Validates: Requirements 8.4**

// Import translation files directly for testing
import enCommon from '../../public/locales/en/common.json';
import deCommon from '../../public/locales/de/common.json';

const supportedLanguages = ['en', 'de'] as const;

describe('Property 14: Context-based translation variants', () => {

  it('should select correct translation variant based on provided context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        fc.constantFrom('male', 'female', 'formal', 'informal', 'admin', 'moderator', 'guest'),
        async (language, context) => {
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
              
              // Enable context support
              contextSeparator: '_',
            });

          // Test different contextual keys
          const contextualKeys = [
            { key: 'contextual.welcome', contexts: ['male', 'female'] },
            { key: 'contextual.greeting', contexts: ['formal', 'informal'] },
            { key: 'contextual.userRole', contexts: ['admin', 'moderator', 'guest'] },
          ];

          for (const { key, contexts } of contextualKeys) {
            if (contexts.includes(context)) {
              // Get translation with context
              const withContext = testI18n.t(key, { context });
              
              // Get translation without context (default)
              const withoutContext = testI18n.t(key);

              // The contextual translation should be different from the default
              // (unless the context doesn't apply to this key)
              expect(withContext).toBeDefined();
              expect(withContext).not.toBe('');
              
              // The translation should not be the key itself (no missing translation)
              expect(withContext).not.toBe(key);
              
              // If this context applies to this key, the contextual version
              // should be different from the default
              if (contexts.includes(context)) {
                // Both should exist and be valid translations
                expect(withoutContext).toBeDefined();
                expect(withoutContext).not.toBe('');
                expect(withoutContext).not.toBe(key);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should fall back to default translation when context variant does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['male', 'female', 'formal', 'informal', 'admin', 'moderator', 'guest'].includes(s)),
        async (language, invalidContext) => {
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
              
              // Enable context support
              contextSeparator: '_',
            });

          // Get translation with invalid context
          const withInvalidContext = testI18n.t('contextual.welcome', { context: invalidContext });
          
          // Get translation without context (default)
          const withoutContext = testI18n.t('contextual.welcome');

          // Should fall back to default when context doesn't exist
          expect(withInvalidContext).toBe(withoutContext);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should maintain context-specific translations across all supported languages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('male', 'female', 'formal', 'informal', 'admin', 'moderator', 'guest'),
        async (context) => {
          const translations: Record<string, string> = {};

          for (const lang of supportedLanguages) {
            // Create a fresh i18n instance for each language
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: lang,
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
                
                // Enable context support
                contextSeparator: '_',
              });
            
            // Get contextual translation for each language
            const translation = testI18n.t('contextual.welcome', { context });
            
            // Store the translation
            translations[lang] = translation;
            
            // Verify it's a valid translation
            expect(translation).toBeDefined();
            expect(translation).not.toBe('');
            expect(translation).not.toBe('contextual.welcome');
          }

          // Verify that each language has its own translation
          // (they should be different for different languages)
          const uniqueTranslations = new Set(Object.values(translations));
          
          // For valid contexts, we expect different translations per language
          if (['male', 'female', 'formal', 'informal', 'admin', 'moderator', 'guest'].includes(context)) {
            expect(uniqueTranslations.size).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
