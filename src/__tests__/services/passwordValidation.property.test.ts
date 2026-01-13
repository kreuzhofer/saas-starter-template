import * as fc from 'fast-check';
import { testEmailArbitrary } from '../helpers/testData';
import { setUserPassword } from '../../services/admin';
import prisma from '../../db/client';
import { cleanupTestDb } from '../helpers/testDb';
import { hashPassword } from '../../services/auth';
import { ACCOUNT_ROLES } from '../../types/account';

/**
 * Feature: account-management, Property 25: Password validation on direct set
 * Validates: Requirements 11.5
 * 
 * For any password provided to the direct password set operation,
 * the system should validate it meets minimum security requirements
 * and reject invalid passwords.
 */

describe('Property-Based Test: Password Validation on Direct Set', () => {
  let testPasswordHash: string;

  beforeAll(async () => {
    // Pre-hash password once to avoid expensive bcrypt operations
    testPasswordHash = await hashPassword('TestPassword123!');
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('should accept any password that meets minimum length requirement (8+ characters)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-valid'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          validPassword: fc.string({ minLength: 8, maxLength: 100 }),
        }),
        async ({ email, role, validPassword }) => {
          let accountId: string | null = null;

          try {
            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Property: Any password with 8+ characters should be accepted
            const result = await setUserPassword(account.id, validPassword);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Password updated successfully');

            // Verify the password was actually set
            const updatedAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(updatedAccount).not.toBeNull();
            expect(updatedAccount!.passwordHash).not.toBe(testPasswordHash);
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 60000);

  it('should reject any password shorter than 8 characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-valid'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          invalidPassword: fc.string({ minLength: 0, maxLength: 7 }),
        }),
        async ({ email, role, invalidPassword }) => {
          let accountId: string | null = null;

          try {
            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            const originalPasswordHash = account.passwordHash;

            // Property: Any password with less than 8 characters should be rejected
            await expect(setUserPassword(account.id, invalidPassword)).rejects.toThrow(
              'Password must be at least 8 characters'
            );

            // Property: Original password should remain unchanged after rejection
            const unchangedAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(unchangedAccount).not.toBeNull();
            expect(unchangedAccount!.passwordHash).toBe(originalPasswordHash);
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  it('should reject empty or null passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-valid'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
        }),
        async ({ email, role }) => {
          let accountId: string | null = null;

          try {
            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            const originalPasswordHash = account.passwordHash;

            // Property: Empty string should be rejected
            await expect(setUserPassword(account.id, '')).rejects.toThrow(
              'Password must be at least 8 characters'
            );

            // Property: Original password should remain unchanged
            const unchangedAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(unchangedAccount).not.toBeNull();
            expect(unchangedAccount!.passwordHash).toBe(originalPasswordHash);
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);

  it('should validate password length regardless of character composition', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-valid'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          // Generate passwords with various character types
          passwordType: fc.constantFrom(
            'numeric',
            'alphabetic',
            'alphanumeric',
            'special',
            'mixed',
            'unicode',
            'whitespace'
          ),
        }),
        async ({ email, role, passwordType }) => {
          let accountId: string | null = null;

          try {
            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Generate password based on type
            let validPassword: string;
            let invalidPassword: string;

            switch (passwordType) {
              case 'numeric':
                validPassword = '12345678'; // 8 digits
                invalidPassword = '1234567'; // 7 digits
                break;
              case 'alphabetic':
                validPassword = 'abcdefgh'; // 8 letters
                invalidPassword = 'abcdefg'; // 7 letters
                break;
              case 'alphanumeric':
                validPassword = 'abc12345'; // 8 chars
                invalidPassword = 'abc1234'; // 7 chars
                break;
              case 'special':
                validPassword = '!@#$%^&*'; // 8 special chars
                invalidPassword = '!@#$%^&'; // 7 special chars
                break;
              case 'mixed':
                validPassword = 'aB1!cD2@'; // 8 mixed chars
                invalidPassword = 'aB1!cD2'; // 7 mixed chars
                break;
              case 'unicode':
                validPassword = '你好世界测试密码'; // 8 unicode chars
                invalidPassword = '你好世界测试密'; // 7 unicode chars
                break;
              case 'whitespace':
                validPassword = 'pass word'; // 9 chars with space
                invalidPassword = 'pas wor'; // 7 chars with space
                break;
            }

            // Property: Valid password (8+ chars) should be accepted regardless of composition
            const result = await setUserPassword(account.id, validPassword);
            expect(result.success).toBe(true);

            // Reset password for next test
            await prisma.account.update({
              where: { id: account.id },
              data: { passwordHash: testPasswordHash },
            });

            // Property: Invalid password (<8 chars) should be rejected regardless of composition
            await expect(setUserPassword(account.id, invalidPassword)).rejects.toThrow(
              'Password must be at least 8 characters'
            );
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 60000);

  it('should validate password at exactly the boundary (8 characters)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-valid'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          // Generate exactly 8-character passwords
          exactPassword: fc.string({ minLength: 8, maxLength: 8 }),
        }),
        async ({ email, role, exactPassword }) => {
          let accountId: string | null = null;

          try {
            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            // Property: Exactly 8 characters should be accepted (boundary case)
            const result = await setUserPassword(account.id, exactPassword);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Password updated successfully');

            // Verify the password was actually set
            const updatedAccount = await prisma.account.findUnique({
              where: { id: account.id },
            });
            expect(updatedAccount).not.toBeNull();
            expect(updatedAccount!.passwordHash).not.toBe(testPasswordHash);
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 60000);

  it('should consistently validate passwords across multiple validation attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-valid'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          password: fc.string({ minLength: 0, maxLength: 20 }),
        }),
        async ({ email, role, password }) => {
          let accountId: string | null = null;

          try {
            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            const originalPasswordHash = account.passwordHash;
            const isValid = password.length >= 8;

            // Property: Validation should be consistent across multiple attempts
            for (let i = 0; i < 3; i++) {
              if (isValid) {
                const result = await setUserPassword(account.id, password);
                expect(result.success).toBe(true);

                // Reset for next iteration
                await prisma.account.update({
                  where: { id: account.id },
                  data: { passwordHash: testPasswordHash },
                });
              } else {
                await expect(setUserPassword(account.id, password)).rejects.toThrow(
                  'Password must be at least 8 characters'
                );

                // Verify password unchanged
                const unchangedAccount = await prisma.account.findUnique({
                  where: { id: account.id },
                });
                expect(unchangedAccount!.passwordHash).toBe(originalPasswordHash);
              }
            }
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 90000);

  it('should validate password before attempting to hash it', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: testEmailArbitrary('pwd-valid'),
          role: fc.constantFrom(...ACCOUNT_ROLES),
          invalidPassword: fc.string({ minLength: 0, maxLength: 7 }),
        }),
        async ({ email, role, invalidPassword }) => {
          let accountId: string | null = null;

          try {
            // Create an account
            const account = await prisma.account.create({
              data: {
                username: email,
                passwordHash: testPasswordHash,
                role: role,
                isActive: true,
              },
            });
            accountId = account.id;

            const startTime = Date.now();

            // Property: Validation should fail quickly without expensive hashing
            await expect(setUserPassword(account.id, invalidPassword)).rejects.toThrow(
              'Password must be at least 8 characters'
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Property: Validation should be fast (< 100ms) since it doesn't hash
            // Hashing with bcrypt typically takes 100-300ms
            expect(duration).toBeLessThan(100);
          } finally {
            // Cleanup
            if (accountId) {
              await prisma.account.delete({
                where: { id: accountId },
              }).catch(() => {
                // Ignore errors if already deleted
              });
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 30000);
});
