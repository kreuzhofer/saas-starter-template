import React from 'react';
import { Link } from 'react-router-dom';

export interface BannerProps {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  dismissable: boolean;
  link?: {
    text: string;
    url: string;
    external: boolean;
    style: 'inline' | 'button';
  };
  backgroundColor?: string;
  textColor?: string;
  onDismiss: (id: string) => void;
}

export const Banner: React.FC<BannerProps> = ({
  id,
  type,
  message,
  dismissable,
  link,
  backgroundColor,
  textColor,
  onDismiss,
}) => {
  // Default colors based on type
  const defaultColors = {
    error: {
      bg: 'bg-red-600',
      text: 'text-white',
    },
    warning: {
      bg: 'bg-yellow-500',
      text: 'text-gray-900',
    },
    info: {
      bg: 'bg-blue-600',
      text: 'text-white',
    },
  };

  const colors = defaultColors[type];
  const bgStyle = backgroundColor ? { backgroundColor } : {};
  const textStyle = textColor ? { color: textColor } : {};
  const combinedStyle = { ...bgStyle, ...textStyle };

  const handleDismiss = () => {
    onDismiss(id);
  };

  const renderLink = () => {
    if (!link) return null;

    const linkClasses = link.style === 'button'
      ? 'ml-2 px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors'
      : 'ml-1 underline hover:no-underline';

    if (link.external) {
      return (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses}
        >
          {link.text}
        </a>
      );
    }

    return (
      <Link to={link.url} className={linkClasses}>
        {link.text}
      </Link>
    );
  };

  return (
    <div
      className={`w-full ${backgroundColor ? '' : colors.bg} ${textColor ? '' : colors.text} px-4 py-3 flex items-center justify-between shadow-md`}
      style={Object.keys(combinedStyle).length > 0 ? combinedStyle : undefined}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center flex-1">
        <span className="text-sm font-medium">
          {message}
          {renderLink()}
        </span>
      </div>
      {dismissable && (
        <button
          onClick={handleDismiss}
          className="ml-4 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
