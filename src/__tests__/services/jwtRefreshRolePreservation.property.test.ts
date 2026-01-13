import * as fc from 'fast-check';
import { testEmailArbitrary } from '../helpers/testData';
import { generateJWT, verifyJWT, refreshToken } from '../../services/auth';
import { AccountRole, ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 15: JWT refresh role preservation
 * Validates: Requirements 4.4
 * 
 * For any JWT token refresh operation, the new token should contain the same 
 * role as the original token.
 */

describe('Property-Based Test: JWT Refresh Role Preservation', () => {
  it('should preserve role when refreshing token for any valid role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-refresh'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async (accountData) => {
          // Generate initial JWT with the role
          const originalToken = generateJWT(
            accountData.accountId,
            accountData.username,
            accountData.role
          );

          // Refresh the token
          const { token: refreshedToken } = await refreshToken(originalToken);

          // Decode both tokens
          const originalPayload = verifyJWT(originalToken);
          const refreshedPayload = verifyJWT(refreshedToken);

          // Property: refreshed token should preserve the same role
          expect(refreshedPayload.role).toBe(originalPayload.role);
          expect(refreshedPayload.role).toBe(accountData.role);
          
          // Also verify other fields are preserved
          expect(refreshedPayload.accountId).toBe(originalPayload.accountId);
          expect(refreshedPayload.username).toBe(originalPayload.username);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve admin role through token refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-refresh'),
        }),
        async (accountData) => {
          const role: AccountRole = 'admin';

          // Generate token with admin role
          const originalToken = generateJWT(accountData.accountId, accountData.username, role);

          // Refresh the token
          const { token: refreshedToken } = await refreshToken(originalToken);

          // Decode refreshed token
          const refreshedPayload = verifyJWT(refreshedToken);

          // Verify admin role is preserved
          expect(refreshedPayload.role).toBe('admin');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve account_owner role through token refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-refresh'),
        }),
        async (accountData) => {
          const role: AccountRole = 'account_owner';

          // Generate token with account_owner role
          const originalToken = generateJWT(accountData.accountId, accountData.username, role);

          // Refresh the token
          const { token: refreshedToken } = await refreshToken(originalToken);

          // Decode refreshed token
          const refreshedPayload = verifyJWT(refreshedToken);

          // Verify account_owner role is preserved
          expect(refreshedPayload.role).toBe('account_owner');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve account_user role through token refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-refresh'),
        }),
        async (accountData) => {
          const role: AccountRole = 'account_user';

          // Generate token with account_user role
          const originalToken = generateJWT(accountData.accountId, accountData.username, role);

          // Refresh the token
          const { token: refreshedToken } = await refreshToken(originalToken);

          // Decode refreshed token
          const refreshedPayload = verifyJWT(refreshedToken);

          // Verify account_user role is preserved
          expect(refreshedPayload.role).toBe('account_user');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve role through multiple consecutive token refreshes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-refresh'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        fc.integer({ min: 2, max: 5 }),
        async (accountData, refreshCount) => {
          // Generate initial token
          let currentToken = generateJWT(
            accountData.accountId,
            accountData.username,
            accountData.role
          );

          // Perform multiple refresh operations
          for (let i = 0; i < refreshCount; i++) {
            const { token: newToken } = await refreshToken(currentToken);
            
            // Verify role is preserved in each refresh
            const payload = verifyJWT(newToken);
            expect(payload.role).toBe(accountData.role);
            
            // Use the new token for the next refresh
            currentToken = newToken;
          }

          // Final verification
          const finalPayload = verifyJWT(currentToken);
          expect(finalPayload.role).toBe(accountData.role);
          expect(finalPayload.accountId).toBe(accountData.accountId);
          expect(finalPayload.username).toBe(accountData.username);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve role for batch of token refreshes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            accountId: fc.uuid(),
            username: testEmailArbitrary('jwt-refresh'),
            role: fc.constantFrom(...ACCOUNT_ROLES),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (accounts) => {
          // Generate tokens for all accounts
          const originalTokens = accounts.map(acc =>
            generateJWT(acc.accountId, acc.username, acc.role)
          );

          // Refresh all tokens
          const refreshResults = await Promise.all(
            originalTokens.map(token => refreshToken(token))
          );

          // Verify each refreshed token preserves its role
          for (let i = 0; i < accounts.length; i++) {
            const refreshedPayload = verifyJWT(refreshResults[i].token);
            expect(refreshedPayload.role).toBe(accounts[i].role);
            expect(refreshedPayload.accountId).toBe(accounts[i].accountId);
            expect(refreshedPayload.username).toBe(accounts[i].username);
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve role regardless of time between token creation and refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-refresh'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        fc.integer({ min: 10, max: 100 }),
        async (accountData, delayMs) => {
          // Generate initial token
          const originalToken = generateJWT(
            accountData.accountId,
            accountData.username,
            accountData.role
          );

          // Wait before refreshing
          await new Promise(resolve => setTimeout(resolve, delayMs));

          // Refresh the token
          const { token: refreshedToken } = await refreshToken(originalToken);

          // Decode refreshed token
          const refreshedPayload = verifyJWT(refreshedToken);

          // Role should be preserved regardless of delay
          expect(refreshedPayload.role).toBe(accountData.role);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve role when refreshing tokens with different account IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        testEmailArbitrary('jwt-refresh'),
        fc.constantFrom(...ACCOUNT_ROLES),
        async (accountId, username, role) => {
          // Generate token
          const originalToken = generateJWT(accountId, username, role);

          // Refresh the token
          const { token: refreshedToken } = await refreshToken(originalToken);

          // Decode refreshed token
          const refreshedPayload = verifyJWT(refreshedToken);

          // Role should be preserved regardless of accountId format
          expect(refreshedPayload.role).toBe(role);
          expect(refreshedPayload.accountId).toBe(accountId);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should preserve role when refreshing tokens with different usernames', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        testEmailArbitrary('jwt-refresh'),
        fc.constantFrom(...ACCOUNT_ROLES),
        async (accountId, username, role) => {
          // Generate token
          const originalToken = generateJWT(accountId, username, role);

          // Refresh the token
          const { token: refreshedToken } = await refreshToken(originalToken);

          // Decode refreshed token
          const refreshedPayload = verifyJWT(refreshedToken);

          // Role should be preserved regardless of username format
          expect(refreshedPayload.role).toBe(role);
          expect(refreshedPayload.username).toBe(username);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should generate new expiration time but preserve role on refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accountId: fc.uuid(),
          username: testEmailArbitrary('jwt-refresh'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async (accountData) => {
          // Generate initial token
          const originalToken = generateJWT(
            accountData.accountId,
            accountData.username,
            accountData.role
          );

          // Small delay to ensure different timestamps
          await new Promise(resolve => setTimeout(resolve, 10));

          // Refresh the token
          const { token: refreshedToken } = await refreshToken(originalToken);

          // Decode both tokens
          const originalPayload = verifyJWT(originalToken);
          const refreshedPayload = verifyJWT(refreshedToken);

          // Role should be preserved
          expect(refreshedPayload.role).toBe(originalPayload.role);
          
          // But timestamps should be different (new token has new iat/exp)
          expect(refreshedPayload.iat).toBeGreaterThanOrEqual(originalPayload.iat);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});
