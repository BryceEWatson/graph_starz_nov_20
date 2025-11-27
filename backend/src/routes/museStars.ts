import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getMuseStarsForUser } from '../services/museStarService.js';
import { generatePromptsForMuseStar } from '../services/aiMuseService.js';
import { z } from 'zod';

export const museStarsRouter = Router();

// All routes require authentication
museStarsRouter.use(requireAuth);

/**
 * GET /muse-stars/ego
 * Get Muse Stars (suggested nodes) for user's ego network
 */
museStarsRouter.get('/ego', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const museStars = await getMuseStarsForUser(userId);

  res.json({
    museStars,
    message: museStars.length > 0
      ? 'Muse Stars found—ideas for extending your map'
      : 'Your map is well-explored for now. Upload more images to discover new possibilities!',
  });
});

const generatePromptsSchema = z.object({
  museStarId: z.string().optional(),
  targetAttributes: z.array(
    z.object({
      type: z.string(),
      value: z.string(),
    })
  ),
  context: z.object({
    nearbyImages: z.array(z.string()),
    attributeGap: z.string(),
    imageCount: z.number().optional(),
  }),
});

/**
 * POST /muse-stars/prompts
 * Generate graph-aware prompts for a Muse Star
 */
museStarsRouter.post('/prompts', async (req: Request, res: Response) => {
  const museStarData = generatePromptsSchema.parse(req.body);
  const userId = req.user!.id;

  const museStar = {
    id: museStarData.museStarId || `temp-${Date.now()}`,
    type: 'muse_star' as const,
    userId,
    targetAttributes: museStarData.targetAttributes,
    context: {
      nearbyImages: museStarData.context.nearbyImages,
      attributeGap: museStarData.context.attributeGap,
      imageCount: museStarData.context.imageCount || 0,
    },
  };

  const prompts = await generatePromptsForMuseStar(museStar);

  res.json({
    prompts,
    message: 'AI Muse suggestions for this part of your map',
  });
});
