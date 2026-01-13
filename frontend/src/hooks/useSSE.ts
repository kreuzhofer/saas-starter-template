import { useEffect, useRef, useState, useCallback } from 'react';
import type { BannerOutput, ToastInput } from '../types';
import { getAuthToken } from '../utils/auth';

/**
 * SSE message structure from the server
 */
interface SSEMessageEvent {
  type: 'banner' | 'toast' | 'banner_removed';
  data: BannerOutput | ToastInput | { bannerId: string };
}

/**
 * Options for the useSSE hook
 */
export interface UseSSEOptions {
  /** Callback when a banner is received */
  onBanner: (banner: BannerOutput) => void;
  /** Callback when a toast is received */
  onToast: (toast: ToastInput) => void;
  /** Callback when a banner removal is received */
  onBannerRemoved: (bannerId: string) => void;
  /** Optional callback when an error occurs */
  onError?: (error: Event) => void;
}

/**
 * Return value from the useSSE hook
 */
export interface UseSSEReturn {
  /** Whether the SSE connection is currently connected */
  connected: boolean;
  /** Error message if connection failed, null otherwise */
  error: string | null;
}

/**
 * Get API URL from runtime config (set by Docker) or build-time env var
 */
const getApiBaseUrl = () => {
  // Check for runtime config (Docker deployment)
  if (typeof window !== 'undefined' && (window as any).ENV?.API_BASE_URL) {
    return (window as any).ENV.API_BASE_URL;
  }
  // Fall back to build-time env var
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
};

/**
 * Reconnection configuration
 */
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Custom hook for establishing and managing SSE connections to receive real-time notifications.
 * 
 * Features:
 * - Establishes EventSource connection to /api/sse endpoint
 * - Automatically includes authentication token in connection
 * - Parses incoming SSE messages and routes to appropriate callbacks
 * - Handles connection errors and authentication failures
 * - Supports automatic reconnection with exponential backoff
 * - Properly cleans up connections on unmount
 * 
 * @param options - Configuration object with callbacks for different message types
 * @returns Object with connection status and error state
 * 
 * @example
 * ```tsx
 * function NotificationContainer() {
 *   const [banners, setBanners] = useState<BannerOutput[]>([]);
 *   const [toasts, setToasts] = useState<ToastInput[]>([]);
 *   
 *   const { connected, error } = useSSE({
 *     onBanner: (banner) => setBanners(prev => [...prev, banner]),
 *     onToast: (toast) => setToasts(prev => [...prev, toast]),
 *     onBannerRemoved: (bannerId) => setBanners(prev => prev.filter(b => b.id !== bannerId)),
 *     onError: (error) => console.error('SSE error:', error)
 *   });
 *   
 *   return (
 *     <div>
 *       {!connected && <div>Connecting...</div>}
 *       {error && <div>Error: {error}</div>}
 *       {banners.map(banner => <Banner key={banner.id} {...banner} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSSE(options: UseSSEOptions): UseSSEReturn {
  const { onBanner, onToast, onBannerRemoved, onError } = options;
  
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Store callbacks in refs to avoid recreating the connection when they change
  const callbacksRef = useRef({ onBanner, onToast, onBannerRemoved, onError });
  
  useEffect(() => {
    callbacksRef.current = { onBanner, onToast, onBannerRemoved, onError };
  }, [onBanner, onToast, onBannerRemoved, onError]);
  
  const connect = useCallback(() => {
    // Skip if window is not available (SSR)
    if (typeof window === 'undefined') {
      return;
    }
    
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    const token = getAuthToken();
    
    // Don't connect without authentication
    if (!token) {
      setError('Authentication required');
      setConnected(false);
      return;
    }
    
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}/api/sse?token=${encodeURIComponent(token)}`;
    
    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };
      
      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const message: SSEMessageEvent = JSON.parse(event.data);
          
          switch (message.type) {
            case 'banner':
              callbacksRef.current.onBanner(message.data as BannerOutput);
              break;
            case 'toast':
              callbacksRef.current.onToast(message.data as ToastInput);
              break;
            case 'banner_removed':
              callbacksRef.current.onBannerRemoved((message.data as { bannerId: string }).bannerId);
              break;
            default:
              console.warn('Unknown SSE message type:', message);
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };
      
      eventSource.onerror = (event: Event) => {
        setConnected(false);
        
        // Check if this is an authentication error
        // If EventSource is closed and we haven't successfully connected yet, or token is now invalid
        const currentToken = getAuthToken();
        if (!currentToken || (eventSource.readyState === EventSource.CLOSED && reconnectAttemptsRef.current === 0)) {
          setError('Authentication failed');
          eventSource.close();
          eventSourceRef.current = null;
          
          if (callbacksRef.current.onError) {
            callbacksRef.current.onError(event);
          }
          return;
        }
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current += 1;
          
          setError(`Connection lost. Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Connection failed after multiple attempts. Please refresh the page.');
          eventSource.close();
          eventSourceRef.current = null;
        }
        
        // Call error callback if provided
        if (callbacksRef.current.onError) {
          callbacksRef.current.onError(event);
        }
      };
    } catch (err) {
      setError('Failed to establish SSE connection');
      setConnected(false);
      console.error('SSE connection error:', err);
    }
  }, []);
  
  useEffect(() => {
    connect();
    
    return () => {
      // Clean up on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);
  
  return { connected, error };
}
