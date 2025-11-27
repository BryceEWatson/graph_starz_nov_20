import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { exchangeCodeForTokens, findOrCreateUser, generateJWT, isWhitelisted, addToWaitlist } from '../services/authService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { ApiError } from '../middleware/errorMiddleware.js';

export const authRouter = Router();

// Request validation schemas
const googleAuthSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
});

/**
 * POST /auth/google
 * Exchange Google OAuth code for JWT
 */
authRouter.post('/google', async (req: Request, res: Response) => {
  // Validate request body
  const { code } = googleAuthSchema.parse(req.body);

  // Exchange code for Google user info
  const googleUser = await exchangeCodeForTokens(code);

  // Check if user is whitelisted
  const whitelisted = isWhitelisted(googleUser.email);

  // Find or create user in database
  const user = await findOrCreateUser(googleUser);

  // Generate JWT (even for non-whitelisted users, for session management)
  const token = generateJWT(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
      waitlisted: user.waitlisted,
    },
    whitelisted,
  });
});

/**
 * GET /auth/validate
 * Validate current JWT token
 */
authRouter.get('/validate', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Get full user info from database
  const { getUserById } = await import('../services/authService.js');
  const user = await getUserById(userId);

  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  // Check if user is whitelisted
  const whitelisted = isWhitelisted(user.email);

  res.json({
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
      waitlisted: user.waitlisted,
    },
    whitelisted,
  });
});

/**
 * POST /auth/logout
 * Logout (client-side token deletion)
 */
authRouter.post('/logout', (_req: Request, res: Response) => {
  // JWT is stateless, so logout is client-side only
  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /auth/waitlist
 * Join the waitlist (requires authentication)
 */
authRouter.post('/waitlist', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Add user to waitlist
  const user = await addToWaitlist(userId);

  res.json({
    message: 'Successfully added to waitlist',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
      waitlisted: user.waitlisted,
    },
  });
});
