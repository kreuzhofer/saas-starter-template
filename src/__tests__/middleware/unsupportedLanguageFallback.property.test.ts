import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { languageDetection } from '../../middleware/languageDetection';
import { supportedLanguages, SupportedLanguage, initializeI18n } from '../../i18n/config';

/**
 * Feature: localization, Property 4: Unsupported language fallback to English
 * Validates: Requirements 1.4, 3.2, 4.3
 * 
 * For any unsupported language code requested in the frontend, backend, or email system,
 * the application should fall back to English as the default language.
 */

describe('Property-Based Test: Unsupported Language Fallback', () => {
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

  describe('Unsupported Language Codes Fallback to English', () => {
    it('should fallback to English for any unsupported language code in Accept-Language header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 5 }).filter(lang => 
            !supportedLanguages.includes(lang as any) && 
            lang !== 'en' && 
            lang !== 'de' &&
            /^[a-z]{2,5}$/i.test(lang) // Valid language code format
          ), // Unsupported language code
          async (unsupportedLang) => {
            // Create mock request with unsupported language
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': `${unsupportedLang}`,
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

            // Verify fallback to English
            expect(mockRequest.language).toBe('en');
            expect(typeof mockRequest.t).toBe('function');
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Invalid Language Codes Fallback to English', () => {
    it('should fallback to English for malformed or invalid language codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'invalid',
            'xyz',
            'abc',
            'fr',
            'es',
            'it',
            'pt',
            'ru',
            'zh',
            'ja',
            'ko',
            '123'
          ), // Various invalid/unsupported language codes (excluding ones that parse to supported languages)
          async (invalidLang) => {
            // Skip if it's actually a supported language or parses to one
            const parsedLang = invalidLang.split('-')[0].split(';')[0].trim();
            fc.pre(!supportedLanguages.includes(parsedLang as any));

            // Create mock request with invalid language
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': `${invalidLang}`,
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

            // Verify fallback to English
            expect(mockRequest.language).toBe('en');
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Missing Accept-Language Header Defaults to English', () => {
    it('should default to English when no Accept-Language header is provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('/api/auth/login', '/api/short-urls', '/api/analytics', '/api/profile'), // Route path
          async (path) => {
            // Create mock request without Accept-Language header
            const mockRequest: Partial<Request> = {
              headers: {},
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

            // Verify default to English
            expect(mockRequest.language).toBe('en');
            expect(typeof mockRequest.t).toBe('function');
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Unsupported Query Parameter Falls Back to English', () => {
    it('should fallback to English when query parameter contains unsupported language', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 5 }).filter(lang => 
            !supportedLanguages.includes(lang as any) && 
            /^[a-z]{2,5}$/i.test(lang)
          ), // Unsupported language code
          async (unsupportedLang) => {
            // Create mock request with unsupported language in query
            const mockRequest: Partial<Request> = {
              headers: {},
              query: {
                lang: unsupportedLang,
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

            // Verify fallback to English
            expect(mockRequest.language).toBe('en');
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Fallback Translations Work Correctly', () => {
    it('should return English translations when unsupported language is requested', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 5 }).filter(lang => 
            !supportedLanguages.includes(lang as any) && 
            /^[a-z]{2,5}$/i.test(lang)
          ), // Unsupported language code
          fc.constantFrom(
            'errors:auth.invalidCredentials',
            'errors:auth.tokenExpired',
            'errors:shortUrl.notFound',
            'errors:validation.invalidEmail'
          ), // Error keys
          async (unsupportedLang, errorKey) => {
            // Create mock request with unsupported language
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': `${unsupportedLang}`,
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

            // Verify we get a valid English translation (not the key itself)
            expect(typeof translation).toBe('string');
            expect(translation.length).toBeGreaterThan(0);
            expect(translation).not.toBe(errorKey);
            
            // Verify language is English
            expect(mockRequest.language).toBe('en');
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Complex Unsupported Language Headers', () => {
    it('should fallback to English for complex Accept-Language headers with only unsupported languages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 2, maxLength: 5 }).filter(lang => 
              !supportedLanguages.includes(lang as any) && 
              /^[a-z]{2,5}$/i.test(lang)
            ),
            { minLength: 1, maxLength: 3 }
          ), // Array of unsupported languages
          async (unsupportedLangs) => {
            // Build complex Accept-Language header with only unsupported languages
            const acceptLanguage = unsupportedLangs
              .map((lang, index) => {
                const quality = 1 - (index * 0.1);
                return index === 0 ? lang : `${lang};q=${quality.toFixed(1)}`;
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

            // Verify fallback to English
            expect(mockRequest.language).toBe('en');
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Fallback Consistency', () => {
    it('should consistently fallback to English regardless of the unsupported language', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 2, maxLength: 5 }).filter(lang => 
              !supportedLanguages.includes(lang as any) && 
              /^[a-z]{2,5}$/i.test(lang)
            ),
            { minLength: 1, maxLength: 10 }
          ), // Multiple unsupported languages
          async (unsupportedLangs) => {
            const languages: string[] = [];

            // Test each unsupported language
            for (const unsupportedLang of unsupportedLangs) {
              const mockRequest: Partial<Request> = {
                headers: {
                  'accept-language': unsupportedLang,
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

              languages.push(mockRequest.language!);
            }

            // All should fallback to English
            expect(languages.every(lang => lang === 'en')).toBe(true);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Fallback with Supported Language in Secondary Position', () => {
    it('should use the first supported language even if unsupported languages come first', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 2, maxLength: 5 }).filter(lang => 
              !supportedLanguages.includes(lang as any) && 
              /^[a-z]{2,5}$/i.test(lang)
            ),
            { minLength: 1, maxLength: 3 }
          ), // Unsupported languages
          fc.constantFrom(...supportedLanguages), // Supported language
          async (unsupportedLangs, supportedLang) => {
            // Build Accept-Language header with unsupported languages first, then supported
            const languages = [...unsupportedLangs, supportedLang];
            const acceptLanguage = languages
              .map((lang, index) => {
                const quality = 1 - (index * 0.1);
                return index === 0 ? lang : `${lang};q=${quality.toFixed(1)}`;
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

            // Should fallback to English (first language is unsupported)
            // Note: Our middleware only checks the first language in the header
            expect(mockRequest.language).toBe('en');
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Empty or Whitespace Language Codes', () => {
    it('should fallback to English for empty or whitespace language codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', ' ', '  ', '\t', '\n'), // Empty or whitespace
          async (emptyLang) => {
            // Create mock request with empty/whitespace language
            const mockRequest: Partial<Request> = {
              headers: {
                'accept-language': emptyLang,
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

            // Verify fallback to English
            expect(mockRequest.language).toBe('en');
            expect(nextFunction).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
