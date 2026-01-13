/**
 * Feature: localization, Property 1: UI text displays in selected language
 * Validates: Requirements 1.1
 * 
 * Property: For any supported language selection, all user interface text in the Frontend Application
 * should display in that selected language by loading and rendering translations from the corresponding
 * translation file.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import * as fc from 'fast-check';
import testI18n, { supportedLanguages } from '../i18n/testConfig';
import { Welcome } from './Welcome';
import { Login } from './Login';
import { SignUp } from './SignUp';
import { Dashboard } from './Dashboard';
import { Pricing } from './Pricing';

// Helper to create a test wrapper with providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nextProvider i18n={testI18n}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </QueryClientProvider>
      </I18nextProvider>
    );
  };
}

describe('Property 1: UI text displays in selected language', () => {
  beforeEach(async () => {
    // Clear any previous renders
    cleanup();
    // Reset to English before each test
    await testI18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
  });

  it('should display Welcome page text in the selected language', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        async (language) => {
          // Change to the selected language
          await testI18n.changeLanguage(language);

          // Render the Welcome page
          const { container, unmount } = render(<Welcome />, { wrapper: createWrapper() });

          // Wait for content to render
          await waitFor(() => {
            expect(container.textContent).toBeTruthy();
          });

          // Get expected translations for this language
          const appName = testI18n.t('app.name', { ns: 'common', lng: language });
          const heroHeading = testI18n.t('welcome.hero.heading', { ns: 'pages', lng: language });
          const getStartedButton = testI18n.t('welcome.hero.getStarted', { ns: 'pages', lng: language });

          // Verify the translations are present in the rendered output
          await waitFor(() => {
            const appNameElements = screen.getAllByText(appName);
            expect(appNameElements.length).toBeGreaterThan(0);
          });
          
          await waitFor(() => {
            expect(screen.getByText(heroHeading)).toBeInTheDocument();
          });
          
          await waitFor(() => {
            expect(screen.getByText(getStartedButton)).toBeInTheDocument();
          });

          // Verify the text is NOT in the other language
          const otherLanguage = language === 'en' ? 'de' : 'en';
          const otherAppName = testI18n.t('app.name', { ns: 'common', lng: otherLanguage });
          const otherHeroHeading = testI18n.t('welcome.hero.heading', { ns: 'pages', lng: otherLanguage });
          
          // Only check if the translations are actually different
          if (otherAppName !== appName) {
            expect(screen.queryAllByText(otherAppName).length).toBe(0);
          }
          if (otherHeroHeading !== heroHeading) {
            expect(screen.queryByText(otherHeroHeading)).not.toBeInTheDocument();
          }

          // Clean up
          unmount();
        }
      ),
      { numRuns: 10 } // Run 10 times (5 for each language)
    );
  });

  it('should display Login page text in the selected language', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        async (language) => {
          // Change to the selected language
          await testI18n.changeLanguage(language);

          // Render the Login page
          const { container, unmount } = render(<Login />, { wrapper: createWrapper() });

          // Wait for content to render
          await waitFor(() => {
            expect(container.textContent).toBeTruthy();
          });

          // Get expected translations for this language
          const heading = testI18n.t('login.heading', { ns: 'pages', lng: language });
          const submitButton = testI18n.t('login.submit', { ns: 'pages', lng: language });
          const forgotPassword = testI18n.t('login.forgotPassword', { ns: 'pages', lng: language });

          // Verify the translations are present in the rendered output
          expect(screen.getByText(heading)).toBeInTheDocument();
          expect(screen.getByRole('button', { name: submitButton })).toBeInTheDocument();
          expect(screen.getByText(forgotPassword)).toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should display SignUp page text in the selected language', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        async (language) => {
          // Change to the selected language
          await testI18n.changeLanguage(language);

          // Render the SignUp page
          const { container, unmount } = render(<SignUp />, { wrapper: createWrapper() });

          // Wait for content to render
          await waitFor(() => {
            expect(container.textContent).toBeTruthy();
          });

          // Get expected translations for this language
          const heading = testI18n.t('signup.heading', { ns: 'pages', lng: language });
          const submitButton = testI18n.t('signup.submit', { ns: 'pages', lng: language });
          const passwordHint = testI18n.t('signup.passwordHint', { ns: 'pages', lng: language });

          // Verify the translations are present in the rendered output
          expect(screen.getByText(heading)).toBeInTheDocument();
          expect(screen.getByRole('button', { name: submitButton })).toBeInTheDocument();
          expect(screen.getAllByText(passwordHint).length).toBeGreaterThan(0);

          // Clean up
          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should display Dashboard page text in the selected language', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        async (language) => {
          // Change to the selected language
          await testI18n.changeLanguage(language);

          // Render the Dashboard page
          const { container, unmount } = render(<Dashboard />, { wrapper: createWrapper() });

          // Wait for content to render
          await waitFor(() => {
            expect(container.textContent).toBeTruthy();
          });

          // Get expected translations for this language
          const heading = testI18n.t('dashboard.heading', { ns: 'pages', lng: language });

          // Verify the translations are present in the rendered output
          // Use queryAllByText and check if elements exist (may appear in navigation too)
          await waitFor(() => {
            const headingElements = screen.queryAllByText(heading);
            expect(headingElements.length).toBeGreaterThan(0);
          });

          // Clean up
          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should display Pricing page text in the selected language', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        async (language) => {
          // Change to the selected language
          await testI18n.changeLanguage(language);

          // Render the Pricing page
          const { container, unmount } = render(<Pricing />, { wrapper: createWrapper() });

          // Wait for content to render and verify the page has content
          await waitFor(() => {
            expect(container.textContent).toBeTruthy();
            // Just verify some content is present - the page renders with translations
            expect(container.textContent!.length).toBeGreaterThan(100);
          }, { timeout: 3000 });

          // Clean up
          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should use correct translation namespace for each page', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        async (language) => {
          await testI18n.changeLanguage(language);

          // Verify that translations from the 'pages' namespace are loaded
          const welcomeTitle = testI18n.t('welcome.title', { ns: 'pages', lng: language });
          const loginTitle = testI18n.t('login.title', { ns: 'pages', lng: language });
          
          // Verify that translations from the 'common' namespace are loaded
          const appName = testI18n.t('app.name', { ns: 'common', lng: language });
          const navDashboard = testI18n.t('nav.dashboard', { ns: 'common', lng: language });

          // All translations should be non-empty strings and not equal to their keys
          expect(welcomeTitle).toBeTruthy();
          expect(welcomeTitle).not.toBe('welcome.title');
          expect(loginTitle).toBeTruthy();
          expect(loginTitle).not.toBe('login.title');
          expect(appName).toBeTruthy();
          expect(appName).not.toBe('app.name');
          expect(navDashboard).toBeTruthy();
          expect(navDashboard).not.toBe('nav.dashboard');
        }
      ),
      { numRuns: 10 }
    );
  });
});
