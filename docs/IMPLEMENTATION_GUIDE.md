# Graph Starz Implementation Guide

This guide provides step-by-step implementation details for building the MVP features. Each phase includes code examples, integration patterns, and best practices.

**Context**: Graph Starz is a **living map of AI images**—a global graph index where creators are stars and every image is a point. The implementation below powers this map, including the **AI Muse** that suggests what to create next through **Muse Stars** (UI term for suggested nodes pointing to underexplored regions).

## Table of Contents

1. [Phase 1: Authentication](#phase-1-authentication)
2. [Phase 2: Upload Pipeline](#phase-2-upload-pipeline)
3. [Phase 3: Graph Queries](#phase-3-graph-queries)
4. [Phase 4: AI & Similarity](#phase-4-ai--similarity)
5. [Phase 5: Muse Stars & Graph-Aware Prompt Suggestions](#phase-5-muse-stars--graph-aware-prompt-suggestions)
6. [Common Patterns](#common-patterns)

---

## Phase 1: Authentication

### Overview
Implement Google OAuth 2.0 authentication with JWT session tokens.

### Implementation Steps

#### 1.1 Create Auth Service

**File: `backend/src/services/authService.ts`**

```typescript
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { runWriteTransaction, runReadTransaction } from '../config/neo4j.js';

const oauth2Client = new OAuth2Client(
  config.oauth.clientId,
  config.oauth.clientSecret,
  config.oauth.redirectUri
);

export interface User {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string;
  createdAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Exchange Google OAuth code for user tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: config.oauth.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error('No email in Google token');
  }

  return {
    email: payload.email,
    name: payload.name || 'Unknown User',
    profilePictureUrl: payload.picture,
  };
}

/**
 * Find or create user in Neo4j
 */
export async function findOrCreateUser(googleUser: {
  email: string;
  name: string;
  profilePictureUrl?: string;
}): Promise<User> {
  return await runWriteTransaction(async (tx) => {
    const result = await tx.run(
      `
      MERGE (u:User {email: $email})
      ON CREATE SET
        u.id = randomUUID(),
        u.name = $name,
        u.profilePictureUrl = $profilePictureUrl,
        u.createdAt = datetime()
      ON MATCH SET
        u.name = $name,
        u.profilePictureUrl = $profilePictureUrl
      RETURN u
      `,
      {
        email: googleUser.email,
        name: googleUser.name,
        profilePictureUrl: googleUser.profilePictureUrl || null,
      }
    );

    const record = result.records[0];
    const node = record.get('u').properties;

    return {
      id: node.id,
      email: node.email,
      name: node.name,
      profilePictureUrl: node.profilePictureUrl,
      createdAt: new Date(node.createdAt),
    };
  });
}

/**
 * Generate JWT for user session
 */
export function generateJWT(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '24h',
    issuer: 'graph-starz',
  });
}

/**
 * Verify and decode JWT
 */
export function verifyJWT(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret, {
    issuer: 'graph-starz',
  }) as TokenPayload;
}

/**
 * Get user by ID from Neo4j
 */
export async function getUserById(userId: string): Promise<User | null> {
  return await runReadTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (u:User {id: $userId})
      RETURN u
      `,
      { userId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const node = result.records[0].get('u').properties;
    return {
      id: node.id,
      email: node.email,
      name: node.name,
      profilePictureUrl: node.profilePictureUrl,
      createdAt: new Date(node.createdAt),
    };
  });
}
```

#### 1.2 Create Auth Middleware

**File: `backend/src/middleware/authMiddleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyJWT, getUserById } from '../services/authService.js';
import { ApiError } from './errorMiddleware.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);

    // Verify user still exists
    const user = await getUserById(payload.userId);
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Attach user to request
    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(401, 'Invalid or expired token'));
    }
  }
}

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyJWT(token);

      req.user = {
        id: payload.userId,
        email: payload.email,
      };
    }

    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
}
```

#### 1.3 Create Auth Routes

**File: `backend/src/routes/auth.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { exchangeCodeForTokens, findOrCreateUser, generateJWT } from '../services/authService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { ApiError } from '../middleware/errorMiddleware.js';

