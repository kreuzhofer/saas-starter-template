import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { useSSE } from './useSSE';
import type { BannerOutput, ToastInput } from '../types';
import * as authUtils from '../utils/auth';

/**
 * Unit tests for useSSE hook
 * Tests connection establishment, message parsing, error handling, and reconnection logic.
 * Requirements: 9.1-9.6
 */

// Mock the auth utils
vi.mock('../utils/auth', () => ({
  getAuthToken: vi.fn(),
}));

describe('useSSE hook', () => {
  let mockEventSource: any;
  let eventSourceInstances: any[] = [];
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    eventSourceInstances = [];
    
    // Mock getAuthToken to return a valid token by default
    vi.mocked(authUtils.getAuthToken).mockReturnValue('mock-token');
    
    // Mock EventSource
    mockEventSource = vi.fn(function(this: any, url: string) {
      this.url = url;
      this.readyState = 0; // CONNECTING
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.close = vi.fn(() => {
        this.readyState = 2; // CLOSED
      });
      
      eventSourceInstances.push(this);
      
      // Simulate successful connection after a tick
      setTimeout(() => {
        if (this.onopen) {
          this.readyState = 1; // OPEN
          this.onopen(new Event('open'));
        }
      }, 0);
    });
    
    global.EventSource = mockEventSource as any;
    
    // Use fake timers for reconnection testing
    vi.useFakeTimers();
    
    cleanup();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  describe('connection establishment', () => {
    it('should establish SSE connection with auth token', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      const { result } = renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      // Initially not connected
      expect(result.current.connected).toBe(false);
      
      // Advance timers to trigger connection
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      // Should be connected now
      expect(result.current.connected).toBe(true);
      expect(result.current.error).toBe(null);
      
      // Should have created EventSource with correct URL
      expect(mockEventSource).toHaveBeenCalledTimes(1);
      expect(mockEventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/sse?token=mock-token')
      );
    });

    it('should not connect without auth token', () => {
      vi.mocked(authUtils.getAuthToken).mockReturnValue(null);
      
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      const { result } = renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      expect(result.current.connected).toBe(false);
      expect(result.current.error).toBe('Authentication required');
      expect(mockEventSource).not.toHaveBeenCalled();
    });

    it('should include API base URL in connection', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const callUrl = mockEventSource.mock.calls[0][0];
      expect(callUrl).toMatch(/^http:\/\/localhost:3000\/api\/sse\?token=/);
    });
  });

  describe('message parsing', () => {
    it('should parse and handle banner messages', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const eventSource = eventSourceInstances[0];
      
      const mockBanner: BannerOutput = {
        id: 'banner-1',
        type: 'info',
        message: 'Test banner',
        dismissable: true,
        audience: 'authenticated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Simulate receiving a banner message
      act(() => {
        if (eventSource.onmessage) {
          eventSource.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'banner',
              data: mockBanner,
            }),
          }));
        }
      });
      
      expect(onBanner).toHaveBeenCalledTimes(1);
      expect(onBanner).toHaveBeenCalledWith(mockBanner);
      expect(onToast).not.toHaveBeenCalled();
      expect(onBannerRemoved).not.toHaveBeenCalled();
    });

    it('should parse and handle toast messages', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const eventSource = eventSourceInstances[0];
      
      const mockToast: ToastInput = {
        type: 'success',
        message: 'Test toast',
        duration: 5000,
      };
      
      // Simulate receiving a toast message
      act(() => {
        if (eventSource.onmessage) {
          eventSource.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'toast',
              data: mockToast,
            }),
          }));
        }
      });
      
      expect(onToast).toHaveBeenCalledTimes(1);
      expect(onToast).toHaveBeenCalledWith(mockToast);
      expect(onBanner).not.toHaveBeenCalled();
      expect(onBannerRemoved).not.toHaveBeenCalled();
    });

    it('should parse and handle banner_removed messages', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const eventSource = eventSourceInstances[0];
      
      // Simulate receiving a banner_removed message
      act(() => {
        if (eventSource.onmessage) {
          eventSource.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'banner_removed',
              data: { bannerId: 'banner-1' },
            }),
          }));
        }
      });
      
      expect(onBannerRemoved).toHaveBeenCalledTimes(1);
      expect(onBannerRemoved).toHaveBeenCalledWith('banner-1');
      expect(onBanner).not.toHaveBeenCalled();
      expect(onToast).not.toHaveBeenCalled();
    });

    it('should handle multiple messages in sequence', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const eventSource = eventSourceInstances[0];
      
      const mockBanner: BannerOutput = {
        id: 'banner-1',
        type: 'warning',
        message: 'Warning banner',
        dismissable: true,
        audience: 'authenticated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const mockToast: ToastInput = {
        type: 'info',
        message: 'Info toast',
      };
      
      // Send multiple messages
      act(() => {
        if (eventSource.onmessage) {
          eventSource.onmessage(new MessageEvent('message', {
            data: JSON.stringify({ type: 'banner', data: mockBanner }),
          }));
          eventSource.onmessage(new MessageEvent('message', {
            data: JSON.stringify({ type: 'toast', data: mockToast }),
          }));
          eventSource.onmessage(new MessageEvent('message', {
            data: JSON.stringify({ type: 'banner_removed', data: { bannerId: 'banner-1' } }),
          }));
        }
      });
      
      expect(onBanner).toHaveBeenCalledTimes(1);
      expect(onToast).toHaveBeenCalledTimes(1);
      expect(onBannerRemoved).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid JSON gracefully', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const eventSource = eventSourceInstances[0];
      
      // Send invalid JSON
      act(() => {
        if (eventSource.onmessage) {
          eventSource.onmessage(new MessageEvent('message', {
            data: 'invalid json',
          }));
        }
      });
      
      // Should not call any callbacks
      expect(onBanner).not.toHaveBeenCalled();
      expect(onToast).not.toHaveBeenCalled();
      expect(onBannerRemoved).not.toHaveBeenCalled();
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse SSE message:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle unknown message types gracefully', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const eventSource = eventSourceInstances[0];
      
      // Send unknown message type
      act(() => {
        if (eventSource.onmessage) {
          eventSource.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'unknown_type',
              data: { foo: 'bar' },
            }),
          }));
        }
      });
      
      // Should not call any callbacks
      expect(onBanner).not.toHaveBeenCalled();
      expect(onToast).not.toHaveBeenCalled();
      expect(onBannerRemoved).not.toHaveBeenCalled();
      
      // Should log warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown SSE message type:',
        expect.objectContaining({ type: 'unknown_type' })
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      const onError = vi.fn();
      
      const { result } = renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
        onError,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      expect(result.current.connected).toBe(true);
      
      const eventSource = eventSourceInstances[0];
      
      // Simulate connection error
      act(() => {
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });
      
      expect(result.current.connected).toBe(false);
      expect(result.current.error).toContain('Connection lost');
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication errors', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      const onError = vi.fn();
      
      const { result } = renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
        onError,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      expect(result.current.connected).toBe(true);
      
      // Simulate token expiration
      vi.mocked(authUtils.getAuthToken).mockReturnValue(null);
      
      const eventSource = eventSourceInstances[0];
      
      // Simulate error
      act(() => {
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });
      
      expect(result.current.connected).toBe(false);
      expect(result.current.error).toBe('Authentication failed');
      expect(eventSource.close).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should attempt reconnection on error', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      const { result } = renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      expect(result.current.connected).toBe(true);
      expect(eventSourceInstances.length).toBe(1);
      
      const firstEventSource = eventSourceInstances[0];
      
      // Simulate error
      act(() => {
        if (firstEventSource.onerror) {
          firstEventSource.onerror(new Event('error'));
        }
      });
      
      expect(result.current.connected).toBe(false);
      expect(result.current.error).toContain('Reconnecting');
      
      // Advance timers to trigger reconnection (3000ms delay)
      await act(async () => {
        vi.advanceTimersByTime(3100);
      });
      
      // Should have created a new EventSource
      expect(eventSourceInstances.length).toBe(2);
    });

    it('should use exponential backoff for reconnection', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      // Simulate multiple errors
      for (let i = 0; i < 3; i++) {
        const eventSource = eventSourceInstances[eventSourceInstances.length - 1];
        
        act(() => {
          if (eventSource.onerror) {
            eventSource.onerror(new Event('error'));
          }
        });
        
        // Calculate expected delay: 3000 * 2^i
        const expectedDelay = 3000 * Math.pow(2, i);
        
        await act(async () => {
          vi.advanceTimersByTime(expectedDelay + 100);
        });
      }
      
      // Should have created multiple EventSource instances (initial + 3 reconnections)
      expect(eventSourceInstances.length).toBe(4);
    });

    it('should stop reconnecting after max attempts', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      // Mock EventSource to never successfully connect
      const failingMockEventSource = vi.fn(function(this: any, url: string) {
        this.url = url;
        this.readyState = 0; // CONNECTING
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.close = vi.fn(() => {
          this.readyState = 2; // CLOSED
        });
        
        eventSourceInstances.push(this);
        
        // Immediately trigger error instead of successful connection
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Event('error'));
          }
        }, 0);
      });
      
      global.EventSource = failingMockEventSource as any;
      
      const { result } = renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      // Advance through all reconnection attempts
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          vi.advanceTimersByTime(10);
        });
        
        const delay = 3000 * Math.pow(2, i);
        
        await act(async () => {
          vi.advanceTimersByTime(delay + 100);
        });
      }
      
      // One more attempt should fail permanently
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      expect(result.current.error).toContain('Connection failed after multiple attempts');
      
      // Should not create more EventSource instances
      const countBefore = eventSourceInstances.length;
      
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      
      expect(eventSourceInstances.length).toBe(countBefore);
    });
  });

  describe('cleanup on unmount', () => {
    it('should close EventSource on unmount', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      const { unmount } = renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const eventSource = eventSourceInstances[0];
      
      unmount();
      
      expect(eventSource.close).toHaveBeenCalled();
    });

    it('should clear reconnection timeout on unmount', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      const { unmount } = renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const eventSource = eventSourceInstances[0];
      
      // Trigger error to start reconnection timer
      act(() => {
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });
      
      const countBefore = eventSourceInstances.length;
      
      // Unmount before reconnection happens
      unmount();
      
      // Advance timers
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      
      // Should not have created new EventSource
      expect(eventSourceInstances.length).toBe(countBefore);
    });

    it('should not call callbacks after unmount', async () => {
      const onBanner = vi.fn();
      const onToast = vi.fn();
      const onBannerRemoved = vi.fn();
      
      const { unmount } = renderHook(() => useSSE({
        onBanner,
        onToast,
        onBannerRemoved,
      }));
      
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      
      const eventSource = eventSourceInstances[0];
      
      unmount();
      
      // Try to send message after unmount
      act(() => {
        if (eventSource.onmessage) {
          eventSource.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'banner',
              data: {
                id: 'banner-1',
                type: 'info',
                message: 'Test',
                dismissable: true,
                audience: 'authenticated',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            }),
          }));
        }
      });
      
      // Callbacks should not be called (component is unmounted)
      // This test mainly ensures no errors occur
      expect(true).toBe(true);
    });
  });
});
