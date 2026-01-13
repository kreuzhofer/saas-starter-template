import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BannerContainer } from './BannerContainer';
import type { BannerOutput, ToastInput } from '../types';
import * as useSSEModule from '../hooks/useSSE';
import * as apiModule from '../api/client';

/**
 * Unit tests for BannerContainer component
 * 
 * Tests verify:
 * - Banner addition via SSE
 * - Banner removal via SSE
 * - Dismissal handling
 * - Connection status display
 */

// Mock the useSSE hook
vi.mock('../hooks/useSSE');

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    dismissBanner: vi.fn(),
  },
}));

describe('BannerContainer', () => {
  let onBannerCallback: ((banner: BannerOutput) => void) | null = null;
  let onToastCallback: ((toast: ToastInput) => void) | null = null;
  let onBannerRemovedCallback: ((bannerId: string) => void) | null = null;

  beforeEach(() => {
    // Reset callbacks
    onBannerCallback = null;
    onToastCallback = null;
    onBannerRemovedCallback = null;

    // Mock useSSE to capture callbacks
    vi.mocked(useSSEModule.useSSE).mockImplementation((options) => {
      onBannerCallback = options.onBanner;
      onToastCallback = options.onToast;
      onBannerRemovedCallback = options.onBannerRemoved;
      
      return {
        connected: true,
        error: null,
      };
    });

    // Mock API
    vi.mocked(apiModule.api.dismissBanner).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createBanner = (overrides: Partial<BannerOutput> = {}): BannerOutput => ({
    id: 'banner-1',
    type: 'info',
    message: 'Test banner',
    dismissable: true,
    audience: 'authenticated',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  describe('Banner Addition via SSE', () => {
    it('should display a banner when received via SSE', async () => {
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Initially no banners
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Simulate receiving a banner via SSE
      const banner = createBanner({ message: 'New notification' });
      onBannerCallback?.(banner);

      // Banner should appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('New notification')).toBeInTheDocument();
      });
    });

    it('should display multiple banners when received via SSE', async () => {
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add first banner
      const banner1 = createBanner({ id: 'banner-1', message: 'First banner' });
      onBannerCallback?.(banner1);

      // Add second banner
      const banner2 = createBanner({ id: 'banner-2', message: 'Second banner' });
      onBannerCallback?.(banner2);

      // Both banners should appear
      await waitFor(() => {
        expect(screen.getByText('First banner')).toBeInTheDocument();
        expect(screen.getByText('Second banner')).toBeInTheDocument();
      });
    });

    it('should update existing banner when received with same ID', async () => {
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add initial banner
      const banner = createBanner({ id: 'banner-1', message: 'Original message' });
      onBannerCallback?.(banner);

      await waitFor(() => {
        expect(screen.getByText('Original message')).toBeInTheDocument();
      });

      // Update banner with same ID
      const updatedBanner = createBanner({ id: 'banner-1', message: 'Updated message' });
      onBannerCallback?.(updatedBanner);

      // Should show updated message
      await waitFor(() => {
        expect(screen.queryByText('Original message')).not.toBeInTheDocument();
        expect(screen.getByText('Updated message')).toBeInTheDocument();
      });
    });

    it('should sort banners by type priority (error > warning > info)', async () => {
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add banners in reverse priority order
      const infoBanner = createBanner({ id: 'info-1', type: 'info', message: 'Info message' });
      onBannerCallback?.(infoBanner);

      const warningBanner = createBanner({ id: 'warning-1', type: 'warning', message: 'Warning message' });
      onBannerCallback?.(warningBanner);

      const errorBanner = createBanner({ id: 'error-1', type: 'error', message: 'Error message' });
      onBannerCallback?.(errorBanner);

      // Get all alerts
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts).toHaveLength(3);
        
        // Verify order: error, warning, info
        expect(alerts[0]).toHaveTextContent('Error message');
        expect(alerts[1]).toHaveTextContent('Warning message');
        expect(alerts[2]).toHaveTextContent('Info message');
      });
    });
  });

  describe('Banner Removal via SSE', () => {
    it('should remove a banner when removal message received via SSE', async () => {
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add banner
      const banner = createBanner({ id: 'banner-1', message: 'Test banner' });
      onBannerCallback?.(banner);

      await waitFor(() => {
        expect(screen.getByText('Test banner')).toBeInTheDocument();
      });

      // Remove banner via SSE
      onBannerRemovedCallback?.('banner-1');

      // Banner should be removed
      await waitFor(() => {
        expect(screen.queryByText('Test banner')).not.toBeInTheDocument();
      });
    });

    it('should only remove the specified banner when multiple exist', async () => {
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add multiple banners
      const banner1 = createBanner({ id: 'banner-1', message: 'First banner' });
      onBannerCallback?.(banner1);

      const banner2 = createBanner({ id: 'banner-2', message: 'Second banner' });
      onBannerCallback?.(banner2);

      await waitFor(() => {
        expect(screen.getByText('First banner')).toBeInTheDocument();
        expect(screen.getByText('Second banner')).toBeInTheDocument();
      });

      // Remove only first banner
      onBannerRemovedCallback?.('banner-1');

      // First banner removed, second remains
      await waitFor(() => {
        expect(screen.queryByText('First banner')).not.toBeInTheDocument();
        expect(screen.getByText('Second banner')).toBeInTheDocument();
      });
    });
  });

  describe('Dismissal Handling', () => {
    it('should call dismissBanner API when dismiss button clicked', async () => {
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add dismissable banner
      const banner = createBanner({ id: 'banner-1', message: 'Dismissable banner', dismissable: true });
      onBannerCallback?.(banner);

      await waitFor(() => {
        expect(screen.getByText('Dismissable banner')).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByLabelText('Dismiss banner');
      dismissButton.click();

      // Should call API
      await waitFor(() => {
        expect(apiModule.api.dismissBanner).toHaveBeenCalledWith('banner-1');
      });
    });

    it('should optimistically remove banner when dismissed', async () => {
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add dismissable banner
      const banner = createBanner({ id: 'banner-1', message: 'Dismissable banner', dismissable: true });
      onBannerCallback?.(banner);

      await waitFor(() => {
        expect(screen.getByText('Dismissable banner')).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByLabelText('Dismiss banner');
      dismissButton.click();

      // Banner should be removed immediately (optimistic update)
      await waitFor(() => {
        expect(screen.queryByText('Dismissable banner')).not.toBeInTheDocument();
      });
    });

    it('should handle dismissal API errors gracefully', async () => {
      // Mock API to reject
      vi.mocked(apiModule.api.dismissBanner).mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add dismissable banner
      const banner = createBanner({ id: 'banner-1', message: 'Dismissable banner', dismissable: true });
      onBannerCallback?.(banner);

      await waitFor(() => {
        expect(screen.getByText('Dismissable banner')).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByLabelText('Dismiss banner');
      dismissButton.click();

      // Banner should still be removed (optimistic update)
      await waitFor(() => {
        expect(screen.queryByText('Dismissable banner')).not.toBeInTheDocument();
      });

      // API should have been called
      expect(apiModule.api.dismissBanner).toHaveBeenCalledWith('banner-1');
    });
  });

  describe('Connection Status', () => {
    it('should not display connection status when connected', () => {
      vi.mocked(useSSEModule.useSSE).mockReturnValue({
        connected: true,
        error: null,
      });

      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // No connection status message
      expect(screen.queryByText(/connection/i)).not.toBeInTheDocument();
    });

    it('should display error message when disconnected and banners exist', async () => {
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add a banner first
      const banner = createBanner({ message: 'Test banner' });
      onBannerCallback?.(banner);

      await waitFor(() => {
        expect(screen.getByText('Test banner')).toBeInTheDocument();
      });

      // Now mock disconnection
      vi.mocked(useSSEModule.useSSE).mockReturnValue({
        connected: false,
        error: 'Connection lost. Reconnecting...',
      });

      // Re-render to apply the new mock
      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add banner again to trigger render with disconnected state
      onBannerCallback?.(banner);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Connection lost. Reconnecting...')).toBeInTheDocument();
      });
    });

    it('should not display error when connected even if error exists', () => {
      vi.mocked(useSSEModule.useSSE).mockReturnValue({
        connected: true,
        error: 'Previous error',
      });

      render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Should not show error when connected
      expect(screen.queryByText('Previous error')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render nothing when no banners exist', () => {
      const { container } = render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Container should be empty
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing after all banners are removed', async () => {
      const { container } = render(
        <BrowserRouter>
          <BannerContainer />
        </BrowserRouter>
      );

      // Add banner
      const banner = createBanner({ id: 'banner-1', message: 'Test banner' });
      onBannerCallback?.(banner);

      await waitFor(() => {
        expect(screen.getByText('Test banner')).toBeInTheDocument();
      });

      // Remove banner
      onBannerRemovedCallback?.('banner-1');

      // Container should be empty again
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });
});
