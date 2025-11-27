import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import { getUserEgoNetwork, getGlobalGraphSample } from '../services/graphService.js';

export const graphRouter = Router();

/**
 * GET /graph/ego
 * Get authenticated user's ego network
 */
graphRouter.get('/ego', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const graph = await getUserEgoNetwork(userId);

  res.json(graph);
});

/**
 * GET /graph/global
 * Get sampled global graph (optionally authenticated)
 */
graphRouter.get('/global', optionalAuth, async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const skip = parseInt(req.query.skip as string) || 0;

  const graph = await getGlobalGraphSample(limit, skip);

  res.json(graph);
});
