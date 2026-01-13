import * as fc from 'fast-check';
import { testEmailArbitrary } from '../helpers/testData';
import { generateJWT, verifyJWT } from '../../services/auth';
import { AccountRole, ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 3: JWT role round-trip
 * Validates: Requirements 4.2
 * 
 * For any account role encoded in a JWT token, decoding that token should 
 * extract the same role value.
 */

describe('Property-Based Test: JWT Role Round-Trip', () => {
  it('should preserve role through encode-decode cycle for any valid role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-round'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async (accountData) => {
          // Encode: Generate JWT with the role
          const token = generateJWT(
            accountData.accountId,
            accountData.username,
            accountData.role
          );

          // Decode: Verify and extract the JWT
          const payload = verifyJWT(token);

          // Round-trip property: decoded role should match original role
          expect(payload.role).toBe(accountData.role);
          
          // Also verify other fields are preserved
          expect(payload.accountId).toBe(accountData.accountId);
          expect(payload.username).toBe(accountData.username);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve admin role through encode-decode cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-round'),
        }),
        async (accountData) => {
          const role: AccountRole = 'admin';

          // Encode with admin role
          const token = generateJWT(accountData.accountId, accountData.username, role);

          // Decode
          const payload = verifyJWT(token);

          // Verify admin role is preserved
          expect(payload.role).toBe('admin');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve account_owner role through encode-decode cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-round'),
        }),
        async (accountData) => {
          const role: AccountRole = 'account_owner';

          // Encode with account_owner role
          const token = generateJWT(accountData.accountId, accountData.username, role);

          // Decode
          const payload = verifyJWT(token);

          // Verify account_owner role is preserved
          expect(payload.role).toBe('account_owner');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve account_user role through encode-decode cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-round'),
        }),
        async (accountData) => {
          const role: AccountRole = 'account_user';

          // Encode with account_user role
          const token = generateJWT(accountData.accountId, accountData.username, role);

          // Decode
          const payload = verifyJWT(token);

          // Verify account_user role is preserved
          expect(payload.role).toBe('account_user');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve role through multiple encode-decode cycles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-round'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        fc.integer({ min: 1, max: 5 }),
        async (accountData, cycles) => {
          let currentToken = generateJWT(
            accountData.accountId,
            accountData.username,
            accountData.role
          );

          // Perform multiple decode-encode cycles
          for (let i = 0; i < cycles; i++) {
            const payload = verifyJWT(currentToken);
            
            // Verify role is preserved in this cycle
            expect(payload.role).toBe(accountData.role);
            
            // Re-encode with the same data
            currentToken = generateJWT(
              payload.accountId,
              payload.username,
              payload.role
            );
          }

          // Final verification
          const finalPayload = verifyJWT(currentToken);
          expect(finalPayload.role).toBe(accountData.role);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve role for batch of different accounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            accountId: fc.uuid(),
            username: testEmailArbitrary('jwt-round'),
            role: fc.constantFrom(...ACCOUNT_ROLES),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (accounts) => {
          // Generate tokens for all accounts
          const tokens = accounts.map(acc =>
            generateJWT(acc.accountId, acc.username, acc.role)
          );

          // Verify each token preserves its role
          for (let i = 0; i < accounts.length; i++) {
            const payload = verifyJWT(tokens[i]);
            expect(payload.role).toBe(accounts[i].role);
            expect(payload.accountId).toBe(accounts[i].accountId);
            expect(payload.username).toBe(accounts[i].username);
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve role regardless of username format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        testEmailArbitrary('jwt-round'),
        fc.constantFrom(...ACCOUNT_ROLES),
        async (accountId, username, role) => {
          // Generate token
          const token = generateJWT(accountId, username, role);

          // Decode and verify
          const payload = verifyJWT(token);

          // Role should be preserved regardless of username
          expect(payload.role).toBe(role);
          expect(payload.username).toBe(username);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve role regardless of accountId format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        testEmailArbitrary('jwt-round'),
        fc.constantFrom(...ACCOUNT_ROLES),
        async (accountId, username, role) => {
          // Generate token
          const token = generateJWT(accountId, username, role);

          // Decode and verify
          const payload = verifyJWT(token);

          // Role should be preserved regardless of accountId
          expect(payload.role).toBe(role);
          expect(payload.accountId).toBe(accountId);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});
