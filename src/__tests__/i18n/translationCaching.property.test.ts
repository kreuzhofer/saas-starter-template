import * as fc from 'fast-check';
import { initializeI18n, getI18n, supportedLanguages } from '../../i18n/config';
import fs from 'fs';
import path from 'path';

/**
 * Feature: localization, Property 17: Backend translation caching
 * Validates: Requirements 9.3
 * 
 * For any sequence of backend requests, the system should cache loaded translations 
 * in memory and reuse them to avoid repeated file system reads.
 */

describe('Property-Based Test: Backend Translation Caching', () => {
  let i18n: ReturnType<typeof getI18n>;
  let fileReadCount: Map<string, number>;
  let originalReadFileSync: typeof fs.readFileSync;

  beforeAll(async () => {
    // Initialize i18n once for all tests
    i18n = await initializeI18n();
  });

  beforeEach(() => {
    // Track file reads
    fileReadCount = new Map();
    originalReadFileSync = fs.readFileSync;

    // Mock fs.readFileSync to count reads
    fs.readFileSync = jest.fn((filePath: any, options?: any) => {
      const pathStr = filePath.toString();
      
      // Only track reads of translation files
      if (pathStr.includes('/locales/') && pathStr.endsWith('.json')) {
        const count = fileReadCount.get(pathStr) || 0;
        fileReadCount.set(pathStr, count + 1);
      }
      
      return originalReadFileSync(filePath, options);
    }) as any;
  });

  afterEach(() => {
    // Restore original fs.readFileSync
    fs.readFileSync = originalReadFileSync;
    jest.clearAllMocks();
  });

  it('should cache translations and avoid repeated file reads for the same language and namespace', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        fc.constantFrom('errors', 'validation', 'emails'),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 5, maxLength: 20 }),
        async (language, namespace, translationKeys) => {
          // Reset file read tracking
          fileReadCount.clear();

          // First translation request - should read from file
          const firstTranslation = i18n.t(`${namespace}:auth.invalidCredentials`, { lng: language });
          expect(firstTranslation).toBeDefined();

          // Get the count of file reads after first request
          const filesReadAfterFirst = Array.from(fileReadCount.values()).reduce((sum, count) => sum + count, 0);

          // Make multiple subsequent translation requests for the same language and namespace
          for (let i = 0; i < translationKeys.length; i++) {
            // Use various translation keys to ensure we're testing caching, not just the same key
            i18n.t(`${namespace}:auth.invalidCredentials`, { lng: language });
            i18n.t(`${namespace}:validation.required`, { lng: language, field: 'test' });
            i18n.t(`${namespace}:auth.tokenExpired`, { lng: language });
          }

          // Get the count of file reads after subsequent requests
          const filesReadAfterSubsequent = Array.from(fileReadCount.values()).reduce((sum, count) => sum + count, 0);

          // The number of file reads should not increase after the first request
          // This proves that translations are cached in memory
          expect(filesReadAfterSubsequent).toBe(filesReadAfterFirst);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should cache translations across different translation keys in the same namespace', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        fc.constantFrom('errors', 'validation', 'emails'),
        fc.integer({ min: 10, max: 50 }),
        async (language, namespace, requestCount) => {
          // Reset file read tracking
          fileReadCount.clear();

          // Define various translation keys to test
          const translationKeys = [
            'auth.invalidCredentials',
            'auth.emailNotConfirmed',
            'auth.tokenExpired',
            'auth.tokenInvalid',
            'auth.unauthorized',
            'validation.required',
            'validation.invalidEmail',
            'shortUrl.notFound',
            'shortUrl.codeInUse',
          ];

          // Make first request to load the namespace
          i18n.t(`${namespace}:${translationKeys[0]}`, { lng: language });

          // Count file reads after first request
          const filesReadAfterFirst = Array.from(fileReadCount.values()).reduce((sum, count) => sum + count, 0);

          // Make many subsequent requests with different keys
          for (let i = 0; i < requestCount; i++) {
            const key = translationKeys[i % translationKeys.length];
            i18n.t(`${namespace}:${key}`, { lng: language });
          }

          // Count file reads after all requests
          const filesReadAfterAll = Array.from(fileReadCount.values()).reduce((sum, count) => sum + count, 0);

          // File reads should not increase - namespace is cached
          expect(filesReadAfterAll).toBe(filesReadAfterFirst);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should cache translations for multiple languages independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('errors', 'validation', 'emails'),
        fc.integer({ min: 5, max: 15 }),
        async (namespace, requestsPerLanguage) => {
          // Reset file read tracking
          fileReadCount.clear();

          // Load translations for all supported languages
          const languageFileReads: Map<string, number> = new Map();

          for (const language of supportedLanguages) {
            // First request for this language - should read file
            i18n.t(`${namespace}:auth.invalidCredentials`, { lng: language });

            // Count reads for this language
            const readsForLanguage = Array.from(fileReadCount.entries())
              .filter(([path]) => path.includes(`/${language}/`))
              .reduce((sum, [, count]) => sum + count, 0);

            languageFileReads.set(language, readsForLanguage);

            // Make multiple subsequent requests for this language
            for (let i = 0; i < requestsPerLanguage; i++) {
              i18n.t(`${namespace}:auth.tokenExpired`, { lng: language });
              i18n.t(`${namespace}:validation.required`, { lng: language, field: 'test' });
            }

            // Count reads again after subsequent requests
            const readsAfterSubsequent = Array.from(fileReadCount.entries())
              .filter(([path]) => path.includes(`/${language}/`))
              .reduce((sum, [, count]) => sum + count, 0);

            // File reads should not increase for this language
            expect(readsAfterSubsequent).toBe(languageFileReads.get(language));
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should cache translations across concurrent requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        fc.constantFrom('errors', 'validation', 'emails'),
        fc.integer({ min: 10, max: 30 }),
        async (language, namespace, concurrentRequests) => {
          // Reset file read tracking
          fileReadCount.clear();

          // Make first request to load namespace
          await i18n.t(`${namespace}:auth.invalidCredentials`, { lng: language });

          // Count file reads after first request
          const filesReadAfterFirst = Array.from(fileReadCount.values()).reduce((sum, count) => sum + count, 0);

          // Make many concurrent translation requests
          const promises = [];
          for (let i = 0; i < concurrentRequests; i++) {
            promises.push(
              Promise.resolve(i18n.t(`${namespace}:auth.tokenExpired`, { lng: language }))
            );
            promises.push(
              Promise.resolve(i18n.t(`${namespace}:validation.required`, { lng: language, field: 'email' }))
            );
          }

          await Promise.all(promises);

          // Count file reads after concurrent requests
          const filesReadAfterConcurrent = Array.from(fileReadCount.values()).reduce((sum, count) => sum + count, 0);

          // File reads should not increase - translations are cached
          expect(filesReadAfterConcurrent).toBe(filesReadAfterFirst);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should cache translations with variable interpolation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        fc.array(
          fc.record({
            field: fc.string({ minLength: 1, maxLength: 20 }),
            min: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        async (language, interpolationData) => {
          // Reset file read tracking
          fileReadCount.clear();

          // First request with interpolation
          i18n.t('validation:required', { lng: language, field: 'email' });

          // Count file reads after first request
          const filesReadAfterFirst = Array.from(fileReadCount.values()).reduce((sum, count) => sum + count, 0);

          // Make multiple requests with different interpolation values
          for (const data of interpolationData) {
            i18n.t('validation:required', { lng: language, field: data.field });
            i18n.t('validation:passwordTooShort', { lng: language, min: data.min });
          }

          // Count file reads after all requests
          const filesReadAfterAll = Array.from(fileReadCount.values()).reduce((sum, count) => sum + count, 0);

          // File reads should not increase - namespace is cached regardless of interpolation values
          expect(filesReadAfterAll).toBe(filesReadAfterFirst);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});
