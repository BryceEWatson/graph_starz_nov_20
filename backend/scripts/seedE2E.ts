/**
 * E2E Seed Script
 * 
 * Seeds the Neo4j database with test data for end-to-end testing.
 * Creates a test user, images with attributes, a board, and a constellation.
 * 
 * Required environment variables:
 * - NEO4J_URI: Neo4j connection URI (e.g., bolt://localhost:7687)
 * - NEO4J_PASSWORD: Neo4j password
 * 
 * Optional environment variables:
 * - NEO4J_USERNAME: Neo4j username (defaults to 'neo4j')
 */

import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';

dotenv.config();

const requiredEnvVars = ['NEO4J_URI', 'NEO4J_PASSWORD'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required env var: ${envVar}`);
  }
}

const uri = process.env.NEO4J_URI as string;
const username = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD as string;

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

/**
 * Interfaces for type safety
 */
interface SeedUser {
  id: string;
  email: string;
  name: string;
  profilePictureUrl: string;
  createdAt: string;
}

interface ImageAttribute {
  type: string;
  value: string;
  confidence: number;
  canonical: boolean;
}

interface SeedImage {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  uploadedAt: string;
  attributes: ImageAttribute[];
}

interface SeedBoard {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface SeedConstellation {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

/**
 * Test data payload
 */
const seedPayload: {
  user: SeedUser;
  images: SeedImage[];
  board: SeedBoard;
  constellation: SeedConstellation;
} = {
  user: {
    id: 'e2e_user_001',
    email: 'e2e.user@graphstarz.test',
    name: 'E2E Tester',
    profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=e2e',
    createdAt: '2024-02-01T10:00:00Z',
  },
  images: [
    {
      id: 'e2e_img_001',
      title: 'Midnight Bloom',
      description: 'Soft neon florals in a dreamlike palette.',
      url: 'http://localhost:4443/graph-starz-e2e/images/e2e_img_001.jpg',
      thumbnailUrl: 'http://localhost:4443/graph-starz-e2e/images/e2e_img_001_thumb.jpg',
      uploadedAt: '2024-02-02T08:15:00Z',
      attributes: [
        { type: 'style', value: 'painterly', confidence: 0.93, canonical: true },
        { type: 'mood', value: 'serene', confidence: 0.91, canonical: true },
        { type: 'color', value: 'cool_tones', confidence: 0.89, canonical: true },
      ],
    },
    {
      id: 'e2e_img_002',
      title: 'Solar Drift',
      description: 'Warm gradients and bold silhouettes in motion.',
      url: 'http://localhost:4443/graph-starz-e2e/images/e2e_img_002.jpg',
      thumbnailUrl: 'http://localhost:4443/graph-starz-e2e/images/e2e_img_002_thumb.jpg',
      uploadedAt: '2024-02-02T09:30:00Z',
      attributes: [
        { type: 'style', value: 'digital', confidence: 0.9, canonical: false },
        { type: 'mood', value: 'energetic', confidence: 0.88, canonical: true },
        { type: 'color', value: 'warm_tones', confidence: 0.92, canonical: true },
      ],
    },
  ],
  board: {
    id: 'e2e_board_001',
    name: 'E2E Inspiration Board',
    description: 'A curated set of seed images for end-to-end testing.',
    createdAt: '2024-02-03T11:00:00Z',
  },
  constellation: {
    id: 'e2e_constellation_001',
    name: 'E2E Constellation',
    description: 'Test constellation linking sample imagery.',
    createdAt: '2024-02-03T12:00:00Z',
  },
};

/**
 * Verify connection to Neo4j with retry logic
 */
async function verifyConnection(maxRetries = 5, delayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await driver.verifyConnectivity();
      console.log('✅ Connected to Neo4j successfully.');
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to Neo4j after ${maxRetries} attempts: ${error}`);
      }
      console.log(`⏳ Connection attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Validate that seed data was created successfully
 */
async function validateSeedData(): Promise<void> {
  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[:UPLOADED]->(i:Image)
      OPTIONAL MATCH (u)-[:CREATED]->(b:Board)
      OPTIONAL MATCH (u)-[:CREATED]->(c:Constellation)
      RETURN 
        count(DISTINCT u) as userCount,
        count(DISTINCT i) as imageCount,
        count(DISTINCT b) as boardCount,
        count(DISTINCT c) as constellationCount
      `,
      { userId: seedPayload.user.id }
    );
    
    const record = result.records[0];
    const userCount = record.get('userCount').toNumber();
    const imageCount = record.get('imageCount').toNumber();
    const boardCount = record.get('boardCount').toNumber();
    const constellationCount = record.get('constellationCount').toNumber();
    
    console.log('📊 Validation results:');
    console.log(`   Users: ${userCount} (expected: 1)`);
    console.log(`   Images: ${imageCount} (expected: 2)`);
    console.log(`   Boards: ${boardCount} (expected: 1)`);
    console.log(`   Constellations: ${constellationCount} (expected: 1)`);
    
    if (userCount !== 1 || imageCount !== 2 || boardCount !== 1 || constellationCount !== 1) {
      throw new Error('Seed validation failed: unexpected entity counts');
    }
    
    console.log('✅ Seed data validation passed.');
  } finally {
    await session.close();
  }
}

