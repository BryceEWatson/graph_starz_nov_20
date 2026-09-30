import { runReadTransaction } from '../config/neo4j.js';
import neo4j from 'neo4j-driver';
import {
  STYLE_DIMENSION_ID,
  MOOD_DIMENSION_ID,
} from '../config/attributeDimensions.js';
import { MuseStar, MUSE_PROMPT_LIMITS } from '../shared/museStarContract.js';

/**
 * Only offer Muse Stars that POST /muse-stars/prompts will accept. Attribute
 * values come from Gemini's image analysis, which doesn't cap their length.
 */
function fitsPromptLimits(museStar: MuseStar): boolean {
  return museStar.targetAttributes.every(
    (a) =>
      typeof a.value === 'string' &&
      a.value.length > 0 &&
      a.value.length <= MUSE_PROMPT_LIMITS.attributeValueLength
  );
}

/**
 * Detect underexplored regions in a user's ego network
 * Returns Muse Stars (suggested nodes) based on attribute gaps
 *
 * Simplified bucket-based detection:
 * - Group images by style and mood
 * - Identify combinations with few (< 3) images
 * - Return these as Muse Stars
 */
export async function detectMuseStarsForUser(
  userId: string,
  limit: number = 5
): Promise<MuseStar[]> {
  return await runReadTransaction(async (tx) => {
    // Get all images in user's ego network and their attributes
    const result = await tx.run(
      `
      // Get user's images and nearby similar images
      MATCH (u:User {id: $userId})-[:UPLOADED]->(i:Image)
      OPTIONAL MATCH (i)-[:SIMILAR_TO]-(nearby:Image)

      // Collect all images to consider
      WITH u, collect(DISTINCT i) + collect(DISTINCT nearby) as allImages
      UNWIND allImages as img

      // Get attributes for each image, focusing on style and mood
      MATCH (img)-[:HAS_ATTRIBUTE]->(a:Attribute)
      WHERE a.type IN [$styleType, $moodType]

      // Group by attribute type and value
      WITH a.type as attrType, a.value as attrValue,
           collect(DISTINCT img.id) as imageIds,
           count(DISTINCT img) as imageCount

      // Find underrepresented combinations
      WHERE imageCount < 3

      // Get some context images
      RETURN attrType, attrValue, imageCount, imageIds
      ORDER BY imageCount ASC
      LIMIT $limit
      `,
      {
        userId,
        limit: neo4j.int(limit),
        styleType: STYLE_DIMENSION_ID,
        moodType: MOOD_DIMENSION_ID,
      }
    );

    const museStars: MuseStar[] = result.records.map((record: any, idx: number) => ({
      id: `muse-star-${userId}-${idx}`,
      type: 'muse_star',
      userId,
      targetAttributes: [
        {
          type: record.get('attrType'),
          value: record.get('attrValue'),
        },
      ],
      context: {
        nearbyImages: record.get('imageIds').slice(0, 5), // Limit context images
        attributeGap: `Only ${record.get('imageCount')} image(s) with ${record.get('attrType')}: ${record.get('attrValue')}`,
        imageCount: record.get('imageCount'),
      },
    }));

    return museStars.filter(fitsPromptLimits);
  });
}

/**
 * Alternative detection using attribute combinations (style + mood buckets)
 */
export async function detectMuseStarsByBuckets(
  userId: string,
  limit: number = 5
): Promise<MuseStar[]> {
  return await runReadTransaction(async (tx) => {
    const result = await tx.run(
      `
      // Get user's images
      MATCH (u:User {id: $userId})-[:UPLOADED]->(i:Image)

      // Get style and mood attributes
      OPTIONAL MATCH (i)-[:HAS_ATTRIBUTE]->(style:Attribute {type: $styleType})
      OPTIONAL MATCH (i)-[:HAS_ATTRIBUTE]->(mood:Attribute {type: $moodType})

      // Group by style + mood combination
      WITH style.value as styleValue, mood.value as moodValue,
           collect(DISTINCT i) as images,
           count(DISTINCT i) as imageCount

      WHERE styleValue IS NOT NULL AND moodValue IS NOT NULL

      // Find all possible combinations from existing attributes
      WITH collect({style: styleValue, mood: moodValue, count: imageCount, images: images}) as buckets

      // Identify low-count buckets
      UNWIND buckets as bucket
      WITH bucket
      WHERE bucket.count < 2

      RETURN bucket.style as styleValue,
             bucket.mood as moodValue,
             bucket.count as imageCount,
             [img in bucket.images | img.id] as imageIds
      ORDER BY bucket.count ASC
      LIMIT $limit
      `,
      {
        userId,
        limit: neo4j.int(limit),
        styleType: STYLE_DIMENSION_ID,
        moodType: MOOD_DIMENSION_ID,
      }
    );

    const museStars: MuseStar[] = result.records.map((record: any, idx: number) => ({
      id: `muse-star-bucket-${userId}-${idx}`,
      type: 'muse_star',
      userId,
      targetAttributes: [
        {
          type: STYLE_DIMENSION_ID,
          value: record.get('styleValue'),
        },
        {
          type: MOOD_DIMENSION_ID,
          value: record.get('moodValue'),
        },
      ],
      context: {
        nearbyImages: record.get('imageIds').slice(0, 5),
        attributeGap: `Only ${record.get('imageCount')} image(s) combining ${record.get('styleValue')} style with ${record.get('moodValue')} mood`,
        imageCount: record.get('imageCount'),
      },
    }));

    return museStars.filter(fitsPromptLimits);
  });
}

/**
 * Get Muse Stars for user's ego network
 * Uses simple attribute-based detection for MVP
 */
export async function getMuseStarsForUser(userId: string): Promise<MuseStar[]> {
  // Try bucket-based detection first
  let museStars = await detectMuseStarsByBuckets(userId, 3);

  // If no results, fall back to single-attribute detection
  if (museStars.length === 0) {
    museStars = await detectMuseStarsForUser(userId, 5);
  }

  return museStars;
}
