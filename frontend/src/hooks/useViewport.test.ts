import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { 
  useViewport, 
  calculateViewportInfo, 
  BREAKPOINTS, 
  RESIZE_DEBOUNCE_MS 
} from './useViewport';

/**
 * Unit tests for useViewport hook
 * Tests viewport detection at various widths, resize event debouncing, and cleanup on unmount.
 * Requirements: 10.5
 */

describe('useViewport hook', () => {
  // Store original window dimensions
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    // Store original values
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    
    // Use fake timers for debounce testing
    vi.useFakeTimers();
    
    cleanup();
  });

  afterEach(() => {
    // Restore original values
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
    
    vi.useRealTimers();
    cleanup();
  });

  // Helper to set window dimensions
  function setWindowDimensions(width: number, height: number = 800) {
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
  }

  // Helper to trigger resize event
  function triggerResize() {
    window.dispatchEvent(new Event('resize'));
  }

  describe('calculateViewportInfo', () => {
    it('should correctly identify mobile viewport (< 768px)', () => {
      const result = calculateViewportInfo(375, 667);
      
      expect(result.isMobile).toBe(true);
      expect(result.isTablet).toBe(false);
      expect(result.isDesktop).toBe(false);
      expect(result.width).toBe(375);
      expect(result.height).toBe(667);
    });

    it('should correctly identify tablet viewport (640px - 1024px)', () => {
      const result = calculateViewportInfo(768, 1024);
      
      expect(result.isMobile).toBe(false);
      expect(result.isTablet).toBe(true);
      expect(result.isDesktop).toBe(false);
      expect(result.width).toBe(768);
      expect(result.height).toBe(1024);
    });

    it('should correctly identify desktop viewport (>= 1024px)', () => {
      const result = calculateViewportInfo(1440, 900);
      
      expect(result.isMobile).toBe(false);
      expect(result.isTablet).toBe(false);
      expect(result.isDesktop).toBe(true);
      expect(result.width).toBe(1440);
      expect(result.height).toBe(900);
    });

    it('should handle boundary at 768px (mobile threshold)', () => {
      // Just below threshold - mobile
      const belowResult = calculateViewportInfo(767, 800);
      expect(belowResult.isMobile).toBe(true);
      
      // At threshold - not mobile
      const atResult = calculateViewportInfo(768, 800);
      expect(atResult.isMobile).toBe(false);
    });

    it('should handle boundary at 1024px (desktop threshold)', () => {
      // Just below threshold - not desktop
      const belowResult = calculateViewportInfo(1023, 800);
      expect(belowResult.isDesktop).toBe(false);
      
      // At threshold - desktop
      const atResult = calculateViewportInfo(1024, 800);
      expect(atResult.isDesktop).toBe(true);
    });
  });

  describe('viewport detection at various widths', () => {
    it('should detect mobile viewport at 375px (iPhone SE)', () => {
      setWindowDimensions(375, 667);
      
      const { result } = renderHook(() => useViewport());
      
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.width).toBe(375);
    });

    it('should detect tablet viewport at 768px (iPad)', () => {
      setWindowDimensions(768, 1024);
      
      const { result } = renderHook(() => useViewport());
      
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.width).toBe(768);
    });

    it('should detect desktop viewport at 1024px', () => {
      setWindowDimensions(1024, 768);
      
      const { result } = renderHook(() => useViewport());
      
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.width).toBe(1024);
    });

    it('should detect desktop viewport at 1440px', () => {
      setWindowDimensions(1440, 900);
      
      const { result } = renderHook(() => useViewport());
      
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.width).toBe(1440);
    });
  });

  describe('resize event debouncing', () => {
    it('should debounce resize events', () => {
      setWindowDimensions(1024, 768);
      
      const { result } = renderHook(() => useViewport());
      
      // Initial state should be desktop
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
      
      // Change to mobile width
      setWindowDimensions(375, 667);
      
      // Trigger multiple resize events rapidly
      act(() => {
        triggerResize();
        triggerResize();
        triggerResize();
      });
      
      // State should NOT have changed yet (debounced)
      expect(result.current.isDesktop).toBe(true);
      
      // Advance timers past debounce delay
      act(() => {
        vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS + 10);
      });
      
      // Now state should be updated
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.width).toBe(375);
    });

    it('should reset debounce timer on subsequent resize events', () => {
      setWindowDimensions(1024, 768);
      
      const { result } = renderHook(() => useViewport());
      
      // Change to mobile width
      setWindowDimensions(375, 667);
      
      // Trigger resize
      act(() => {
        triggerResize();
      });
      
      // Advance timers partially
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      // State should NOT have changed yet
      expect(result.current.isDesktop).toBe(true);
      
      // Trigger another resize (should reset timer)
      act(() => {
        triggerResize();
      });
      
      // Advance timers by original debounce time (but not enough from last resize)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      // State should still NOT have changed
      expect(result.current.isDesktop).toBe(true);
      
      // Advance remaining time
      act(() => {
        vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS);
      });
      
      // Now state should be updated
      expect(result.current.isMobile).toBe(true);
    });
  });

  describe('cleanup on unmount', () => {
    it('should remove resize event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      setWindowDimensions(1024, 768);
      
      const { unmount } = renderHook(() => useViewport());
      
      // Unmount the hook
      unmount();
      
      // Should have removed the resize listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('should clear pending timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      setWindowDimensions(1024, 768);
      
      const { unmount } = renderHook(() => useViewport());
      
      // Trigger a resize to create a pending timeout
      act(() => {
        setWindowDimensions(375, 667);
        triggerResize();
      });
      
      // Unmount before debounce completes
      unmount();
      
      // Should have cleared the timeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('should not update state after unmount', () => {
      setWindowDimensions(1024, 768);
      
      const { result, unmount } = renderHook(() => useViewport());
      
      // Verify initial state
      expect(result.current.isDesktop).toBe(true);
      
      // Trigger resize
      act(() => {
        setWindowDimensions(375, 667);
        triggerResize();
      });
      
      // Unmount before debounce completes
      unmount();
      
      // Advance timers - this should not cause any errors
      act(() => {
        vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS + 10);
      });
      
      // No error should occur (React would warn about state update on unmounted component)
    });
  });

  describe('breakpoint constants', () => {
    it('should export correct breakpoint values', () => {
      expect(BREAKPOINTS.MOBILE).toBe(768);
      expect(BREAKPOINTS.TABLET_MIN).toBe(640);
      expect(BREAKPOINTS.DESKTOP).toBe(1024);
    });

    it('should export correct debounce delay', () => {
      expect(RESIZE_DEBOUNCE_MS).toBe(150);
    });
  });

  describe('height tracking', () => {
    it('should track viewport height', () => {
      setWindowDimensions(1024, 900);
      
      const { result } = renderHook(() => useViewport());
      
      expect(result.current.height).toBe(900);
    });

    it('should update height on resize', () => {
      setWindowDimensions(1024, 768);
      
      const { result } = renderHook(() => useViewport());
      
      expect(result.current.height).toBe(768);
      
      // Change height
      act(() => {
        setWindowDimensions(1024, 900);
        triggerResize();
        vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS + 10);
      });
      
      expect(result.current.height).toBe(900);
    });
  });
});
