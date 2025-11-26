import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import dotenv from 'dotenv';

import { config } from './config/env.js';
import { initNeo4j, closeNeo4j } from './config/neo4j.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRouter);
app.use('/auth', authRouter);

// TODO: Add more routes as they're implemented
// app.use('/uploads', uploadRouter);
// app.use('/graph', graphRouter);
// app.use('/me', meRouter);
// app.use('/users', usersRouter);
// app.use('/images', imagesRouter);
// app.use('/constellations', constellationsRouter);

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Start server
async function startServer() {
  try {
    // Initialize Neo4j connection
    await initNeo4j();
    logger.info('✅ Neo4j connected');

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`✅ Server running on port ${config.port}`);
      logger.info(`✅ Environment: ${config.nodeEnv}`);
      logger.info(`✅ Frontend origin: ${config.frontendOrigin}`);
      logger.info(`✅ Neo4j URI: ${config.neo4j.uri}`);
      logger.info('');
      logger.info(`🚀 Graph Starz backend ready at http://localhost:${config.port}`);
      logger.info(`📊 Health check: http://localhost:${config.port}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(() => {
        logger.info('✅ HTTP server closed');
      });

      await closeNeo4j();
      logger.info('✅ Neo4j connection closed');

      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();