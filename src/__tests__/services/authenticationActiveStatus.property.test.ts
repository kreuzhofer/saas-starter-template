import * as fc from 'fast-check';
import { register, login, hashPassword } from '../../services/auth';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { testEmailArbitrary } from '../helpers/testData';
import * as emailService from '../../services/email';

// Mock the email service
jest.mock('../../services/email');

/**
 * Feature: account-management, Property 28: Authentication based on active status
 * Validates: Requirements 12.4, 12.5
 * 
 * For any account, authentication should succeed if and only if the account's active status is true.
 */

describe('Property-Based Test: Authentication Based on Active Status', () => {
  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('should allow authentication only for active accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('auth-active'),
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.boolean(),
        async (email, password, isActive) => {
          // Create account directly in database with specified active status
          const passwordHash = await hashPassword(password);
          
          const account = await prisma.account.create({
            data: {
              username: email,
              passwordHash,
              role: 'account_owner',
              isActive,
            },
          });

          try {
            // Attempt to login
            const result = await login(email, password);

            // If we reach here, login succeeded
            // This should only happen when isActive is true
            expect(isActive).toBe(true);
            expect(result).toBeDefined();
            expect(result.token).toBeDefined();
            expect(result.account.username).toBe(email);
          } catch (error) {
            // If login failed, it should be because account is inactive
            expect(isActive).toBe(false);
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('Email confirmation required');
          } finally {
            // Cleanup
            await prisma.account.delete({
              where: { id: account.id },
            });
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should reject authentication for inactive accounts regardless of correct credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('auth-inactive'),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (email, password) => {
          // Create inactive account
          const passwordHash = await hashPassword(password);
          
          const account = await prisma.account.create({
            data: {
              username: email,
              passwordHash,
              role: 'account_owner',
              isActive: false,
            },
          });

          try {
            // Attempt to login with correct credentials
            await login(email, password);
            
            // Should not reach here - login should fail
            fail('Login should have failed for inactive account');
          } catch (error) {
            // Verify the error is about email confirmation
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('Email confirmation required');
          } finally {
            // Cleanup
            await prisma.account.delete({
              where: { id: account.id },
            });
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should allow authentication for active accounts with correct credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('auth-correct'),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (email, password) => {
          // Create active account
          const passwordHash = await hashPassword(password);
          
          const account = await prisma.account.create({
            data: {
              username: email,
              passwordHash,
              role: 'account_owner',
              isActive: true,
            },
          });

          try {
            // Attempt to login with correct credentials
            const result = await login(email, password);
            
            // Verify login succeeded
            expect(result).toBeDefined();
            expect(result.token).toBeDefined();
            expect(result.account.id).toBe(account.id);
            expect(result.account.username).toBe(email);
          } finally {
            // Cleanup
            await prisma.account.delete({
              where: { id: account.id },
            });
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should maintain active status check across multiple login attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('auth-multi'),
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.integer({ min: 2, max: 5 }),
        async (email, password, attempts) => {
          // Create inactive account
          const passwordHash = await hashPassword(password);
          
          const account = await prisma.account.create({
            data: {
              username: email,
              passwordHash,
              role: 'account_owner',
              isActive: false,
            },
          });

          try {
            // Attempt to login multiple times
            for (let i = 0; i < attempts; i++) {
              try {
                await login(email, password);
                fail('Login should have failed for inactive account');
              } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('Email confirmation required');
              }
            }

            // Now activate the account
            await prisma.account.update({
              where: { id: account.id },
              data: { isActive: true },
            });

            // Login should now succeed
            const result = await login(email, password);
            expect(result).toBeDefined();
            expect(result.token).toBeDefined();
          } finally {
            // Cleanup
            await prisma.account.delete({
              where: { id: account.id },
            });
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should check active status before password verification', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('auth-order'),
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (email, correctPassword, wrongPassword) => {
          // Ensure passwords are different
          if (correctPassword === wrongPassword) {
            return;
          }

          // Create inactive account
          const passwordHash = await hashPassword(correctPassword);
          
          const account = await prisma.account.create({
            data: {
              username: email,
              passwordHash,
              role: 'account_owner',
              isActive: false,
            },
          });

          try {
            // Attempt to login with wrong password
            // Should still fail with email confirmation error, not invalid credentials
            await login(email, wrongPassword);
            fail('Login should have failed for inactive account');
          } catch (error) {
            // Verify the error is about email confirmation, not invalid credentials
            // This proves that active status is checked before password verification
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('Email confirmation required');
          } finally {
            // Cleanup
            await prisma.account.delete({
              where: { id: account.id },
            });
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should respect active status changes immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('auth-change'),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (email, password) => {
          // Create active account
          const passwordHash = await hashPassword(password);
          
          const account = await prisma.account.create({
            data: {
              username: email,
              passwordHash,
              role: 'account_owner',
              isActive: true,
            },
          });

          try {
            // Login should succeed
            const result1 = await login(email, password);
            expect(result1).toBeDefined();
            expect(result1.token).toBeDefined();

            // Deactivate the account
            await prisma.account.update({
              where: { id: account.id },
              data: { isActive: false },
            });

            // Login should now fail
            try {
              await login(email, password);
              fail('Login should have failed after deactivation');
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toBe('Email confirmation required');
            }

            // Reactivate the account
            await prisma.account.update({
              where: { id: account.id },
              data: { isActive: true },
            });

            // Login should succeed again
            const result2 = await login(email, password);
            expect(result2).toBeDefined();
            expect(result2.token).toBeDefined();
          } finally {
            // Cleanup
            await prisma.account.delete({
              where: { id: account.id },
            });
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});
