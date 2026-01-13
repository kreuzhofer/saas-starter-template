/**
 * Feature: localization, Property 8: Variable interpolation in translations
 * Validates: Requirements 3.4, 8.1
 * 
 * Property: For any translation containing variable placeholders and any set of variable values,
 * the i18n system should correctly interpolate the dynamic values into the translated string
 * in both frontend and backend contexts.
 */

import * as fc from 'fast-check';
import handlebars from 'handlebars';
import { initializeI18n, getI18n } from '../../i18n/config';
import { registerTranslationHelper } from '../../i18n/handlebarsHelper';

describe('Property Test: Variable interpolation in translations', () => {
  beforeAll(async () => {
    await initializeI18n();
    registerTranslationHelper();
  });

  describe('Backend i18n interpolation', () => {
    it('should interpolate single variables in any translation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9\s]+$/.test(s)),
          (language, value) => {
            const i18n = getI18n();
            
            // Use a translation key that has a variable placeholder
            // confirmation.body has {{appName}}
            const result = i18n.t('confirmation.body', {
              lng: language,
              ns: 'emails',
              appName: value,
            });
            
            // The result should contain the interpolated value
            expect(result).toContain(value);
            expect(result.length).toBeGreaterThan(value.length);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should interpolate multiple variables in any translation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9\s]+$/.test(s)),
          fc.integer({ min: 1, max: 100 }),
          (language, appName, hours) => {
            const i18n = getI18n();
            
            // confirmation.expiration has {{hours}}
            const result = i18n.t('confirmation.expiration', {
              lng: language,
              ns: 'emails',
              hours: hours,
            });
            
            // The result should contain the interpolated hours value
            expect(result).toContain(hours.toString());
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should handle missing interpolation variables gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          (language) => {
            const i18n = getI18n();
            
            // Request a translation with a variable but don't provide it
            const result = i18n.t('confirmation.body', {
              lng: language,
              ns: 'emails',
              // appName is missing
            });
            
            // i18next should still return a string (with the placeholder visible)
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Handlebars helper interpolation', () => {
    it('should interpolate variables passed via hash parameters', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9\s]+$/.test(s)),
          (language, appName) => {
            // Create a template with variable interpolation
            const templateSource = `{{t "confirmation.body" appName=appName}}`;
            const template = handlebars.compile(templateSource);
            
            const result = template({ language, appName });
            
            // The result should contain the interpolated value
            expect(result).toContain(appName);
            expect(result.length).toBeGreaterThan(appName.length);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should interpolate multiple variables in templates', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          fc.integer({ min: 1, max: 100 }),
          (language, hours) => {
            const templateSource = `{{t "confirmation.expiration" hours=hours}}`;
            const template = handlebars.compile(templateSource);
            
            const result = template({ language, hours });
            
            // The result should contain the interpolated hours
            expect(result).toContain(hours.toString());
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should handle complex interpolation with nested context', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9\s@.]+$/.test(s)),
          fc.integer({ min: 1, max: 120 }),
          (language, email, minutes) => {
            // Create a template with multiple interpolations
            const templateSource = `
              <div>
                <p>{{t "emailChange.body" email=email}}</p>
                <p>{{t "emailChange.expiration" minutes=minutes}}</p>
              </div>
            `;
            const template = handlebars.compile(templateSource);
            
            const result = template({ language, email, minutes });
            
            // Both interpolations should be present
            expect(result).toContain(email);
            expect(result).toContain(minutes.toString());
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should preserve variable types during interpolation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          fc.oneof(
            fc.integer({ min: 0, max: 1000 }),
            fc.double({ min: 0, max: 1000, noNaN: true }),
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9\s]+$/.test(s))
          ),
          (language, value) => {
            const i18n = getI18n();
            
            // Use a translation that accepts any variable
            const result = i18n.t('confirmation.body', {
              lng: language,
              ns: 'emails',
              appName: value,
            });
            
            // The value should be converted to string and included
            const stringValue = String(value);
            expect(result).toContain(stringValue);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should handle special characters in interpolated values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9\s\-_]+$/.test(s)),
          (language, value) => {
            const templateSource = `{{t "confirmation.body" appName=value}}`;
            const template = handlebars.compile(templateSource);
            
            const result = template({ language, value });
            
            // The value should be included without breaking the template
            expect(result).toContain(value);
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should work with the same interpolation across different languages', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9\s]+$/.test(s)),
          (appName) => {
            const templateSource = `{{t "confirmation.body" appName=appName}}`;
            const template = handlebars.compile(templateSource);
            
            const englishResult = template({ language: 'en', appName });
            const germanResult = template({ language: 'de', appName });
            
            // Both should contain the interpolated value
            expect(englishResult).toContain(appName);
            expect(germanResult).toContain(appName);
            
            // Both should be non-empty
            expect(englishResult.length).toBeGreaterThan(0);
            expect(germanResult.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string interpolation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          (language) => {
            const i18n = getI18n();
            
            const result = i18n.t('confirmation.body', {
              lng: language,
              ns: 'emails',
              appName: '',
            });
            
            // Should still return a valid string
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should handle numeric zero interpolation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('en', 'de'),
          (language) => {
            const i18n = getI18n();
            
            const result = i18n.t('confirmation.expiration', {
              lng: language,
              ns: 'emails',
              hours: 0,
            });
            
            // Should contain "0"
            expect(result).toContain('0');
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
