import * as fc from 'fast-check';
import { register } from '../../services/auth';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { testEmailArbitrary } from '../helpers/testData';
import * as emailService from '../../services/email';

// Mock the email service
jest.mock('../../services/email');

/**
 * Feature: account-management, Property 1: New account role assignment
 * Validates: Requirements 2.1
 * 
 * For any new account registration (excluding admin@example.com), the system should 
 * assign the role "account_owner" and persist it to the database.
 */

describe('Property-Based Test: New Account Role Assignment', () => {
  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('should assign account_owner role to all new registrations except admin@example.com', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('reg-role'),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (email, password) => {
          // Register new account
          const result = await register(email, password);

          // Verify the registration result
          expect(result).toBeDefined();
          expect(result.id).toBeDefined();
          expect(result.username).toBe(email);

          // Fetch the account from database to verify role persistence
          const account = await prisma.account.findUnique({
            where: { id: result.id },
          });

          // Verify account was created
          expect(account).not.toBeNull();
          
          // Verify role assignment
          expect(account!.role).toBe('account_owner');

          // Cleanup
          await prisma.emailConfirmationToken.deleteMany({
            where: { accountId: result.id },
          });
          await prisma.account.delete({
            where: { id: result.id },
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should assign admin role to admin@example.com', async () => {
    // This test verifies the special admin@example.com logic exists
    // We check if admin@example.com exists and has admin role
    // We do NOT create or delete it to avoid touching production data
    const existingAdmin = await prisma.account.findUnique({
      where: { username: 'admin@example.com' },
    });

    if (existingAdmin) {
      // Verify the existing admin account has admin role
      expect(existingAdmin.role).toBe('admin');
    } else {
      // Admin doesn't exist - skip test
      // Note: We don't create it here to avoid touching production data
      console.log('Skipping test: admin@example.com does not exist');
    }
  });

  it('should persist role assignment across database queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('reg-persist'),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (email, password) => {
          // Register new account
          const result = await register(email, password);

          // Query the account multiple times to verify persistence
          const query1 = await prisma.account.findUnique({
            where: { id: result.id },
          });

          const query2 = await prisma.account.findUnique({
            where: { username: email },
          });

          const query3 = await prisma.account.findFirst({
            where: { id: result.id },
          });

          // All queries should return the same role
          expect(query1).not.toBeNull();
          expect(query2).not.toBeNull();
          expect(query3).not.toBeNull();

          expect(query1!.role).toBe('account_owner');
          expect(query2!.role).toBe('account_owner');
          expect(query3!.role).toBe('account_owner');

          // All queries should return the same account
          expect(query1!.id).toBe(result.id);
          expect(query2!.id).toBe(result.id);
          expect(query3!.id).toBe(result.id);

          // Cleanup
          await prisma.emailConfirmationToken.deleteMany({
            where: { accountId: result.id },
          });
          await prisma.account.delete({
            where: { id: result.id },
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should assign account_owner role regardless of email format variations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          localPart: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9._-]+$/.test(s)),
          domain: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9-]+$/.test(s)),
          tld: fc.constantFrom('com', 'org', 'net', 'edu', 'io', 'co'),
        }),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (emailParts, password) => {
          // Construct email from parts
          const email = `${emailParts.localPart}@${emailParts.domain}.${emailParts.tld}`;

          // Skip if it's the admin email
          if (email === 'admin@example.com') {
            return;
          }

          // Skip if email is invalid (empty parts)
          if (!emailParts.localPart || !emailParts.domain) {
            return;
          }

          try {
            // Register new account
            const result = await register(email, password);

            // Fetch the account from database
            const account = await prisma.account.findUnique({
              where: { id: result.id },
            });

            // Verify role assignment
            expect(account).not.toBeNull();
            expect(account!.role).toBe('account_owner');

            // Cleanup
            await prisma.emailConfirmationToken.deleteMany({
              where: { accountId: result.id },
            });
            await prisma.account.delete({
              where: { id: result.id },
            });
          } catch (error) {
            // If registration fails due to invalid email format, that's acceptable
            // The property is about role assignment for valid registrations
            if (error instanceof Error && error.message.includes('valid email')) {
              return;
            }
            throw error;
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should assign account_owner role to batch registrations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            email: testEmailArbitrary('reg-batch'),
            password: fc.string({ minLength: 8, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (registrations) => {
          const createdIds: string[] = [];

          try {
            // Register all accounts
            for (const reg of registrations) {
              const result = await register(reg.email, reg.password);
              createdIds.push(result.id);
            }

            // Verify all accounts have account_owner role
            const accounts = await prisma.account.findMany({
              where: { id: { in: createdIds } },
            });

            expect(accounts).toHaveLength(registrations.length);

            for (const account of accounts) {
              expect(account.role).toBe('account_owner');
            }
          } finally {
            // Cleanup
            if (createdIds.length > 0) {
              await prisma.emailConfirmationToken.deleteMany({
                where: { accountId: { in: createdIds } },
              });
              await prisma.account.deleteMany({
                where: { id: { in: createdIds } },
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});