export const authRouter = Router();

// Request validation schemas
const googleAuthSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
});

/**
 * POST /auth/google
 * Exchange Google OAuth code for JWT
 */
authRouter.post('/google', async (req: Request, res: Response) => {
  // Validate request body
  const { code } = googleAuthSchema.parse(req.body);

  // Exchange code for Google user info
  const googleUser = await exchangeCodeForTokens(code);

  // Find or create user in database
  const user = await findOrCreateUser(googleUser);

  // Generate JWT
  const token = generateJWT(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
    },
  });
});

/**
 * GET /auth/validate
 * Validate current JWT token
 */
authRouter.get('/validate', requireAuth, async (req: Request, res: Response) => {
  res.json({
    valid: true,
    user: req.user,
  });
});

/**
 * POST /auth/logout
 * Logout (client-side token deletion)
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  // JWT is stateless, so logout is client-side only
  res.json({ message: 'Logged out successfully' });
});
```

#### 1.4 Register Auth Routes

**File: `backend/src/index.ts`** (update)

```typescript
// Add to imports
import { authRouter } from './routes/auth.js';

// Add after health route
app.use('/auth', authRouter);
```

### Testing Auth

```bash
# Get OAuth code from frontend, then:
curl -X POST http://localhost:4000/auth/google \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_GOOGLE_AUTH_CODE"}'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "user": { "id": "...", "email": "...", "name": "..." }
# }

# Validate token:
curl http://localhost:4000/auth/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Phase 2: Upload Pipeline

### Overview
Handle image uploads to GCS and trigger AI analysis.

### Implementation Steps

#### 2.1 Create Storage Service

**File: `backend/src/services/storageService.ts`**

```typescript
import { Storage } from '@google-cloud/storage';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

const storage = new Storage({
  projectId: config.gcs.projectId,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket(config.gcs.bucket);

export interface SignedUploadUrl {
  uploadUrl: string;
  imageId: string;
  gcsPath: string;
}

/**
 * Generate signed URL for direct GCS upload
 */
export async function generateSignedUploadUrl(
  filename: string,
  contentType: string
): Promise<SignedUploadUrl> {
  // Generate unique image ID
  const imageId = uuidv4();
  const extension = filename.split('.').pop();
  const gcsPath = `images/${imageId}.${extension}`;

  const file = bucket.file(gcsPath);

  // Generate signed URL (valid for 15 minutes)
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });

  return {
    uploadUrl,
    imageId,
    gcsPath,
  };
}

/**
 * Get public URL for uploaded image
 */
export function getPublicUrl(gcsPath: string): string {
  return `https://storage.googleapis.com/${config.gcs.bucket}/${gcsPath}`;
}

/**
 * Generate thumbnail (simplified - use Sharp for production)
 */
export async function generateThumbnail(gcsPath: string): Promise<string> {
  // For MVP, return same URL
  // In production, use Sharp to resize and upload thumbnail
  const thumbnailPath = gcsPath.replace('images/', 'thumbnails/');
  return thumbnailPath;
}
```

#### 2.2 Create AI Service

**File: `backend/src/services/aiService.ts`**

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
 */
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
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

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
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
```

#### 2.3 Create Graph Service

**File: `backend/src/services/graphService.ts`**

