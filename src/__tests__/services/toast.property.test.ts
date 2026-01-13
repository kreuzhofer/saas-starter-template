/**
 * Property-Based Tests for Toast Notifications
 * 
 * Tests universal properties for toast message delivery via SSE.
 */

import * as fc from 'fast-check';
import { Response } from 'express';
import { sseService } from '../../services/sseService';
import { ToastInput } from '../../types/banner';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';
import { createTestAccount } from '../helpers/testData';

const db = getTestDb();

describe('Toast Notifications - Property-Based Tests', () => {
  let testAccount1: any;
  let testAccount2: any;

  beforeEach(async () => {
    await cleanupTestDb();
    
    const result1 = await createTestAccount(db, {
      username: `toast-test-1-${Date.now()}@example.com`,
      password: 'password123',
    });
    testAccount1 = result1.account;
    
    const result2 = await createTestAccount(db, {
      username: `toast-test-2-${Date.now()}@example.com`,
      password: 'password123',
    });
    testAccount2 = result2.account;
    
    await db.account.updateMany({
      where: { id: { in: [testAccount1.id, testAccount2.id] } },
      data: { isActive: true },
    });
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('Property 22: Toast Message Delivery', () => {
    /**
     * Feature: 031-notification-banner-system, Property 22: Toast Message Delivery
     * Validates: Requirements 13.1, 13.2, 13.6
     * 
     * For any toast notification sent through the system, the toast should be delivered
     * to the appropriate SSE connections (account-specific or all connections) with the
     * correct type, message, and duration.
     */
    it('should deliver account-specific toasts only to target account connections', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const),
              fc.constant('success' as const)
            ),
            message: fc.string({ minLength: 1, maxLength: 500 }),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (data) => {
            // Create mock response objects to track messages
            const messages1: string[] = [];
            const messages2: string[] = [];
            
            const mockRes1 = {
              write: (msg: string) => messages1.push(msg),
            } as unknown as Response;
            
            const mockRes2 = {
              write: (msg: string) => messages2.push(msg),
            } as unknown as Response;

            // Register connections for both accounts
            sseService.registerConnection(testAccount1.id, mockRes1);
            sseService.registerConnection(testAccount2.id, mockRes2);

            // Send account-specific toast to account1
            const toast: ToastInput = {
              accountId: testAccount1.id,
              type: data.type,
              message: data.message,
              duration: data.duration,
            };

            sseService.sendToast(toast);

            // Verify account1 received the toast
            expect(messages1.length).toBe(1);
            const parsedMessage1 = JSON.parse(messages1[0].replace('data: ', '').trim());
            expect(parsedMessage1.type).toBe('toast');
            expect(parsedMessage1.data.type).toBe(data.type);
            expect(parsedMessage1.data.message).toBe(data.message);
            expect(parsedMessage1.data.duration).toBe(data.duration);
            expect(parsedMessage1.data.accountId).toBe(testAccount1.id);

            // Verify account2 did NOT receive the toast
            expect(messages2.length).toBe(0);

            // Cleanup
            sseService.removeConnection(testAccount1.id, mockRes1);
            sseService.removeConnection(testAccount2.id, mockRes2);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should deliver global toasts to all connections', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const),
              fc.constant('success' as const)
            ),
            message: fc.string({ minLength: 1, maxLength: 500 }),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (data) => {
            // Create mock response objects to track messages
            const messages1: string[] = [];
            const messages2: string[] = [];
            const messagesUnauth: string[] = [];
            
            const mockRes1 = {
              write: (msg: string) => messages1.push(msg),
            } as unknown as Response;
            
            const mockRes2 = {
              write: (msg: string) => messages2.push(msg),
            } as unknown as Response;
            
            const mockResUnauth = {
              write: (msg: string) => messagesUnauth.push(msg),
            } as unknown as Response;

            // Register connections for both accounts and unauthenticated
            sseService.registerConnection(testAccount1.id, mockRes1);
            sseService.registerConnection(testAccount2.id, mockRes2);
            sseService.registerConnection(null, mockResUnauth);

            // Send global toast (no accountId)
            const toast: ToastInput = {
              type: data.type,
              message: data.message,
              duration: data.duration,
            };

            sseService.sendToast(toast);

            // Verify all connections received the toast
            expect(messages1.length).toBe(1);
            expect(messages2.length).toBe(1);
            expect(messagesUnauth.length).toBe(1);

            // Verify message content for account1
            const parsedMessage1 = JSON.parse(messages1[0].replace('data: ', '').trim());
            expect(parsedMessage1.type).toBe('toast');
            expect(parsedMessage1.data.type).toBe(data.type);
            expect(parsedMessage1.data.message).toBe(data.message);
            expect(parsedMessage1.data.duration).toBe(data.duration);
            expect(parsedMessage1.data.accountId).toBeUndefined();

            // Verify message content for account2
            const parsedMessage2 = JSON.parse(messages2[0].replace('data: ', '').trim());
            expect(parsedMessage2.type).toBe('toast');
            expect(parsedMessage2.data.type).toBe(data.type);
            expect(parsedMessage2.data.message).toBe(data.message);

            // Verify message content for unauthenticated
            const parsedMessageUnauth = JSON.parse(messagesUnauth[0].replace('data: ', '').trim());
            expect(parsedMessageUnauth.type).toBe('toast');
            expect(parsedMessageUnauth.data.type).toBe(data.type);
            expect(parsedMessageUnauth.data.message).toBe(data.message);

            // Cleanup
            sseService.removeConnection(testAccount1.id, mockRes1);
            sseService.removeConnection(testAccount2.id, mockRes2);
            sseService.removeConnection(null, mockResUnauth);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should preserve toast type, message, and duration in delivery', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const),
              fc.constant('success' as const)
            ),
            message: fc.string({ minLength: 1, maxLength: 500 }),
            duration: fc.integer({ min: 1000, max: 30000 }),
            useAccountId: fc.boolean(),
          }),
          async (data) => {
            // Create mock response object to track messages
            const messages: string[] = [];
            
            const mockRes = {
              write: (msg: string) => messages.push(msg),
            } as unknown as Response;

            // Register connection
            const accountId = data.useAccountId ? testAccount1.id : null;
            sseService.registerConnection(accountId, mockRes);

            // Send toast
            const toast: ToastInput = {
              accountId: data.useAccountId ? testAccount1.id : undefined,
              type: data.type,
              message: data.message,
              duration: data.duration,
            };

            sseService.sendToast(toast);

            // Verify toast was delivered with correct data
            expect(messages.length).toBe(1);
            const parsedMessage = JSON.parse(messages[0].replace('data: ', '').trim());
            
            expect(parsedMessage.type).toBe('toast');
            expect(parsedMessage.data.type).toBe(data.type);
            expect(parsedMessage.data.message).toBe(data.message);
            expect(parsedMessage.data.duration).toBe(data.duration);
            
            if (data.useAccountId) {
              expect(parsedMessage.data.accountId).toBe(testAccount1.id);
            } else {
              expect(parsedMessage.data.accountId).toBeUndefined();
            }

            // Cleanup
            sseService.removeConnection(accountId, mockRes);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
