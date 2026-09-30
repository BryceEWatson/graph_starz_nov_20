import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getUserEgoNetwork, getGlobalGraphSample } from '../services/graphService.js';

// Mounted behind requireAllowListedUser (app.ts), so req.user is always set.
export const graphRouter = Router();

/** Page size for /graph/global when none is given, and the most it will return. */
export const GLOBAL_GRAPH_DEFAULT_LIMIT = 100;
export const GLOBAL_GRAPH_MAX_LIMIT = 100;
/** Deepest page offset /graph/global accepts. */
export const GLOBAL_GRAPH_MAX_SKIP = 10_000;

const globalGraphQuerySchema = z.object({
  // Larger page sizes are capped rather than rejected
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(GLOBAL_GRAPH_DEFAULT_LIMIT)
    .transform((limit) => Math.min(limit, GLOBAL_GRAPH_MAX_LIMIT)),
  skip: z.coerce.number().int().min(0).max(GLOBAL_GRAPH_MAX_SKIP).default(0),
});

/**
 * GET /graph/ego
 * Get authenticated user's ego network
 */
graphRouter.get('/ego', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const graph = await getUserEgoNetwork(userId);

  res.json(graph);
});

/**
 * GET /graph/global
 * Get sampled global graph
 */
graphRouter.get('/global', async (req: Request, res: Response) => {
  const { limit, skip } = globalGraphQuerySchema.parse(req.query);

  const graph = await getGlobalGraphSample(limit, skip);

  res.json(graph);
});
