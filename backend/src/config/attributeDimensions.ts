/**
 * Attribute Dimensions Configuration (Backend)
 *
 * Minimal backend config used for prompts + queries.
 * Backend doesn't need UI colors or icons - just stable IDs, descriptions, and canonical vocabularies.
 */

export const CORE_ATTRIBUTE_DIMENSIONS = [
  'style',
  'mood',
  'subject',
  'color',
  'lighting',
  'composition',
] as const;

export type AttributeDimensionId =
  | (typeof CORE_ATTRIBUTE_DIMENSIONS)[number]
  | string;

export interface AttributeDimensionConfig {
  id: AttributeDimensionId;
  description?: string;
  /** Canonical vocabulary for this dimension - used for overlap & graph connectivity. */
  canonicalValues?: string[];
}

/**
 * Backend config used for prompts + queries, including canonical vocabularies.
 */
export const ATTRIBUTE_DIMENSION_CONFIG: AttributeDimensionConfig[] = [
  {
    id: 'style',
    description:
      'Overall visual style or medium (photographic, painterly, cyberpunk, etc.)',
    canonicalValues: ['painterly', 'illustration', 'line_art', 'photo', '3d_render', 'digital_art', 'watercolor', 'sketch'],
  },
  {
    id: 'mood',
    description:
      'Emotional tone (energetic, peaceful, dramatic, mysterious, etc.)',
    canonicalValues: ['serene', 'energetic', 'melancholic', 'whimsical', 'peaceful', 'dramatic', 'mysterious', 'joyful'],
  },
  {
    id: 'subject',
    description:
      'What the image depicts (portrait, landscape, cityscape, nature, etc.)',
    canonicalValues: ['portrait', 'landscape', 'cityscape', 'nature', 'animal', 'anthropomorphic', 'abstract', 'still_life'],
  },
  {
    id: 'color',
    description:
      'Color palette and temperature (vibrant, monochrome, warm_tones, cool_tones, etc.)',
    canonicalValues: ['cool', 'warm', 'pastel', 'monochrome', 'high_contrast', 'muted', 'vibrant', 'earthy'],
  },
  {
    id: 'lighting',
    description:
      'Light quality and direction (soft, harsh, ambient, backlit, etc.)',
    canonicalValues: ['soft', 'harsh', 'ambient', 'backlit', 'dramatic', 'natural', 'golden_hour'],
  },
  {
    id: 'composition',
    description:
      'Arrangement and framing (centered, rule_of_thirds, symmetrical, etc.)',
    canonicalValues: ['centered', 'rule_of_thirds', 'symmetrical', 'close_up', 'wide_angle', 'full_body'],
  },
];

/**
 * Get dimension config by ID
 */
export function getAttributeDimensionConfig(
  id: string
): AttributeDimensionConfig | undefined {
  return ATTRIBUTE_DIMENSION_CONFIG.find(
    (d) => d.id === id.toLowerCase().trim()
  );
}

/**
 * Get canonical values for a dimension
 */
export function getCanonicalValuesForDimension(id: string): string[] {
  const dim = getAttributeDimensionConfig(id);
  return dim?.canonicalValues ?? [];
}

/**
 * Check if a value is canonical for a given dimension
 */
export function isCanonicalValue(dimensionId: string, value: string): boolean {
  const canonicalValues = getCanonicalValuesForDimension(dimensionId);
  if (canonicalValues.length === 0) return false;
  const normalizedValue = value.toLowerCase().trim().replace(/\s+/g, '_');
  return canonicalValues.some(
    (v) => v.toLowerCase().replace(/\s+/g, '_') === normalizedValue
  );
}

/**
 * Constants for commonly used dimension IDs in Cypher queries
 */
export const STYLE_DIMENSION_ID = 'style';
export const MOOD_DIMENSION_ID = 'mood';
export const SUBJECT_DIMENSION_ID = 'subject';
export const COLOR_DIMENSION_ID = 'color';
export const LIGHTING_DIMENSION_ID = 'lighting';
export const COMPOSITION_DIMENSION_ID = 'composition';
