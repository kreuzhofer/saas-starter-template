import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ShortUrlNotFoundError extends AppError {
  constructor(message = 'Short URL not found') {
    super(404, message);
  }
}

export class ShortUrlInactiveError extends AppError {
  constructor(message = 'Short URL is inactive') {
    super(410, message);
  }
}

export class DuplicateShortCodeError extends AppError {
  constructor(message = 'Short code already exists') {
    super(409, message);
  }
}

export class InvalidTrackingIdError extends AppError {
  constructor(message = 'Invalid tracking ID') {
    super(404, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'API key required') {
    super(401, message);
  }
}

export class InvalidApiKeyError extends AppError {
  constructor(message = 'Invalid API key') {
    super(401, message);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  
  // Use translation function if available, otherwise fall back to error message
  let message: string;
  if (req.t) {
    // Map error messages to translation keys
    if (err.message === 'Short URL not found') {
      message = req.t('errors:shortUrl.notFound');
    } else if (err.message === 'Short URL is inactive') {
      message = req.t('errors:shortUrl.inactive');
    } else if (err.message === 'Short code already exists') {
      message = req.t('errors:shortUrl.codeAlreadyExists');
    } else if (err.message === 'Invalid tracking ID') {
      message = req.t('errors:tracking.invalidTrackingId');
    } else if (err.message === 'API key required') {
      message = req.t('errors:auth.apiKeyRequired');
    } else if (err.message === 'Invalid API key') {
      message = req.t('errors:auth.invalidApiKey');
    } else if (statusCode === 500) {
      message = req.t('errors:general.internalServerError');
    } else {
      message = err.message || req.t('errors:general.unknownError');
    }
  } else {
    message = err.message || 'Internal server error';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
