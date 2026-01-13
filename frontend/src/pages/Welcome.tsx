import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function Welcome() {
  const { t } = useTranslation(['pages', 'common']);
  useDocumentTitle('welcome.title');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <PublicHeader />

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              {t('welcome.hero.heading')}
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t('welcome.hero.subheading')}
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg"
              >
                {t('welcome.hero.getStarted')}
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 text-lg font-medium text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50"
              >
                {t('welcome.hero.signIn')}
              </Link>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="text-blue-600 text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('welcome.features.authentication.title')}</h3>
              <p className="text-gray-600">
                {t('welcome.features.authentication.description')}
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="text-blue-600 text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('welcome.features.userManagement.title')}</h3>
              <p className="text-gray-600">
                {t('welcome.features.userManagement.description')}
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="text-blue-600 text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('welcome.features.adminPanel.title')}</h3>
              <p className="text-gray-600">
                {t('welcome.features.adminPanel.description')}
              </p>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-white rounded-lg shadow-md p-12 mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              {t('welcome.benefits.heading')}
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="text-green-600 text-2xl">✓</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">{t('welcome.benefits.productionReady.title')}</h4>
                  <p className="text-gray-600">
                    {t('welcome.benefits.productionReady.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green-600 text-2xl">✓</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">{t('welcome.benefits.tierSystem.title')}</h4>
                  <p className="text-gray-600">
                    {t('welcome.benefits.tierSystem.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green-600 text-2xl">✓</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">{t('welcome.benefits.notifications.title')}</h4>
                  <p className="text-gray-600">
                    {t('welcome.benefits.notifications.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green-600 text-2xl">✓</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">{t('welcome.benefits.internationalization.title')}</h4>
                  <p className="text-gray-600">
                    {t('welcome.benefits.internationalization.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green-600 text-2xl">✓</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">{t('welcome.benefits.taskScheduler.title')}</h4>
                  <p className="text-gray-600">
                    {t('welcome.benefits.taskScheduler.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green-600 text-2xl">✓</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">{t('welcome.benefits.securePrivate.title')}</h4>
                  <p className="text-gray-600">
                    {t('welcome.benefits.securePrivate.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-blue-600 rounded-lg shadow-lg p-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              {t('welcome.cta.heading')}
            </h3>
            <p className="text-xl text-blue-100 mb-8">
              {t('welcome.cta.subheading')}
            </p>
            <Link
              to="/signup"
              className="inline-block px-8 py-3 text-lg font-medium text-blue-600 bg-white rounded-lg hover:bg-gray-100 shadow-lg"
            >
              {t('welcome.cta.button')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
