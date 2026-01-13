import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { LanguageSelector } from '../components/LanguageSelector';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function ConfirmEmail() {
  const { t } = useTranslation('pages');
  useDocumentTitle('confirmEmail.title');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      // Extract token from URL query parameter
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage(t('confirmEmail.errors.noToken'));
        return;
      }

      try {
        // Automatically call confirmation API on page load
        await api.confirmEmail(token);
        setStatus('success');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { message: t('confirmEmail.success.loginMessage') }
          });
        }, 3000);
      } catch (err) {
        setStatus('error');
        if (err instanceof Error) {
          // Display error message for invalid or expired tokens
          if (err.message.includes('Invalid or expired')) {
            setErrorMessage(t('confirmEmail.errors.invalidToken'));
          } else {
            setErrorMessage(err.message);
          }
        } else {
          setErrorMessage(t('confirmEmail.errors.failed'));
        }
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Simple header with language selector */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
                {t('confirmEmail.appName')}
              </Link>
              <LanguageSelector />
            </div>
          </div>
        </div>

        {/* Loading message */}
        <div className="flex-grow flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                  <svg
                    className="animate-spin h-6 w-6 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('confirmEmail.loading.heading')}</h2>
                <p className="text-gray-600">{t('confirmEmail.loading.message')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Simple header with language selector */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
                {t('confirmEmail.appName')}
              </Link>
              <LanguageSelector />
            </div>
          </div>
        </div>

        {/* Success message */}
        <div className="flex-grow flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
              {/* Display success message with link to login page */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('confirmEmail.success.heading')}</h2>
              <p className="text-gray-600 mb-6">
                {t('confirmEmail.success.message')}
              </p>
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
                <p className="text-sm">
                  {t('confirmEmail.success.redirecting')}
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
              >
                {t('confirmEmail.success.goToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header with language selector */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
              {t('confirmEmail.appName')}
            </Link>
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Error message */}
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
            {/* Display error message for invalid or expired tokens */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('confirmEmail.error.heading')}</h2>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <p className="text-sm">{errorMessage}</p>
            </div>
            <div className="space-y-3">
              <Link
                to="/signup"
                className="inline-block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
              >
                {t('confirmEmail.error.signUpAgain')}
              </Link>
              <Link
                to="/login"
                className="inline-block w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
              >
                {t('confirmEmail.error.backToLogin')}
              </Link>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
