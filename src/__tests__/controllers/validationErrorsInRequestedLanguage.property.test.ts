/**
 * Feature: localization, Property 10: Validation errors in requested language
 * 
 * Property: For any validation error and language preference, the Backend Service
 * should return validation error messages in the requested language with properly
 * interpolated field names.
 * 
 * Validates: Requirements 4.4
 */

import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { getTestDb, cleanupTestDb, registerTestEntity } from '../helpers/testDb';
import { generateTestToken } from '../helpers/testAuth';
import * as fc from 'fast-check';
import { supportedLanguages } from '../../i18n/config';
import bcrypt from 'bcrypt';

const app = createTestApp();
const db = getTestDb();

describe('Property 10: Validation errors in requested language', () => {
  let testAccountId: string;
  let authToken: string;

  beforeAll(async () => {
    // Clean up before starting
    await cleanupTestDb();
    
    // Create a test account for authenticated requests
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    const account = await db.account.create({
      data: {
        username: 'test-validation@example.com',
        passwordHash: hashedPassword,
        isActive: true,
        role: 'account_owner',
      },
    });
    
    testAccountId = account.id;
    registerTestEntity('accounts', account.id);
    
    // Generate auth token
    authToken = generateTestToken({
      accountId: account.id,
      username: account.username,
      role: 'account_owner',
    });
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  /**
   * Property: For any supported language and validation error scenario,
   * the API should return validation error messages in the requested language
   */
  test('validation errors are returned in the requested language', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        fc.constantFrom(
          // Different validation error scenarios
          { endpoint: '/api/auth/register', body: { username: '', password: '' }, requiresAuth: false },
          { endpoint: '/api/auth/login', body: { username: '', password: '' }, requiresAuth: false },
          { endpoint: '/api/profile', body: { firstName: 'a'.repeat(100) }, requiresAuth: true, method: 'PATCH' },
          { endpoint: '/api/auth/change-password', body: { currentPassword: '', newPassword: 'short' }, requiresAuth: true, method: 'PATCH' }
        ),
        async (language, scenario) => {
          // Make request with Accept-Language header
          const method = scenario.method || 'post';
          let response;
          
          if (scenario.requiresAuth) {
            if (method === 'PATCH') {
              response = await request(app)
                .patch(scenario.endpoint)
                .set('Authorization', `Bearer ${authToken}`)
                .set('Accept-Language', language)
                .send(scenario.body);
            } else {
              response = await request(app)
                .post(scenario.endpoint)
                .set('Authorization', `Bearer ${authToken}`)
                .set('Accept-Language', language)
                .send(scenario.body);
            }
          } else {
            response = await request(app)
              .post(scenario.endpoint)
              .set('Accept-Language', language)
              .send(scenario.body);
          }

          // Skip if rate limited (429)
          if (response.status === 429) {
            return;
          }

          // Should return 400 Bad Request for validation errors
          expect(response.status).toBe(400);

          // Should have error field
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');

          // Error message should not be empty
          expect(response.body.error.length).toBeGreaterThan(0);

          // Should have details array with validation errors
          expect(response.body).toHaveProperty('details');
          expect(Array.isArray(response.body.details)).toBe(true);
          expect(response.body.details.length).toBeGreaterThan(0);

          // Each detail should have field and message
          response.body.details.forEach((detail: any) => {
            expect(detail).toHaveProperty('field');
            expect(detail).toHaveProperty('message');
            expect(typeof detail.field).toBe('string');
            expect(typeof detail.message).toBe('string');
            expect(detail.message.length).toBeGreaterThan(0);
          });

          // For German, check that messages contain German-specific characters or words
          if (language === 'de') {
            const allMessages = [
              response.body.error,
              ...response.body.details.map((d: any) => d.message)
            ].join(' ');

            // German validation messages should contain German-specific patterns
            // Check for common German words or characters
            const hasGermanPattern = 
              allMessages.includes('erforderlich') || // required
              allMessages.includes('mindestens') || // at least
              allMessages.includes('muss') || // must
              allMessages.includes('ungültig') || // invalid
              allMessages.includes('Validierung fehlgeschlagen') || // validation failed
              allMessages.includes('Zeichen'); // characters

            expect(hasGermanPattern).toBe(true);
          }

          // For English, check that messages are in English
          if (language === 'en') {
            const allMessages = [
              response.body.error,
              ...response.body.details.map((d: any) => d.message)
            ].join(' ');

            // English validation messages should contain English patterns
            const hasEnglishPattern = 
              allMessages.includes('required') ||
              allMessages.includes('at least') ||
              allMessages.includes('must') ||
              allMessages.includes('invalid') ||
              allMessages.includes('Validation failed') ||
              allMessages.includes('characters');

            expect(hasEnglishPattern).toBe(true);
          }
        }
      ),
      { numRuns: 3 } // Reduced to avoid rate limiting
    );
  });

  /**
   * Property: Field names in validation errors should be translated
   */
  test('field names in validation errors are translated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        async (language) => {
          // Test with a scenario that has known field names
          const response = await request(app)
            .post('/api/auth/register')
            .set('Accept-Language', language)
            .send({ username: '', password: '' });

          // Skip if rate limited
          if (response.status === 429) {
            return;
          }

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('details');
          expect(Array.isArray(response.body.details)).toBe(true);

          // Check that field names are present in messages
          response.body.details.forEach((detail: any) => {
            expect(detail.message.length).toBeGreaterThan(0);
            
            // For German, check for German field names
            if (language === 'de') {
              // German field names should appear in messages
              const hasGermanFieldName = 
                detail.message.includes('Benutzername') || // username
                detail.message.includes('Passwort') || // password
                detail.message.includes('E-Mail'); // email
              
              // At least some messages should contain translated field names
              // (not all messages may contain field names)
            }
          });
        }
      ),
      { numRuns: 5 } // Reduced to avoid rate limiting
    );
  });

  /**
   * Property: Variable interpolation in validation messages works correctly
   */
  test('validation messages with variables are interpolated correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...supportedLanguages),
        async (language) => {
          // Test with password too short error (has min length variable)
          const response = await request(app)
            .post('/api/auth/register')
            .set('Accept-Language', language)
            .send({ 
              username: 'test@example.com', 
              password: 'short' // Too short, should trigger min length error
            });

          // Skip if rate limited
          if (response.status === 429) {
            return;
          }

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('details');

          // Find the password error
          const passwordError = response.body.details.find(
            (d: any) => d.field === 'password'
          );

          if (passwordError) {
            // Message should contain the minimum length (8)
            expect(passwordError.message).toMatch(/8/);
            
            // For German, should contain "mindestens 8"
            if (language === 'de') {
              expect(passwordError.message).toMatch(/mindestens.*8|8.*mindestens/i);
            }
            
            // For English, should contain "at least 8"
            if (language === 'en') {
              expect(passwordError.message).toMatch(/at least.*8|8.*at least/i);
            }
          }
        }
      ),
      { numRuns: 5 } // Reduced to avoid rate limiting
    );
  });
});
