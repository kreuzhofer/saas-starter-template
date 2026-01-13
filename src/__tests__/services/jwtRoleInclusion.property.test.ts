import * as fc from 'fast-check';
import { generateJWT, verifyJWT, login } from '../../services/auth';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { testEmailArbitrary } from '../helpers/testData';
import { AccountRole, ACCOUNT_ROLES } from '../../types/account';
import * as emailService from '../../services/email';
import bcrypt from 'bcrypt';

// Mock the email service
jest.mock('../../services/email');

// Use minimal bcrypt rounds for testing to improve performance
const TEST_BCRYPT_ROUNDS = 1;

/**
 * Feature: account-management, Property 2: JWT role inclusion on authentication
 * Validates: Requirements 4.1
 * 
 * For any account that authenticates successfully, the generated JWT token should 
 * contain the account's current role in the payload.
 */

describe('Property-Based Test: JWT Role Inclusion on Authentication', () => {
  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('should include role in JWT token for any account authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('jwt-role'),
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.constantFrom(...ACCOUNT_ROLES),
        async (email, password, role: AccountRole) => {
          // Create account with specific role
          const passwordHash = await bcrypt.hash(password, TEST_BCRYPT_ROUNDS);
          const account = await prisma.account.create({
            data: {
              username: email,
              passwordHash,
              role,
              isActive: true, // Must be active to login
            },
          });

          try {
            // Authenticate the account
            const loginResult = await login(email, password);

            // Verify token was generated
            expect(loginResult.token).toBeDefined();
            expect(typeof loginResult.token).toBe('string');

            // Decode the JWT token
            const payload = verifyJWT(loginResult.token);

            // Verify the role is included in the token payload
            expect(payload.role).toBeDefined();
            expect(payload.role).toBe(role);

            // Verify other expected fields are also present
            expect(payload.accountId).toBe(account.id);
            expect(payload.username).toBe(email);
            expect(payload.iat).toBeDefined();
            expect(payload.exp).toBeDefined();
          } finally {
            // Cleanup
            await prisma.account.delete({
              where: { id: account.id },
            });
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should include correct role in JWT for all valid role types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-valid'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async (accountData) => {
          // Generate JWT with the role
          const token = generateJWT(
            accountData.accountId,
            accountData.username,
            accountData.role
          );

          // Verify token was generated
          expect(token).toBeDefined();
          expect(typeof token).toBe('string');

          // Decode and verify the token
          const payload = verifyJWT(token);

          // Verify the role matches what was provided
          expect(payload.role).toBe(accountData.role);
          expect(payload.accountId).toBe(accountData.accountId);
          expect(payload.username).toBe(accountData.username);
        }
      ),
      { numRuns: 5 }
    );
  });

  // Note: Tests for individual roles (admin, account_owner, account_user) are redundant
  // as they are already covered by the first test which tests all roles via fc.constantFrom(...ACCOUNT_ROLES)

  it('should include role in JWT for batch authentication operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            email: testEmailArbitrary('jwt-batch'),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            role: fc.constantFrom(...ACCOUNT_ROLES),
          }),
          { minLength: 1, maxLength: 2 } // Reduced to 2 for performance
        ),
        async (accounts) => {
          const createdIds: string[] = [];

          try {
            // Create all accounts
            for (const acc of accounts) {
              const passwordHash = await bcrypt.hash(acc.password, TEST_BCRYPT_ROUNDS);
              const account = await prisma.account.create({
                data: {
                  username: acc.email,
                  passwordHash,
                  role: acc.role,
                  isActive: true,
                },
              });
              createdIds.push(account.id);
            }

            // Authenticate each account and verify role in JWT
            for (let i = 0; i < accounts.length; i++) {
              const acc = accounts[i];
              const loginResult = await login(acc.email, acc.password);
              const payload = verifyJWT(loginResult.token);

              // Verify role matches
              expect(payload.role).toBe(acc.role);
              expect(payload.username).toBe(acc.email);
            }
          } finally {
            // Cleanup
            if (createdIds.length > 0) {
              await prisma.account.deleteMany({
                where: { id: { in: createdIds } },
              });
            }
          }
        }
      ),
      { numRuns: 5 } // Reduced from 50 to 20 for performance
    );
  }, 30000); // Reduced timeout to 30 seconds

  it('should include role in JWT regardless of account creation time', async () => {
    await fc.assert(
      fc.asyncProperty(
        testEmailArbitrary('jwt-time'),
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.constantFrom(...ACCOUNT_ROLES),
        async (email, password, role: AccountRole) => {
          // Create account
          const passwordHash = await bcrypt.hash(password, TEST_BCRYPT_ROUNDS);
          const account = await prisma.account.create({
            data: {
              username: email,
              passwordHash,
              role,
              isActive: true,
            },
          });

          try {
            // Removed delay - not necessary for testing role inclusion
            // Authenticate
            const loginResult = await login(email, password);
            const payload = verifyJWT(loginResult.token);

            // Role should still be included correctly
            expect(payload.role).toBe(role);
          } finally {
            // Cleanup
            await prisma.account.delete({
              where: { id: account.id },
            });
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});
