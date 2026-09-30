/**
 * AI Muse API contract, shared by the backend and the front end.
 *
 * The front end imports this file directly (services/museStarService.ts), so the
 * Muse panel and the routes share one definition of the request and response.
 * Keep it free of imports so both builds can compile it.
 */

/** Size limits for POST /muse-stars/prompts, enforced by the route's schema. */
export const MUSE_PROMPT_LIMITS = {
  museStarIdLength: 128,
  targetAttributes: 4,
  attributeValueLength: 100,
  nearbyImages: 5,
  imageIdLength: 100,
  attributeGapLength: 300,
} as const;

export interface MuseStarAttribute {
  /** A core dimension: style, mood, subject, color, lighting or composition. The prompts route rejects anything else. */
  type: string;
  value: string;
}

export interface MuseStarContext {
  /** IDs of images near this part of the map. */
  nearbyImages: string[];
  /** Plain-language description of what's underexplored. */
  attributeGap: string;
  /** How many images already sit in this part of the map. */
  imageCount: number;
}

/** A Muse Star: a suggested spot on the map where a new image would fill a gap. */
export interface MuseStar {
  id: string;
  type: 'muse_star';
  userId: string;
  targetAttributes: MuseStarAttribute[];
  context: MuseStarContext;
  position?: { x: number; y: number };
}

/** GET /muse-stars/ego response. */
export interface MuseStarsResponse {
  museStars: MuseStar[];
  message: string;
}

/** POST /muse-stars/prompts request body. */
export interface GeneratePromptsRequest {
  museStarId?: string;
  targetAttributes: MuseStarAttribute[];
  context: {
    nearbyImages: string[];
    attributeGap: string;
    imageCount?: number;
  };
}

/** One AI Muse suggestion. */
export interface PromptSuggestion {
  id: string;
  museStarId: string;
  /** "Safe", "Bold" or "Experimental". */
  label: string;
  /** The prompt to paste into an image generator. */
  promptText: string;
  rationale: string;
  /** ISO 8601 timestamp. */
  generatedAt: string;
}

/** POST /muse-stars/prompts response. */
export interface GeneratePromptsResponse {
  prompts: PromptSuggestion[];
  message: string;
}
