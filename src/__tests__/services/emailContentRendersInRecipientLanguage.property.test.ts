/**
 * Feature: localization, Property 6: Email content renders in recipient's language
 * Validates: Requirements 3.1
 * 
 * Property: For any email type and recipient language preference, the Email Template System
 * should render the complete email content (subject and body) in the recipient's preferred
 * language using translation keys.
 */

import * as fc from 'fast-check';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { initializeI18n, getI18n } from '../../i18n/config';
import { registerTranslationHelper } from '../../i18n/handlebarsHelper';

// Email types that we support
const emailTypes = ['email-confirmation', 'password-reset', 'email-change-confirmation'] as const;
type EmailType = typeof emailTypes[number];

// Mapping of email types to their subject translation keys
const subjectKeys: Record<EmailType, string> = {
  'email-confirmation': 'emails:confirmation.subject',
  'password-reset': 'emails:passwordReset.subject',
  'email-change-confirmation': 'emails:emailChange.subject',
};

// Template cache
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Load and compile an email template
 */
async function loadTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
  if (templateCache.has(name)) {
    return templateCache.get(name)!;
  }

  const templatePath = path.join(__dirname, '../../templates', `${name}.hbs`);
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const compiled = handlebars.compile(templateContent);
  templateCache.set(name, compiled);

  return compiled;
}

