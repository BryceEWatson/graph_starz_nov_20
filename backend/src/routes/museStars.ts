import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getMuseStarsForUser } from '../services/museStarService.js';
import { generatePromptsForMuseStar } from '../services/aiMuseService.js';
import { musePromptsRateLimit } from '../middleware/rateLimitMiddleware.js';
import { CORE_ATTRIBUTE_DIMENSIONS } from '../config/attributeDimensions.js';
import {
  GeneratePromptsRequest,
  GeneratePromptsResponse,
  MuseStarsResponse,
  MUSE_PROMPT_LIMITS,
} from '../shared/museStarContract.js';

// Mounted behind requireAllowListedUser (app.ts), so req.user is always set.
export const museStarsRouter = Router();

/**
 * GET /muse-stars/ego
 * Get Muse Stars (suggested nodes) for user's ego network
 */
museStarsRouter.get('/ego', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const museStars = await getMuseStarsForUser(userId);

  const body: MuseStarsResponse = {
    museStars,
    message: museStars.length > 0
      ? 'Muse Stars found—ideas for extending your map'
      : 'Your map is well-explored for now. Upload more images to discover new possibilities!',
  };
  res.json(body);
});

// Everything in this body is written into the Gemini prompt, so each field is bounded
const generatePromptsSchema: z.ZodType<GeneratePromptsRequest> = z.object({
  museStarId: z.string().max(MUSE_PROMPT_LIMITS.museStarIdLength).optional(),
  targetAttributes: z
    .array(
      z.object({
        type: z.enum(CORE_ATTRIBUTE_DIMENSIONS),
        value: z.string().min(1).max(MUSE_PROMPT_LIMITS.attributeValueLength),
      })
    )
    .min(1)
    .max(MUSE_PROMPT_LIMITS.targetAttributes),
  context: z.object({
    nearbyImages: z
      .array(z.string().min(1).max(MUSE_PROMPT_LIMITS.imageIdLength))
      .max(MUSE_PROMPT_LIMITS.nearbyImages),
    attributeGap: z.string().max(MUSE_PROMPT_LIMITS.attributeGapLength),
    imageCount: z.number().int().nonnegative().optional(),
  }),
});

/**
 * POST /muse-stars/prompts
 * Generate graph-aware prompts for a Muse Star
 */
museStarsRouter.post('/prompts', musePromptsRateLimit, async (req: Request, res: Response) => {
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

  const body: GeneratePromptsResponse = {
    prompts,
    message: 'AI Muse suggestions for this part of your map',
  };
  res.json(body);
});
