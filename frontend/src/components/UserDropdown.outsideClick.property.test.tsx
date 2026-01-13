import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { UserDropdown } from './UserDropdown';
import testI18n from '../i18n/testConfig';

/**
 * Feature: responsive-navigation-ui, Property 4: Menu closure on outside click
 * Validates: Requirements 1.4, 2.3
 * 
 * For any open menu (burger menu or user dropdown), when a click event occurs 
 * outside the menu boundaries, the menu should close
 */

describe('Property-Based Test: Menu Closure on Outside Click', () => {
  it('should call onClose when clicking outside the dropdown for any admin status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isAdmin value
        async (isAdmin) => {
          const mockOnClose = vi.fn();
          const mockOnLogout = vi.fn();

          const { container, unmount } = render(
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

          // Click outside the dropdown (on the container)
          await userEvent.click(container);

          // Property: Outside click should trigger onClose
          await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalledTimes(1);
          });

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not call onClose when clicking inside the dropdown', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isAdmin value
        async (isAdmin) => {
          const mockOnClose = vi.fn();
          const mockOnLogout = vi.fn();

          const { unmount, container } = render(
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

          // Find the dropdown menu element
          const menu = container.querySelector('[role="menu"]');
          expect(menu).toBeTruthy();

          if (menu) {
            // Click inside the dropdown
            await userEvent.click(menu);

            // Wait a bit to ensure no call was made
            await new Promise(resolve => setTimeout(resolve, 50));

            // Property: Inside click should NOT trigger onClose
            expect(mockOnClose).not.toHaveBeenCalled();
          }

          // Clean up
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 10000);

  it('should call onClose for each outside click', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // isAdmin value
        fc.integer({ min: 1, max: 3 }), // number of clicks
        async (isAdmin, numClicks) => {
          const mockOnClose = vi.fn();
          const mockOnLogout = vi.fn();

          const { container, unmount } = render(
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

          // Perform multiple clicks outside
          for (let i = 0; i < numClicks; i++) {
            await userEvent.click(container);
            // Small delay between clicks to ensure event handlers process
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Property: Each outside click should trigger onClose
          await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalledTimes(numClicks);
          });

          // Clean up
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});
