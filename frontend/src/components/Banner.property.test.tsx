import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Banner } from './Banner';

/**
 * Feature: 031-notification-banner-system, Property 2: Type-Specific Styling
 * Validates: Requirements 2.2, 2.3, 2.4
 * 
 * For any banner with a specific type (error, warning, or info), when rendered 
 * without custom colors, the banner should have the appropriate default background 
 * and text colors for that type.
 */

describe('Property-Based Test: Type-Specific Styling', () => {
  it('should apply correct default colors based on banner type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('error', 'warning', 'info'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.boolean(),
        async (type, message, dismissable) => {
          const mockOnDismiss = vi.fn();

          const { container, unmount } = render(
            <BrowserRouter>
              <Banner
                id="test-banner"
                type={type as 'error' | 'warning' | 'info'}
                message={message}
                dismissable={dismissable}
                onDismiss={mockOnDismiss}
              />
            </BrowserRouter>
          );

          const bannerElement = container.querySelector('[role="alert"]');
          expect(bannerElement).toBeTruthy();

          // Property: Each type should have its specific default colors
          const classList = bannerElement!.className;
          
          if (type === 'error') {
            expect(classList).toContain('bg-red-600');
            expect(classList).toContain('text-white');
          } else if (type === 'warning') {
            expect(classList).toContain('bg-yellow-500');
            expect(classList).toContain('text-gray-900');
          } else if (type === 'info') {
            expect(classList).toContain('bg-blue-600');
            expect(classList).toContain('text-white');
          }

          // Clean up
          unmount();
          mockOnDismiss.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 031-notification-banner-system, Property 3: Custom Color Persistence
 * Validates: Requirements 2.5, 2.6, 7.7
 * 
 * For any banner created with custom background and text colors, when retrieved 
 * from the database and rendered, the custom colors should match the originally 
 * specified values.
 */

describe('Property-Based Test: Custom Color Persistence', () => {
  it('should render custom colors when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('error', 'warning', 'info'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 0, max: 0xFFFFFF }).map(n => `#${n.toString(16).padStart(6, '0')}`),
        fc.integer({ min: 0, max: 0xFFFFFF }).map(n => `#${n.toString(16).padStart(6, '0')}`),
        async (type, message, backgroundColor, textColor) => {
          const mockOnDismiss = vi.fn();

          const { container, unmount } = render(
            <BrowserRouter>
              <Banner
                id="test-banner"
                type={type as 'error' | 'warning' | 'info'}
                message={message}
                dismissable={false}
                backgroundColor={backgroundColor}
                textColor={textColor}
                onDismiss={mockOnDismiss}
              />
            </BrowserRouter>
          );

          const bannerElement = container.querySelector('[role="alert"]') as HTMLElement;
          expect(bannerElement).toBeTruthy();

          // Property: Custom colors should be applied via inline styles
          // Note: Browsers may convert hex colors to rgb format, so we normalize for comparison
          const style = bannerElement!.style;
          const actualBg = style.backgroundColor;
          const actualText = style.color;
          
          // Helper to convert hex to rgb for comparison
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
            } : null;
          };
          
          const expectedBgRgb = hexToRgb(backgroundColor);
          const expectedTextRgb = hexToRgb(textColor);
          
          // Check if the actual color matches expected (either hex or rgb format)
          if (expectedBgRgb) {
            const expectedBgString = `rgb(${expectedBgRgb.r}, ${expectedBgRgb.g}, ${expectedBgRgb.b})`;
            expect(actualBg === backgroundColor || actualBg === expectedBgString).toBe(true);
          }
          
          if (expectedTextRgb) {
            const expectedTextString = `rgb(${expectedTextRgb.r}, ${expectedTextRgb.g}, ${expectedTextRgb.b})`;
            expect(actualText === textColor || actualText === expectedTextString).toBe(true);
          }

          // Clean up
          unmount();
          mockOnDismiss.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 031-notification-banner-system, Property 4: Dismissable Button Rendering
 * Validates: Requirements 3.1, 3.4
 * 
 * For any banner, the presence of a dismiss button in the rendered output should 
 * match the dismissable flag value (present when true, absent when false).
 */

describe('Property-Based Test: Dismissable Button Rendering', () => {
  it('should render dismiss button only when dismissable is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('error', 'warning', 'info'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.boolean(),
        async (type, message, dismissable) => {
          const mockOnDismiss = vi.fn();

          const { container, unmount } = render(
            <BrowserRouter>
              <Banner
                id="test-banner"
                type={type as 'error' | 'warning' | 'info'}
                message={message}
                dismissable={dismissable}
                onDismiss={mockOnDismiss}
              />
            </BrowserRouter>
          );

          const dismissButton = container.querySelector('button[aria-label="Dismiss banner"]');

          // Property: Dismiss button presence should match dismissable flag
          if (dismissable) {
            expect(dismissButton).toBeTruthy();
          } else {
            expect(dismissButton).toBeNull();
          }

          // Clean up
          unmount();
          mockOnDismiss.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 031-notification-banner-system, Property 7: Link Configuration Rendering
 * Validates: Requirements 4.2, 4.3, 4.6
 * 
 * For any banner with a link, the rendered output should include a clickable 
 * element with the correct text, URL, and style (inline or button) as specified 
 * in the configuration.
 */

describe('Property-Based Test: Link Configuration Rendering', () => {
  it('should render link with correct text, URL, and style', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('error', 'warning', 'info'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.webUrl(),
        fc.constantFrom('inline', 'button'),
        fc.boolean(),
        async (type, message, linkText, linkUrl, linkStyle, external) => {
          const mockOnDismiss = vi.fn();

          const { container, unmount } = render(
            <BrowserRouter>
              <Banner
                id="test-banner"
                type={type as 'error' | 'warning' | 'info'}
                message={message}
                dismissable={false}
                link={{
                  text: linkText,
                  url: linkUrl,
                  external,
                  style: linkStyle as 'inline' | 'button',
                }}
                onDismiss={mockOnDismiss}
              />
            </BrowserRouter>
          );

          const linkElement = container.querySelector('a');
          expect(linkElement).toBeTruthy();

          // Property: Link should have correct text
          expect(linkElement!.textContent).toBe(linkText);

          // Property: Link should have correct URL (href or to attribute)
          const href = linkElement!.getAttribute('href');
          expect(href).toBeTruthy();
          if (external) {
            expect(href).toBe(linkUrl);
          } else {
            // Internal links use React Router, so href will be the path
            expect(href).toBe(linkUrl);
          }

          // Property: Link should have correct style classes
          const classList = linkElement!.className;
          if (linkStyle === 'button') {
            expect(classList).toContain('px-3');
            expect(classList).toContain('py-1');
            expect(classList).toContain('bg-white');
          } else {
            expect(classList).toContain('underline');
          }

          // Clean up
          unmount();
          mockOnDismiss.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: 031-notification-banner-system, Property 8: External Link Behavior
 * Validates: Requirements 4.4, 4.5
 * 
 * For any banner with a link, when the link is marked as external, the rendered 
 * anchor element should have target="_blank" attribute; when marked as internal, 
 * it should not have this attribute.
 */

describe('Property-Based Test: External Link Behavior', () => {
  it('should set target="_blank" only for external links', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('error', 'warning', 'info'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.webUrl(),
        fc.constantFrom('inline', 'button'),
        fc.boolean(),
        async (type, message, linkText, linkUrl, linkStyle, external) => {
          const mockOnDismiss = vi.fn();

          const { container, unmount } = render(
            <BrowserRouter>
              <Banner
                id="test-banner"
                type={type as 'error' | 'warning' | 'info'}
                message={message}
                dismissable={false}
                link={{
                  text: linkText,
                  url: linkUrl,
                  external,
                  style: linkStyle as 'inline' | 'button',
                }}
                onDismiss={mockOnDismiss}
              />
            </BrowserRouter>
          );

          const linkElement = container.querySelector('a');
          expect(linkElement).toBeTruthy();

          // Property: External links should have target="_blank"
          const target = linkElement!.getAttribute('target');
          if (external) {
            expect(target).toBe('_blank');
            // Also check for security attributes
            expect(linkElement!.getAttribute('rel')).toBe('noopener noreferrer');
          } else {
            expect(target).toBeNull();
          }

          // Clean up
          unmount();
          mockOnDismiss.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});
