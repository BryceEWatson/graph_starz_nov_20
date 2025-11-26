import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let driver: Driver | null = null;

/**
 * Initialize Neo4j driver connection
 */
export async function initNeo4j(): Promise<Driver> {
  if (driver) {
    logger.warn('Neo4j driver already initialized');
    return driver;
  }

  try {
    // Create driver instance
    driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
      {
        maxConnectionPoolSize: 50,
        connectionTimeout: 30000, // 30 seconds
        logging: {
          level: config.nodeEnv === 'development' ? 'debug' : 'info',
          logger: (level, message) => {
            if (level === 'debug') logger.debug(`Neo4j: ${message}`);
            else if (level === 'info') logger.info(`Neo4j: ${message}`);
            else if (level === 'warn') logger.warn(`Neo4j: ${message}`);
            else if (level === 'error') logger.error(`Neo4j: ${message}`);
          },
        },
      }
    );

    // Verify connectivity
    await driver.verifyConnectivity();

    logger.info(`Connected to Neo4j at ${config.neo4j.uri}`);
    return driver;
  } catch (error) {
    logger.error('Failed to connect to Neo4j:', error);
    throw new Error(`Neo4j connection failed: ${error.message}`);
  }
}

/**
 * Get the current Neo4j driver instance
 */
export function getDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call initNeo4j() first.');
  }
  return driver;
}

/**
 * Create a new Neo4j session
 */
export function getSession(options?: { database?: string; defaultAccessMode?: 'READ' | 'WRITE' }): Session {
  const driver = getDriver();

  const sessionConfig: any = {};
  if (options?.database) {
    sessionConfig.database = options.database;
  }
  if (options?.defaultAccessMode) {
    sessionConfig.defaultAccessMode =
      options.defaultAccessMode === 'READ'
        ? neo4j.session.READ
        : neo4j.session.WRITE;
  }

  return driver.session(sessionConfig);
}

/**
 * Close Neo4j driver connection
 */
export async function closeNeo4j(): Promise<void> {
  if (!driver) {
    logger.warn('Neo4j driver not initialized, nothing to close');
    return;
  }

  try {
    await driver.close();
    driver = null;
    logger.info('Neo4j connection closed');
  } catch (error) {
    logger.error('Error closing Neo4j connection:', error);
    throw error;
  }
}

/**
 * Execute a Cypher query with automatic session management
 */
export async function runQuery<T = any>(
  query: string,
  params: Record<string, any> = {},
  options?: { database?: string }
): Promise<T[]> {
  const session = getSession(options);

  try {
    const result = await session.run(query, params);
    return result.records.map(record => record.toObject() as T);
  } catch (error) {
    logger.error('Query execution failed:', { query, params, error });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Execute a write transaction with automatic retry logic
 */
export async function runWriteTransaction<T = any>(
  transactionFn: (tx: any) => Promise<T>,
  options?: { database?: string }
): Promise<T> {
  const session = getSession({ ...options, defaultAccessMode: 'WRITE' });

  try {
    return await session.executeWrite(transactionFn);
  } catch (error) {
    logger.error('Write transaction failed:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Execute a read transaction with automatic retry logic
 */
export async function runReadTransaction<T = any>(
  transactionFn: (tx: any) => Promise<T>,
  options?: { database?: string }
): Promise<T> {
  const session = getSession({ ...options, defaultAccessMode: 'READ' });

  try {
    return await session.executeRead(transactionFn);
  } catch (error) {
    logger.error('Read transaction failed:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Check if Neo4j is connected and healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();

    // Run a simple query to verify database access
    await runQuery('RETURN 1 as health');

    return true;
  } catch (error) {
    logger.error('Neo4j health check failed:', error);
    return false;
  }
}