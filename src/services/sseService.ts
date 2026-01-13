/**
 * SSE Service
 * 
 * Manages Server-Sent Events connections and broadcasts real-time notifications
 * to connected clients. Handles connection registration, message broadcasting,
 * and initial banner delivery.
 */

import { Response } from 'express';
import { BannerOutput, ToastInput } from '../types/banner';
import { getActiveBanners } from './notificationService';

/**
 * SSE Service class for managing real-time notification delivery
 */
export class SSEService {
  /**
   * Connection registry mapping accountId to Set of Response objects
   * - Key: accountId (string) or 'unauthenticated' for non-authenticated users
   * - Value: Set of Express Response objects for SSE connections
   */
  private connections: Map<string, Set<Response>>;

  constructor() {
    this.connections = new Map();
  }

  /**
   * Registers a new SSE connection for an account
   * 
   * @param accountId - Account ID (null for unauthenticated users)
   * @param res - Express Response object for SSE connection
   */
  registerConnection(accountId: string | null, res: Response): void {
    const key = accountId || 'unauthenticated';
    
    if (!this.connections.has(key)) {
      this.connections.set(key, new Set());
    }
    
    this.connections.get(key)!.add(res);
  }

  /**
   * Removes a connection when client disconnects
   * 
   * @param accountId - Account ID (null for unauthenticated users)
   * @param res - Express Response object to remove
   */
  removeConnection(accountId: string | null, res: Response): void {
    const key = accountId || 'unauthenticated';
    
    const connectionSet = this.connections.get(key);
    if (connectionSet) {
      connectionSet.delete(res);
      
      // Clean up empty sets
      if (connectionSet.size === 0) {
        this.connections.delete(key);
      }
    }
  }

  /**
   * Broadcasts a banner to relevant connections
   * 
   * Determines which connections should receive the banner based on:
   * - Account-specific banners: only to that account's connections
   * - Global banners: to all connections matching the audience criteria
   * 
   * @param banner - Banner to broadcast
   */
  broadcastBanner(banner: BannerOutput): void {
    const message = this.formatSSEMessage('banner', banner);

    if (banner.accountId) {
      // Account-specific banner: send only to that account
      this.sendToConnections(banner.accountId, message);
    } else {
      // Global banner: send to appropriate audience
      if (banner.audience === 'all') {
        // Send to all connections
        this.sendToAllConnections(message);
      } else if (banner.audience === 'authenticated') {
        // Send to all authenticated connections (exclude 'unauthenticated' key)
        for (const [key, connections] of this.connections.entries()) {
          if (key !== 'unauthenticated') {
            this.sendToConnectionSet(connections, message);
          }
        }
      } else if (banner.audience === 'unauthenticated') {
        // Send only to unauthenticated connections
        this.sendToConnections('unauthenticated', message);
      }
    }
  }

  /**
   * Broadcasts a banner removal to relevant connections
   * 
   * @param bannerId - ID of the banner to remove
   * @param accountId - Optional account ID (if account-specific banner)
   */
  broadcastBannerRemoval(bannerId: string, accountId?: string): void {
    const message = this.formatSSEMessage('banner_removed', { bannerId });

    if (accountId) {
      // Account-specific banner removal
      this.sendToConnections(accountId, message);
    } else {
      // Global banner removal: send to all connections
      this.sendToAllConnections(message);
    }
  }

  /**
   * Sends a toast notification via SSE
   * 
   * @param toast - Toast notification to send
   */
  sendToast(toast: ToastInput): void {
    const message = this.formatSSEMessage('toast', toast);

    if (toast.accountId) {
      // Account-specific toast
      this.sendToConnections(toast.accountId, message);
    } else {
      // Global toast: send to all connections
      this.sendToAllConnections(message);
    }
  }

  /**
   * Sends initial banners to a newly connected client
   * 
   * @param accountId - Account ID (null for unauthenticated users)
   * @param isAuthenticated - Whether the user is authenticated
   * @param res - Express Response object for the connection
   */
  async sendInitialBanners(
    accountId: string | null,
    isAuthenticated: boolean,
    res: Response
  ): Promise<void> {
    try {
      const banners = await getActiveBanners(accountId, isAuthenticated);
      
      for (const banner of banners) {
        const message = this.formatSSEMessage('banner', banner);
        this.sendToConnection(res, message);
      }
    } catch (error) {
      console.error('Error sending initial banners:', error);
    }
  }

  /**
   * Formats an SSE message according to the SSE protocol
   * 
   * @param type - Message type
   * @param data - Message data
   * @returns Formatted SSE message string
   */
  private formatSSEMessage(
    type: 'banner' | 'toast' | 'banner_removed',
    data: BannerOutput | ToastInput | { bannerId: string }
  ): string {
    const message = {
      type,
      data,
    };
    
    return `data: ${JSON.stringify(message)}\n\n`;
  }

  /**
   * Sends a message to a specific connection
   * 
   * @param res - Express Response object
   * @param message - Formatted SSE message
   */
  private sendToConnection(res: Response, message: string): void {
    try {
      res.write(message);
    } catch (error) {
      console.error('Error sending to connection:', error);
    }
  }

  /**
   * Sends a message to all connections for a specific account
   * 
   * @param accountKey - Account ID or 'unauthenticated'
   * @param message - Formatted SSE message
   */
  private sendToConnections(accountKey: string, message: string): void {
    const connections = this.connections.get(accountKey);
    if (connections) {
      this.sendToConnectionSet(connections, message);
    }
  }

  /**
   * Sends a message to a set of connections
   * 
   * @param connections - Set of Response objects
   * @param message - Formatted SSE message
   */
  private sendToConnectionSet(connections: Set<Response>, message: string): void {
    for (const res of connections) {
      this.sendToConnection(res, message);
    }
  }

  /**
   * Sends a message to all registered connections
   * 
   * @param message - Formatted SSE message
   */
  private sendToAllConnections(message: string): void {
    for (const connections of this.connections.values()) {
      this.sendToConnectionSet(connections, message);
    }
  }

  /**
   * Gets the total number of active connections
   * 
   * @returns Total connection count
   */
  getConnectionCount(): number {
    let count = 0;
    for (const connections of this.connections.values()) {
      count += connections.size;
    }
    return count;
  }

  /**
   * Gets the number of connections for a specific account
   * 
   * @param accountId - Account ID (null for unauthenticated)
   * @returns Connection count for the account
   */
  getAccountConnectionCount(accountId: string | null): number {
    const key = accountId || 'unauthenticated';
    const connections = this.connections.get(key);
    return connections ? connections.size : 0;
  }
}

// Export singleton instance
export const sseService = new SSEService();
