import 'react-i18next';
import common from '../../public/locales/en/common.json';
import pages from '../../public/locales/en/pages.json';
import errors from '../../public/locales/en/errors.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      pages: typeof pages;
      errors: typeof errors;
    };
  }
}
