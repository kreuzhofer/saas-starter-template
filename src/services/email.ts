import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';
import { config } from '../config';
import { getI18n } from '../i18n/config';

// Email configuration
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.password,
  },
  // Allow self-signed certificates in development
  tls: {
    rejectUnauthorized: config.nodeEnv === 'production',
  },
});

// Template cache
const templates = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Load and compile an email template
 */
async function loadTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
  if (templates.has(name)) {
    return templates.get(name)!;
  }

  const templatePath = path.join(__dirname, '../templates', `${name}.hbs`);
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const compiled = handlebars.compile(templateContent);
  templates.set(name, compiled);

  return compiled;
}

/**
 * Send email confirmation to new user
 */
export async function sendEmailConfirmation(
  email: string,
  token: string,
  language: string = 'en'
): Promise<void> {
  const template = await loadTemplate('email-confirmation');
  const confirmationLink = `${config.baseUrl}/confirm-email?token=${token}`;
  const i18n = getI18n();

  const html = template({
    language,
    email,
    confirmationLink,
    expirationHours: 24,
  });

  const subject = i18n.t('emails:confirmation.subject', { lng: language });

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    html,
  });

  logger.info(`Email confirmation sent to ${email} in language ${language}`);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(
  email: string,
  token: string,
  language: string = 'en'
): Promise<void> {
  const template = await loadTemplate('password-reset');
  const resetLink = `${config.baseUrl}/reset-password?token=${token}`;
  const i18n = getI18n();

  const html = template({
    language,
    email,
    resetLink,
    expirationMinutes: 60,
  });

  const subject = i18n.t('emails:passwordReset.subject', { lng: language });

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    html,
  });

  logger.info(`Password reset email sent to ${email} in language ${language}`);
}

/**
 * Send email change confirmation to new email address
 */
export async function sendEmailChangeConfirmation(
  email: string,
  token: string,
  language: string = 'en'
): Promise<void> {
  const template = await loadTemplate('email-change-confirmation');
  const confirmationLink = `${config.baseUrl}/confirm-email-change?token=${token}`;
  const i18n = getI18n();

  const html = template({
    language,
    email,
    confirmationLink,
    expirationMinutes: 60,
  });

  const subject = i18n.t('emails:emailChange.subject', { lng: language });

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    html,
  });

  logger.info(`Email change confirmation sent to ${email} in language ${language}`);
}

/**
 * Verify SMTP connection
 */
export async function verifyEmailService(): Promise<boolean> {
  try {
    await transporter.verify();
    logger.info('Email service is ready');
    return true;
  } catch (err) {
    logger.error('Email service verification failed', err);
    return false;
  }
}
