import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import type { BannerOutput, ToastInput } from '../types';
import * as useSSEModule from '../hooks/useSSE';

/**
 * Unit tests for ToastContainer component
 * 
 * Tests verify:
 * - Toast addition via SSE
 * - Toast removal after duration
 * - Multiple toast handling
 * - Empty state rendering
 * 
 * Requirements: 13.1-13.4
 */

// Mock the useSSE hook
vi.mock('../hooks/useSSE');

describe('ToastContainer', () => {
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

    // Use fake timers for duration testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const createToast = (overrides: Partial<ToastInput> = {}): ToastInput => ({
    type: 'info',
    message: 'Test toast',
    duration: 5000,
    ...overrides,
  });

  describe('Toast Addition via SSE', () => {
    it('should display a toast when received via SSE', () => {
      render(<ToastContainer />);

      // Verify callback was registered
      expect(onToastCallback).toBeDefined();
      expect(onToastCallback).not.toBeNull();

      // Simulate receiving a toast via SSE
      const toast = createToast({ message: 'New notification' });
      act(() => {
        onToastCallback!(toast);
      });

      // Toast should appear - state updates are synchronous after act()
      expect(screen.getByText('New notification')).toBeInTheDocument();
    });

    it('should display multiple toasts when received via SSE', () => {
      render(<ToastContainer />);

      // Add first toast
      const toast1 = createToast({ message: 'First toast' });
      act(() => {
        onToastCallback!(toast1);
      });

      // Add second toast
      const toast2 = createToast({ message: 'Second toast' });
      act(() => {
        onToastCallback!(toast2);
      });

      // Both toasts should appear
      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();
    });

    it('should display toasts with different types', () => {
      render(<ToastContainer />);

      // Add toasts with different types
      const errorToast = createToast({ type: 'error', message: 'Error toast' });
      act(() => {
        onToastCallback!(errorToast);
      });

      const warningToast = createToast({ type: 'warning', message: 'Warning toast' });
      act(() => {
        onToastCallback!(warningToast);
      });

      const infoToast = createToast({ type: 'info', message: 'Info toast' });
      act(() => {
        onToastCallback!(infoToast);
      });

      const successToast = createToast({ type: 'success', message: 'Success toast' });
      act(() => {
        onToastCallback!(successToast);
      });

      // All toasts should appear
      expect(screen.getByText('Error toast')).toBeInTheDocument();
      expect(screen.getByText('Warning toast')).toBeInTheDocument();
      expect(screen.getByText('Info toast')).toBeInTheDocument();
      expect(screen.getByText('Success toast')).toBeInTheDocument();
    });

    it('should use default duration of 5000ms when not specified', () => {
      render(<ToastContainer />);

      // Add toast without duration
      const toast = createToast({ message: 'Test toast', duration: undefined });
      act(() => {
        onToastCallback!(toast);
      });

      expect(screen.getByText('Test toast')).toBeInTheDocument();

      // Fast-forward time by 4999ms (just before default duration)
      act(() => {
        vi.advanceTimersByTime(4999);
      });

      // Toast should still be visible
      expect(screen.getByText('Test toast')).toBeInTheDocument();

      // Fast-forward by 1ms more (reaching 5000ms)
      act(() => {
        vi.advanceTimersByTime(1);
      });

      // Toast should be removed
      expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
    });
  });

  describe('Toast Removal After Duration', () => {
    it('should remove toast after specified duration', () => {
      render(<ToastContainer />);

      // Add toast with 3000ms duration
      const toast = createToast({ message: 'Temporary toast', duration: 3000 });
      act(() => {
        onToastCallback!(toast);
      });

      expect(screen.getByText('Temporary toast')).toBeInTheDocument();

      // Fast-forward time by 2999ms (just before duration)
      act(() => {
        vi.advanceTimersByTime(2999);
      });

      // Toast should still be visible
      expect(screen.getByText('Temporary toast')).toBeInTheDocument();

      // Fast-forward by 1ms more (reaching 3000ms)
      act(() => {
        vi.advanceTimersByTime(1);
      });

      // Toast should be removed
      expect(screen.queryByText('Temporary toast')).not.toBeInTheDocument();
    });

    it('should remove each toast after its own duration', () => {
      render(<ToastContainer />);

      // Add toast with 2000ms duration
      const toast1 = createToast({ message: 'Short toast', duration: 2000 });
      act(() => {
        onToastCallback!(toast1);
      });

      // Add toast with 4000ms duration
      const toast2 = createToast({ message: 'Long toast', duration: 4000 });
      act(() => {
        onToastCallback!(toast2);
      });

      expect(screen.getByText('Short toast')).toBeInTheDocument();
      expect(screen.getByText('Long toast')).toBeInTheDocument();

      // Fast-forward by 2000ms
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // First toast should be removed, second still visible
      expect(screen.queryByText('Short toast')).not.toBeInTheDocument();
      expect(screen.getByText('Long toast')).toBeInTheDocument();

      // Fast-forward by another 2000ms (total 4000ms)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Second toast should now be removed
      expect(screen.queryByText('Long toast')).not.toBeInTheDocument();
    });

    it('should handle manual close before duration expires', () => {
      render(<ToastContainer />);

      // Add toast with long duration
      const toast = createToast({ message: 'Closeable toast', duration: 10000 });
      act(() => {
        onToastCallback!(toast);
      });

      expect(screen.getByText('Closeable toast')).toBeInTheDocument();

      // Click close button
      const closeButton = screen.getByLabelText('Close toast');
      act(() => {
        closeButton.click();
      });

      // Toast should be removed immediately
      expect(screen.queryByText('Closeable toast')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render nothing when no toasts exist', () => {
      const { container } = render(<ToastContainer />);

      // Container should be empty
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing after all toasts are removed', () => {
      const { container } = render(<ToastContainer />);

      // Add toast
      const toast = createToast({ message: 'Test toast', duration: 1000 });
      act(() => {
        onToastCallback!(toast);
      });

      expect(screen.getByText('Test toast')).toBeInTheDocument();

      // Fast-forward past duration
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Container should be empty again
      expect(container.firstChild).toBeNull();
    });
  });

  describe('SSE Integration', () => {
    it('should establish SSE connection on mount', () => {
      render(<ToastContainer />);

      // useSSE should have been called
      expect(useSSEModule.useSSE).toHaveBeenCalled();
    });

    it('should provide toast callback to useSSE', () => {
      render(<ToastContainer />);

      // Verify useSSE was called with onToast callback
      const callArgs = vi.mocked(useSSEModule.useSSE).mock.calls[0][0];
      expect(callArgs.onToast).toBeDefined();
      expect(typeof callArgs.onToast).toBe('function');
    });

    it('should ignore banner messages (handled by BannerContainer)', () => {
      render(<ToastContainer />);

      // Simulate receiving a banner via SSE (should be ignored)
      const banner: BannerOutput = {
        id: 'banner-1',
        type: 'info',
        message: 'Banner message',
        dismissable: true,
        audience: 'authenticated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      act(() => {
        onBannerCallback!(banner);
      });

      // No toast should appear
      expect(screen.queryByText('Banner message')).not.toBeInTheDocument();
    });

    it('should ignore banner removal messages (handled by BannerContainer)', async () => {
      render(<ToastContainer />);

      // Add a toast first
      const toast = createToast({ message: 'Test toast' });
      act(() => {
        onToastCallback!(toast);
      });

      // Use getByText since state update is synchronous after act()
      expect(screen.getByText('Test toast')).toBeInTheDocument();

      // Simulate banner removal (should be ignored)
      act(() => {
        onBannerRemovedCallback!('banner-1');
      });

      // Toast should still be visible
      expect(screen.getByText('Test toast')).toBeInTheDocument();
    });
  });

  describe('Toast Stacking', () => {
    it('should stack multiple toasts vertically', async () => {
      render(<ToastContainer />);

      // Add multiple toasts
      const toast1 = createToast({ message: 'First toast' });
      act(() => {
        onToastCallback!(toast1);
      });

      const toast2 = createToast({ message: 'Second toast' });
      act(() => {
        onToastCallback!(toast2);
      });

      const toast3 = createToast({ message: 'Third toast' });
      act(() => {
        onToastCallback!(toast3);
      });

      // All toasts should be visible (state updates are synchronous after act())
      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();
      expect(screen.getByText('Third toast')).toBeInTheDocument();

      // Verify they are all rendered
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);
    });
  });

  describe('Unique ID Generation', () => {
    it('should generate unique IDs for each toast', async () => {
      render(<ToastContainer />);

      // Add same toast message multiple times
      const toast = createToast({ message: 'Duplicate message' });
      act(() => {
        onToastCallback!(toast);
        onToastCallback!(toast);
        onToastCallback!(toast);
      });

      // All three toasts should appear (with unique IDs) - state updates are synchronous after act()
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);
    });
  });
});
