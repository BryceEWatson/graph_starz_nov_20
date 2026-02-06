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

const seedPayload = {
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

async function seed() {
  const session = driver.session();
  try {
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
  } finally {
    await session.close();
    await driver.close();
  }
}

seed().catch((error) => {
  console.error('❌ Failed to seed E2E data:', error);
  process.exit(1);
});