```typescript
import { runWriteTransaction, runReadTransaction } from '../config/neo4j.js';
import { ImageAnalysis } from './aiService.js';

export interface Image {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  uploadedAt: Date;
  uploaderId: string;
}

/**
 * Create image node with attributes and relationships
 */
export async function createImageWithAttributes(
  imageId: string,
  userId: string,
  url: string,
  thumbnailUrl: string,
  analysis: ImageAnalysis
): Promise<Image> {
  return await runWriteTransaction(async (tx) => {
    // Create image node and UPLOADED relationship
    const imageResult = await tx.run(
      `
      MATCH (u:User {id: $userId})
      CREATE (i:Image {
        id: $imageId,
        url: $url,
        thumbnailUrl: $thumbnailUrl,
        title: $title,
        description: $description,
        uploadedAt: datetime()
      })
      CREATE (u)-[:UPLOADED {timestamp: datetime()}]->(i)
      RETURN i
      `,
      {
        userId,
        imageId,
        url,
        thumbnailUrl,
        title: analysis.title,
        description: analysis.description,
      }
    );

    const imageNode = imageResult.records[0].get('i').properties;

    // Create or link attributes
    for (const attr of analysis.attributes) {
      await tx.run(
        `
        MATCH (i:Image {id: $imageId})
        MERGE (a:Attribute {type: $type, value: $value})
        CREATE (i)-[:HAS_ATTRIBUTE {confidence: $confidence}]->(a)
        `,
        {
          imageId,
          type: attr.type,
          value: attr.value,
          confidence: attr.confidence,
        }
      );
    }

    return {
      id: imageNode.id,
      url: imageNode.url,
      thumbnailUrl: imageNode.thumbnailUrl,
      title: imageNode.title,
      description: imageNode.description,
      uploadedAt: new Date(imageNode.uploadedAt),
      uploaderId: userId,
    };
  });
}
```

#### 2.4 Create Upload Routes

**File: `backend/src/routes/uploads.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware.js';
import { generateSignedUploadUrl, getPublicUrl, generateThumbnail } from '../services/storageService.js';
import { analyzeImage } from '../services/aiService.js';
import { createImageWithAttributes } from '../services/graphService.js';

export const uploadsRouter = Router();

// All upload routes require authentication
uploadsRouter.use(requireAuth);

const initUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
});

const completeUploadSchema = z.object({
  imageId: z.string().uuid(),
  gcsPath: z.string(),
});

/**
 * POST /uploads/init
 * Get signed URL for direct GCS upload
 */
uploadsRouter.post('/init', async (req: Request, res: Response) => {
  const { filename, contentType } = initUploadSchema.parse(req.body);

  const { uploadUrl, imageId, gcsPath } = await generateSignedUploadUrl(
    filename,
    contentType
  );

  res.json({
    uploadUrl,
    imageId,
    gcsPath,
  });
});

/**
 * POST /uploads/complete
 * Trigger AI analysis and create graph nodes
 */
uploadsRouter.post('/complete', async (req: Request, res: Response) => {
  const { imageId, gcsPath } = completeUploadSchema.parse(req.body);
  const userId = req.user!.id;

  // Get public URL
  const imageUrl = getPublicUrl(gcsPath);

  // Analyze image with Gemini
  const analysis = await analyzeImage(imageUrl);

  // Generate thumbnail
  const thumbnailUrl = await generateThumbnail(gcsPath);

  // Create graph nodes
  const image = await createImageWithAttributes(
    imageId,
    userId,
    imageUrl,
    getPublicUrl(thumbnailUrl),
    analysis
  );

  res.json({
    image,
    analysis,
  });
});
```

---

## Phase 3: Graph Queries

### Implementation Steps

#### 3.1 Extend Graph Service

**File: `backend/src/services/graphService.ts`** (add to existing)

