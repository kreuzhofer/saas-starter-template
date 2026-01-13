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
 * Responsive behavior integration tests
 * Tests navigation at various viewport sizes, menu interactions on mobile and desktop,
 * and orientation changes
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
describe('Navigation - Responsive Behavior Across Devices', () => {
  let getProfileMock: ReturnType<typeof vi.fn>;
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(authUtils.getUserRole).mockReturnValue('user');
    
    // Store original dimensions
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    
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
    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    vi.restoreAllMocks();
  });

  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  };

  describe('Various viewport sizes', () => {
    it('should render mobile layout on iPhone SE (375x667)', () => {
      setViewport(375, 667);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have burger menu button
      const burgerButton = screen.getByLabelText('Open menu');
      expect(burgerButton).toBeInTheDocument();
    });

    it('should render mobile layout on iPhone 12 Pro (390x844)', () => {
      setViewport(390, 844);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have burger menu button
      const burgerButton = screen.getByLabelText('Open menu');
      expect(burgerButton).toBeInTheDocument();
    });

    it('should render mobile layout on Samsung Galaxy S20 (360x800)', () => {
      setViewport(360, 800);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have burger menu button
      const burgerButton = screen.getByLabelText('Open menu');
      expect(burgerButton).toBeInTheDocument();
    });

    it('should render desktop layout on iPad (768x1024)', () => {
      setViewport(768, 1024);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have horizontal navigation links
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });

    it('should render desktop layout on iPad Pro (1024x1366)', () => {
      setViewport(1024, 1366);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have horizontal navigation links
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });

    it('should render desktop layout on laptop (1366x768)', () => {
      setViewport(1366, 768);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have horizontal navigation links
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });

    it('should render desktop layout on desktop (1920x1080)', () => {
      setViewport(1920, 1080);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have horizontal navigation links
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });

    it('should render desktop layout on 4K display (3840x2160)', () => {
      setViewport(3840, 2160);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have horizontal navigation links
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });

    it('should maintain user avatar visibility at all viewport sizes', async () => {
      const viewports = [
        [375, 667],   // iPhone SE
        [768, 1024],  // iPad
        [1920, 1080], // Desktop
      ];

      for (const [width, height] of viewports) {
        setViewport(width, height);
        
        const { unmount } = render(<Navigation />, { wrapper: createWrapper() });

        await waitFor(() => {
          expect(screen.getByText('JD')).toBeInTheDocument();
        });

        unmount();
      }
    });

    it('should maintain app name visibility at all viewport sizes', () => {
      const viewports = [
        [375, 667],   // iPhone SE
        [768, 1024],  // iPad
        [1920, 1080], // Desktop
      ];

      for (const [width, height] of viewports) {
        setViewport(width, height);
        
        const { unmount } = render(<Navigation />, { wrapper: createWrapper() });

        expect(screen.getByText('Test App')).toBeInTheDocument();

        unmount();
      }
    });
  });

  describe('Menu interactions on mobile', () => {
    beforeEach(() => {
      setViewport(375, 667); // iPhone SE
    });

    it('should open burger menu on mobile when button is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      await user.click(burgerButton);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should close burger menu when clicking outside on mobile', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      await user.click(burgerButton);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });

      // Click outside the menu
      await user.click(document.body);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should close burger menu when navigation link is clicked on mobile', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      const burgerButton = screen.getByLabelText('Open menu');
      await user.click(burgerButton);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });

      // Click a navigation link
      const dashboardLinks = screen.getAllByText('Dashboard');
      await user.click(dashboardLinks[0]);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should open user menu on mobile when avatar is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('should close user menu when clicking outside on mobile', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Click outside the menu
      await user.click(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });
  });

  describe('Menu interactions on desktop', () => {
    beforeEach(() => {
      setViewport(1920, 1080); // Desktop
    });

    it('should not show burger menu button on desktop', () => {
      render(<Navigation />, { wrapper: createWrapper() });

      // Burger button exists in DOM but is hidden with md:hidden class
      const burgerButton = screen.getByLabelText('Open menu');
      expect(burgerButton).toBeInTheDocument();
      // Check that it has the md:hidden class
      expect(burgerButton.parentElement).toHaveClass('md:hidden');
    });

    it('should show horizontal navigation links on desktop', () => {
      render(<Navigation />, { wrapper: createWrapper() });

      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
      
      const analyticsLinks = screen.getAllByText('Analytics');
      expect(analyticsLinks.length).toBeGreaterThan(0);
    });

    it('should open user menu on desktop when avatar is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('should close user menu when clicking outside on desktop', async () => {
      const user = userEvent.setup();
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Click outside the menu
      await user.click(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });
  });

  describe('Orientation changes', () => {
    it('should adapt from portrait to landscape on mobile', async () => {
      // Start in portrait
      setViewport(375, 667);
      
      const { rerender } = render(<Navigation />, { wrapper: createWrapper() });

      // Should have burger menu in portrait
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();

      // Change to landscape (swap dimensions)
      setViewport(667, 375);
      rerender(<Navigation />);

      // Should still have burger menu (still < 768px)
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    });

    it('should adapt from portrait to landscape on tablet', async () => {
      // Start in portrait (768x1024)
      setViewport(768, 1024);
      
      const { rerender } = render(<Navigation />, { wrapper: createWrapper() });

      // Should have desktop layout in portrait
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);

      // Change to landscape (1024x768)
      setViewport(1024, 768);
      rerender(<Navigation />);

      // Should still have desktop layout
      const dashboardLinksAfter = screen.getAllByText('Dashboard');
      expect(dashboardLinksAfter.length).toBeGreaterThan(0);
    });

    it('should close all menus when orientation changes', async () => {
      const user = userEvent.setup();
      
      // Start in portrait
      setViewport(375, 667);
      
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Open user menu
      const avatar = screen.getByLabelText('User menu');
      await user.click(avatar);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Change orientation
      setViewport(667, 375);
      
      // Menu should be closed
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });

    it('should maintain user avatar visibility during orientation change', async () => {
      setViewport(375, 667);
      
      const { rerender } = render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Change orientation
      setViewport(667, 375);
      rerender(<Navigation />);

      // Avatar should still be visible
      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });
  });

  describe('Breakpoint transitions', () => {
    it('should transition from mobile to desktop layout at 768px', async () => {
      // Start just below breakpoint
      setViewport(767, 1024);
      
      const { rerender, unmount } = render(<Navigation />, { wrapper: createWrapper() });

      // Should have burger menu
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();

      unmount();

      // Cross breakpoint
      setViewport(768, 1024);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have desktop layout
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });

    it('should transition from desktop to mobile layout at 767px', async () => {
      // Start just above breakpoint
      setViewport(768, 1024);
      
      const { unmount } = render(<Navigation />, { wrapper: createWrapper() });

      // Should have desktop layout
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);

      unmount();

      // Cross breakpoint
      setViewport(767, 1024);
      
      render(<Navigation />, { wrapper: createWrapper() });

      // Should have burger menu
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    });

    it('should close all menus when crossing breakpoint', async () => {
      const user = userEvent.setup();
      
      setViewport(767, 1024);
      
      render(<Navigation />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });

      // Open burger menu
      const burgerButton = screen.getByLabelText('Open menu');
      await user.click(burgerButton);
      
      await waitFor(() => {
        expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
      });

      // Cross breakpoint to desktop
      setViewport(768, 1024);
      
      // Burger menu should be closed (actually removed from DOM)
      await waitFor(() => {
        expect(screen.queryByLabelText('Open menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Consistent behavior across devices', () => {
    it('should maintain consistent logout functionality across all devices', async () => {
      const user = userEvent.setup();
      const clearAuthTokenMock = vi.mocked(authUtils.clearAuthToken);
      
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      const viewports = [
        [375, 667],   // Mobile
        [768, 1024],  // Tablet
        [1920, 1080], // Desktop
      ];

      for (const [width, height] of viewports) {
        setViewport(width, height);
        
        const { unmount } = render(<Navigation />, { wrapper: createWrapper() });

        await waitFor(() => {
          expect(screen.getByText('JD')).toBeInTheDocument();
        });

        // Open user menu
        const avatar = screen.getByLabelText('User menu');
        await user.click(avatar);
        
        await waitFor(() => {
          expect(screen.getByText('Logout')).toBeInTheDocument();
        });

        // Click logout
        const logoutButton = screen.getByText('Logout');
        await user.click(logoutButton);
        
        expect(clearAuthTokenMock).toHaveBeenCalled();
        
        clearAuthTokenMock.mockClear();
        unmount();
      }
    });

    it('should maintain consistent profile access across all devices', async () => {
      const user = userEvent.setup();

      const viewports = [
        [375, 667],   // Mobile
        [768, 1024],  // Tablet
        [1920, 1080], // Desktop
      ];

      for (const [width, height] of viewports) {
        setViewport(width, height);
        
        const { unmount } = render(<Navigation />, { wrapper: createWrapper() });

        await waitFor(() => {
          expect(screen.getByText('JD')).toBeInTheDocument();
        });

        // Open user menu
        const avatar = screen.getByLabelText('User menu');
        await user.click(avatar);
        
        await waitFor(() => {
          // Profile appears in multiple places, use getAllByText
          const profileLinks = screen.getAllByText('Profile');
          expect(profileLinks.length).toBeGreaterThan(0);
        });

        unmount();
      }
    });
  });
});
