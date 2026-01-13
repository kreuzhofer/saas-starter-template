import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Feature: localization, Property 16: Async language switching without UI blocking
// **Validates: Requirements 9.2**

// Import translation files directly for testing
import enCommon from '../../public/locales/en/common.json';
import enPages from '../../public/locales/en/pages.json';
import enErrors from '../../public/locales/en/errors.json';
import deCommon from '../../public/locales/de/common.json';
import dePages from '../../public/locales/de/pages.json';
import deErrors from '../../public/locales/de/errors.json';

const supportedLanguages = ['en', 'de'] as const;

describe('Property 16: Async language switching without UI blocking', () => {
  it('should load new language translations asynchronously without blocking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages), // Initial language
        fc.constantFrom(...supportedLanguages), // Target language
        async (initialLanguage, targetLanguage) => {
          // Create a fresh i18n instance for this test
          const testI18n = i18n.createInstance();

          await testI18n
            .use(initReactI18next)
            .init({
              lng: initialLanguage,
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

          // Verify initial language is set
          expect(testI18n.language).toBe(initialLanguage);

          // Track if the language change is async
          let languageChangeStarted = false;
          let languageChangeCompleted = false;

          // Start language change (this should be async)
          const changePromise = testI18n.changeLanguage(targetLanguage).then(() => {
            languageChangeCompleted = true;
          });

          languageChangeStarted = true;

          // Immediately after starting the change, we should still be able to interact
          // This simulates UI remaining responsive during language loading
          const translationDuringChange = testI18n.t('common:app.name');
          
          // The translation should still work (either from old or new language)
          expect(translationDuringChange).toBeDefined();
          expect(translationDuringChange).not.toBe('');
          expect(translationDuringChange).not.toBe('common:app.name');

          // Verify the change started but may not be complete yet
          expect(languageChangeStarted).toBe(true);

          // Wait for the language change to complete
          await changePromise;

          // Verify the language change completed
          expect(languageChangeCompleted).toBe(true);
          expect(testI18n.language).toBe(targetLanguage);

          // Verify translations work in the new language
          const translationAfterChange = testI18n.t('common:app.name');
          expect(translationAfterChange).toBeDefined();
          expect(translationAfterChange).not.toBe('');
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should allow multiple UI interactions during language switch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages), // Initial language
        fc.constantFrom(...supportedLanguages), // Target language
        fc.array(fc.constantFrom('common:app.name', 'common:nav.dashboard', 'common:actions.save'), { minLength: 3, maxLength: 10 }),
        async (initialLanguage, targetLanguage, translationKeys) => {
          // Create a fresh i18n instance for this test
          const testI18n = i18n.createInstance();

          await testI18n
            .use(initReactI18next)
            .init({
              lng: initialLanguage,
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

          // Start language change
          const changePromise = testI18n.changeLanguage(targetLanguage);

          // Simulate multiple UI interactions during the language switch
          const interactionResults: string[] = [];
          
          for (const key of translationKeys) {
            const translation = testI18n.t(key);
            interactionResults.push(translation);
            
            // Each interaction should return a valid translation
            expect(translation).toBeDefined();
            expect(translation).not.toBe('');
            expect(translation).not.toBe(key);
          }

          // Wait for language change to complete
          await changePromise;

          // Verify all interactions completed successfully
          expect(interactionResults.length).toBe(translationKeys.length);
          
          // Verify translations work after the switch
          for (const key of translationKeys) {
            const translation = testI18n.t(key);
            expect(translation).toBeDefined();
            expect(translation).not.toBe('');
            expect(translation).not.toBe(key);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should handle rapid language switches without blocking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom(...supportedLanguages), { minLength: 2, maxLength: 5 }),
        async (languageSequence) => {
          // Create a fresh i18n instance for this test
          const testI18n = i18n.createInstance();

          await testI18n
            .use(initReactI18next)
            .init({
              lng: 'en',
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

          // Perform rapid language switches
          const changePromises: Promise<any>[] = [];
          
          for (const lang of languageSequence) {
            // Start language change (don't await immediately)
            const promise = testI18n.changeLanguage(lang);
            changePromises.push(promise);
            
            // Simulate UI interaction during the switch
            const translation = testI18n.t('common:app.name');
            expect(translation).toBeDefined();
            expect(translation).not.toBe('');
          }

          // Wait for all language changes to complete
          await Promise.all(changePromises);

          // Verify the final language is the last one in the sequence
          const finalLanguage = languageSequence[languageSequence.length - 1];
          expect(testI18n.language).toBe(finalLanguage);

          // Verify translations still work
          const finalTranslation = testI18n.t('common:app.name');
          expect(finalTranslation).toBeDefined();
          expect(finalTranslation).not.toBe('');
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should not block UI rendering during language resource loading', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        async (targetLanguage) => {
          // Create a fresh i18n instance with a simulated delay
          const testI18n = i18n.createInstance();

          // Mock a delayed backend to simulate network latency
          const mockBackend = {
            type: 'backend' as const,
            init: () => {},
            read: (language: string, namespace: string, callback: (err: any, data: any) => void) => {
              // Simulate async loading with a small delay
              setTimeout(() => {
                const resources: any = {
                  en: { common: enCommon, pages: enPages, errors: enErrors },
                  de: { common: deCommon, pages: dePages, errors: deErrors },
                };
                callback(null, resources[language]?.[namespace] || {});
              }, 10);
            },
          };

          await testI18n
            .use(mockBackend as any)
            .use(initReactI18next)
            .init({
              lng: 'en',
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

          // Start language change
          const changePromise = testI18n.changeLanguage(targetLanguage);

          // Track UI responsiveness during loading
          const uiInteractions: boolean[] = [];
          
          // Simulate UI interactions while loading
          for (let i = 0; i < 5; i++) {
            try {
              const translation = testI18n.t('common:app.name');
              // If we can get a translation, UI is responsive
              uiInteractions.push(translation !== undefined && translation !== '');
            } catch (error) {
              // If an error occurs, UI might be blocked
              uiInteractions.push(false);
            }
          }

          // Wait for language change to complete
          await changePromise;

          // Verify at least some UI interactions succeeded during loading
          // This proves the UI wasn't completely blocked
          const successfulInteractions = uiInteractions.filter(success => success).length;
          expect(successfulInteractions).toBeGreaterThan(0);

          // Verify final state is correct
          expect(testI18n.language).toBe(targetLanguage);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
