import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import logger from '../utils/logger';

export const supportedLanguages = ['en', 'de'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

let i18nInstance: typeof i18next | null = null;

/**
 * Initialize the i18next instance with filesystem backend
 * This should be called once during server startup
 */
export async function initializeI18n(): Promise<typeof i18next> {
  if (i18nInstance) {
    return i18nInstance;
  }

  // Determine the correct path for locales based on environment
  // In production (dist/), locales are at dist/locales
  // In development (src/), locales are at src/locales
  const localesPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../locales')
    : path.join(__dirname, '../locales');

  logger.info('Initializing i18n', {
    localesPath,
    supportedLanguages,
    nodeEnv: process.env.NODE_ENV,
  });

  i18nInstance = i18next.createInstance();

  await i18nInstance
    .use(Backend)
    .init({
      fallbackLng: 'en',
      supportedLngs: supportedLanguages,
      preload: supportedLanguages, // Preload all supported languages
      defaultNS: 'errors',
      ns: ['errors', 'validation', 'emails'],
      
      backend: {
        loadPath: path.join(localesPath, '{{lng}}/{{ns}}.json'),
      },
      
      interpolation: {
        escapeValue: false, // Not needed for server-side
      },
      
      initImmediate: false,
      
      // Enable caching for performance
      cache: {
        enabled: true,
      },
      
      // Enable context support for gender-specific and other contextual translations
      contextSeparator: '_',
    });

  logger.info('i18n initialized successfully', {
    languages: i18nInstance.languages,
    namespaces: i18nInstance.options.ns,
  });

  return i18nInstance;
}

/**
 * Get the initialized i18n instance
 * Throws an error if i18n has not been initialized
 */
export function getI18n(): typeof i18next {
  if (!i18nInstance) {
    throw new Error('i18n has not been initialized. Call initializeI18n() first.');
  }
  return i18nInstance;
}

export default getI18n;
