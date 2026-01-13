import { useTranslation } from 'react-i18next';

/**
 * Example component demonstrating context-based translations
 * This shows how to use the context parameter to select different translation variants
 */
export function ContextTranslationExample() {
  const { t } = useTranslation('common');

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Context-Based Translation Examples</h2>
      
      {/* Gender-specific greetings */}
      <div className="space-y-2">
        <h3 className="font-semibold">Gender-specific greetings:</h3>
        <p>Default: {t('contextual.welcome')}</p>
        <p>Male: {t('contextual.welcome', { context: 'male' })}</p>
        <p>Female: {t('contextual.welcome', { context: 'female' })}</p>
      </div>

      {/* Formality levels */}
      <div className="space-y-2">
        <h3 className="font-semibold">Formality levels:</h3>
        <p>Default: {t('contextual.greeting')}</p>
        <p>Formal: {t('contextual.greeting', { context: 'formal' })}</p>
        <p>Informal: {t('contextual.greeting', { context: 'informal' })}</p>
      </div>

      {/* Role-based text */}
      <div className="space-y-2">
        <h3 className="font-semibold">Role-based text:</h3>
        <p>Default: {t('contextual.userRole')}</p>
        <p>Admin: {t('contextual.userRole', { context: 'admin' })}</p>
        <p>Moderator: {t('contextual.userRole', { context: 'moderator' })}</p>
        <p>Guest: {t('contextual.userRole', { context: 'guest' })}</p>
      </div>
    </div>
  );
}
