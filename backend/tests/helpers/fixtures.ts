/**
 * Database rows and Gemini replies shared by the route tests.
 * Counts are written as plain numbers. The fake driver hands them to the app as
 * Integer objects unless src/config/neo4j.ts sets disableLosslessIntegers, just
 * as the real driver does, so the Muse flow test fails if that setting goes.
 */
import { fakeNeo4j, fakeGemini, node, APPROVED_USER } from './fakes.js';
import { GeneratePromptsRequest } from '../../src/shared/museStarContract.js';

export const MUSE_BUCKETS_QUERY = /WHERE bucket\.count < 2/;
export const MUSE_SINGLE_ATTRIBUTE_QUERY = /WHERE imageCount < 3/;
export const NEARBY_IMAGES_QUERY = /WHERE i\.id IN \$imageIds/;
export const GLOBAL_GRAPH_QUERY = /SKIP \$skip/;
export const EGO_GRAPH_QUERY = /collect\(DISTINCT i\) as images/;

const HARBOR_IMAGE = {
  id: 'img-harbor',
  url: 'https://storage.test/test-bucket/images/img-harbor.png',
  thumbnailUrl: 'https://storage.test/test-bucket/images/img-harbor.png',
  title: 'Quiet Harbor',
  description: 'Boats at rest in a misty harbor.',
  uploadedAt: '2025-11-28T00:00:00Z',
};

const FOREST_IMAGE = {
  id: 'img-forest',
  url: 'https://storage.test/test-bucket/images/img-forest.png',
  thumbnailUrl: 'https://storage.test/test-bucket/images/img-forest.png',
  title: 'Night Forest',
  description: 'Fireflies between tall pines.',
  uploadedAt: '2025-11-27T00:00:00Z',
};

// Stored user nodes carry an email address; graph responses must never include it
const OTHER_CREATOR = {
  id: 'user-other',
  email: 'other.creator@example.com',
  name: 'Other Creator',
  profilePictureUrl: 'https://example.com/other.png',
};

const WATERCOLOR = { type: 'style', value: 'watercolor' };

/** Rows for the global map and the ego map, both with uploaders' stored emails. */
export function useGraphRows() {
  fakeNeo4j.on(GLOBAL_GRAPH_QUERY, () => [
    {
      i: node(HARBOR_IMAGE),
      u: node(APPROVED_USER),
      attrs: [{ attr: node(WATERCOLOR), rel: { properties: { confidence: 0.9, canonical: true } } }],
      uploadRel: { properties: {} },
    },
    {
      i: node(FOREST_IMAGE),
      u: node(OTHER_CREATOR),
      attrs: [{ attr: node(WATERCOLOR), rel: { properties: { confidence: 0.8, canonical: true } } }],
      uploadRel: { properties: {} },
    },
  ]);

  fakeNeo4j.on(EGO_GRAPH_QUERY, () => [
    {
      u: node(APPROVED_USER),
      images: [node(HARBOR_IMAGE)],
      attributes: [node(WATERCOLOR)],
      similarImages: [node(FOREST_IMAGE)],
      similarAttributes: [node(WATERCOLOR)],
      uploadRelData: [{ imageId: HARBOR_IMAGE.id }],
      attrRelData: [
        { imageId: HARBOR_IMAGE.id, attrType: 'style', attrValue: 'watercolor', confidence: 0.9, canonical: true },
      ],
      simRelData: [{ img1: HARBOR_IMAGE.id, img2: FOREST_IMAGE.id, similarity: 0.8 }],
    },
  ]);
}

/** Rows for Muse Star detection and the nearby-image lookup the AI Muse runs. */
export function useMuseStarRows() {
  fakeNeo4j.on(MUSE_BUCKETS_QUERY, () => [
    { styleValue: 'watercolor', moodValue: 'serene', imageCount: 1, imageIds: [HARBOR_IMAGE.id] },
  ]);
  fakeNeo4j.on(MUSE_SINGLE_ATTRIBUTE_QUERY, () => []);
  fakeNeo4j.on(NEARBY_IMAGES_QUERY, () => [
    { title: HARBOR_IMAGE.title, description: HARBOR_IMAGE.description },
  ]);
}

/** Rows for a signed upload and its completion. */
export function useUploadRows() {
  fakeNeo4j.on(/CREATE \(p:PendingUpload/, () => []);
  fakeNeo4j.on(/MATCH \(p:PendingUpload/, () => [{ contentType: 'image/png' }]);
  fakeNeo4j.on(/CREATE \(i:Image/, (params) => [
    {
      i: node({
        id: params.imageId,
        url: params.url,
        thumbnailUrl: params.thumbnailUrl,
        title: params.title,
        description: params.description,
        uploadedAt: '2025-11-28T00:00:00Z',
      }),
    },
  ]);
  fakeNeo4j.on(/MERGE \(a:Attribute/, () => []);
}

/** What Gemini returns for the AI Muse, fenced the way the model often answers. */
export const MUSE_REPLY =
  '```json\n' +
  JSON.stringify([
    { label: 'Safe', promptText: 'A watercolor harbor at dawn, calm water', rationale: 'Adds a second serene watercolor.' },
    { label: 'Bold', promptText: 'A watercolor lighthouse in a soft storm', rationale: 'Pushes the mood while staying serene.' },
    { label: 'Experimental', promptText: 'A watercolor harbor seen from underwater', rationale: 'An unexpected angle on the same gap.' },
  ]) +
  '\n```';

/** What Gemini returns when it analyzes an upload. */
export const IMAGE_ANALYSIS_REPLY = JSON.stringify({
  title: 'Quiet Harbor',
  description: 'Boats at rest in a misty harbor.',
  attributes: [{ type: 'style', value: 'watercolor', confidence: 0.9, canonical: true }],
});

/** Reset the fake Gemini and give it realistic replies for both kinds of call. */
export function useGeminiReplies() {
  fakeGemini.reset();
  fakeGemini.museReply = MUSE_REPLY;
  fakeGemini.imageAnalysisReply = IMAGE_ANALYSIS_REPLY;
}

/** A prompt request the Muse panel could send. */
export function validPromptRequest(): GeneratePromptsRequest {
  return {
    museStarId: `muse-star-bucket-${APPROVED_USER.id}-0`,
    targetAttributes: [
      { type: 'style', value: 'watercolor' },
      { type: 'mood', value: 'serene' },
    ],
    context: {
      nearbyImages: [HARBOR_IMAGE.id],
      attributeGap: 'Only 1 image(s) combining watercolor style with serene mood',
      imageCount: 1,
    },
  };
}

/** A completion request for an upload that /uploads/init issued. */
export function validUploadCompletion() {
  const imageId = '6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';
  return { imageId, gcsPath: `images/${imageId}.png` };
}