/**
 * Seed the database with test data
 */
async function seed() {
  const session = driver.session();
  try {
    console.log('🌱 Starting seed operation...');
    
    await session.executeWrite(async (tx) => {
      await tx.run(
        `
        MERGE (u:User {id: $userId})
        SET u.email = $email,
            u.name = $name,
            u.profilePictureUrl = $profilePictureUrl,
            u.waitlisted = false,
            u.createdAt = datetime($createdAt)
        WITH u
        UNWIND $images as image
          MERGE (i:Image {id: image.id})
          SET i.title = image.title,
              i.description = image.description,
              i.url = image.url,
              i.thumbnailUrl = image.thumbnailUrl,
              i.uploadedAt = datetime(image.uploadedAt)
          MERGE (u)-[upload:UPLOADED]->(i)
          SET upload.timestamp = datetime(image.uploadedAt)
          WITH u, i, image
          UNWIND image.attributes as attribute
            MERGE (a:Attribute {type: attribute.type, value: attribute.value})
            MERGE (i)-[rel:HAS_ATTRIBUTE]->(a)
            SET rel.confidence = attribute.confidence,
                rel.canonical = attribute.canonical
        WITH u
        MERGE (b:Board {id: $boardId})
        SET b.name = $boardName,
            b.description = $boardDescription,
            b.createdAt = datetime($boardCreatedAt)
        MERGE (u)-[createdBoard:CREATED]->(b)
        SET createdBoard.timestamp = datetime($boardCreatedAt)
        WITH u, b
        UNWIND $boardImageIds as boardImageId
          MATCH (boardImage:Image {id: boardImageId})
          MERGE (b)-[contains:CONTAINS]->(boardImage)
          SET contains.addedAt = datetime($boardCreatedAt)
        WITH u
        MERGE (c:Constellation {id: $constellationId})
        SET c.name = $constellationName,
            c.description = $constellationDescription,
            c.createdAt = datetime($constellationCreatedAt)
        MERGE (u)-[createdConstellation:CREATED]->(c)
        SET createdConstellation.timestamp = datetime($constellationCreatedAt)
        WITH c
        UNWIND $constellationImageIds as constellationImageId
          MATCH (constellationImage:Image {id: constellationImageId})
          MERGE (c)-[includes:INCLUDES]->(constellationImage)
          SET includes.addedAt = datetime($constellationCreatedAt)
        `,
        {
          userId: seedPayload.user.id,
          email: seedPayload.user.email,
          name: seedPayload.user.name,
          profilePictureUrl: seedPayload.user.profilePictureUrl,
          createdAt: seedPayload.user.createdAt,
          images: seedPayload.images,
          boardId: seedPayload.board.id,
          boardName: seedPayload.board.name,
          boardDescription: seedPayload.board.description,
          boardCreatedAt: seedPayload.board.createdAt,
          boardImageIds: seedPayload.images.map((image) => image.id),
          constellationId: seedPayload.constellation.id,
          constellationName: seedPayload.constellation.name,
          constellationDescription: seedPayload.constellation.description,
          constellationCreatedAt: seedPayload.constellation.createdAt,
          constellationImageIds: seedPayload.images.map((image) => image.id),
        }
      );
    });

    console.log('✅ Seeded E2E data successfully.');
  } catch (error) {
    console.error('❌ Error during seed operation:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('Running E2E seed script...');
  await verifyConnection();
  await seed();
  await validateSeedData();
  await driver.close();
}

main().catch((error) => {
  console.error('❌ Failed to seed E2E data:', error);
  process.exit(1);
});
