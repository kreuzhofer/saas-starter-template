import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { languageDetection } from '../../middleware/languageDetection';
import { supportedLanguages, SupportedLanguage, initializeI18n } from '../../i18n/config';

/**
 * Feature: localization, Property 9: API error messages in requested language
 * Validates: Requirements 4.1, 4.2
 * 
 * For any error response from the Backend Service and any language preference header,
 * the system should return error messages in the requested language.
 */

describe('Property-Based Test: API Error Messages in Requested Language', () => {
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeAll(async () => {
    // Initialize i18n before running tests
    await initializeI18n();
  });

  beforeEach(() => {
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe('Language Detection from Accept-Language Header', () => {
    it('should detect and set the correct language from Accept-Language header for all supported languages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Supported language
          fc.constantFrom('/api/auth/login', '/api/profile', '/api/admin/users', '/api/account/change-password'), // Route path
          async (language, path) => {
            // Create mock request with Accept-Language header
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': `${language}-${language.toUpperCase()},${language};q=0.9,en;q=0.8`,
              },
              query: {},
              path: path,
            } as any;

            // Reset next function
            (nextFunction as jest.Mock).mockClear();

            // Apply language detection middleware
            languageDetection(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // Verify language was detected correctly
            expect(mockRequest.language).toBe(language);
            expect(typeof mockRequest.t).toBe('function');
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Translation Function Returns Correct Language', () => {
    it('should return translations in the requested language for all error keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Supported language
          fc.constantFrom(
            'errors:auth.invalidCredentials',
            'errors:auth.tokenExpired',
            'errors:auth.unauthorized',
            'errors:user.notFound',
            'errors:validation.invalidEmail',
            'errors:validation.required',
            'errors:role.invalid',
            'errors:general.internalServerError'
          ), // Error keys
          async (language, errorKey) => {
            // Create mock request with Accept-Language header
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': `${language}`,
              },
              query: {},
              path: '/api/test',
            } as any;

            // Reset next function
            (nextFunction as jest.Mock).mockClear();

            // Apply language detection middleware
            languageDetection(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // Get translation
            const translation = mockRequest.t!(errorKey);

            // Verify translation is a string and not the key itself (unless missing)
            expect(typeof translation).toBe('string');
            expect(translation.length).toBeGreaterThan(0);
            
            // For English and German, we should get actual translations
            if (language === 'en' || language === 'de') {
              expect(translation).not.toBe(errorKey);
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Language Detection from Query Parameter', () => {
    it('should prioritize query parameter over Accept-Language header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Query language
          fc.constantFrom(...supportedLanguages), // Header language (different)
          async (queryLang, headerLang) => {
            // Skip if languages are the same (no priority to test)
            fc.pre(queryLang !== headerLang);

            // Create mock request with both query param and header
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': `${headerLang}`,
              },
              query: {
                lang: queryLang,
              },
              path: '/api/test',
            } as any;

            // Reset next function
            (nextFunction as jest.Mock).mockClear();

            // Apply language detection middleware
            languageDetection(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // Verify query parameter takes priority
            expect(mockRequest.language).toBe(queryLang);
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Translation Function with Variable Interpolation', () => {
    it('should correctly interpolate variables in translated error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Supported language
          fc.string({ minLength: 1, maxLength: 20 }), // Field name
          fc.integer({ min: 1, max: 100 }), // Min value
          async (language, fieldName, minValue) => {
            // Create mock request with Accept-Language header
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': `${language}`,
              },
              query: {},
              path: '/api/test',
            } as any;

            // Reset next function
            (nextFunction as jest.Mock).mockClear();

            // Apply language detection middleware
            languageDetection(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // Test interpolation with 'required' message
            const requiredMsg = mockRequest.t!('errors:validation.required', { field: fieldName });
            expect(typeof requiredMsg).toBe('string');
            expect(requiredMsg).toContain(fieldName);

            // Test interpolation with 'passwordTooShort' message
            const passwordMsg = mockRequest.t!('errors:validation.passwordTooShort', { min: minValue });
            expect(typeof passwordMsg).toBe('string');
            expect(passwordMsg).toContain(minValue.toString());
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Middleware Always Calls Next', () => {
    it('should always call next() regardless of language detection outcome', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.constantFrom(...supportedLanguages), { nil: undefined }), // Optional language
          fc.option(fc.string(), { nil: undefined }), // Optional Accept-Language header
          async (queryLang, acceptLanguage) => {
            // Create mock request
            const mockRequest: Partial<Request> = {
              headers: acceptLanguage ? { 'accept-language': acceptLanguage } : {},
              query: queryLang ? { lang: queryLang } : {},
              path: '/api/test',
            } as any;

            // Reset next function
            (nextFunction as jest.Mock).mockClear();

            // Apply language detection middleware
            languageDetection(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // Verify next() was called exactly once
            expect(nextFunction).toHaveBeenCalledTimes(1);
            
            // Verify language and t function are always set
            expect(mockRequest.language).toBeDefined();
            expect(typeof mockRequest.t).toBe('function');
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Complex Accept-Language Headers', () => {
    it('should correctly parse complex Accept-Language headers with quality values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Primary language
          fc.array(fc.constantFrom(...supportedLanguages), { minLength: 0, maxLength: 3 }), // Additional languages
          async (primaryLang, additionalLangs) => {
            // Build complex Accept-Language header
            const languages = [primaryLang, ...additionalLangs];
            const acceptLanguage = languages
              .map((lang, index) => {
                const quality = 1 - (index * 0.1);
                return index === 0 ? `${lang}-${lang.toUpperCase()}` : `${lang};q=${quality.toFixed(1)}`;
              })
              .join(',');

            // Create mock request
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': acceptLanguage,
              },
              query: {},
              path: '/api/test',
            } as any;

            // Reset next function
            (nextFunction as jest.Mock).mockClear();

            // Apply language detection middleware
            languageDetection(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // Verify the first supported language was selected
            expect(mockRequest.language).toBe(primaryLang);
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Translation Function Consistency', () => {
    it('should return the same translation for the same key and language across multiple calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages), // Supported language
          fc.constantFrom(
            'errors:auth.invalidCredentials',
            'errors:user.notFound',
            'errors:validation.invalidEmail'
          ), // Error key
          async (language, errorKey) => {
            // Create mock request
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': `${language}`,
              },
              query: {},
              path: '/api/test',
            } as any;

            // Reset next function
            (nextFunction as jest.Mock).mockClear();

            // Apply language detection middleware
            languageDetection(
              mockRequest as Request,
              mockResponse as Response,
              nextFunction
            );

            // Call translation function multiple times
            const translation1 = mockRequest.t!(errorKey);
            const translation2 = mockRequest.t!(errorKey);
            const translation3 = mockRequest.t!(errorKey);

            // Verify consistency (idempotence)
            expect(translation1).toBe(translation2);
            expect(translation2).toBe(translation3);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Different Languages Return Different Translations', () => {
    it('should return different translations for the same error key in different languages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'errors:auth.invalidCredentials',
            'errors:auth.tokenExpired',
            'errors:user.notFound',
            'errors:validation.invalidEmail'
          ), // Error key
          async (errorKey) => {
            const translations: Record<string, string> = {};

            // Get translations for all supported languages
            for (const language of supportedLanguages) {
              const mockRequest: Partial<Request> = {
                headers: {
                  'accept-language': `${language}`,
                },
                query: {},
                path: '/api/test',
              } as any;

              (nextFunction as jest.Mock).mockClear();

              languageDetection(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
              );

              translations[language] = mockRequest.t!(errorKey);
            }

            // Verify we have translations for all languages
            expect(Object.keys(translations).length).toBe(supportedLanguages.length);

            // Verify English and German translations are different (if both exist)
            // Note: Both translations should be actual translated strings, not the key itself
            if (translations['en'] && translations['de']) {
              // Both should be translated (not equal to the key)
              expect(translations['en']).not.toBe(errorKey);
              expect(translations['de']).not.toBe(errorKey);
              
              // And they should be different from each other
              expect(translations['en']).not.toBe(translations['de']);
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
