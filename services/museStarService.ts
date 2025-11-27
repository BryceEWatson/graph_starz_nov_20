const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface MuseStarAttribute {
  type: string;
  value: string;
}

export interface MuseStarContext {
  nearbyImages: string[];
  attributeGap: string;
  imageCount: number;
}

export interface MuseStar {
  id: string;
  type: 'muse_star';
  userId: string;
  targetAttributes: MuseStarAttribute[];
  context: MuseStarContext;
  position?: { x: number; y: number };
}

export interface MuseStarPrompt {
  label: string;
  text: string;
}

export interface FetchMuseStarsResponse {
  museStars: MuseStar[];
  message: string;
}

export interface GeneratePromptsResponse {
  prompts: MuseStarPrompt[];
  message: string;
}

/**
 * Fetch Muse Stars for user's ego network
 */
export async function fetchMuseStars(
  token: string
): Promise<FetchMuseStarsResponse> {
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
  museStar: MuseStar,
  token: string
): Promise<GeneratePromptsResponse> {
  const response = await fetch(`${API_BASE_URL}/muse-stars/prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      museStarId: museStar.id,
      targetAttributes: museStar.targetAttributes,
      context: museStar.context,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate prompts');
  }

  return response.json();
}
