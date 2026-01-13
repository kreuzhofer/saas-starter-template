import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function Pricing() {
  const { t } = useTranslation('pages');
  useDocumentTitle('pricing.title');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {t('pricing.heading')}
            </h1>
            <p className="text-xl text-gray-600">
              {t('pricing.subheading')}
            </p>
          </div>

          {/* Pricing Tiers */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Starter Plan */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('pricing.plans.starter.name')}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{t('pricing.plans.starter.price')}</span>
                <span className="text-gray-600">{t('pricing.plans.starter.period')}</span>
              </div>
              <p className="text-gray-600 mb-6">{t('pricing.plans.starter.description')}</p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.starter.features.users')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.starter.features.storage')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.starter.features.basicFeatures')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.starter.features.emailSupport')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.starter.features.communityAccess')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 text-xl">✗</span>
                  <span className="text-gray-400">{t('pricing.plans.starter.features.advancedAnalytics')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 text-xl">✗</span>
                  <span className="text-gray-400">{t('pricing.plans.starter.features.prioritySupport')}</span>
                </li>
              </ul>

              <Link
                to="/signup"
                className="block w-full text-center px-6 py-3 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('pricing.plans.starter.button')}
              </Link>
            </div>

            {/* Professional Plan */}
            <div className="bg-white rounded-lg shadow-xl p-8 border-4 border-blue-600 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  {t('pricing.plans.professional.badge')}
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('pricing.plans.professional.name')}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{t('pricing.plans.professional.price')}</span>
                <span className="text-gray-600">{t('pricing.plans.professional.period')}</span>
              </div>
              <p className="text-gray-600 mb-6">{t('pricing.plans.professional.description')}</p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.professional.features.users')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.professional.features.storage')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.professional.features.allBasicFeatures')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.professional.features.advancedAnalytics')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.professional.features.apiAccess')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.professional.features.customBranding')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.professional.features.prioritySupport')}</span>
                </li>
              </ul>

              <Link
                to="/signup"
                className="block w-full text-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('pricing.plans.professional.button')}
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('pricing.plans.enterprise.name')}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{t('pricing.plans.enterprise.price')}</span>
                <span className="text-gray-600">{t('pricing.plans.enterprise.period')}</span>
              </div>
              <p className="text-gray-600 mb-6">{t('pricing.plans.enterprise.description')}</p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.enterprise.features.unlimitedUsers')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.enterprise.features.unlimitedStorage')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.enterprise.features.allProfessionalFeatures')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.enterprise.features.advancedSecurity')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.enterprise.features.customIntegrations')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.enterprise.features.dedicatedSupport')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-700">{t('pricing.plans.enterprise.features.sla')}</span>
                </li>
              </ul>

              <Link
                to="/signup"
                className="block w-full text-center px-6 py-3 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('pricing.plans.enterprise.button')}
              </Link>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {t('pricing.comparison.heading')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">{t('pricing.comparison.feature')}</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">{t('pricing.plans.starter.name')}</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">{t('pricing.plans.professional.name')}</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">{t('pricing.plans.enterprise.name')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-700">{t('pricing.comparison.rows.users')}</td>
                    <td className="text-center py-4 px-4 text-gray-600">{t('pricing.comparison.values.starter.users')}</td>
                    <td className="text-center py-4 px-4 text-gray-600">{t('pricing.comparison.values.professional.users')}</td>
                    <td className="text-center py-4 px-4 text-gray-600">{t('pricing.comparison.values.enterprise.users')}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-700">{t('pricing.comparison.rows.storage')}</td>
                    <td className="text-center py-4 px-4 text-gray-600">{t('pricing.comparison.values.starter.storage')}</td>
                    <td className="text-center py-4 px-4 text-gray-600">{t('pricing.comparison.values.professional.storage')}</td>
                    <td className="text-center py-4 px-4 text-gray-600">{t('pricing.comparison.values.enterprise.storage')}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-700">{t('pricing.comparison.rows.basicFeatures')}</td>
                    <td className="text-center py-4 px-4 text-green-600">✓</td>
                    <td className="text-center py-4 px-4 text-green-600">✓</td>
                    <td className="text-center py-4 px-4 text-green-600">✓</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-700">{t('pricing.comparison.rows.advancedAnalytics')}</td>
                    <td className="text-center py-4 px-4 text-gray-400">✗</td>
                    <td className="text-center py-4 px-4 text-green-600">✓</td>
                    <td className="text-center py-4 px-4 text-green-600">✓</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-700">{t('pricing.comparison.rows.apiAccess')}</td>
                    <td className="text-center py-4 px-4 text-gray-400">✗</td>
                    <td className="text-center py-4 px-4 text-green-600">✓</td>
                    <td className="text-center py-4 px-4 text-green-600">✓</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-700">{t('pricing.comparison.rows.customIntegrations')}</td>
                    <td className="text-center py-4 px-4 text-gray-400">✗</td>
                    <td className="text-center py-4 px-4 text-gray-400">✗</td>
                    <td className="text-center py-4 px-4 text-green-600">✓</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-gray-700">{t('pricing.comparison.rows.support')}</td>
                    <td className="text-center py-4 px-4 text-gray-600">{t('pricing.comparison.values.starter.support')}</td>
                    <td className="text-center py-4 px-4 text-gray-600">{t('pricing.comparison.values.professional.support')}</td>
                    <td className="text-center py-4 px-4 text-gray-600">{t('pricing.comparison.values.enterprise.support')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
