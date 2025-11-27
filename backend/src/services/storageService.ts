import { Storage } from '@google-cloud/storage';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { runWriteTransaction } from '../config/neo4j.js';

const storage = new Storage({
  projectId: config.gcs.projectId,
  // Uses Application Default Credentials from GOOGLE_APPLICATION_CREDENTIALS env var
});

const bucket = storage.bucket(config.gcs.bucket);

export interface SignedUploadUrl {
  uploadUrl: string;
  imageId: string;
  gcsPath: string;
}

/**
 * Generate signed URL for direct GCS upload
 * Also creates a PendingUpload record for validation during /complete
 */
export async function generateSignedUploadUrl(
  filename: string,
  contentType: string,
  userId: string
): Promise<SignedUploadUrl> {
  // Generate unique image ID
  const imageId = uuidv4();
  const extension = filename.split('.').pop();
  const gcsPath = `images/${imageId}.${extension}`;

  const file = bucket.file(gcsPath);

  // Generate signed URL (valid for 15 minutes)
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });

  // Store pending upload for validation
  await storePendingUpload(imageId, gcsPath, userId, contentType);

  return {
    uploadUrl,
    imageId,
    gcsPath,
  };
}

/**
 * Store pending upload in Neo4j for later validation
 * Expires after 15 minutes (same as signed URL)
 */
async function storePendingUpload(
  imageId: string,
  gcsPath: string,
  userId: string,
  contentType: string
): Promise<void> {
  await runWriteTransaction(async (tx) => {
    await tx.run(
      `
      CREATE (p:PendingUpload {
        imageId: $imageId,
        gcsPath: $gcsPath,
        userId: $userId,
        contentType: $contentType,
        createdAt: datetime(),
        expiresAt: datetime() + duration({minutes: 15})
      })
      `,
      { imageId, gcsPath, userId, contentType }
    );
  });
}

/**
 * Validate and consume a pending upload
 * Returns true if valid, false if not found or already used
 */
export async function validateAndConsumePendingUpload(
  imageId: string,
  gcsPath: string,
  userId: string
): Promise<{ valid: boolean; contentType?: string }> {
  return await runWriteTransaction(async (tx) => {
    // Find and delete the pending upload in one transaction
    const result = await tx.run(
      `
      MATCH (p:PendingUpload {
        imageId: $imageId,
        gcsPath: $gcsPath,
        userId: $userId
      })
      WHERE p.expiresAt > datetime()
      WITH p, p.contentType as contentType
      DELETE p
      RETURN contentType
      `,
      { imageId, gcsPath, userId }
    );

    if (result.records.length === 0) {
      return { valid: false };
    }

    return {
      valid: true,
      contentType: result.records[0].get('contentType'),
    };
  });
}

/**
 * Cleanup expired pending uploads (run periodically)
 */
export async function cleanupExpiredPendingUploads(): Promise<number> {
  return await runWriteTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (p:PendingUpload)
      WHERE p.expiresAt < datetime()
      DELETE p
      RETURN count(p) as deleted
      `
    );

    return result.records[0]?.get('deleted') || 0;
  });
}

/**
 * Get public URL for uploaded image
 */
export function getPublicUrl(gcsPath: string): string {
  return `https://storage.googleapis.com/${config.gcs.bucket}/${gcsPath}`;
}

/**
 * Generate thumbnail path (simplified for MVP)
 * In production, use Sharp to resize and upload thumbnail
 */
export async function generateThumbnail(gcsPath: string): Promise<string> {
  // For MVP, return same path as main image
  // TODO: Implement actual thumbnail generation with Sharp
  return gcsPath;
}
