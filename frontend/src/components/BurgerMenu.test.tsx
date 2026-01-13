import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { BurgerMenu } from './BurgerMenu';
import testI18n from '../i18n/testConfig';

describe('BurgerMenu', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  const renderBurgerMenu = (isOpen: boolean, isAdmin: boolean) => {
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={testI18n}>
          <BurgerMenu isOpen={isOpen} onClose={mockOnClose} isAdmin={isAdmin} />
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  describe('Menu rendering when open/closed', () => {
    it('should render menu with translate-x-0 when isOpen is true', () => {
      renderBurgerMenu(true, false);
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('translate-x-0');
      expect(menu).not.toHaveClass('-translate-x-full');
    });

    it('should render menu with -translate-x-full when isOpen is false', () => {
      renderBurgerMenu(false, false);
      const menu = screen.getByRole('menu', { hidden: true });
      expect(menu).toHaveClass('-translate-x-full');
      expect(menu).not.toHaveClass('translate-x-0');
    });

    it('should render backdrop when isOpen is true', () => {
      const { container } = renderBurgerMenu(true, false);
      const backdrop = container.querySelector('.bg-black.bg-opacity-50');
      expect(backdrop).toBeInTheDocument();
    });

    it('should not render backdrop when isOpen is false', () => {
      const { container } = renderBurgerMenu(false, false);
      const backdrop = container.querySelector('.bg-black.bg-opacity-50');
      expect(backdrop).not.toBeInTheDocument();
    });

    it('should have aria-hidden=false when isOpen is true', () => {
      renderBurgerMenu(true, false);
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-hidden', 'false');
    });

    it('should have aria-hidden=true when isOpen is false', () => {
      renderBurgerMenu(false, false);
      const menu = screen.getByRole('menu', { hidden: true });
      expect(menu).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Link rendering', () => {
    it('should render Dashboard link', () => {
      renderBurgerMenu(true, false);
      expect(screen.getByRole('menuitem', { name: /dashboard/i })).toBeInTheDocument();
    });

    it('should render Analytics link', () => {
      renderBurgerMenu(true, false);
      expect(screen.getByRole('menuitem', { name: /analytics/i })).toBeInTheDocument();
    });

    it('should render Profile link', () => {
      renderBurgerMenu(true, false);
      expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument();
    });

    it('should render Admin link when isAdmin is true', () => {
      renderBurgerMenu(true, true);
      expect(screen.getByRole('menuitem', { name: /admin/i })).toBeInTheDocument();
    });

    it('should not render Admin link when isAdmin is false', () => {
      renderBurgerMenu(true, false);
      expect(screen.queryByRole('menuitem', { name: /admin/i })).not.toBeInTheDocument();
    });
  });

  describe('Language selector inclusion', () => {
    it('should include language selector in menu', () => {
      renderBurgerMenu(true, false);
      // Language selector has a button with aria-label="Select language"
      expect(screen.getByLabelText(/select language/i)).toBeInTheDocument();
    });
  });

  describe('Close on link click', () => {
    it('should call onClose when Dashboard link is clicked', async () => {
      const user = userEvent.setup();
      renderBurgerMenu(true, false);

      const dashboardLink = screen.getByRole('menuitem', { name: /dashboard/i });
      await user.click(dashboardLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Analytics link is clicked', async () => {
      const user = userEvent.setup();
      renderBurgerMenu(true, false);

      const analyticsLink = screen.getByRole('menuitem', { name: /analytics/i });
      await user.click(analyticsLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Profile link is clicked', async () => {
      const user = userEvent.setup();
      renderBurgerMenu(true, false);

      const profileLink = screen.getByRole('menuitem', { name: /profile/i });
      await user.click(profileLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Admin link is clicked', async () => {
      const user = userEvent.setup();
      renderBurgerMenu(true, true);

      const adminLink = screen.getByRole('menuitem', { name: /admin/i });
      await user.click(adminLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Outside click detection', () => {
    it('should call onClose when clicking outside the menu', async () => {
      const { container } = renderBurgerMenu(true, false);

      // Click outside the menu (on the backdrop or container)
      await userEvent.click(container);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onClose when clicking inside the menu', async () => {
      renderBurgerMenu(true, false);

      const menu = screen.getByRole('menu');
      await userEvent.click(menu);

      // Wait a bit to ensure no call was made
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not set up outside click listener when menu is closed', async () => {
      const { container } = renderBurgerMenu(false, false);

      // Click outside when menu is closed
      await userEvent.click(container);

      // Wait a bit to ensure no call was made
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      renderBurgerMenu(true, false);
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-label', 'Mobile navigation menu');
    });

    it('should have role="menuitem" on all navigation links', () => {
      renderBurgerMenu(true, true);
      const menuItems = screen.getAllByRole('menuitem');
      // Dashboard, Analytics, Admin, Profile = 4 items
      expect(menuItems).toHaveLength(4);
    });
  });
});
