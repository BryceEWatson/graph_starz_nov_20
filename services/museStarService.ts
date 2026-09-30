import { GraphNode, NodeType } from '../types';
import type {
  GeneratePromptsRequest,
  GeneratePromptsResponse,
  MuseStar,
  MuseStarsResponse,
} from '../backend/src/shared/museStarContract';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Request and response types come from the backend's contract file, so the
// panel and the routes use the same field names
export type {
  GeneratePromptsRequest,
  GeneratePromptsResponse,
  MuseStar,
  MuseStarAttribute,
  MuseStarContext,
  MuseStarsResponse,
  PromptSuggestion,
} from '../backend/src/shared/museStarContract';

/**
 * Turn a Muse Star from the backend into a node on the map
 */
export function museStarToGraphNode(museStar: MuseStar): GraphNode {
  return {
    id: museStar.id,
    type: NodeType.MUSE_STAR,
    label: museStar.targetAttributes.map((a) => a.value).join(' + '),
    radius: 30,
    targetAttributes: museStar.targetAttributes,
    attributeGap: museStar.context.attributeGap,
    imageCount: museStar.context.imageCount,
    nearbyImages: museStar.context.nearbyImages,
    x: museStar.position?.x || Math.random() * 1000,
    y: museStar.position?.y || Math.random() * 1000,
  };
}

/**
 * Build the prompt request the Muse panel sends for a Muse Star node
 */
export function buildGeneratePromptsRequest(museStar: GraphNode): GeneratePromptsRequest {
  return {
    museStarId: museStar.id,
    targetAttributes: museStar.targetAttributes || [],
    context: {
      nearbyImages: museStar.nearbyImages || [],
      attributeGap: museStar.attributeGap || '',
      imageCount: museStar.imageCount || 0,
    },
  };
}

/**
 * Fetch Muse Stars for user's ego network
 */
export async function fetchMuseStars(
  token: string
): Promise<MuseStarsResponse> {
  const response = await fetch(`${API_BASE_URL}/muse-stars/ego`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch Muse Stars');
  }

  return response.json();
}

/**
 * Generate prompts for a specific Muse Star
 */
export async function generatePrompts(
  request: GeneratePromptsRequest,
  token: string
): Promise<GeneratePromptsResponse> {
  const response = await fetch(`${API_BASE_URL}/muse-stars/prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate prompts');
  }

  return response.json();
}
