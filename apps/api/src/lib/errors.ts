import type { ApiError } from '@rotpitch/shared';

/**
 * Typed application error. Carries an HTTP status + stable error code; the
 * error middleware serializes it as { error: { code, message } } — never a
 * stack trace.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toBody(): ApiError {
    return { error: { code: this.code, message: this.message } };
  }
}

/**
 * A render failure with a message safe to show the user (e.g. "Video is too
 * long"). The worker stores `message` on the failed video row; generic/internal
 * errors get a sanitized fallback instead.
 */
export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenderError';
  }
}

export const Unauthorized = (msg = 'Unauthorized') => new AppError(401, 'unauthorized', msg);
export const Forbidden = (msg = 'Forbidden') => new AppError(403, 'forbidden', msg);
export const NotFound = (msg = 'Not found') => new AppError(404, 'not_found', msg);
export const BadRequest = (msg = 'Bad request') => new AppError(400, 'bad_request', msg);
export const PaymentRequired = (msg = 'Insufficient credits') =>
  new AppError(402, 'insufficient_credits', msg);
