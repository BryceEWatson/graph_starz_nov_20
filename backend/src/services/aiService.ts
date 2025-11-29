import { getVisionModel } from './geminiClient.js';
import { Storage } from '@google-cloud/storage';
import { config } from '../config/env.js';
import { ATTRIBUTE_DIMENSION_CONFIG, isCanonicalValue } from '../config/attributeDimensions.js';

// GCS client for reading images (uses service account credentials)
const storage = new Storage({
  projectId: config.gcs.projectId,
});
const bucket = storage.bucket(config.gcs.bucket);

export interface ImageAnalysisAttribute {
  type: string;
  value: string;
  confidence: number;
  /** True if this is a primary/canonical attribute for overlap & connectivity. */
  canonical: boolean;
}

export interface ImageAnalysis {
  title: string;
  description: string;
  attributes: ImageAnalysisAttribute[];
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
  // Build dimension lines with canonical values from config
  const dimensionLines = ATTRIBUTE_DIMENSION_CONFIG.map((dim) => {
    const hint = dim.description ?? '';
    const canon = dim.canonicalValues?.length
      ? ` [canonical: ${dim.canonicalValues.join(', ')}]`
      : '';
    return `   - ${dim.id}${hint ? ` (${hint})` : ''}${canon}`;
  }).join('\n');

  const prompt = `Analyze this image and return structured data.

Provide:
1. A creative title (1-5 words).
2. A brief description (1-2 sentences).
3. A list of visual attributes. For each attribute:
   - "type" MUST be one of the known dimensions (style, mood, subject, color, lighting, composition).
   - "value" is a short phrase describing this aspect.
   - "confidence" is a number between 0 and 1.
   - "canonical" is TRUE only if the value matches a canonical term from the vocabulary below.

Dimensions and canonical vocabularies:
${dimensionLines}

Rules:
- For each dimension, choose AT LEAST 1 canonical attribute where possible. Prioritize canonical terms to maximize overlap between related images.
- You may also add additional non-canonical, more specific attributes (set "canonical": false for these).
- Use snake_case for canonical values (e.g. "line_art", "golden_hour").
- Non-canonical values can be more descriptive (e.g. "painterly illustration", "blue and gold clouds").

Format as JSON:
{
  "title": "...",
  "description": "...",
  "attributes": [
    {"type": "style", "value": "painterly", "confidence": 0.96, "canonical": true},
    {"type": "style", "value": "painterly_illustration", "confidence": 0.9, "canonical": false},
    {"type": "mood", "value": "serene", "confidence": 0.92, "canonical": true},
    {"type": "color", "value": "cool", "confidence": 0.88, "canonical": true}
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
    attributes: parsed.attributes.map((attr: any) => {
      const type = attr.type?.toLowerCase().trim() || 'other';
      const value = String(attr.value).trim();
      // Use explicit canonical from AI if provided, otherwise fall back to vocab check
      const canonical =
        typeof attr.canonical === 'boolean'
          ? attr.canonical
          : isCanonicalValue(type, value);
      return {
        type,
        value,
        confidence: attr.confidence || 0.9,
        canonical,
      };
    }),
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
