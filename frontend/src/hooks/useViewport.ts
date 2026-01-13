import { useState, useEffect, useCallback } from 'react';

/**
 * Viewport information returned by the useViewport hook.
 */
export interface ViewportInfo {
  /** True when viewport width is less than 768px */
  isMobile: boolean;
  /** True when viewport width is between 640px and 1024px */
  isTablet: boolean;
  /** True when viewport width is 1024px or greater */
  isDesktop: boolean;
  /** Current viewport width in pixels */
  width: number;
  /** Current viewport height in pixels */
  height: number;
}

/**
 * Breakpoint constants used for viewport detection.
 * These align with Tailwind CSS default breakpoints.
 */
export const BREAKPOINTS = {
  /** Mobile breakpoint (md in Tailwind) */
  MOBILE: 768,
  /** Tablet lower bound (sm in Tailwind) */
  TABLET_MIN: 640,
  /** Desktop breakpoint (lg in Tailwind) */
  DESKTOP: 1024,
} as const;

/**
 * Debounce delay in milliseconds for resize events.
 */
export const RESIZE_DEBOUNCE_MS = 150;

/**
 * Calculate viewport info from width and height values.
 * Exported for testing purposes.
 */
export function calculateViewportInfo(width: number, height: number): ViewportInfo {
  return {
    isMobile: width < BREAKPOINTS.MOBILE,
    isTablet: width >= BREAKPOINTS.TABLET_MIN && width < BREAKPOINTS.DESKTOP,
    isDesktop: width >= BREAKPOINTS.DESKTOP,
    width,
    height,
  };
}

/**
 * Get initial viewport dimensions, handling SSR case.
 */
function getInitialDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    // SSR fallback - assume desktop
    return { width: 1024, height: 768 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Custom hook that provides responsive viewport information.
 * 
 * Features:
 * - Detects mobile, tablet, and desktop viewports
 * - Debounces resize events for performance
 * - Properly cleans up event listeners on unmount
 * - Handles SSR with sensible defaults
 * 
 * @returns ViewportInfo object with viewport state and dimensions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, isTablet, isDesktop, width } = useViewport();
 *   
 *   return (
 *     <div>
 *       {isMobile && <MobileLayout />}
 *       {isTablet && <TabletLayout />}
 *       {isDesktop && <DesktopLayout />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    const { width, height } = getInitialDimensions();
    return calculateViewportInfo(width, height);
  });

  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    setViewport(calculateViewportInfo(width, height));
  }, []);

  useEffect(() => {
    // Skip if window is not available (SSR)
    if (typeof window === 'undefined') {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', debouncedResize);

    // Initial call to ensure state is correct
    handleResize();

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  return viewport;
}
