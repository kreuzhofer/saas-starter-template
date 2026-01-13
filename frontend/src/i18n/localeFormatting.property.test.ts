import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Feature: localization, Property 13: Locale-specific formatting
 * Validates: Requirements 8.3
 * 
 * For any date or number value formatted for display, the i18n library should 
 * apply locale-appropriate formatting conventions (e.g., "1.234,56" for German 
 * vs "1,234.56" for English).
 */

const supportedLanguages = ['en', 'de'] as const;

describe('Property-Based Test: Locale-Specific Formatting', () => {
  describe('Number Formatting', () => {
    it('should format numbers with locale-appropriate thousand separators', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          fc.integer({ min: 1000, max: 999999 }), // Numbers with thousands
          async (language, number) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                interpolation: {
                  escapeValue: false,
                  format: (value, format, lng) => {
                    if (format === 'number' && typeof value === 'number') {
                      return new Intl.NumberFormat(lng).format(value);
                    }
                    return value;
                  },
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Format the number using Intl.NumberFormat
            const formatted = new Intl.NumberFormat(language).format(number);

            // Verify locale-specific formatting
            if (language === 'en') {
              // English uses comma as thousand separator
              expect(formatted).toMatch(/\d{1,3}(,\d{3})+/);
            } else if (language === 'de') {
              // German uses period as thousand separator
              expect(formatted).toMatch(/\d{1,3}(\.\d{3})+/);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should format decimal numbers with locale-appropriate decimal separators', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          fc.float({ min: Math.fround(0.01), max: Math.fround(9999.99), noNaN: true }), // Decimal numbers
          async (language, number) => {
            // Create a fresh i18n instance for this test
            const testI18n = i18n.createInstance();

            await testI18n
              .use(initReactI18next)
              .init({
                lng: language,
                fallbackLng: 'en',
                supportedLngs: supportedLanguages,
                defaultNS: 'common',
                ns: ['common'],
                
                interpolation: {
                  escapeValue: false,
                  format: (value, format, lng) => {
                    if (format === 'number' && typeof value === 'number') {
                      return new Intl.NumberFormat(lng, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(value);
                    }
                    return value;
                  },
                },
                
                react: {
                  useSuspense: false,
                },
              });

            // Format the number with 2 decimal places
            const formatted = new Intl.NumberFormat(language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(number);

            // Verify locale-specific decimal separator
            if (language === 'en') {
              // English uses period as decimal separator
              expect(formatted).toContain('.');
            } else if (language === 'de') {
              // German uses comma as decimal separator
              expect(formatted).toContain(',');
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should format large numbers with both thousand and decimal separators correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          fc.float({ min: Math.fround(1000.01), max: Math.fround(999999.99), noNaN: true }), // Large decimal numbers
          async (language, number) => {
            // Format the number with 2 decimal places
            const formatted = new Intl.NumberFormat(language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(number);

            // Verify locale-specific formatting
            if (language === 'en') {
              // English: comma for thousands, period for decimals (e.g., "1,234.56")
              expect(formatted).toMatch(/\d{1,3}(,\d{3})*\.\d{2}/);
            } else if (language === 'de') {
              // German: period for thousands, comma for decimals (e.g., "1.234,56")
              expect(formatted).toMatch(/\d{1,3}(\.\d{3})*,\d{2}/);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Date Formatting', () => {
    it('should format dates with locale-appropriate conventions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
          async (language, date) => {
            // Format the date using Intl.DateTimeFormat
            const formatted = new Intl.DateTimeFormat(language, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }).format(date);

            // Verify the formatted date is not empty
            expect(formatted.length).toBeGreaterThan(0);
            
            // Verify the date contains the year
            expect(formatted).toContain(date.getFullYear().toString());
            
            // Verify locale-specific month names
            if (language === 'en') {
              // English month names
              const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 
                                     'July', 'August', 'September', 'October', 'November', 'December'];
              const hasEnglishMonth = englishMonths.some(month => formatted.includes(month));
              expect(hasEnglishMonth).toBe(true);
            } else if (language === 'de') {
              // German month names
              const germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                                    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
              const hasGermanMonth = germanMonths.some(month => formatted.includes(month));
              expect(hasGermanMonth).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should format short dates with locale-appropriate conventions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
          async (language, date) => {
            // Format the date using Intl.DateTimeFormat with short format
            const formatted = new Intl.DateTimeFormat(language, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(date);

            // Verify the formatted date is not empty
            expect(formatted.length).toBeGreaterThan(0);
            
            // Verify the date contains the year
            expect(formatted).toContain(date.getFullYear().toString());
            
            // Verify locale-specific date format
            if (language === 'en') {
              // English typically uses MM/DD/YYYY format
              expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
            } else if (language === 'de') {
              // German typically uses DD.MM.YYYY format
              expect(formatted).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should format date and time with locale-appropriate conventions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
          async (language, date) => {
            // Format the date and time using Intl.DateTimeFormat
            const formatted = new Intl.DateTimeFormat(language, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(date);

            // Verify the formatted date is not empty
            expect(formatted.length).toBeGreaterThan(0);
            
            // Verify the date contains the year
            expect(formatted).toContain(date.getFullYear().toString());
            
            // Verify time is included (contains colon for time separator)
            expect(formatted).toContain(':');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Currency Formatting', () => {
    it('should format currency with locale-appropriate conventions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          fc.float({ min: Math.fround(0.01), max: Math.fround(99999.99), noNaN: true }),
          async (language, amount) => {
            // Format as currency (USD for English, EUR for German)
            const currency = language === 'en' ? 'USD' : 'EUR';
            const formatted = new Intl.NumberFormat(language, {
              style: 'currency',
              currency: currency,
            }).format(amount);

            // Verify the formatted currency is not empty
            expect(formatted.length).toBeGreaterThan(0);
            
            // Verify currency symbol is present
            if (language === 'en') {
              expect(formatted).toContain('$');
            } else if (language === 'de') {
              expect(formatted).toContain('€');
            }
            
            // Verify locale-specific number formatting within currency
            if (language === 'en' && amount >= 1000) {
              // English uses comma as thousand separator
              expect(formatted).toMatch(/\$\d{1,3}(,\d{3})*/);
            } else if (language === 'de' && amount >= 1000) {
              // German uses period as thousand separator
              expect(formatted).toMatch(/\d{1,3}(\.\d{3})*,\d{2}\s*€/);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Percentage Formatting', () => {
    it('should format percentages with locale-appropriate conventions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          fc.float({ min: 0, max: 1, noNaN: true }),
          async (language, value) => {
            // Format as percentage
            const formatted = new Intl.NumberFormat(language, {
              style: 'percent',
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }).format(value);

            // Verify the formatted percentage is not empty
            expect(formatted.length).toBeGreaterThan(0);
            
            // Verify percentage symbol is present
            expect(formatted).toContain('%');
            
            // Verify locale-specific decimal separator
            if (value > 0 && value < 1) {
              if (language === 'en') {
                // English uses period as decimal separator
                expect(formatted).toMatch(/\d+\.\d+\s*%/);
              } else if (language === 'de') {
                // German uses comma as decimal separator
                expect(formatted).toMatch(/\d+,\d+\s*%/);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Cross-Locale Formatting Consistency', () => {
    it('should produce different formatted output for same value in different locales', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: Math.fround(1000.01), max: Math.fround(9999.99), noNaN: true }),
          async (number) => {
            // Format the same number in both locales
            const enFormatted = new Intl.NumberFormat('en', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(number);
            
            const deFormatted = new Intl.NumberFormat('de', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(number);

            // The formatted strings should be different due to locale conventions
            expect(enFormatted).not.toBe(deFormatted);
            
            // English should use comma for thousands, period for decimals
            expect(enFormatted).toMatch(/\d{1,3},\d{3}\.\d{2}/);
            
            // German should use period for thousands, comma for decimals
            expect(deFormatted).toMatch(/\d{1,3}\.\d{3},\d{2}/);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should maintain numeric value equivalence across locale formatting', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          fc.float({ min: Math.fround(0.01), max: Math.fround(999999.99), noNaN: true }),
          async (language, number) => {
            // Format the number
            const formatted = new Intl.NumberFormat(language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(number);

            // Parse the formatted string back to a number
            // Remove locale-specific separators
            let normalized = formatted;
            if (language === 'en') {
              normalized = formatted.replace(/,/g, ''); // Remove thousand separators
            } else if (language === 'de') {
              normalized = formatted.replace(/\./g, '').replace(',', '.'); // Convert to standard format
            }
            
            const parsed = parseFloat(normalized);
            
            // The parsed value should be close to the original (within rounding error)
            expect(Math.abs(parsed - number)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
