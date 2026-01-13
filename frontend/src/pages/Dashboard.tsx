import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { useTranslation } from 'react-i18next';

interface PlaceholderCardProps {
  title: string;
  description: string;
  icon?: string;
}

function PlaceholderCard({ title, description, icon = '📦' }: PlaceholderCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

export function Dashboard() {
  const { t } = useTranslation(['pages', 'common']);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('dashboard.title', 'Dashboard')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('dashboard.welcome', 'Welcome to your SaaS application dashboard.')}
          </p>
        </div>
        
        {/* Placeholder cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <PlaceholderCard 
            title={t('dashboard.gettingStarted', 'Getting Started')}
            description={t('dashboard.gettingStartedDesc', 'This is a placeholder card. Replace with your application\'s main features.')}
            icon="🚀"
          />
          <PlaceholderCard 
            title={t('dashboard.yourData', 'Your Data')}
            description={t('dashboard.yourDataDesc', 'Add components here to display user-specific data and metrics.')}
            icon="📊"
          />
          <PlaceholderCard 
            title={t('dashboard.quickActions', 'Quick Actions')}
            description={t('dashboard.quickActionsDesc', 'Add buttons and forms for common user actions.')}
            icon="⚡"
          />
        </div>
        
        {/* Developer note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            {t('dashboard.devNote.title', 'Developer Note')}
          </h2>
          <p className="text-blue-700">
            {t('dashboard.devNote.message', 'This is a placeholder dashboard. Customize this page to build your application\'s main interface. The template includes authentication, user management, admin panel, and tier system ready to use.')}
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-blue-600">
              <strong>{t('dashboard.devNote.features', 'Included features:')}</strong>
            </p>
            <ul className="list-disc list-inside text-sm text-blue-600 space-y-1 ml-4">
              <li>{t('dashboard.devNote.auth', 'Email-based authentication with JWT tokens')}</li>
              <li>{t('dashboard.devNote.userMgmt', 'User profile management and account settings')}</li>
              <li>{t('dashboard.devNote.admin', 'Admin panel for user and system management')}</li>
              <li>{t('dashboard.devNote.tiers', 'Tier-based subscription system with limits')}</li>
              <li>{t('dashboard.devNote.notifications', 'Banner and toast notification system')}</li>
              <li>{t('dashboard.devNote.i18n', 'Internationalization (English and German)')}</li>
              <li>{t('dashboard.devNote.scheduler', 'Background task scheduler framework')}</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
