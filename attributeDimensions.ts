/**
 * Attribute Dimensions Configuration
 *
 * This module is the single source of truth for attribute dimensions in the frontend.
 * Dimension IDs like "style", "mood", "subject", "color" should only be enumerated here.
 * Other code should treat attr.type as opaque and look up metadata via getAttributeDimension.
 */

import type { AttributeChip, RawAttribute } from './types';

export type AttributeDimensionId =
  | 'style'
  | 'mood'
  | 'subject'
  | 'color'
  | 'palette'
  | 'lighting'
  | 'technique'
  | 'composition'
  | 'other';

export interface AttributeDimension {
  id: AttributeDimensionId | string;
  label: string;
  description?: string;
  order: number;
  /** Tailwind classes for text/border/bg styling */
  colorClass: string;
  visibleInUpload: boolean;
  visibleInSidebar: boolean;
  /** Optional canonical vocabulary for this dimension (used for overlap & graph LOD). */
  canonicalValues?: string[];
}

/**
 * Core attribute dimensions with UI metadata
 */
export const ATTRIBUTE_DIMENSIONS: AttributeDimension[] = [
  {
    id: 'style',
    label: 'Style',
    description: 'Overall visual style or medium',
    order: 1,
    colorClass: 'bg-indigo-900/40 text-indigo-200 border border-indigo-400/50',
    visibleInUpload: true,
    visibleInSidebar: true,
    canonicalValues: ['painterly', 'illustration', 'line_art', 'photo', '3d_render', 'digital_art', 'watercolor', 'sketch'],
  },
  {
    id: 'mood',
    label: 'Mood',
    description: 'Emotional tone',
    order: 2,
    colorClass: 'bg-rose-900/40 text-rose-200 border border-rose-400/50',
    visibleInUpload: true,
    visibleInSidebar: true,
    canonicalValues: ['serene', 'energetic', 'melancholic', 'whimsical', 'peaceful', 'dramatic', 'mysterious', 'joyful'],
  },
  {
    id: 'subject',
    label: 'Subject',
    description: 'What the image is about',
    order: 3,
    colorClass: 'bg-emerald-900/40 text-emerald-200 border border-emerald-400/50',
    visibleInUpload: true,
    visibleInSidebar: true,
    canonicalValues: ['portrait', 'landscape', 'cityscape', 'nature', 'animal', 'anthropomorphic', 'abstract', 'still_life'],
  },
  {
    id: 'color',
    label: 'Color',
    description: 'Color palette and temperature',
    order: 4,
    colorClass: 'bg-amber-900/40 text-amber-200 border border-amber-400/50',
    visibleInUpload: true,
    visibleInSidebar: true,
    canonicalValues: ['cool', 'warm', 'pastel', 'monochrome', 'high_contrast', 'muted', 'vibrant', 'earthy'],
  },
  {
    id: 'palette',
    label: 'Palette',
    description: 'Specific color scheme',
    order: 5,
    colorClass: 'bg-violet-900/40 text-violet-200 border border-violet-400/50',
    visibleInUpload: true,
    visibleInSidebar: true,
  },
  {
    id: 'lighting',
    label: 'Lighting',
    description: 'Light quality and direction',
    order: 6,
    colorClass: 'bg-sky-900/40 text-sky-200 border border-sky-400/50',
    visibleInUpload: true,
    visibleInSidebar: true,
    canonicalValues: ['soft', 'harsh', 'ambient', 'backlit', 'dramatic', 'natural', 'golden_hour'],
  },
  {
    id: 'technique',
    label: 'Technique',
    description: 'Artistic technique used',
    order: 7,
    colorClass: 'bg-cyan-900/40 text-cyan-200 border border-cyan-400/50',
    visibleInUpload: true,
    visibleInSidebar: true,
  },
  {
    id: 'composition',
    label: 'Composition',
    description: 'Arrangement and framing',
    order: 8,
    colorClass: 'bg-fuchsia-900/40 text-fuchsia-200 border border-fuchsia-400/50',
    visibleInUpload: true,
    visibleInSidebar: true,
    canonicalValues: ['centered', 'rule_of_thirds', 'symmetrical', 'close_up', 'wide_angle', 'full_body'],
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Unclassified attribute',
    order: 99,
    colorClass: 'bg-slate-800 text-slate-200 border border-slate-500/60',
    visibleInUpload: true,
    visibleInSidebar: true,
  },
];

