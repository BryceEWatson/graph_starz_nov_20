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

async function cleanup() {
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      await tx.run('MATCH (n) DETACH DELETE n');
    });
    console.log('✅ Cleared E2E data successfully.');
  } finally {
    await session.close();
    await driver.close();
  }
}

cleanup().catch((error) => {
  console.error('❌ Failed to cleanup E2E data:', error);
  process.exit(1);
});
