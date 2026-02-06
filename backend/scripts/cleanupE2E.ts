/**
 * E2E Cleanup Script
 * 
 * Deletes all nodes and relationships from the Neo4j database.
 * 
 * WARNING: This script performs a destructive operation. It should only be run
 * against test/development databases. Production use is explicitly prevented.
 * 
 * Required environment variables:
 * - NEO4J_URI: Neo4j connection URI (e.g., bolt://localhost:7687)
 * - NEO4J_PASSWORD: Neo4j password
 * 
 * Optional environment variables:
 * - NEO4J_USERNAME: Neo4j username (defaults to 'neo4j')
 * - NODE_ENV: Must be 'test' or 'development' to prevent accidental production use
 */

import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';

dotenv.config();

// Environment safety check
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv !== 'test' && nodeEnv !== 'development') {
  console.error('❌ Safety check failed: cleanup:e2e can only run in test or development environments.');
  console.error(`   Current NODE_ENV: ${nodeEnv || '(not set)'}`);
  console.error('   Set NODE_ENV=test or NODE_ENV=development to proceed.');
  process.exit(1);
}

// Additional safety check for production-like URIs
const uri = process.env.NEO4J_URI as string;
if (uri && (uri.includes('prod') || uri.includes('production'))) {
  console.error('❌ Safety check failed: NEO4J_URI appears to contain production references.');
  console.error(`   URI: ${uri}`);
  process.exit(1);
}

const requiredEnvVars = ['NEO4J_URI', 'NEO4J_PASSWORD'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required env var: ${envVar}`);
  }
}

const username = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD as string;

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

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
 * Delete all nodes and relationships from the database
 */
async function cleanup() {
  const session = driver.session();
  try {
    console.log('🗑️  Starting cleanup...');
    
    await session.executeWrite(async (tx) => {
      const result = await tx.run('MATCH (n) DETACH DELETE n RETURN count(n) as deletedCount');
      const deletedCount = result.records[0]?.get('deletedCount').toNumber() || 0;
      console.log(`   Deleted ${deletedCount} nodes and their relationships.`);
    });
    
    console.log('✅ Cleared E2E data successfully.');
  } catch (error) {
    console.error('❌ Error during cleanup operation:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

async function main() {
  console.log(`Running E2E cleanup in ${nodeEnv} environment...`);
  await verifyConnection();
  await cleanup();
}

main().catch((error) => {
  console.error('❌ Failed to cleanup E2E data:', error);
  process.exit(1);
});