/**
 * Get dimension metadata by ID
 */
export function getAttributeDimension(id: string): AttributeDimension {
  const normalized = id.toLowerCase().trim();
  const found = ATTRIBUTE_DIMENSIONS.find((d) => d.id === normalized);
  if (found) return found;

  // Fallback "Other" dimension
  const other = ATTRIBUTE_DIMENSIONS.find((d) => d.id === 'other');
  if (other) return other;

  // Ultimate fallback
  return {
    id: normalized,
    label: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    description: 'Unclassified attribute',
    order: 999,
    colorClass: 'bg-slate-800 text-slate-200 border border-slate-500/60',
    visibleInUpload: true,
    visibleInSidebar: true,
  };
}

/**
 * Slugify a value for comparison and ID generation
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Build a canonical id for an attribute (type + slugified value)
 */
export function buildAttributeId(attr: { type: string; value: string }): string {
  const type = attr.type?.toLowerCase().trim() || 'other';
  const valueSlug = slugify(attr.value);
  return `${type}:${valueSlug || 'value'}`;
}

/**
 * Check if a value is in the canonical vocabulary for a dimension
 */
export function isCanonicalAttributeValue(type: string, value: string): boolean {
  const dim = getAttributeDimension(type);
  if (!dim.canonicalValues || dim.canonicalValues.length === 0) return false;
  const slug = slugify(value);
  return dim.canonicalValues.some((v) => slugify(v) === slug);
}

/**
 * Get canonical vocabulary for a dimension
 */
export function getCanonicalValuesForDimension(type: string): string[] {
  const dim = getAttributeDimension(type);
  return dim.canonicalValues ?? [];
}

/**
 * Normalize raw backend attributes into AttributeChips
 */
export function normalizeAttributes(raw: RawAttribute[]): AttributeChip[] {
  const seen = new Set<string>();

  return raw
    .filter((attr) => attr && attr.value)
    .map((attr, index) => {
      const type = attr.type?.toLowerCase().trim() || 'other';
      const value = String(attr.value).trim();
      const confidence =
        typeof attr.confidence === 'number' ? attr.confidence : 0.9;

      const id = buildAttributeId({ type, value }) || `attr:${index}`;
      if (seen.has(id)) {
        // Skip exact duplicates
        return null;
      }
      seen.add(id);

      // Determine canonical status: use explicit flag if provided, otherwise infer from vocab
      const canonical =
        typeof attr.canonical === 'boolean'
          ? attr.canonical
          : isCanonicalAttributeValue(type, value);

      return {
        id,
        type,
        value,
        confidence,
        source: attr.source || 'ai',
        canonical,
      } as AttributeChip;
    })
    .filter((a): a is AttributeChip => Boolean(a));
}

/**
 * Group AttributeChips by their dimension metadata, sorted by dimension.order
 */
export function groupAttributesByDimension(
  attributes: AttributeChip[]
): Array<{ dimension: AttributeDimension; attributes: AttributeChip[] }> {
  const byDim = new Map<string, AttributeChip[]>();

  for (const attr of attributes) {
    const dim = getAttributeDimension(attr.type);
    if (!byDim.has(dim.id)) byDim.set(dim.id, []);
    byDim.get(dim.id)!.push(attr);
  }

  return Array.from(byDim.entries())
    .map(([id, attrs]) => ({
      dimension: getAttributeDimension(id),
      attributes: attrs,
    }))
    .sort((a, b) => a.dimension.order - b.dimension.order);
}
