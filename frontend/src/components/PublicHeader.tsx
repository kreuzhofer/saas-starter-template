import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';

export function PublicHeader() {
  const { t } = useTranslation('common');

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
            {t('app.name')}
          </Link>
          <div className="flex gap-4 items-center">
            <Link
              to="/pricing"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {t('nav.pricing')}
            </Link>
            <LanguageSelector />
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {t('pages:welcome.hero.signIn', { ns: 'pages' })}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
