import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface UseDocumentTitleOptions {
  ns?: string;
}

/**
 * Custom hook that updates the document title with a translated string.
 * The title automatically updates when the language changes.
 * 
 * @param titleKey - The translation key for the page title
 * @param options - Optional configuration object
 * @param options.ns - The namespace to use (defaults to 'pages')
 * 
 * @example
 * // In a page component
 * useDocumentTitle('login.title');
 * 
 * @example
 * // With custom namespace
 * useDocumentTitle('myTitle', { ns: 'common' });
 */
export function useDocumentTitle(titleKey: string, options?: UseDocumentTitleOptions) {
  const { t } = useTranslation(options?.ns || 'pages');
  
  useEffect(() => {
    document.title = t(titleKey);
  }, [t, titleKey]);
}