```typescript
export interface GraphNode {
  id: string;
  type: 'user' | 'image' | 'attribute';
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  type: 'UPLOADED' | 'HAS_ATTRIBUTE' | 'SIMILAR_TO';
  source: string;
  target: string;
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Get user's ego network (their uploads + attributes)
 */
export async function getUserEgoNetwork(userId: string): Promise<GraphData> {
  return await runReadTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[r1:UPLOADED]->(i:Image)
      OPTIONAL MATCH (i)-[r2:HAS_ATTRIBUTE]->(a:Attribute)
      OPTIONAL MATCH (i)-[r3:SIMILAR_TO]-(similar:Image)
      RETURN u, collect(distinct i) as images,
             collect(distinct a) as attributes,
             collect(distinct similar) as similarImages,
             collect(distinct r1) as uploadRels,
             collect(distinct r2) as attrRels,
             collect(distinct r3) as simRels
      `,
      { userId }
    );

    if (result.records.length === 0) {
      return { nodes: [], edges: [] };
    }

    const record = result.records[0];
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Add user node
    const user = record.get('u');
    nodes.push({
      id: user.properties.id,
      type: 'user',
      properties: user.properties,
    });

    // Add image nodes
    const images = record.get('images');
    images.forEach((img: any) => {
      if (img) {
        nodes.push({
          id: img.properties.id,
          type: 'image',
          properties: img.properties,
        });
      }
    });

    // Add attribute nodes
    const attributes = record.get('attributes');
    attributes.forEach((attr: any) => {
      if (attr) {
        const nodeId = `${attr.properties.type}:${attr.properties.value}`;
        nodes.push({
          id: nodeId,
          type: 'attribute',
          properties: attr.properties,
        });
      }
    });

    // Add similar image nodes
    const similarImages = record.get('similarImages');
    similarImages.forEach((img: any) => {
      if (img && !nodes.find(n => n.id === img.properties.id)) {
        nodes.push({
          id: img.properties.id,
          type: 'image',
          properties: img.properties,
        });
      }
    });

    // Add edges (relationships)
    const uploadRels = record.get('uploadRels');
    uploadRels.forEach((rel: any, idx: number) => {
      if (rel) {
        edges.push({
          id: `upload-${idx}`,
          type: 'UPLOADED',
          source: userId,
          target: rel.end.properties.id,
          properties: rel.properties,
        });
      }
    });

    // Continue for other relationship types...

    return { nodes, edges };
  });
}

/**
 * Get global graph sample (paginated)
 */
export async function getGlobalGraphSample(
  limit: number = 100,
  skip: number = 0
): Promise<GraphData> {
  return await runReadTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (i:Image)-[r:HAS_ATTRIBUTE]->(a:Attribute)
      WITH i, collect({attr: a, rel: r}) as attrs
      ORDER BY i.uploadedAt DESC
      SKIP $skip
      LIMIT $limit
      MATCH (u:User)-[:UPLOADED]->(i)
      RETURN i, u, attrs
      `,
      { limit, skip }
    );

    // Transform to graph format
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Process results...

    return { nodes, edges };
  });
}
```

#### 3.2 Create Graph Routes

**File: `backend/src/routes/graph.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import { getUserEgoNetwork, getGlobalGraphSample } from '../services/graphService.js';

export const graphRouter = Router();

/**
 * GET /graph/ego
 * Get authenticated user's ego network
 */
graphRouter.get('/ego', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const graph = await getUserEgoNetwork(userId);

  res.json(graph);
});

/**
 * GET /graph/global
 * Get sampled global graph (optionally authenticated)
 */
graphRouter.get('/global', optionalAuth, async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const skip = parseInt(req.query.skip as string) || 0;

  const graph = await getGlobalGraphSample(limit, skip);

  res.json(graph);
});
```

---

## Phase 4: AI & Similarity

### Implementation Steps

#### 4.1 Calculate Image Similarity

**File: `backend/src/services/similarityService.ts`**

```typescript
import { runWriteTransaction, runReadTransaction } from '../config/neo4j.js';

const SIMILARITY_THRESHOLD = 0.7;

/**
 * Calculate similarity between images based on shared attributes
 */
export async function calculateImageSimilarity(imageId: string): Promise<void> {
  await runWriteTransaction(async (tx) => {
    // Find images with shared attributes
    const result = await tx.run(
      `
      MATCH (i1:Image {id: $imageId})-[r1:HAS_ATTRIBUTE]->(a:Attribute)
      MATCH (i2:Image)-[r2:HAS_ATTRIBUTE]->(a)
      WHERE i1 <> i2
      WITH i1, i2,
           count(a) as sharedAttrs,
           avg(r1.confidence * r2.confidence) as avgConfidence
      MATCH (i1)-[:HAS_ATTRIBUTE]->()
      WITH i1, i2, sharedAttrs, avgConfidence, count(*) as totalAttrs1
      MATCH (i2)-[:HAS_ATTRIBUTE]->()
      WITH i1, i2, sharedAttrs, avgConfidence, totalAttrs1, count(*) as totalAttrs2
      WITH i1, i2,
           (toFloat(sharedAttrs) / (totalAttrs1 + totalAttrs2 - sharedAttrs)) * avgConfidence as similarity
      WHERE similarity >= $threshold
      MERGE (i1)-[s:SIMILAR_TO]-(i2)
      SET s.similarity = similarity
      RETURN count(*) as created
      `,
      {
        imageId,
        threshold: SIMILARITY_THRESHOLD,
      }
    );

    return result.records[0]?.get('created') || 0;
  });
}

/**
 * Find similar images to a given image
 */
export async function findSimilarImages(
  imageId: string,
  limit: number = 10
): Promise<Array<{ image: any; similarity: number }>> {
  return await runReadTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (i1:Image {id: $imageId})-[s:SIMILAR_TO]-(i2:Image)
      RETURN i2 as image, s.similarity as similarity
      ORDER BY similarity DESC
      LIMIT $limit
      `,
      { imageId, limit }
    );

    return result.records.map(r => ({
      image: r.get('image').properties,
      similarity: r.get('similarity'),
    }));
  });
}
```

#### 4.2 Background Job for Similarity (Optional)

**File: `backend/src/services/jobService.ts`**

```typescript
import { calculateImageSimilarity } from './similarityService.js';
import { logger } from '../utils/logger.js';

