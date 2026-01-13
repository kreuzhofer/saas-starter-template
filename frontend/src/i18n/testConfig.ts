import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files directly for testing
import enCommon from '../../public/locales/en/common.json';
import enPages from '../../public/locales/en/pages.json';
import enErrors from '../../public/locales/en/errors.json';
import deCommon from '../../public/locales/de/common.json';
import dePages from '../../public/locales/de/pages.json';
import deErrors from '../../public/locales/de/errors.json';

export const supportedLanguages = ['en', 'de'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
};

// Create a new i18n instance for testing
const testI18n = i18n.createInstance();

testI18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    defaultNS: 'common',
    ns: ['common', 'pages', 'errors'],
    
    // Use resources directly instead of HTTP backend
    resources: {
      en: {
        common: enCommon,
        pages: enPages,
        errors: enErrors,
      },
      de: {
        common: deCommon,
        pages: dePages,
        errors: deErrors,
      },
    },
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    react: {
      useSuspense: false, // Disable suspense for testing
    },
    
    // Preload only the default language
    preload: ['en'],
    
    // Disable language detection for tests
    detection: {
      order: [],
      caches: [],
    },
  });

export default testI18n;
