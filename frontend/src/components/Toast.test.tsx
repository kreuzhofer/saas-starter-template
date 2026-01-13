import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from './Toast';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render toast with message', () => {
      const mockOnClose = vi.fn();
      
      render(
        <Toast
          id="test-1"
          type="info"
          message="Test message"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render error type with red background', () => {
      const mockOnClose = vi.fn();
      
      const { container } = render(
        <Toast
          id="test-1"
          type="error"
          message="Error message"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('[role="alert"]');
      expect(toast?.className).toContain('bg-red-600');
      expect(toast?.className).toContain('text-white');
    });

    it('should render warning type with yellow background', () => {
      const mockOnClose = vi.fn();
      
      const { container } = render(
        <Toast
          id="test-1"
          type="warning"
          message="Warning message"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('[role="alert"]');
      expect(toast?.className).toContain('bg-yellow-500');
      expect(toast?.className).toContain('text-gray-900');
    });

    it('should render info type with blue background', () => {
      const mockOnClose = vi.fn();
      
      const { container } = render(
        <Toast
          id="test-1"
          type="info"
          message="Info message"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('[role="alert"]');
      expect(toast?.className).toContain('bg-blue-600');
      expect(toast?.className).toContain('text-white');
    });

    it('should render success type with green background', () => {
      const mockOnClose = vi.fn();
      
      const { container } = render(
        <Toast
          id="test-1"
          type="success"
          message="Success message"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('[role="alert"]');
      expect(toast?.className).toContain('bg-green-600');
      expect(toast?.className).toContain('text-white');
    });

    it('should render icon for each type', () => {
      const mockOnClose = vi.fn();
      
      const { container } = render(
        <Toast
          id="test-1"
          type="info"
          message="Message with icon"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Auto-dismiss Functionality', () => {
    it('should call onClose after duration expires', () => {
      const mockOnClose = vi.fn();
      
      render(
        <Toast
          id="test-toast-123"
          type="info"
          message="Auto-dismiss toast"
          duration={3000}
          onClose={mockOnClose}
        />
      );

      expect(mockOnClose).not.toHaveBeenCalled();

      // Fast-forward time by 3000ms
      vi.advanceTimersByTime(3000);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledWith('test-toast-123');
    });

    it('should not call onClose before duration expires', () => {
      const mockOnClose = vi.fn();
      
      render(
        <Toast
          id="test-toast-123"
          type="info"
          message="Auto-dismiss toast"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      // Fast-forward time by 2000ms (less than duration)
      vi.advanceTimersByTime(2000);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should respect different duration values', () => {
      const mockOnClose = vi.fn();
      
      render(
        <Toast
          id="test-toast-123"
          type="info"
          message="Custom duration toast"
          duration={10000}
          onClose={mockOnClose}
        />
      );

      // Fast-forward time by 5000ms (less than duration)
      vi.advanceTimersByTime(5000);
      expect(mockOnClose).not.toHaveBeenCalled();

      // Fast-forward time by another 5000ms (total 10000ms)
      vi.advanceTimersByTime(5000);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should cleanup timer on unmount', () => {
      const mockOnClose = vi.fn();
      
      const { unmount } = render(
        <Toast
          id="test-toast-123"
          type="info"
          message="Toast to unmount"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      // Unmount before duration expires
      unmount();

      // Fast-forward time past duration
      vi.advanceTimersByTime(5000);

      // onClose should not be called because component was unmounted
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Manual Close Functionality', () => {
    it('should show close button', () => {
      const mockOnClose = vi.fn();
      
      render(
        <Toast
          id="test-1"
          type="info"
          message="Toast with close button"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText('Close toast')).toBeInTheDocument();
    });

    it('should call onClose with toast id when close button is clicked', async () => {
      vi.useRealTimers(); // Use real timers for user interaction
      const mockOnClose = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Toast
          id="test-toast-456"
          type="info"
          message="Closeable toast"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close toast');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledWith('test-toast-456');
      
      vi.useFakeTimers(); // Restore fake timers for other tests
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      const mockOnClose = vi.fn();
      
      render(
        <Toast
          id="test-1"
          type="info"
          message="Accessible toast"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="polite" for screen readers', () => {
      const mockOnClose = vi.fn();
      
      const { container } = render(
        <Toast
          id="test-1"
          type="info"
          message="Accessible toast"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('[role="alert"]');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-label on close button', () => {
      const mockOnClose = vi.fn();
      
      render(
        <Toast
          id="test-1"
          type="info"
          message="Toast with close button"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close toast');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should have rounded corners', () => {
      const mockOnClose = vi.fn();
      
      const { container } = render(
        <Toast
          id="test-1"
          type="info"
          message="Styled toast"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('[role="alert"]');
      expect(toast?.className).toContain('rounded-lg');
    });

    it('should have shadow', () => {
      const mockOnClose = vi.fn();
      
      const { container } = render(
        <Toast
          id="test-1"
          type="info"
          message="Styled toast"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('[role="alert"]');
      expect(toast?.className).toContain('shadow-lg');
    });

    it('should have minimum width', () => {
      const mockOnClose = vi.fn();
      
      const { container } = render(
        <Toast
          id="test-1"
          type="info"
          message="Short"
          duration={5000}
          onClose={mockOnClose}
        />
      );

      const toast = container.querySelector('[role="alert"]');
      expect(toast?.className).toContain('min-w-[300px]');
    });
  });
});
