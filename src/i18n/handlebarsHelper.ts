import handlebars from 'handlebars';
import { getI18n } from './config';
import logger from '../utils/logger';

/**
 * Register the translation helper for Handlebars templates
 * This allows email templates to use {{t "key"}} syntax for translations
 */
export function registerTranslationHelper(): void {
  handlebars.registerHelper('t', function(this: any, key: string, options?: any) {
    try {
      const i18n = getI18n();
      
      // Get language from template context (passed via data.root.language)
      const language = options?.data?.root?.language || 'en';
      
      // Get interpolation parameters from hash (e.g., {{t "key" param1="value1"}})
      const params = options?.hash || {};
      
      // Translate the key with the specified language and namespace
      const translation = i18n.t(key, {
        lng: language,
        ns: 'emails',
        ...params,
      });
      
      return translation;
    } catch (error) {
      logger.error('Translation helper error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Return the key itself as fallback
      return key;
    }
  });
  
  logger.info('Handlebars translation helper registered');
}
