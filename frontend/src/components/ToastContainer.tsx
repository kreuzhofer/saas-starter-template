import React, { useState, useCallback } from 'react';
import { Toast } from './Toast';
import { useSSE } from '../hooks/useSSE';
import type { ToastInput } from '../types';

/**
 * Internal toast state with unique ID for React keys
 */
interface ToastState extends ToastInput {
  id: string;
}

/**
 * ToastContainer component manages the display of temporary toast notifications.
 * 
 * Features:
 * - Receives toast messages via SSE in real-time
 * - Maintains state of active toasts
 * - Renders Toast components in a fixed bottom-right position
 * - Handles automatic toast removal after duration
 * - Generates unique IDs for each toast for React key management
 * 
 * The component uses the useSSE hook to establish a connection to the server
 * and receive real-time toast notifications. Toasts are displayed in a stacked
 * layout at the bottom-right of the screen and auto-dismiss after their duration.
 */
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // Handle new toast from SSE
  const handleToast = useCallback((toast: ToastInput) => {
    // Generate a unique ID for this toast instance
    const toastWithId: ToastState = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setToasts((prev) => [...prev, toastWithId]);
  }, []);

  // Handle banner (no-op for ToastContainer, handled by BannerContainer)
  const handleBanner = useCallback(() => {
    // Banner messages are handled by BannerContainer component
  }, []);

  // Handle banner removal (no-op for ToastContainer)
  const handleBannerRemoved = useCallback(() => {
    // Banner removal is handled by BannerContainer component
  }, []);

  // Handle toast close (manual or automatic)
  const handleClose = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Establish SSE connection
  useSSE({
    onBanner: handleBanner,
    onToast: handleToast,
    onBannerRemoved: handleBannerRemoved,
  });

  // Don't render anything if there are no toasts
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration || 5000}
          onClose={handleClose}
        />
      ))}
    </div>
  );
};
