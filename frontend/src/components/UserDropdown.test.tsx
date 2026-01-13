import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { UserDropdown } from './UserDropdown';
import testI18n from '../i18n/testConfig';

describe('UserDropdown', () => {
  const mockOnClose = vi.fn();
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnLogout.mockClear();
  });

  const renderUserDropdown = (isOpen: boolean, isAdmin: boolean) => {
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={testI18n}>
          <UserDropdown
            isOpen={isOpen}
            onClose={mockOnClose}
            isAdmin={isAdmin}
            onLogout={mockOnLogout}
          />
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  describe('Menu rendering', () => {
    it('should not render when isOpen is false', () => {
      renderUserDropdown(false, false);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderUserDropdown(true, false);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should render Profile menu item when open', () => {
      renderUserDropdown(true, false);
      expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument();
    });

    it('should render Logout menu item when open', () => {
      renderUserDropdown(true, false);
      expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
    });
  });

  describe('Admin link conditional rendering', () => {
    it('should render Admin link when isAdmin is true', () => {
      renderUserDropdown(true, true);
      expect(screen.getByRole('menuitem', { name: /admin/i })).toBeInTheDocument();
    });

    it('should not render Admin link when isAdmin is false', () => {
      renderUserDropdown(true, false);
      expect(screen.queryByRole('menuitem', { name: /admin/i })).not.toBeInTheDocument();
    });
  });

  describe('Menu item click handlers', () => {
    it('should call onClose when Profile link is clicked', async () => {
      const user = userEvent.setup();
      renderUserDropdown(true, false);

      const profileLink = screen.getByRole('menuitem', { name: /profile/i });
      await user.click(profileLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Admin link is clicked', async () => {
      const user = userEvent.setup();
      renderUserDropdown(true, true);

      const adminLink = screen.getByRole('menuitem', { name: /admin/i });
      await user.click(adminLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onLogout and onClose when Logout button is clicked', async () => {
      const user = userEvent.setup();
      renderUserDropdown(true, false);

      const logoutButton = screen.getByRole('menuitem', { name: /logout/i });
      await user.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Outside click detection', () => {
    it('should call onClose when clicking outside the dropdown', async () => {
      const { container } = renderUserDropdown(true, false);

      // Click outside the dropdown
      await userEvent.click(container);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onClose when clicking inside the dropdown', async () => {
      renderUserDropdown(true, false);

      const menu = screen.getByRole('menu');
      await userEvent.click(menu);

      // Wait a bit to ensure no call was made
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderUserDropdown(true, false);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('should have role="menuitem" on all menu items', () => {
      renderUserDropdown(true, true);

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3); // Profile, Admin, Logout
    });
  });
});