/**
 * Queue for processing similarity calculations
 */
const similarityQueue: string[] = [];
let processing = false;

export function queueSimilarityCalculation(imageId: string): void {
  similarityQueue.push(imageId);
  processSimilarityQueue();
}

async function processSimilarityQueue(): Promise<void> {
  if (processing || similarityQueue.length === 0) {
    return;
  }

  processing = true;

  while (similarityQueue.length > 0) {
    const imageId = similarityQueue.shift()!;

    try {
      await calculateImageSimilarity(imageId);
      logger.info(`Similarity calculated for image ${imageId}`);
    } catch (error) {
      logger.error(`Similarity calculation failed for ${imageId}:`, error);
    }
  }

  processing = false;
}
```

---

## Phase 5: Muse Stars & Graph-Aware Prompt Suggestions

### Overview

Implement the **Muse Stars** feature—subtle suggested nodes in the graph that point to underexplored regions. When clicked, the **AI Muse** generates 2-3 contextual prompts for images that could expand that part of the map.

**UI Terminology**: "Muse Star" (what users see)
**Internal/DTO Terminology**: `GapNode` or `MuseStarNode` (what code uses)

### Implementation Steps

#### 5.1 Create Muse Star Detection Service

**File: `backend/src/services/museStarService.ts`**

```typescript
import { runReadTransaction } from '../config/neo4j.js';

export interface MuseStar {
  id: string;
  type: 'muse_star';
  boardId: string;
  targetAttributes: Array<{
    type: string;
    value: string;
  }>;
  context: {
    nearbyImages: string[]; // IDs of nearby images
    attributeGap: string; // Description of what's underexplored
  };
  position?: { x: number; y: number }; // Optional suggested position
}

/**
 * Detect underexplored regions in a board's graph
 * Returns Muse Stars (suggested nodes) based on attribute gaps
 */
export async function detectMuseStars(
  boardId: string,
  limit: number = 5
): Promise<MuseStar[]> {
  return await runReadTransaction(async (tx) => {
    // Find attributes that appear in the graph but are underrepresented
    const result = await tx.run(
      `
      // Get all images in the board
      MATCH (board:Board {id: $boardId})-[:CONTAINS]->(i:Image)

      // Get all attributes and their counts
      MATCH (i)-[:HAS_ATTRIBUTE]->(a:Attribute)
      WITH a.type as attrType, a.value as attrValue, count(i) as imageCount

      // Find underrepresented attribute combinations
      WHERE imageCount < 3  // Threshold for "underexplored"

      // Get context from nearby images
      MATCH (img:Image)-[:HAS_ATTRIBUTE]->(:Attribute {type: attrType})
      WITH attrType, attrValue, imageCount, collect(DISTINCT img.id) as nearbyImageIds
      ORDER BY imageCount ASC
      LIMIT $limit

      RETURN attrType, attrValue, imageCount, nearbyImageIds
      `,
      { boardId, limit }
    );

    const museStars: MuseStar[] = result.records.map((record, idx) => ({
      id: `muse-star-${boardId}-${idx}`,
      type: 'muse_star',
      boardId,
      targetAttributes: [
        {
          type: record.get('attrType'),
          value: record.get('attrValue'),
        },
      ],
      context: {
        nearbyImages: record.get('nearbyImageIds'),
        attributeGap: `Only ${record.get('imageCount')} image(s) with ${record.get('attrType')}: ${record.get('attrValue')}`,
      },
    }));

    return museStars;
  });
}

