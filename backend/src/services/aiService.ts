import { getVisionModel } from './geminiClient.js';
import { Storage } from '@google-cloud/storage';
import { config } from '../config/env.js';

// GCS client for reading images (uses service account credentials)
const storage = new Storage({
  projectId: config.gcs.projectId,
});
const bucket = storage.bucket(config.gcs.bucket);

export interface ImageAnalysis {
  title: string;
  description: string;
  attributes: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
}

/**
 * Analyze image using Gemini Vision
 * @param gcsPath - GCS path of the image (e.g., 'images/uuid.jpg')
 * @param contentType - MIME type of the image (e.g., 'image/jpeg', 'image/png')
 */
export async function analyzeImage(
  gcsPath: string,
  contentType: string = 'image/jpeg'
): Promise<ImageAnalysis> {
  const prompt = `Analyze this image and provide:
1. A creative title (1-5 words)
2. A brief description (1-2 sentences)
3. Visual attributes in these categories:
   - style (e.g., photographic, abstract, cyberpunk, minimalist)
   - mood (e.g., energetic, peaceful, dramatic, mysterious)
   - subject (e.g., portrait, landscape, cityscape, nature)
   - color (e.g., vibrant, monochrome, warm_tones, cool_tones)

Format as JSON:
{
  "title": "...",
  "description": "...",
  "attributes": [
    {"type": "style", "value": "...", "confidence": 0.95},
    {"type": "mood", "value": "...", "confidence": 0.88}
  ]
}`;

  const model = getVisionModel();
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: contentType,
        data: await fetchImageFromGCS(gcsPath),
      },
    },
    prompt,
  ]);

  const response = result.response.text();

  // Extract JSON from markdown code blocks if present
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                    response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Failed to parse Gemini response');
  }

  const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

  return {
    title: parsed.title,
    description: parsed.description,
    attributes: parsed.attributes.map((attr: any) => ({
      type: attr.type,
      value: attr.value,
      confidence: attr.confidence || 0.9,
    })),
  };
}

/**
 * Fetch image from GCS and convert to base64
 * Uses service account credentials to read from private bucket
 */
async function fetchImageFromGCS(gcsPath: string): Promise<string> {
  const file = bucket.file(gcsPath);
  const [buffer] = await file.download();
  return buffer.toString('base64');
}
