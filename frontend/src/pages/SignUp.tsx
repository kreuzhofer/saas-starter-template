import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { isAuthenticated } from '../utils/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { LanguageSelector } from '../components/LanguageSelector';
import { PasswordInput } from '../components/PasswordInput';

export function SignUp() {
  const { t } = useTranslation(['pages', 'common']);
  useDocumentTitle('signup.title');
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    // Check if username is provided
    if (!username.trim()) {
      setError(t('signup.errors.emailRequired'));
      return false;
    }

    // Validate email format
    if (!validateEmail(username)) {
      setError(t('signup.errors.invalidEmail'));
      return false;
    }

    // Check if password is provided
    if (!password) {
      setError(t('signup.errors.passwordRequired'));
      return false;
    }

    // Validate password requirements (minimum 8 characters)
    if (password.length < 8) {
      setError(t('signup.errors.passwordTooShort'));
      return false;
    }

    // Check if password confirmation is provided
    if (!passwordConfirmation) {
      setError(t('signup.errors.confirmPasswordRequired'));
      return false;
    }

    // Validate password confirmation match
    if (password !== passwordConfirmation) {
      setError(t('signup.errors.passwordMismatch'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await api.register({ username, password });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        // Handle specific error messages from the API
        if (err.message.includes('already exists') || err.message.includes('409')) {
          setError(t('signup.errors.accountExists'));
        } else if (err.message.includes('validation') || err.message.includes('400')) {
          setError(t('signup.errors.invalidFormat'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('signup.errors.registrationFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Simple header with language selector */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
                {t('common:app.name')}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('signup.success.heading')}</h2>
              <p className="text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('signup.success.message', { email: username }) }} />
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
                <p className="text-sm">
                  {t('signup.success.note')}
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
              >
                {t('signup.success.goToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header with language selector */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
              {t('common:app.name')}
            </Link>
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Signup form */}
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900">{t('common:app.name')}</h1>
              <p className="mt-2 text-gray-600">{t('signup.heading')}</p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                {t('signup.email')}
              </label>
              <input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('signup.password')}
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('signup.passwordHint')}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <p className="mt-1 text-sm text-gray-500">{t('signup.passwordHint')}</p>
            </div>

            <div>
              <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-gray-700 mb-2">
                {t('signup.confirmPassword')}
              </label>
              <PasswordInput
                id="passwordConfirmation"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder={t('signup.confirmPassword')}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('signup.submitting') : t('signup.submit')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('signup.alreadyHaveAccount')}{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                {t('signup.signInLink')}
              </Link>
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