/**
 * Get Muse Stars for display in graph visualization
 */
export async function getMuseStarsForBoard(
  boardId: string
): Promise<MuseStar[]> {
  return await detectMuseStars(boardId, 5);
}
```

#### 5.2 Create AI Muse Prompt Generation Service

**File: `backend/src/services/aiMuseService.ts`**

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { runReadTransaction } from '../config/neo4j.js';
import { MuseStar } from './museStarService.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

export interface PromptSuggestion {
  id: string;
  museStarId: string;
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
  const systemPrompt = `You are the AI Muse for Graph Starz, a living map of AI images.
Your role is to suggest prompts for images that could expand underexplored regions of the map.

**Context**:
- Target attributes: ${museStar.targetAttributes.map(a => `${a.type}: ${a.value}`).join(', ')}
- Gap in the map: ${museStar.context.attributeGap}
- Nearby images: ${nearbyContext}

**Task**: Generate 2-3 creative prompts for AI image generation that:
1. Match the target attributes (${museStar.targetAttributes.map(a => a.value).join(', ')})
2. Would make sense next to the nearby images
3. Fill the gap in this part of the map
4. Are specific enough to guide image generation

Format each prompt as:
{
  "promptText": "the actual prompt for image generation",
  "rationale": "why this prompt fills this gap"
}

Return JSON array of 2-3 prompts.`;

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
    promptText: p.promptText,
    rationale: p.rationale,
    generatedAt: new Date(),
  }));
}

/**
 * Get context from nearby images for prompt generation
 */
async function getNearbyImageContext(imageIds: string[]): Promise<string> {
  if (imageIds.length === 0) return 'No nearby images';

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

    return result.records
      .map(r => `"${r.get('title')}": ${r.get('description')}`)
      .join('; ');
  });
}
```

#### 5.3 Create Muse Star Routes

**File: `backend/src/routes/museStars.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getMuseStarsForBoard } from '../services/museStarService.js';
import { generatePromptsForMuseStar } from '../services/aiMuseService.js';
import { z } from 'zod';

export const museStarsRouter = Router();

// All routes require authentication
museStarsRouter.use(requireAuth);

/**
 * GET /boards/:boardId/muse-stars
 * Get Muse Stars (suggested nodes) for a board
 */
museStarsRouter.get('/boards/:boardId/muse-stars', async (req: Request, res: Response) => {
  const { boardId } = req.params;

  const museStars = await getMuseStarsForBoard(boardId);

  res.json({
    museStars,
    message: museStars.length > 0
      ? 'Muse Stars found—ideas for extending your map'
      : 'Your map is well-explored for now',
  });
});

const generatePromptsSchema = z.object({
  targetAttributes: z.array(
    z.object({
      type: z.string(),
      value: z.string(),
    })
  ),
  context: z.object({
    nearbyImages: z.array(z.string()),
    attributeGap: z.string(),
  }),
});

/**
 * POST /muse-stars/prompts
 * Generate graph-aware prompts for a Muse Star
 */
museStarsRouter.post('/muse-stars/prompts', async (req: Request, res: Response) => {
  const museStarData = generatePromptsSchema.parse(req.body);

  const museStar = {
    id: `temp-${Date.now()}`,
    type: 'muse_star' as const,
    boardId: req.body.boardId || 'default',
    targetAttributes: museStarData.targetAttributes,
    context: museStarData.context,
  };

  const prompts = await generatePromptsForMuseStar(museStar);

  res.json({
    prompts,
    message: 'AI Muse suggestions for this part of your map',
  });
});
```

