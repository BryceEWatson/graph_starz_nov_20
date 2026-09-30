import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { ApiError } from './errorMiddleware.js';

/**
 * Per-user limits for the routes that call Gemini.
 * Counts live in memory, so they reset when the server restarts.
 */
export const GEMINI_RATE_LIMITS = {
  musePrompts: { windowMs: 60 * 60 * 1000, limit: 30 },
  uploadAnalysis: { windowMs: 60 * 60 * 1000, limit: 30 },
} as const;

/**
 * Key each count on the signed-in user rather than the IP address, so one person
 * can't spread calls across addresses and people sharing an address don't share
 * a quota. Limiters must sit behind requireAllowListedUser, which sets req.user.
 */
function userKey(req: Request): string {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  return `user:${req.user.id}`;
}

function perUserLimiter(
  { windowMs, limit }: { windowMs: number; limit: number },
  message: string
) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator: userKey,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, message)),
  });
}

export const musePromptsRateLimit = perUserLimiter(
  GEMINI_RATE_LIMITS.musePrompts,
  'Too many AI Muse requests. Please try again later.'
);

export const uploadAnalysisRateLimit = perUserLimiter(
  GEMINI_RATE_LIMITS.uploadAnalysis,
  'Too many uploads analyzed. Please try again later.'
);
