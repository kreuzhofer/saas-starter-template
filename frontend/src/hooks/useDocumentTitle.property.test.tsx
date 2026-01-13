import * as fc from 'fast-check';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { useDocumentTitle } from './useDocumentTitle';
import testI18n, { supportedLanguages } from '../i18n/testConfig';
import type { ReactNode } from 'react';

/**
 * Feature: localization, Property 5: Page title localization
 * Validates: Requirements 2.1, 2.2
 * 
 * For any page navigation or language change, the Frontend Application should 
 * update the HTML document title to reflect the current page name in the selected language.
 */

describe('Property-Based Test: Page Title Localization', () => {
  const originalTitle = document.title;

  beforeEach(async () => {
    // Reset to English
    await testI18n.changeLanguage('en');
    
    // Reset document title
    document.title = originalTitle;
    
    // Clean up any previous renders
    cleanup();
  });

  afterEach(() => {
    document.title = originalTitle;
    cleanup();
  });

  // Helper to create wrapper with i18n provider
  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <I18nextProvider i18n={testI18n}>
        {children}
      </I18nextProvider>
    );
  };

  describe('Document Title Updates on Language Change', () => {
    it('should update document.title when language changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Initial language
          fc.constantFrom(...supportedLanguages), // Target language
          fc.constantFrom(
            'login.title',
            'home.title',
            'analytics.title',
            'profile.title',
            'admin.title',
            'signup.title',
            'welcome.title'
          ), // Translation key
          async (initialLanguage, targetLanguage, titleKey) => {
            // Set initial language
            await testI18n.changeLanguage(initialLanguage);

            // Render the hook with initial language
            const { rerender, unmount } = renderHook(
              () => useDocumentTitle(titleKey),
              { wrapper: createWrapper() }
            );

            // Wait for initial title to be set
            await waitFor(() => {
              const expectedInitialTitle = testI18n.t(titleKey, { ns: 'pages', lng: initialLanguage });
              expect(document.title).toBe(expectedInitialTitle);
            });

            // Change language
            await testI18n.changeLanguage(targetLanguage);

            // Force re-render to trigger the effect
            rerender();

            // Wait for title to update to new language
            await waitFor(() => {
              const expectedNewTitle = testI18n.t(titleKey, { ns: 'pages', lng: targetLanguage });
              expect(document.title).toBe(expectedNewTitle);
            });

            // Clean up
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  describe('Document Title Updates on Page Navigation', () => {
    it('should update document.title when titleKey changes (simulating navigation)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom(
            'login.title',
            'home.title',
            'analytics.title',
            'profile.title',
            'admin.title',
            'signup.title',
            'welcome.title',
            'urlDetails.title'
          ), // Initial page
          fc.constantFrom(
            'login.title',
            'home.title',
            'analytics.title',
            'profile.title',
            'admin.title',
            'signup.title',
            'welcome.title',
            'urlDetails.title'
          ), // Target page
          async (language, initialTitleKey, targetTitleKey) => {
            // Set language
            await testI18n.changeLanguage(language);

            // Render the hook with initial page
            const { rerender, unmount } = renderHook(
              ({ titleKey }) => useDocumentTitle(titleKey),
              { 
                wrapper: createWrapper(),
                initialProps: { titleKey: initialTitleKey }
              }
            );

            // Wait for initial title to be set
            await waitFor(() => {
              const expectedInitialTitle = testI18n.t(initialTitleKey, { ns: 'pages', lng: language });
              expect(document.title).toBe(expectedInitialTitle);
            });

            // Navigate to new page (change titleKey)
            rerender({ titleKey: targetTitleKey });

            // Wait for title to update to new page
            await waitFor(() => {
              const expectedNewTitle = testI18n.t(targetTitleKey, { ns: 'pages', lng: language });
              expect(document.title).toBe(expectedNewTitle);
            });

            // Clean up
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  describe('Document Title with Custom Namespace', () => {
    it('should update document.title using custom namespace', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom('common', 'errors'), // Custom namespace
          async (language, namespace) => {
            // Set language
            await testI18n.changeLanguage(language);

            // Use a key that exists in the namespace
            const titleKey = namespace === 'common' ? 'app.name' : 'auth.unauthorized';

            // Render the hook with custom namespace
            const { unmount } = renderHook(
              () => useDocumentTitle(titleKey, { ns: namespace }),
              { wrapper: createWrapper() }
            );

            // Wait for title to be set
            await waitFor(() => {
              const expectedTitle = testI18n.t(titleKey, { ns: namespace, lng: language });
              expect(document.title).toBe(expectedTitle);
            });

            // Clean up
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  describe('Document Title Reflects Current Language', () => {
    it('should always display title in the current language', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom(
            'login.title',
            'home.title',
            'analytics.title',
            'profile.title',
            'admin.title'
          ), // Translation key
          async (language, titleKey) => {
            // Set language
            await testI18n.changeLanguage(language);

            // Render the hook
            const { unmount } = renderHook(
              () => useDocumentTitle(titleKey),
              { wrapper: createWrapper() }
            );

            // Wait for title to be set
            await waitFor(() => {
              const expectedTitle = testI18n.t(titleKey, { ns: 'pages', lng: language });
              expect(document.title).toBe(expectedTitle);
            });

            // Verify the title matches the current language
            const currentTitle = document.title;
            const expectedTitle = testI18n.t(titleKey, { ns: 'pages', lng: language });
            expect(currentTitle).toBe(expectedTitle);

            // Clean up
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  describe('Document Title Idempotence', () => {
    it('should produce the same title when called multiple times with same parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom(
            'login.title',
            'home.title',
            'analytics.title'
          ), // Translation key
          async (language, titleKey) => {
            // Set language
            await testI18n.changeLanguage(language);

            // Render the hook multiple times
            const { unmount: unmount1 } = renderHook(
              () => useDocumentTitle(titleKey),
              { wrapper: createWrapper() }
            );

            await waitFor(() => {
              const expectedTitle = testI18n.t(titleKey, { ns: 'pages', lng: language });
              expect(document.title).toBe(expectedTitle);
            });

            const firstTitle = document.title;
            unmount1();

            // Render again with same parameters
            const { unmount: unmount2 } = renderHook(
              () => useDocumentTitle(titleKey),
              { wrapper: createWrapper() }
            );

            await waitFor(() => {
              const expectedTitle = testI18n.t(titleKey, { ns: 'pages', lng: language });
              expect(document.title).toBe(expectedTitle);
            });

            const secondTitle = document.title;

            // Both should produce the same title
            expect(firstTitle).toBe(secondTitle);

            // Clean up
            unmount2();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  describe('Document Title Updates Immediately', () => {
    it('should update document.title synchronously within the effect', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom(
            'login.title',
            'home.title',
            'analytics.title',
            'profile.title'
          ), // Translation key
          async (language, titleKey) => {
            // Set language
            await testI18n.changeLanguage(language);

            // Render the hook
            const { unmount } = renderHook(
              () => useDocumentTitle(titleKey),
              { wrapper: createWrapper() }
            );

            // The title should be updated immediately (within the effect)
            // We use waitFor to handle any async behavior, but the update should be fast
            await waitFor(() => {
              const expectedTitle = testI18n.t(titleKey, { ns: 'pages', lng: language });
              expect(document.title).toBe(expectedTitle);
            }, { timeout: 1000 }); // Short timeout to verify it's immediate

            // Clean up
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  describe('Document Title with Default Namespace', () => {
    it('should use "pages" namespace by default when no namespace is specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Language
          fc.constantFrom(
            'login.title',
            'home.title',
            'analytics.title'
          ), // Translation key from pages namespace
          async (language, titleKey) => {
            // Set language
            await testI18n.changeLanguage(language);

            // Render the hook without specifying namespace
            const { unmount } = renderHook(
              () => useDocumentTitle(titleKey),
              { wrapper: createWrapper() }
            );

            // Wait for title to be set
            await waitFor(() => {
              // Should use 'pages' namespace by default
              const expectedTitle = testI18n.t(titleKey, { ns: 'pages', lng: language });
              expect(document.title).toBe(expectedTitle);
            });

            // Clean up
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });
});
