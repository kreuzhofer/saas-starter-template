import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as fc from 'fast-check';
import { registerTestEntity } from './testDb';

// Counter to ensure unique IDs even when Date.now() is the same
let uniqueCounter = 0;

/**
 * Generate a test email with a prefix and timestamp.
 * Use this instead of fc.emailAddress() to avoid weird random email patterns.
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${uniqueCounter++}@example.com`;
}

/**
 * Fast-check arbitrary for generating test emails with prefix-timestamp pattern.
 * Use this instead of fc.emailAddress() in property tests.
 */
export function testEmailArbitrary(prefix: string = 'test'): fc.Arbitrary<string> {
  return fc.constant(null).map(() => generateTestEmail(prefix));
}

/**
 * Create a test account
 */
export async function createTestAccount(
  db: PrismaClient,
  data: {
    username?: string;
    password?: string;
  } = {}
) {
  const username = data.username || `test-${Date.now()}-${uniqueCounter++}@example.com`;
  const password = data.password || 'password123';
  const passwordHash = await bcrypt.hash(password, 10);
  
  const account = await db.account.create({
    data: {
      username,
      passwordHash
    }
  });
  
  // Register this account for cleanup
  registerTestEntity('accounts', account.id);
  
  return { account, password };
}
