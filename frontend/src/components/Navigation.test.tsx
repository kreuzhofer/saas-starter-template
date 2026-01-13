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

describe('Navigation', () => {
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

  describe('Responsive layout switching', () => {
    it('should render burger menu button on mobile viewport', () => {
      // Set mobile viewport
      global.innerWidth = 500;
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Burger menu button should be visible (has aria-label="Open menu")
      const burgerButton = screen.getByLabelText('Open menu');
      expect(burgerButton).toBeInTheDocument();
    });

    it('should render horizontal navigation links on desktop viewport', () => {
      // Set desktop viewport
      global.innerWidth = 1024;
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Desktop navigation links should be present
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
      const analyticsLinks = screen.getAllByText('Analytics');
      expect(analyticsLinks.length).toBeGreaterThan(0);
    });

    it('should always render user avatar regardless of viewport', async () => {
      render(<Navigation />, { wrapper: createWrapper() });

      // User avatar should be present (look for initials)
      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });

    it('should always render app name regardless of viewport', () => {
      render(<Navigation />, { wrapper: createWrapper() });

      expect(screen.getByText('Test App')).toBeInTheDocument();
    });
  });

  describe('Profile data fetching', () => {
    it('should fetch user profile data on mount', async () => {
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(getProfileMock).toHaveBeenCalled();
      });
    });

    it('should display user initials when profile data is loaded', async () => {
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should display "JD" for John Doe
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });

    it('should display meeple icon when profile data has no names', async () => {
      getProfileMock.mockResolvedValue({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: '2024-01-01',
        firstName: null,
        lastName: null,
        language: 'en',
      });

      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Meeple icon should be rendered (svg element)
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Menu state management', () => {
    it('should toggle burger menu when burger button is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      
      // Click to open
      await user.click(burgerButton);
      
      // Menu should be open (check for menu items in burger menu)
      await waitFor(() => {
        const dashboardLinks = screen.getAllByText('Dashboard');
        // Should have both desktop and burger menu links
        expect(dashboardLinks.length).toBeGreaterThan(1);
      });
    });

    it('should toggle user menu when avatar is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      
      // Click to open
      await user.click(avatar);
      
      // User menu should be open - look for Logout which is only in dropdown
      await waitFor(() => {
        const logoutButtons = screen.getAllByText('Logout');
        expect(logoutButtons.length).toBeGreaterThan(0);
      });
    });

    it('should show admin link in user menu for admin users', async () => {
      vi.mocked(authUtils.getUserRole).mockReturnValue('admin');
      const user = userEvent.setup();
      
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        const adminLinks = screen.getAllByText('Admin');
        // Should have admin link in both desktop nav and dropdown
        expect(adminLinks.length).toBeGreaterThan(0);
      });
    });

    it('should not show admin link in user menu for non-admin users', async () => {
      vi.mocked(authUtils.getUserRole).mockReturnValue('user');
      const user = userEvent.setup();
      
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        // Profile should be in dropdown
        const profileLinks = screen.getAllByText('Profile');
        expect(profileLinks.length).toBeGreaterThan(0);
      });

      // Admin should not be in the dropdown
      const dropdownContainer = screen.getByRole('menu');
      expect(dropdownContainer).not.toHaveTextContent('Admin');
    });
  });

  describe('Logout functionality', () => {
    it('should call clearAuthToken and redirect when logout is clicked', async () => {
      const user = userEvent.setup();
      const clearAuthTokenMock = vi.mocked(authUtils.clearAuthToken);
      
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Open user menu
      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      // Click logout
      await waitFor(() => {
        const logoutButtons = screen.getAllByText('Logout');
        expect(logoutButtons.length).toBeGreaterThan(0);
      });
      
      const logoutButton = screen.getAllByText('Logout')[0];
      await user.click(logoutButton);
      
      expect(clearAuthTokenMock).toHaveBeenCalled();
      expect(window.location.href).toBe('/');
    });
  });

  describe('Viewport resize behavior', () => {
    it('should close all menus when viewport is resized', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Open user menu
      const avatar = screen.getByRole('button', { name: /user menu|profile/i });
      await user.click(avatar);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Trigger resize event
      global.dispatchEvent(new Event('resize'));
      
      // Menu should be closed
      await waitFor(() => {
        const logoutButtons = screen.queryAllByText('Logout');
        // Logout should not be visible in dropdown anymore
        expect(logoutButtons.length).toBe(0);
      });
    });
  });

  describe('Keyboard navigation', () => {
    it('should close burger menu when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      // Open burger menu
      const burgerButton = screen.getByLabelText('Open menu');
      await user.click(burgerButton);
      
      // Check that burger button shows "expanded" state
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });

      // Press Escape
      await user.keyboard('{Escape}');
      
      // Menu should be closed - check aria-expanded attribute
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should close user menu when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Open user menu
      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        const logoutButtons = screen.getAllByText('Logout');
        expect(logoutButtons.length).toBeGreaterThan(0);
      });

      // Press Escape
      await user.keyboard('{Escape}');
      
      // Menu should be closed
      await waitFor(() => {
        const logoutButtons = screen.queryAllByText('Logout');
        expect(logoutButtons.length).toBe(0);
      });
    });
  });
});
