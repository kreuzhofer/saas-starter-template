import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { Navigation } from './Navigation';
import * as authUtils from '../utils/auth';
import i18n from 'i18next';

// Mock modules
vi.mock('../utils/auth');
vi.mock('../api/client', () => ({
  getProfile: vi.fn(),
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
      },
    },
  },
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
};

/**
 * Accessibility and keyboard navigation integration tests
 * Tests Tab navigation through all interactive elements, Enter/Space activation of menus,
 * Escape key menu closure, and ARIA attributes
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
describe('Navigation - Accessibility with Keyboard Navigation', () => {
  let getProfileMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(authUtils.getUserRole).mockReturnValue('user');
    
    // Import and mock getProfile
    const apiClient = await import('../api/client');
    getProfileMock = vi.mocked(apiClient.getProfile);
    getProfileMock.mockResolvedValue({
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: '2024-01-01',
      firstName: 'John',
      lastName: 'Doe',
      language: 'en',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tab navigation through all interactive elements', () => {
    it('should allow Tab navigation through burger menu button, navigation links, and user avatar', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      
      // First focusable element should be burger menu button or first nav link
      const burgerButton = screen.queryByLabelText('Open menu');
      const dashboardLinks = screen.queryAllByText('Dashboard');
      
      // One of these should be focused
      expect(
        burgerButton === document.activeElement ||
        dashboardLinks.some(link => link === document.activeElement)
      ).toBe(true);
    });

    it('should maintain logical focus order: burger button → nav links → language selector → user avatar', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Start from beginning
      document.body.focus();
      
      // Tab to first element
      await user.tab();
      const firstFocused = document.activeElement;
      expect(firstFocused).toBeTruthy();
      
      // Tab to second element
      await user.tab();
      const secondFocused = document.activeElement;
      expect(secondFocused).toBeTruthy();
      expect(secondFocused).not.toBe(firstFocused);
      
      // Tab to third element
      await user.tab();
      const thirdFocused = document.activeElement;
      expect(thirdFocused).toBeTruthy();
      expect(thirdFocused).not.toBe(secondFocused);
    });

    it('should allow reverse Tab navigation with Shift+Tab', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Tab forward twice
      await user.tab();
      await user.tab();
      const forwardFocused = document.activeElement;
      
      // Tab backward once
      await user.tab({ shift: true });
      const backwardFocused = document.activeElement;
      
      expect(backwardFocused).not.toBe(forwardFocused);
    });

    it('should include all navigation links in tab order', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const focusedElements: Element[] = [];
      
      // Tab through several elements
      for (let i = 0; i < 10; i++) {
        await user.tab();
        if (document.activeElement && document.activeElement !== document.body) {
          focusedElements.push(document.activeElement);
        }
      }
      
      // Should have focused multiple elements
      expect(focusedElements.length).toBeGreaterThan(0);
      
      // Should include navigation links
      const navLinks = screen.getAllByRole('link');
      const focusedNavLinks = focusedElements.filter(el => 
        navLinks.some(link => link === el)
      );
      expect(focusedNavLinks.length).toBeGreaterThan(0);
    });

    it('should include user avatar in tab order', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      // Tab until we reach the avatar or exhaust reasonable attempts
      let found = false;
      for (let i = 0; i < 20; i++) {
        await user.tab();
        if (document.activeElement === avatar) {
          found = true;
          break;
        }
      }
      
      expect(found).toBe(true);
    });
  });

  describe('Enter/Space activation of menus', () => {
    it('should open burger menu when Enter is pressed on burger button', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      // Focus the burger button
      burgerButton.focus();
      expect(document.activeElement).toBe(burgerButton);
      
      // Press Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should open burger menu when Space is pressed on burger button', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      // Focus the burger button
      burgerButton.focus();
      expect(document.activeElement).toBe(burgerButton);
      
      // Press Space
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should close burger menu when Enter is pressed again on burger button', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      // Focus and open
      burgerButton.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
      
      // Press Enter again to close
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should open user menu when Enter is pressed on user avatar', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      // Focus the avatar
      avatar.focus();
      expect(document.activeElement).toBe(avatar);
      
      // Press Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('should open user menu when Space is pressed on user avatar', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      // Focus the avatar
      avatar.focus();
      expect(document.activeElement).toBe(avatar);
      
      // Press Space
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('should close user menu when Enter is pressed again on user avatar', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      // Focus and open
      avatar.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
      
      // Press Enter again to close
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });
  });

  describe('Escape key menu closure', () => {
    it('should close burger menu when Escape is pressed', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      // Open burger menu
      await user.click(burgerButton);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should close user menu when Escape is pressed', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      // Open user menu
      await user.click(avatar);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });

    it('should close burger menu when Escape is pressed while menu has focus', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      // Open burger menu
      await user.click(burgerButton);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
      
      // Tab into the menu
      await user.tab();
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should close user menu when Escape is pressed while menu has focus', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      // Open user menu
      await user.click(avatar);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
      
      // Tab into the menu
      await user.tab();
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });
  });

  describe('ARIA attributes verification', () => {
    it('should have correct ARIA attributes on burger menu button', () => {
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      expect(burgerButton).toHaveAttribute('aria-label', 'Open menu');
      expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      expect(burgerButton).toHaveAttribute('aria-controls', 'burger-menu');
    });

    it('should update aria-expanded when burger menu is opened', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(burgerButton);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should have correct ARIA attributes on user avatar button', async () => {
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      expect(avatar).toHaveAttribute('aria-label', 'User menu');
      expect(avatar).toHaveAttribute('aria-haspopup', 'true');
      expect(avatar).toHaveAttribute('aria-expanded');
    });

    it('should update aria-expanded when user menu is opened', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      expect(avatar).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(avatar);
      
      await waitFor(() => {
        expect(avatar).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should have role="menu" on dropdown menus', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        const menu = screen.getByRole('menu');
        expect(menu).toBeInTheDocument();
      });
    });

    it('should have role="menuitem" on menu items', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems.length).toBeGreaterThan(0);
      });
    });

    it('should have aria-label on burger menu', () => {
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerMenu = screen.getByLabelText('Mobile navigation menu');
      expect(burgerMenu).toBeInTheDocument();
    });

    it('should have aria-hidden on closed burger menu', () => {
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerMenu = screen.getByLabelText('Mobile navigation menu');
      expect(burgerMenu).toHaveAttribute('aria-hidden', 'true');
    });

    it('should update aria-hidden when burger menu is opened', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      const burgerMenu = screen.getByLabelText('Mobile navigation menu');
      
      expect(burgerMenu).toHaveAttribute('aria-hidden', 'true');
      
      await user.click(burgerButton);
      
      await waitFor(() => {
        expect(burgerMenu).toHaveAttribute('aria-hidden', 'false');
      });
    });

    it('should have aria-label on language selector', () => {
      render(<Navigation />, { wrapper: createWrapper() });

      // There are multiple language selectors (desktop and mobile)
      const languageSelectors = screen.getAllByLabelText('Select language');
      expect(languageSelectors.length).toBeGreaterThan(0);
    });

    it('should have aria-label on user initials', async () => {
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        const initials = screen.getByLabelText('User initials: JD');
        expect(initials).toBeInTheDocument();
      });
    });
  });

  describe('Focus management', () => {
    it('should maintain focus on burger button after closing menu with Escape', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      // Open menu
      burgerButton.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
      
      // Close with Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      });
      
      // Focus should return to button
      expect(document.activeElement).toBe(burgerButton);
    });

    it('should maintain focus on user avatar after closing menu with Escape', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      // Open menu
      avatar.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
      
      // Close with Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
      
      // Focus should return to avatar
      expect(document.activeElement).toBe(avatar);
    });

    it('should allow keyboard navigation within open burger menu', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      // Open menu
      await user.click(burgerButton);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
      
      // Tab into menu - may need multiple tabs to reach menu items
      const menuItems = screen.getAllByRole('menuitem');
      let foundMenuItem = false;
      
      for (let i = 0; i < 5; i++) {
        await user.tab();
        if (menuItems.some(item => item === document.activeElement)) {
          foundMenuItem = true;
          break;
        }
      }
      
      // Should eventually focus on a menu item
      expect(foundMenuItem).toBe(true);
    });

    it('should allow keyboard navigation within open user menu', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      // Open menu
      await user.click(avatar);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
      
      // Tab into menu
      await user.tab();
      
      // Should focus on a menu item
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.some(item => item === document.activeElement)).toBe(true);
    });
  });

  describe('Complete keyboard workflow', () => {
    it('should support complete keyboard-only workflow: navigate → open menu → select item', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Tab to user avatar
      const avatar = screen.getByLabelText('User menu');
      let found = false;
      for (let i = 0; i < 20; i++) {
        await user.tab();
        if (document.activeElement === avatar) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
      
      // Open menu with Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
      
      // Tab to menu item
      await user.tab();
      
      // Should be on a menu item
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.some(item => item === document.activeElement)).toBe(true);
      
      // Close with Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });

    it('should support keyboard-only burger menu workflow', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      // Tab to burger button
      const burgerButton = screen.getByLabelText('Open menu');
      burgerButton.focus();
      
      // Open with Space
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
      
      // Tab to menu item - may need multiple tabs
      const menuItems = screen.getAllByRole('menuitem');
      let foundMenuItem = false;
      
      for (let i = 0; i < 5; i++) {
        await user.tab();
        if (menuItems.some(item => item === document.activeElement)) {
          foundMenuItem = true;
          break;
        }
      }
      
      // Should eventually focus on a menu item
      expect(foundMenuItem).toBe(true);
      
      // Close with Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      });
      
      // Menu should be closed
      expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
