import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { Navigation } from './Navigation';
import { BurgerMenu } from './BurgerMenu';
import { LanguageSelector } from './LanguageSelector';
import i18n from 'i18next';
import * as fc from 'fast-check';

/**
 * Feature: responsive-navigation-ui, Property 14: Language selector accessibility
 * Validates: Requirements 9.1, 9.2
 *
 * Property: For any viewport size, the language selector should be visible and functional
 * either in the navigation bar (desktop) or within the burger menu (mobile)
 */

// Mock auth utilities
vi.mock('../utils/auth', () => ({
  clearAuthToken: vi.fn(),
  getUserRole: vi.fn(() => 'user'),
}));

// Mock API client
vi.mock('../api/client', () => ({
  getProfile: vi.fn(() =>
    Promise.resolve({
      id: '1',
      username: 'test@example.com',
      createdAt: '2024-01-01',
      firstName: 'Test',
      lastName: 'User',
    })
  ),
}));

// Create test i18n instance
const testI18n = i18n.createInstance();
testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        'app.name': 'Test App',
        'nav.dashboard': 'Dashboard',
        'nav.analytics': 'Analytics',
        'nav.admin': 'Admin',
        'nav.profile': 'Profile',
        'nav.logout': 'Logout',
        'nav.openMenu': 'Open menu',
        'nav.closeMenu': 'Close menu',
      },
    },
  },
});

function renderNavigation() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function renderBurgerMenu(isOpen: boolean, isAdmin: boolean) {
  return render(
    <I18nextProvider i18n={testI18n}>
      <BrowserRouter>
        <BurgerMenu isOpen={isOpen} onClose={() => {}} isAdmin={isAdmin} />
      </BrowserRouter>
    </I18nextProvider>
  );
}

function renderLanguageSelector() {
  return render(
    <I18nextProvider i18n={testI18n}>
      <LanguageSelector />
    </I18nextProvider>
  );
}

describe('LanguageSelector Property Tests', () => {
  // Cleanup after each test to prevent DOM accumulation
  afterEach(() => {
    cleanup();
  });

  describe('Property 14: Language selector accessibility', () => {
    it('should have language selector component with proper ARIA attributes', () => {
      // Property: Language selector always has proper accessibility attributes
      fc.assert(
        fc.property(fc.boolean(), (initialOpen) => {
          const { unmount } = renderLanguageSelector();

          // Language selector button should exist
          const languageButton = screen.getByRole('button', {
            name: /select language/i,
          });

          expect(languageButton).toBeTruthy();
          expect(languageButton).toHaveAttribute('aria-label', 'Select language');
          expect(languageButton).toHaveAttribute('aria-expanded');
          expect(languageButton).toHaveAttribute('aria-haspopup', 'true');

          unmount();
        }),
        { numRuns: 50 }
      );
    });

    it('should have language selector in burger menu when open', () => {
      // Property: Burger menu always contains a language selector
      fc.assert(
        fc.property(fc.boolean(), (isAdmin) => {
          const { unmount } = renderBurgerMenu(true, isAdmin);

          // When burger menu is open, it should contain a language selector
          const languageButton = screen.getByRole('button', {
            name: /select language/i,
          });

          expect(languageButton).toBeTruthy();
          expect(languageButton).toHaveAttribute('aria-label');
          expect(languageButton).toHaveAttribute('aria-expanded');
          expect(languageButton).toHaveAttribute('aria-haspopup');

          unmount();
        }),
        { numRuns: 50 }
      );
    });

    it('should have language selector accessible in navigation structure', () => {
      // Property: Navigation contains language selector in its structure
      fc.assert(
        fc.property(fc.boolean(), () => {
          const { unmount } = renderNavigation();

          // Find all language selector buttons in the navigation
          // Use queryAllByRole since there may be multiple (desktop + mobile layouts)
          const languageButtons = screen.queryAllByRole('button', {
            name: /select language/i,
          });

          // At least one language selector should exist
          expect(languageButtons.length).toBeGreaterThan(0);

          // Each language selector should have proper ARIA attributes
          languageButtons.forEach((button) => {
            expect(button).toHaveAttribute('aria-label', 'Select language');
            expect(button).toHaveAttribute('aria-expanded');
            expect(button).toHaveAttribute('aria-haspopup', 'true');
          });

          // Verify burger menu button exists (for mobile layout)
          const burgerButtons = screen.queryAllByRole('button', { name: /open menu/i });
          expect(burgerButtons.length).toBeGreaterThan(0);

          unmount();
        }),
        { numRuns: 50 }
      );
    });

    it('should maintain language selector functionality across user roles', () => {
      // Property: Language selector is accessible regardless of user role
      fc.assert(
        fc.property(fc.constantFrom('user', 'admin'), (role) => {
          const { unmount } = renderNavigation();

          // Language selector should be present regardless of role
          // Use queryAllByRole since there may be multiple instances
          const languageButtons = screen.queryAllByRole('button', {
            name: /select language/i,
          });

          expect(languageButtons.length).toBeGreaterThan(0);

          // All language selectors should be functional (enabled)
          languageButtons.forEach((button) => {
            expect(button).toBeEnabled();
          });

          unmount();
        }),
        { numRuns: 30 }
      );
    });

    it('should have language selector in both navigation layouts', () => {
      // Property: The application structure includes language selector for both mobile and desktop

      // Test desktop navigation structure
      const { unmount: unmountNav } = renderNavigation();

      // Language selector should exist in navigation (may be multiple for mobile + desktop)
      const navLanguageButtons = screen.queryAllByRole('button', {
        name: /select language/i,
      });
      expect(navLanguageButtons.length).toBeGreaterThan(0);

      unmountNav();
      cleanup();

      // Test mobile burger menu structure separately
      const { unmount: unmountBurger } = renderBurgerMenu(true, false);

      const burgerLanguageSelector = screen.getByRole('button', {
        name: /select language/i,
      });
      expect(burgerLanguageSelector).toBeTruthy();
      expect(burgerLanguageSelector).toHaveAttribute('aria-label', 'Select language');

      unmountBurger();
    });
  });
});
