import { Storage } from '@google-cloud/storage';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

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
 */
export async function generateSignedUploadUrl(
  filename: string,
  contentType: string
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

  return {
    uploadUrl,
    imageId,
    gcsPath,
  };
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
