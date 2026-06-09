import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

/** Final error handler — emits typed envelopes, never leaks stack traces. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express requires the 4-arg signature
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json(err.toBody());
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'validation_error', message: err.issues.map((i) => i.message).join('; ') },
    });
  }
  console.error('[api] unhandled error:', err);
  return res.status(500).json({
    error: { code: 'internal_error', message: 'Something went wrong' },
  });
}
