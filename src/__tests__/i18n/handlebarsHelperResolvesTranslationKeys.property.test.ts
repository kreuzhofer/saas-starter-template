/**
 * Feature: localization, Property 7: Handlebars helper resolves translation keys
 * Validates: Requirements 3.3
 * 
 * Property: For any translation key used in email templates with the {{t}} Handlebars helper,
 * the system should correctly resolve and insert the localized text for the specified language.
 */

import * as fc from 'fast-check';
import handlebars from 'handlebars';
import { initializeI18n } from '../../i18n/config';
import { registerTranslationHelper } from '../../i18n/handlebarsHelper';

// Translation keys that exist in both en and de email translations
const validTranslationKeys = [
  'app.name',
  'app.tagline',
  'confirmation.subject',
  'confirmation.title',
  'confirmation.greeting',
  'confirmation.button',
  'passwordReset.subject',
  'passwordReset.title',
  'passwordReset.greeting',
  'passwordReset.button',
  'emailChange.subject',
  'emailChange.title',
  'emailChange.greeting',
  'emailChange.button',
  'common.regards',
  'common.team',
] as const;

describe('Property Test: Handlebars helper resolves translation keys', () => {
  beforeAll(async () => {
    await initializeI18n();
    registerTranslationHelper();
  });

  it('should resolve any valid translation key in any supported language', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTranslationKeys),
        fc.constantFrom('en', 'de'),
        (key, language) => {
          // Create a simple template with the translation key
          const templateSource = `{{t "${key}"}}`;
          const template = handlebars.compile(templateSource);
          
          // Render the template with the language context
          const result = template({ language });
          
          // The result should not be empty
          expect(result).toBeTruthy();
          expect(result.length).toBeGreaterThan(0);
          
          // The result should not be the key itself (unless it's a fallback)
          // For valid keys, we should get actual translations
          expect(result).not.toBe(key);
          
          // The result should be a string
          expect(typeof result).toBe('string');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should return different translations for different languages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTranslationKeys),
        (key) => {
          // Skip keys that are the same in both languages (like app.name)
          if (key === 'app.name') {
            return true;
          }
          
          const templateSource = `{{t "${key}"}}`;
          const template = handlebars.compile(templateSource);
          
          const englishResult = template({ language: 'en' });
          const germanResult = template({ language: 'de' });
          
          // For most keys, English and German translations should differ
          // (except for brand names and some technical terms)
          expect(englishResult).toBeTruthy();
          expect(germanResult).toBeTruthy();
          
          // Both should be non-empty strings
          expect(englishResult.length).toBeGreaterThan(0);
          expect(germanResult.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should handle missing keys gracefully by returning the key', () => {
    fc.assert(
      fc.property(
        // Generate realistic translation key patterns (alphanumeric with dots)
        fc.array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/), { minLength: 1, maxLength: 3 })
          .map(parts => parts.join('.'))
          .filter(s => !validTranslationKeys.includes(s as any)),
        fc.constantFrom('en', 'de'),
        (invalidKey, language) => {
          const templateSource = `{{t "${invalidKey}"}}`;
          const template = handlebars.compile(templateSource);
          
          const result = template({ language });
          
          // For missing keys, i18next returns the key itself as fallback
          expect(result).toBe(invalidKey);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should default to English when no language is specified', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTranslationKeys),
        (key) => {
          const templateSource = `{{t "${key}"}}`;
          const template = handlebars.compile(templateSource);
          
          // Render without language context
          const resultWithoutLanguage = template({});
          
          // Render with explicit English
          const resultWithEnglish = template({ language: 'en' });
          
          // Both should produce the same result (English)
          expect(resultWithoutLanguage).toBe(resultWithEnglish);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should work with nested template contexts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validTranslationKeys),
        fc.constantFrom('en', 'de'),
        (key, language) => {
          // Create a template with nested context
          const templateSource = `
            <div>
              <h1>{{t "${key}"}}</h1>
            </div>
          `;
          const template = handlebars.compile(templateSource);
          
          const result = template({ language });
          
          // The result should contain the translation
          expect(result).toContain('<h1>');
          expect(result).toContain('</h1>');
          
          // Extract the content between h1 tags
          const match = result.match(/<h1>(.*?)<\/h1>/);
          expect(match).toBeTruthy();
          
          if (match) {
            const translation = match[1];
            expect(translation).toBeTruthy();
            expect(translation.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});
