import { Request, Response, NextFunction } from 'express';
import { verifyJWT, getUserById, isWhitelisted, User } from '../services/authService.js';
import { ApiError } from './errorMiddleware.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Verify the bearer token and load the signed-in user.
 * Throws ApiError(401) when there's no valid session.
 */
async function authenticate(req: Request): Promise<User> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const payload = verifyJWT(token);

  // Verify user still exists
  const user = await getUserById(payload.userId);
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  return user;
}

function toAuthError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(401, 'Invalid or expired token');
}

/**
 * Middleware to require authentication.
 * Any signed-in user passes, including people who aren't on the allow-list yet,
 * so it's only for the session check and the waitlist.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await authenticate(req);
    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    next(toAuthError(error));
  }
}

/**
 * Middleware to require a signed-in user on the allow-list (WHITELISTED_EMAILS).
 * app.ts mounts it once in front of every route except health, sign-in and the
 * waitlist, so new routes are protected by default.
 */
export async function requireAllowListedUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await authenticate(req);

    if (!isWhitelisted(user.email)) {
      throw new ApiError(403, 'This account is not on the allow-list yet');
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    next(toAuthError(error));
  }
}