#### 5.4 Extend Graph Service for Muse Stars

**File: `backend/src/services/graphService.ts`** (add to existing)

```typescript
import { getMuseStarsForBoard } from './museStarService.js';

// Add to existing GraphData interface
export interface GraphDataWithMuseStars extends GraphData {
  museStars?: MuseStar[];
}

/**
 * Get graph data with Muse Stars included
 */
export async function getGraphWithMuseStars(
  boardId: string
): Promise<GraphDataWithMuseStars> {
  const graphData = await getUserEgoNetwork(boardId); // or appropriate query
  const museStars = await getMuseStarsForBoard(boardId);

  return {
    ...graphData,
    museStars,
  };
}
```

#### 5.5 Register Muse Star Routes

**File: `backend/src/index.ts`** (update)

```typescript
// Add to imports
import { museStarsRouter } from './routes/museStars.js';

// Add after other routes
app.use('/api', museStarsRouter);
```

### Frontend Integration Notes

In the frontend graph visualization:

1. **Render Muse Stars**: Display as subtle, pulsing nodes distinct from images
2. **Click Handler**: Open a prompt drawer showing AI-generated suggestions
3. **Styling**: Use a different visual style (e.g., dashed outline, glow effect)
4. **Tooltip**: "Muse Star – Ideas for this part of your map"

### Testing Muse Stars

```bash
# Get Muse Stars for a board
curl http://localhost:4000/api/boards/board-123/muse-stars \
  -H "Authorization: Bearer YOUR_JWT"

# Response:
# {
#   "museStars": [
#     {
#       "id": "muse-star-board-123-0",
#       "type": "muse_star",
#       "targetAttributes": [{"type": "style", "value": "watercolor"}],
#       "context": {
#         "nearbyImages": ["img-1", "img-2"],
#         "attributeGap": "Only 1 image(s) with style: watercolor"
#       }
#     }
#   ]
# }

# Generate prompts for a Muse Star
curl -X POST http://localhost:4000/api/muse-stars/prompts \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": "board-123",
    "targetAttributes": [{"type": "style", "value": "watercolor"}],
    "context": {
      "nearbyImages": ["img-1", "img-2"],
      "attributeGap": "Only 1 image(s) with style: watercolor"
    }
  }'

# Response:
# {
#   "prompts": [
#     {
#       "id": "temp-123-prompt-0",
#       "promptText": "A serene watercolor landscape with soft pastel tones...",
#       "rationale": "Fills the watercolor gap while complementing nearby nature images"
#     }
#   ]
# }
```

---

## Common Patterns

### Error Handling

```typescript
// In route handlers
import { ApiError } from '../middleware/errorMiddleware.js';

// Throw specific errors
throw new ApiError(400, 'Invalid input', { field: 'email' });
throw new ApiError(404, 'Resource not found');
throw new ApiError(403, 'Insufficient permissions');

// Errors are caught by errorMiddleware automatically
```

### Request Validation

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
  tags: z.array(z.string()).optional(),
});

// In route handler
const data = schema.parse(req.body);
// Validation errors throw ZodError, caught by errorMiddleware
```

### Database Transactions

```typescript
// Write operations
await runWriteTransaction(async (tx) => {
  await tx.run('CREATE ...');
  await tx.run('MERGE ...');
  // Automatically commits or rolls back
});

// Read operations
const results = await runReadTransaction(async (tx) => {
  const result = await tx.run('MATCH ...');
  return result.records.map(...);
});
```

### Logging

```typescript
import { logger } from '../utils/logger.js';

logger.info('Operation completed', { userId, imageId });
logger.warn('Slow query detected', { duration: 1500 });
logger.error('Failed to process', error);
logger.debug('Debug info', { data });
```

---

## Frontend Implementation (Complete)

The frontend is now fully integrated with the backend APIs. This section documents the key integration points.

### Services Layer

#### Upload Service (`services/uploadService.ts`)

Handles the complete upload flow:
```typescript
// 1. Initialize upload (get signed URL)
const initResponse = await initUpload(file, token);

