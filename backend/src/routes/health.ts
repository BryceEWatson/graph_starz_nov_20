import { Router, Request, Response } from 'express';
import { checkHealth as checkNeo4jHealth } from '../config/neo4j.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const healthRouter = Router();

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    neo4j: {
      status: 'connected' | 'disconnected' | 'error';
      uri?: string;
    };
    gcs?: {
      status: 'configured' | 'not_configured';
      bucket?: string;
    };
    gemini?: {
      status: 'configured' | 'not_configured';
    };
  };
}

/**
 * GET /health
 * Basic health check endpoint
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // Check Neo4j connection
    const neo4jHealthy = await checkNeo4jHealth();

    const health: HealthStatus = {
      status: neo4jHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '0.1.0',
      services: {
        neo4j: {
          status: neo4jHealthy ? 'connected' : 'disconnected',
          uri: config.neo4j.uri.replace(/:[^:]*@/, ':****@'), // Hide password
        },
        gcs: {
          status: config.gcs.bucket ? 'configured' : 'not_configured',
          bucket: config.gcs.bucket,
        },
        gemini: {
          status: config.gemini.apiKey ? 'configured' : 'not_configured',
        },
      },
    };

    // Return appropriate status code
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed:', error);

    const errorHealth: HealthStatus = {
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '0.1.0',
      services: {
        neo4j: {
          status: 'error',
        },
      },
    };

    res.status(503).json(errorHealth);
  }
});

/**
 * GET /health/live
 * Kubernetes liveness probe endpoint
 * Returns 200 if the service is alive
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * GET /health/ready
 * Kubernetes readiness probe endpoint
 * Returns 200 if the service is ready to handle requests
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    const neo4jHealthy = await checkNeo4jHealth();

    if (neo4jHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready', reason: 'Neo4j not connected' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not_ready', reason: error instanceof Error ? error.message : String(error) });
  }
});