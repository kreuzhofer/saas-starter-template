import React, { useState, useCallback, useEffect } from 'react';
import { Banner } from './Banner';
import { useSSE } from '../hooks/useSSE';
import { api } from '../api/client';
import type { BannerOutput } from '../types';

/**
 * BannerContainer component manages the display of notification banners.
 * 
 * Features:
 * - Fetches active banners immediately on mount (no waiting for SSE)
 * - Receives banner updates via SSE in real-time
 * - Maintains state of active banners
 * - Sorts banners by type priority (error > warning > info)
 * - Renders banners in a stacked layout at the top of the page
 * - Handles banner dismissal with API persistence
 * - Handles banner removal messages from SSE
 * 
 * The component uses the useSSE hook to establish a connection to the server
 * and receive real-time updates about banners. Banners are automatically
 * sorted by priority and displayed above all page content.
 */
export const BannerContainer: React.FC = () => {
  const [banners, setBanners] = useState<BannerOutput[]>([]);

  // Define type priority for sorting (lower number = higher priority)
  const getTypePriority = (type: 'error' | 'warning' | 'info'): number => {
    switch (type) {
      case 'error':
        return 1;
      case 'warning':
        return 2;
      case 'info':
        return 3;
      default:
        return 4;
    }
  };

  // Sort banners by type priority (error > warning > info)
  const sortBanners = (bannersToSort: BannerOutput[]): BannerOutput[] => {
    return [...bannersToSort].sort((a, b) => {
      const priorityDiff = getTypePriority(a.type) - getTypePriority(b.type);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      // Within same type, sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  // Handle new banner from SSE
  const handleBanner = useCallback((banner: BannerOutput) => {
    setBanners((prev) => {
      // Check if banner already exists (by ID)
      const existingIndex = prev.findIndex((b) => b.id === banner.id);
      
      if (existingIndex >= 0) {
        // Update existing banner
        const updated = [...prev];
        updated[existingIndex] = banner;
        return sortBanners(updated);
      } else {
        // Add new banner
        return sortBanners([...prev, banner]);
      }
    });
  }, []);

  // Handle banner removal from SSE
  const handleBannerRemoved = useCallback((bannerId: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
  }, []);

  // Handle toast (no-op for BannerContainer, handled by ToastContainer)
  const handleToast = useCallback(() => {
    // Toast messages are handled by ToastContainer component
  }, []);

  // Fetch active banners - called on mount and when auth state changes
  const fetchBanners = useCallback(async () => {
    try {
      const activeBanners = await api.getActiveBanners();
      setBanners(sortBanners(activeBanners));
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    }
  }, []);

  // Fetch banners on mount and listen for auth changes (login/logout)
  useEffect(() => {
    fetchBanners();
    
    const handleAuthChange = () => {
      fetchBanners();
    };
    
    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [fetchBanners]);

  // Handle banner dismissal
  const handleDismiss = useCallback(async (bannerId: string) => {
    try {
      // Optimistically remove banner from UI
      setBanners((prev) => prev.filter((b) => b.id !== bannerId));
      
      // Persist dismissal to backend
      await api.dismissBanner(bannerId);
    } catch (error) {
      console.error('Failed to dismiss banner:', error);
      
      // On error, we could re-add the banner, but since the SSE connection
      // will eventually sync the state, we'll just log the error
      // The user can refresh if needed
    }
  }, []);

  // Establish SSE connection
  const { connected, error } = useSSE({
    onBanner: handleBanner,
    onToast: handleToast,
    onBannerRemoved: handleBannerRemoved,
  });

  // Don't render anything if there are no banners and no error
  if (banners.length === 0 && !(!connected && error)) {
    return null;
  }

  return (
    <div className="w-full relative z-40">
      {/* Show connection error when disconnected and there are banners */}
      {!connected && error && banners.length > 0 && (
        <div className="w-full bg-yellow-50 border-b border-yellow-200 text-yellow-800 px-4 py-2 text-sm">
          {error}
        </div>
      )}
      {banners.map((banner) => (
        <Banner
          key={banner.id}
          id={banner.id}
          type={banner.type}
          message={banner.message}
          dismissable={banner.dismissable}
          link={banner.link}
          backgroundColor={banner.backgroundColor}
          textColor={banner.textColor}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
};
