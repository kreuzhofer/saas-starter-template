import { disconnectTestDb, cleanupTestDb } from './helpers/testDb';
import { initializeI18n } from '../i18n/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://saas_starter:password@localhost:5433/saas_starter';

// Mock email service globally to prevent actual emails from being sent
jest.mock('../services/email', () => ({
  sendEmailConfirmation: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  sendEmailChangeConfirmation: jest.fn().mockResolvedValue(undefined),
  verifyEmailService: jest.fn().mockResolvedValue(true),
}));

// CRITICAL: Mock global fetch to prevent real HTTP requests
// This is a safety net - individual tests should mock fetch explicitly
// Returns a mock response instead of throwing to prevent test failures
const originalFetch = global.fetch;
global.fetch = jest.fn().mockImplementation((url: string) => {
  // Log warning about unmocked fetch call
  console.warn(
    `WARNING: Unmocked fetch call detected!\n` +
    `URL: ${url}\n` +
    `Tests should mock fetch() to prevent real HTTP requests.`
  );
  
  // Return a mock response to prevent socket hang up errors
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map([['content-type', 'text/html']]),
    text: () => Promise.resolve('<html><body>Mock page from setup.ts</body></html>'),
    json: () => Promise.resolve({}),
  });
}) as any;

// Increase timeout for database operations
jest.setTimeout(30000);

// Initialize i18n before all tests
beforeAll(async () => {
  await initializeI18n();
});

// Clean up and disconnect from database after all tests
afterAll(async () => {
  await cleanupTestDb();
  await disconnectTestDb();
});
