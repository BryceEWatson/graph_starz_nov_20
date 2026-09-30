import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';

import { config } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { uploadsRouter } from './routes/uploads.js';
import { graphRouter } from './routes/graph.js';
import { museStarsRouter } from './routes/museStars.js';
import { requireAllowListedUser } from './middleware/authMiddleware.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';

/**
 * Build the Express app without starting a server, so tests can drive the real
 * middleware and routes.
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: config.frontendOrigin,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Open routes: health checks, plus sign-in, the session check and the waitlist,
  // which people who aren't on the allow-list yet still need.
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);

  // Everything below this line requires a signed-in user on the allow-list.
  app.use(requireAllowListedUser);

  app.use('/uploads', uploadsRouter);
  app.use('/graph', graphRouter);
  app.use('/muse-stars', museStarsRouter);

  // TODO: Add more routes as they're implemented
  // app.use('/me', meRouter);
  // app.use('/users', usersRouter);
  // app.use('/images', imagesRouter);

  // Error handling middleware (must be last)
  app.use(errorMiddleware);

  return app;
}