describe('Property Test: Email content renders in recipient\'s language', () => {
  beforeAll(async () => {
    await initializeI18n();
    registerTranslationHelper();
  });

  it('should render email subject in the recipient\'s language', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...emailTypes),
        fc.constantFrom('en', 'de'),
        (emailType, language) => {
          const i18n = getI18n();
          const subjectKey = subjectKeys[emailType];
          
          // Get the translated subject
          const subject = i18n.t(subjectKey, { lng: language });
          
          // Subject should not be empty
          expect(subject).toBeTruthy();
          expect(subject.length).toBeGreaterThan(0);
          
          // Subject should not be the key itself
          expect(subject).not.toBe(subjectKey);
          
          // Subject should be a string
          expect(typeof subject).toBe('string');
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should render email body with translations in the recipient\'s language', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...emailTypes),
        fc.constantFrom('en', 'de'),
        async (emailType, language) => {
          const template = await loadTemplate(emailType);
          
          // Render the template with language context and sample data
          const html = template({
            language,
            email: 'test@example.com',
            confirmationLink: 'https://example.com/confirm?token=abc123',
            resetLink: 'https://example.com/reset?token=abc123',
            expirationHours: 24,
            expirationMinutes: 60,
          });
          
          // HTML should not be empty
          expect(html).toBeTruthy();
          expect(html.length).toBeGreaterThan(0);
          
          // HTML should contain actual content, not just template keys
          expect(html).not.toContain('{{t ');
          
          // HTML should be valid HTML (contains basic tags)
          expect(html).toMatch(/<html|<body|<div|<p|<h1|<h2/i);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should render different content for different languages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...emailTypes),
        async (emailType) => {
          const template = await loadTemplate(emailType);
          
          // Render in English
          const htmlEn = template({
            language: 'en',
            email: 'test@example.com',
            confirmationLink: 'https://example.com/confirm?token=abc123',
            resetLink: 'https://example.com/reset?token=abc123',
            expirationHours: 24,
            expirationMinutes: 60,
          });
          
          // Render in German
          const htmlDe = template({
            language: 'de',
            email: 'test@example.com',
            confirmationLink: 'https://example.com/confirm?token=abc123',
            resetLink: 'https://example.com/reset?token=abc123',
            expirationHours: 24,
            expirationMinutes: 60,
          });
          
          // Both should be non-empty
          expect(htmlEn).toBeTruthy();
          expect(htmlDe).toBeTruthy();
          
          // They should be different (different languages)
          expect(htmlEn).not.toBe(htmlDe);
          
          // Both should be valid HTML
          expect(htmlEn).toMatch(/<html|<body|<div|<p|<h1|<h2/i);
          expect(htmlDe).toMatch(/<html|<body|<div|<p|<h1|<h2/i);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should include app name from translations in email content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...emailTypes),
        fc.constantFrom('en', 'de'),
        async (emailType, language) => {
          const template = await loadTemplate(emailType);
          const i18n = getI18n();
          
          // Get the app name from translations
          const appName = i18n.t('emails:app.name', { lng: language });
          
          // Render the template
          const html = template({
            language,
            email: 'test@example.com',
            confirmationLink: 'https://example.com/confirm?token=abc123',
            resetLink: 'https://example.com/reset?token=abc123',
            expirationHours: 24,
            expirationMinutes: 60,
          });
          
          // The rendered HTML should contain the app name
          expect(html).toContain(appName);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should handle variable interpolation in email templates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...emailTypes),
        fc.constantFrom('en', 'de'),
        fc.integer({ min: 1, max: 48 }),
        async (emailType, language, hours) => {
          const template = await loadTemplate(emailType);
          
          // Use a simple URL without special characters that need escaping
          const link = 'https://example.com/confirm/abc123';
          
          // Render with specific values
          const html = template({
            language,
            email: 'test@example.com',
            confirmationLink: link,
            resetLink: link,
            expirationHours: hours,
            expirationMinutes: hours * 60,
          });
          
          // The rendered HTML should contain the interpolated link
          // (URLs without query params don't get escaped)
          expect(html).toContain(link);
          
          // Should contain the hours or minutes value (as string)
          // Different templates use different time units
          const containsHours = html.includes(hours.toString());
          const containsMinutes = html.includes((hours * 60).toString());
          expect(containsHours || containsMinutes).toBe(true);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should default to English when language is not specified', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...emailTypes),
        async (emailType) => {
          const template = await loadTemplate(emailType);
          
          // Render without language
          const htmlNoLang = template({
            email: 'test@example.com',
            confirmationLink: 'https://example.com/confirm?token=abc123',
            resetLink: 'https://example.com/reset?token=abc123',
            expirationHours: 24,
            expirationMinutes: 60,
          });
          
          // Render with explicit English
          const htmlEn = template({
            language: 'en',
            email: 'test@example.com',
            confirmationLink: 'https://example.com/confirm?token=abc123',
            resetLink: 'https://example.com/reset?token=abc123',
            expirationHours: 24,
            expirationMinutes: 60,
          });
          
          // Both should produce the same result (English)
          expect(htmlNoLang).toBe(htmlEn);
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });

  it('should render subject and body consistently in the same language', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...emailTypes),
        fc.constantFrom('en', 'de'),
        (emailType, language) => {
          const i18n = getI18n();
          const subjectKey = subjectKeys[emailType];
          
          // Get the translated subject
          const subject = i18n.t(subjectKey, { lng: language });
          
          // Verify subject is in the correct language by checking it's not empty
          // and doesn't contain the key
          expect(subject).toBeTruthy();
          expect(subject).not.toBe(subjectKey);
          
          // For German, subject should contain German-specific characters or words
          // For English, it should be in English
          if (language === 'de') {
            // German subjects should contain German text
            // We can check for common German words or characters
            const germanIndicators = ['Bestätigen', 'Ihre', 'Sie', 'Zurücksetzen', 'Änderung'];
            const hasGermanIndicator = germanIndicators.some(indicator => 
              subject.includes(indicator)
            );
            expect(hasGermanIndicator).toBe(true);
          } else {
            // English subjects should contain English text
            const englishIndicators = ['Confirm', 'Your', 'Reset', 'Change', 'Email', 'Password'];
            const hasEnglishIndicator = englishIndicators.some(indicator => 
              subject.includes(indicator)
            );
            expect(hasEnglishIndicator).toBe(true);
          }
        }
      ),
      { numRuns: 3 } // Reduced for faster test execution
    );
  });
});
