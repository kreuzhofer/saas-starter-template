import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { BurgerMenu } from './BurgerMenu';
import testI18n from '../i18n/testConfig';

/**
 * Feature: responsive-navigation-ui, Property 5: Menu closure on action selection
 * Validates: Requirements 1.3, 2.4
 * 
 * For any menu item click within an open menu, the menu should close after 
 * the action is executed
 */

describe('Property-Based Test: Menu Closure on Action Selection', () => {
  it('should call onClose when any navigation link is clicked', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isAdmin value
        fc.constantFrom('dashboard', 'analytics', 'profile', 'admin'), // link to click
        async (isAdmin, linkName) => {
          // Skip admin link test if user is not admin
          if (linkName === 'admin' && !isAdmin) {
            return;
          }

          const mockOnClose = vi.fn();
          const user = userEvent.setup();

          const { unmount } = render(
            <BrowserRouter>
              <I18nextProvider i18n={testI18n}>
                <BurgerMenu isOpen={true} onClose={mockOnClose} isAdmin={isAdmin} />
              </I18nextProvider>
            </BrowserRouter>
          );

          // Find and click the link
          const link = screen.getByRole('menuitem', { name: new RegExp(linkName, 'i') });
          await user.click(link);

          // Property: onClose should be called exactly once after clicking any link
          expect(mockOnClose).toHaveBeenCalledTimes(1);

          // Clean up
          unmount();
          mockOnClose.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have correct number of menu items based on admin status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isAdmin value
        async (isAdmin) => {
          const mockOnClose = vi.fn();

          const { unmount } = render(
            <BrowserRouter>
              <I18nextProvider i18n={testI18n}>
                <BurgerMenu isOpen={true} onClose={mockOnClose} isAdmin={isAdmin} />
              </I18nextProvider>
            </BrowserRouter>
          );

          // Get all menu items
          const menuItems = screen.getAllByRole('menuitem');
          
          // Expected count: 3 base links (dashboard, analytics, profile) + 1 if admin
          const expectedCount = isAdmin ? 4 : 3;
          expect(menuItems).toHaveLength(expectedCount);

          // Clean up
          unmount();
          mockOnClose.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not call onClose when clicking inside menu but not on a link', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isAdmin value
        async (isAdmin) => {
          const mockOnClose = vi.fn();

          const { unmount, container } = render(
            <BrowserRouter>
              <I18nextProvider i18n={testI18n}>
                <BurgerMenu isOpen={true} onClose={mockOnClose} isAdmin={isAdmin} />
              </I18nextProvider>
            </BrowserRouter>
          );

          // Click on the menu itself (not a link) - use container to avoid multiple menu issue
          const menu = container.querySelector('[role="menu"]');
          expect(menu).toBeTruthy();
          
          await userEvent.click(menu!);

          // Property: Clicking inside menu but not on a link should NOT close the menu
          expect(mockOnClose).not.toHaveBeenCalled();

          // Clean up
          unmount();
          mockOnClose.mockClear();
        }
      ),
      { numRuns: 50 } // Reduced runs to avoid timeout
    );
  });
});
