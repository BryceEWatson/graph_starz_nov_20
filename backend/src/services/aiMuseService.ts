import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { runReadTransaction } from '../config/neo4j.js';
import { MuseStar } from './museStarService.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

export interface PromptSuggestion {
  id: string;
  museStarId: string;
  label: string; // e.g., "Safe", "Bold", "Experimental"
  promptText: string;
  rationale: string;
  generatedAt: Date;
}

/**
 * Generate graph-aware prompts for a Muse Star
 * Based on nearby images and target attributes
 */
export async function generatePromptsForMuseStar(
  museStar: MuseStar
): Promise<PromptSuggestion[]> {
  // Get context from nearby images
  const nearbyContext = await getNearbyImageContext(museStar.context.nearbyImages);

  // Build prompt for Gemini
  const targetAttrDescription = museStar.targetAttributes
    .map(a => `${a.type}: ${a.value}`)
    .join(', ');

  const systemPrompt = `You are the AI Muse for Graph Starz, a living map of AI images.
Your role is to suggest prompts for images that could expand underexplored regions of the map.

**Context**:
- Target attributes: ${targetAttrDescription}
- Gap in the map: ${museStar.context.attributeGap}
- Nearby images in this region: ${nearbyContext || 'No nearby images yet'}

**Task**: Generate 2-3 creative prompts for AI image generation that:
1. Match the target attributes (${museStar.targetAttributes.map(a => a.value).join(', ')})
2. Would make sense next to the nearby images (or stand alone if no nearby images)
3. Fill the gap in this part of the map
4. Are specific enough to guide image generation

**Variety**: Provide prompts with different levels of creativity:
- One "safe" prompt (clear, straightforward)
- One "bold" prompt (more creative, interesting)
- One "experimental" prompt (unexpected, pushing boundaries)

Format as JSON array:
[
  {
    "label": "Safe",
    "promptText": "the actual prompt for image generation",
    "rationale": "why this prompt fills this gap"
  },
  {
    "label": "Bold",
    "promptText": "...",
    "rationale": "..."
  },
  {
    "label": "Experimental",
    "promptText": "...",
    "rationale": "..."
  }
]

Return ONLY the JSON array, no other text.`;

  const result = await model.generateContent(systemPrompt);
  const response = result.response.text();

  // Parse JSON from response
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                    response.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    throw new Error('Failed to parse AI Muse response');
  }

  const prompts = JSON.parse(jsonMatch[1] || jsonMatch[0]);

  return prompts.map((p: any, idx: number) => ({
    id: `${museStar.id}-prompt-${idx}`,
    museStarId: museStar.id,
    label: p.label || `Prompt ${idx + 1}`,
    promptText: p.promptText,
    rationale: p.rationale,
    generatedAt: new Date(),
  }));
}

/**
 * Get context from nearby images for prompt generation
 */
async function getNearbyImageContext(imageIds: string[]): Promise<string> {
  if (imageIds.length === 0) return '';

  return await runReadTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (i:Image)
      WHERE i.id IN $imageIds
      RETURN i.title as title, i.description as description
      LIMIT 5
      `,
      { imageIds }
    );

    if (result.records.length === 0) return '';

    return result.records
      .map((r: any) => `"${r.get('title')}": ${r.get('description')}`)
      .join('; ');
  });
}
