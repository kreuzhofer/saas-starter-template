import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { UserDropdown } from './UserDropdown';
import testI18n from '../i18n/testConfig';

/**
 * Feature: responsive-navigation-ui, Property 6: Admin menu item visibility
 * Validates: Requirements 2.5, 2.6
 * 
 * For any user, the admin menu item should be visible in the user dropdown 
 * if and only if the user's role is "admin"
 */

describe('Property-Based Test: Admin Menu Item Visibility', () => {
  it('should show admin link if and only if isAdmin is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isAdmin value
        async (isAdmin) => {
          const mockOnClose = vi.fn();
          const mockOnLogout = vi.fn();

          const { unmount } = render(
            <BrowserRouter>
              <I18nextProvider i18n={testI18n}>
                <UserDropdown
                  isOpen={true}
                  onClose={mockOnClose}
                  isAdmin={isAdmin}
                  onLogout={mockOnLogout}
                />
              </I18nextProvider>
            </BrowserRouter>
          );

          // Check if admin link is present
          const adminLink = screen.queryByRole('menuitem', { name: /admin/i });

          // Property: Admin link visible IFF isAdmin is true
          if (isAdmin) {
            expect(adminLink).toBeInTheDocument();
          } else {
            expect(adminLink).not.toBeInTheDocument();
          }

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always show Profile and Logout regardless of admin status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isAdmin value
        async (isAdmin) => {
          const mockOnClose = vi.fn();
          const mockOnLogout = vi.fn();

          const { unmount } = render(
            <BrowserRouter>
              <I18nextProvider i18n={testI18n}>
                <UserDropdown
                  isOpen={true}
                  onClose={mockOnClose}
                  isAdmin={isAdmin}
                  onLogout={mockOnLogout}
                />
              </I18nextProvider>
            </BrowserRouter>
          );

          // Profile and Logout should always be present
          expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument();
          expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have exactly 2 menu items for non-admin and 3 for admin', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isAdmin value
        async (isAdmin) => {
          const mockOnClose = vi.fn();
          const mockOnLogout = vi.fn();

          const { unmount } = render(
            <BrowserRouter>
              <I18nextProvider i18n={testI18n}>
                <UserDropdown
                  isOpen={true}
                  onClose={mockOnClose}
                  isAdmin={isAdmin}
                  onLogout={mockOnLogout}
                />
              </I18nextProvider>
            </BrowserRouter>
          );

          const menuItems = screen.getAllByRole('menuitem');
          const expectedCount = isAdmin ? 3 : 2;

          expect(menuItems).toHaveLength(expectedCount);

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
