/**
 * Utility functions for locale-specific formatting of dates and numbers
 */

/**
 * Format a number with locale-appropriate thousand and decimal separators
 * @param value - The number to format
 * @param locale - The locale to use for formatting (e.g., 'en', 'de')
 * @param options - Optional Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  locale: string = 'en',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a date with locale-appropriate conventions
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale to use for formatting (e.g., 'en', 'de')
 * @param options - Optional Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format a date with short format (e.g., "12/7/2024" for en, "7.12.2024" for de)
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale to use for formatting
 * @returns Formatted date string
 */
export function formatShortDate(date: Date | string, locale: string = 'en'): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with long format (e.g., "December 7, 2024" for en, "7. Dezember 2024" for de)
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale to use for formatting
 * @returns Formatted date string
 */
export function formatLongDate(date: Date | string, locale: string = 'en'): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date and time with locale-appropriate conventions
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale to use for formatting
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string, locale: string = 'en'): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a currency value with locale-appropriate conventions
 * @param value - The amount to format
 * @param locale - The locale to use for formatting
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  locale: string = 'en',
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(value);
}

/**
 * Format a percentage with locale-appropriate conventions
 * @param value - The value to format (0-1 range, e.g., 0.5 for 50%)
 * @param locale - The locale to use for formatting
 * @param decimals - Number of decimal places to show
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  locale: string = 'en',
  decimals: number = 1
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
