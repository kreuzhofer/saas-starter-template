import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Banner } from './Banner';

describe('Banner Component', () => {
  describe('Basic Rendering', () => {
    it('should render banner with message', () => {
      const mockOnDismiss = vi.fn();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Test message"
            dismissable={false}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render error type with red background', () => {
      const mockOnDismiss = vi.fn();
      
      const { container } = render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="error"
            message="Error message"
            dismissable={false}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const banner = container.querySelector('[role="alert"]');
      expect(banner?.className).toContain('bg-red-600');
      expect(banner?.className).toContain('text-white');
    });

    it('should render warning type with yellow background', () => {
      const mockOnDismiss = vi.fn();
      
      const { container } = render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="warning"
            message="Warning message"
            dismissable={false}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const banner = container.querySelector('[role="alert"]');
      expect(banner?.className).toContain('bg-yellow-500');
      expect(banner?.className).toContain('text-gray-900');
    });

    it('should render info type with blue background', () => {
      const mockOnDismiss = vi.fn();
      
      const { container } = render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Info message"
            dismissable={false}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const banner = container.querySelector('[role="alert"]');
      expect(banner?.className).toContain('bg-blue-600');
      expect(banner?.className).toContain('text-white');
    });
  });

  describe('Custom Colors', () => {
    it('should apply custom background and text colors', () => {
      const mockOnDismiss = vi.fn();
      
      const { container } = render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Custom colors"
            dismissable={false}
            backgroundColor="#ff00ff"
            textColor="#00ff00"
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const banner = container.querySelector('[role="alert"]') as HTMLElement;
      expect(banner.style.backgroundColor).toBeTruthy();
      expect(banner.style.color).toBeTruthy();
    });
  });

  describe('Dismissable Functionality', () => {
    it('should show dismiss button when dismissable is true', () => {
      const mockOnDismiss = vi.fn();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Dismissable banner"
            dismissable={true}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      expect(screen.getByLabelText('Dismiss banner')).toBeInTheDocument();
    });

    it('should not show dismiss button when dismissable is false', () => {
      const mockOnDismiss = vi.fn();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Non-dismissable banner"
            dismissable={false}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      expect(screen.queryByLabelText('Dismiss banner')).not.toBeInTheDocument();
    });

    it('should call onDismiss with banner id when dismiss button is clicked', async () => {
      const mockOnDismiss = vi.fn();
      const user = userEvent.setup();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-banner-123"
            type="info"
            message="Dismissable banner"
            dismissable={true}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const dismissButton = screen.getByLabelText('Dismiss banner');
      await user.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockOnDismiss).toHaveBeenCalledWith('test-banner-123');
    });
  });

  describe('Link Rendering', () => {
    it('should render inline link when link is provided with inline style', () => {
      const mockOnDismiss = vi.fn();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Banner with link"
            dismissable={false}
            link={{
              text: 'Click here',
              url: '/test',
              external: false,
              style: 'inline',
            }}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const link = screen.getByText('Click here');
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link.className).toContain('underline');
    });

    it('should render button link when link is provided with button style', () => {
      const mockOnDismiss = vi.fn();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Banner with button link"
            dismissable={false}
            link={{
              text: 'Click button',
              url: '/test',
              external: false,
              style: 'button',
            }}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const link = screen.getByText('Click button');
      expect(link).toBeInTheDocument();
      expect(link.className).toContain('px-3');
      expect(link.className).toContain('py-1');
    });

    it('should render external link with target="_blank"', () => {
      const mockOnDismiss = vi.fn();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Banner with external link"
            dismissable={false}
            link={{
              text: 'External link',
              url: 'https://example.com',
              external: true,
              style: 'inline',
            }}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const link = screen.getByText('External link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should render internal link without target="_blank"', () => {
      const mockOnDismiss = vi.fn();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Banner with internal link"
            dismissable={false}
            link={{
              text: 'Internal link',
              url: '/dashboard',
              external: false,
              style: 'inline',
            }}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const link = screen.getByText('Internal link');
      expect(link).not.toHaveAttribute('target');
      expect(link).toHaveAttribute('href', '/dashboard');
    });

    it('should not render link when link prop is not provided', () => {
      const mockOnDismiss = vi.fn();
      
      const { container } = render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Banner without link"
            dismissable={false}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const links = container.querySelectorAll('a');
      expect(links.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      const mockOnDismiss = vi.fn();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Accessible banner"
            dismissable={false}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="polite" for screen readers', () => {
      const mockOnDismiss = vi.fn();
      
      const { container } = render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Accessible banner"
            dismissable={false}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const banner = container.querySelector('[role="alert"]');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-label on dismiss button', () => {
      const mockOnDismiss = vi.fn();
      
      render(
        <BrowserRouter>
          <Banner
            id="test-1"
            type="info"
            message="Dismissable banner"
            dismissable={true}
            onDismiss={mockOnDismiss}
          />
        </BrowserRouter>
      );

      const dismissButton = screen.getByLabelText('Dismiss banner');
      expect(dismissButton).toBeInTheDocument();
    });
  });
});
