import { Request, Response, NextFunction } from 'express';
import { getI18n, supportedLanguages, SupportedLanguage } from '../i18n/config';
import logger from '../utils/logger';

// Extend Express Request type to include language and translation function
declare global {
  namespace Express {
    interface Request {
      language: SupportedLanguage;
      t: (key: string, options?: any) => string | any;
    }
  }
}

/**
 * Language Detection Middleware
 * Detects the user's preferred language from the Accept-Language header
 * and attaches a translation function to the request object
 */
export function languageDetection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const i18n = getI18n();
    
    // Detect language from Accept-Language header or query param
    const acceptLanguage = req.headers['accept-language'];
    const queryLang = req.query.lang as string | undefined;
    
    let detectedLang: SupportedLanguage = 'en';
    
    // Priority 1: Query parameter (for testing and explicit overrides)
    if (queryLang && supportedLanguages.includes(queryLang as any)) {
      detectedLang = queryLang as SupportedLanguage;
      logger.debug('Language detected from query parameter', {
        language: detectedLang,
        path: req.path,
      });
    }
    // Priority 2: Accept-Language header
    else if (acceptLanguage) {
      // Parse Accept-Language header (e.g., "de-DE,de;q=0.9,en;q=0.8")
      // Extract the first language code before any hyphen or semicolon
      const browserLang = acceptLanguage.split(',')[0].split('-')[0].split(';')[0].trim();
      
      if (supportedLanguages.includes(browserLang as any)) {
        detectedLang = browserLang as SupportedLanguage;
        logger.debug('Language detected from Accept-Language header', {
          language: detectedLang,
          acceptLanguage,
          path: req.path,
        });
      } else {
        logger.debug('Unsupported language in Accept-Language header, falling back to English', {
          requestedLanguage: browserLang,
          acceptLanguage,
          fallbackLanguage: 'en',
          path: req.path,
        });
      }
    } else {
      logger.debug('No language preference found, using default English', {
        path: req.path,
      });
    }
    
    // Attach language and translation function to request
    req.language = detectedLang;
    req.t = (key: string, options?: any) => {
      return i18n.t(key, {
        lng: detectedLang,
        ...options,
      });
    };
    
    next();
  } catch (error) {
    // If i18n is not initialized or any error occurs, fall back to English
    logger.error('Error in language detection middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    });
    
    // Set default values and continue
    req.language = 'en';
    req.t = (key: string) => key; // Fallback: return the key itself
    
    next();
  }
}
