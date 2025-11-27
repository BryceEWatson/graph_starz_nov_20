import { getVisionModel } from './geminiClient.js';

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
 * @param imageUrl - Public URL of the image to analyze
 * @param contentType - MIME type of the image (e.g., 'image/jpeg', 'image/png')
 */
export async function analyzeImage(
  imageUrl: string,
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
        data: await fetchImageAsBase64(imageUrl),
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
 * Fetch image and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
