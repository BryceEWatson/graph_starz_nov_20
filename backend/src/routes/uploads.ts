import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  generateSignedUploadUrl,
  getPublicUrl,
  generateThumbnail,
  validateAndConsumePendingUpload,
} from '../services/storageService.js';
import { analyzeImage } from '../services/aiService.js';
import { createImageWithAttributes } from '../services/graphService.js';
import { ApiError } from '../middleware/errorMiddleware.js';
import { uploadAnalysisRateLimit } from '../middleware/rateLimitMiddleware.js';

// Mounted behind requireAllowListedUser (app.ts), so req.user is always set.
export const uploadsRouter = Router();

const initUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
});

const completeUploadSchema = z.object({
  imageId: z.string().uuid(),
  gcsPath: z.string(),
  // contentType is now validated from PendingUpload, not trusted from client
});

/**
 * POST /uploads/init
 * Get signed URL for direct GCS upload
 */
uploadsRouter.post('/init', async (req: Request, res: Response) => {
  const { filename, contentType } = initUploadSchema.parse(req.body);
  const userId = req.user!.id;

  const { uploadUrl, imageId, gcsPath } = await generateSignedUploadUrl(
    filename,
    contentType,
    userId
  );

  res.json({
    uploadUrl,
    imageId,
    gcsPath,
    contentType, // Return content type so client can pass it to /complete
  });
});

/**
 * POST /uploads/complete
 * Trigger AI analysis and create graph nodes
 *
 * Security: validateAndConsumePendingUpload ensures imageId/gcsPath were issued
 * by /init for this specific user. Prevents spoofed completions.
 * The analysis calls Gemini, so it's rate limited per user.
 *
 * TODO (future hardening):
 * - Verify the file actually exists in GCS before processing
 * - Consider file size validation
 */
uploadsRouter.post('/complete', uploadAnalysisRateLimit, async (req: Request, res: Response) => {
  const { imageId, gcsPath } = completeUploadSchema.parse(req.body);
  const userId = req.user!.id;

  // Validate that this upload was initiated by this user (anti-spoofing)
  const validation = await validateAndConsumePendingUpload(imageId, gcsPath, userId);

  if (!validation.valid) {
    throw new ApiError(400, 'Invalid upload: imageId/gcsPath not found or expired');
  }

  // Use the content type from the validated pending upload (not from client)
  const contentType = validation.contentType!;

  // Get public URL for storing in the database
  const imageUrl = getPublicUrl(gcsPath);

  // Analyze image with Gemini (pass gcsPath to read from private bucket)
  const analysis = await analyzeImage(gcsPath, contentType);

  // Generate thumbnail (for MVP, same as main image)
  const thumbnailPath = await generateThumbnail(gcsPath);

  // Create graph nodes
  const image = await createImageWithAttributes(
    imageId,
    userId,
    imageUrl,
    getPublicUrl(thumbnailPath),
    analysis
  );

  res.json({
    image,
    analysis,
  });
});