// 2. Upload to GCS
await uploadToGCS(file, initResponse.uploadUrl, initResponse.contentType);

// 3. Complete upload (trigger AI analysis)
const result = await completeUpload(initResponse.imageId, initResponse.gcsPath, token);
```

#### Graph Service (`services/graphService.ts`)

Fetches graph data from backend:
```typescript
// Fetch user's ego network
const graph = await fetchEgoGraph(token);

// Fetch global graph sample
const globalGraph = await fetchGlobalGraph(limit, skip);
```

#### Muse Star Service (`services/museStarService.ts`)

Handles Muse Star fetching and prompt generation:
```typescript
// Fetch Muse Stars for user
const { museStars } = await fetchMuseStars(token);

// Generate prompts for a Muse Star
const { prompts } = await generatePrompts(museStar, token);
```

### Context Management

#### GraphContext (`contexts/GraphContext.tsx`)

Manages graph state and loading:
```typescript
const { graphData, refreshGraph, museStars, isLoading } = useGraph();

// Converts backend GraphData to frontend format
// Merges Muse Stars into the graph nodes
// Handles view mode switching (ego vs global)
```

### Components

#### UploadModal (`components/UploadModal.tsx`)
- Uses real upload services (no more mock data)
- Shows progress through upload → analysis → graph creation
- Calls `refreshGraph()` after successful upload

#### GraphCanvas (`components/GraphCanvas.tsx`)
- Renders Muse Stars with distinct styling:
  - Smaller radius, dashed amber outline
  - Star emoji (✨) icon
  - Lower opacity with glow effect
- Tooltip on hover: "Muse Star – a suggested point in your map..."
- Click handler opens MuseStarPanel

#### MuseStarPanel (`components/MuseStarPanel.tsx`)
- Drawer that opens when Muse Star is clicked
- Fetches prompts from `/muse-stars/prompts`
- Shows 2-3 prompts with labels (Safe, Bold, Experimental)
- Copy-to-clipboard functionality

### App Integration (`App.tsx`)

```typescript
// Wraps app with providers
<GoogleOAuthProvider clientId={clientId}>
  <AuthProvider>
    <GraphProvider>  {/* Handles graph data fetching */}
      <AppContent />
    </GraphProvider>
  </AuthProvider>
</GoogleOAuthProvider>

// Handles node selection
const handleNodeSelect = useCallback((node: GraphNode | null) => {
  if (node?.type === NodeType.MUSE_STAR) {
    setSelectedMuseStar(node);  // Opens MuseStarPanel
  } else {
    setSelectedNodeId(node?.id);  // Opens Sidebar
  }
}, []);
```

### Data Flow

**Upload Flow:**
1. User selects image in UploadModal
2. `initUpload()` → GET signed URL from `/uploads/init`
3. `uploadToGCS()` → Direct upload to GCS
4. `completeUpload()` → POST to `/uploads/complete` (triggers Gemini analysis + Neo4j writes)
5. `refreshGraph()` → Refetch `/graph/ego` to show new image

**Graph Rendering Flow:**
1. On auth, GraphContext calls `/graph/ego` and `/muse-stars/ego` in parallel
2. Converts backend nodes/edges to frontend GraphNode/GraphLink format
3. Merges Muse Stars into nodes array
4. GraphCanvas renders with D3.js force simulation

**Muse Star Interaction Flow:**
1. User clicks Muse Star node in GraphCanvas
2. App.tsx sets `selectedMuseStar` state
3. MuseStarPanel opens, calls `/muse-stars/prompts`
4. Displays Safe/Bold/Experimental prompts
5. User can copy prompts to use with image generators

---

## Next Steps

After implementing these phases:

1. **Add Rate Limiting** - Protect endpoints from abuse
2. **Add Caching** - Cache graph queries with Redis
3. **Add WebSockets** - Real-time graph updates
4. **Add Metrics** - Prometheus/Grafana monitoring
5. **Add Admin Panel** - Content moderation

For full API reference, see [GRAPH_STARZ_MVP.md](./GRAPH_STARZ_MVP.md)