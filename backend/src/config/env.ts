import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Define environment schema
const envSchema = z.object({
  // Server config
  port: z.string().default('4000').transform(Number),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),

  // JWT
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),

  // Neo4j
  neo4j: z.object({
    uri: z.string().url().or(z.string().startsWith('bolt://')).or(z.string().startsWith('neo4j+s://')),
    username: z.string().default('neo4j'),
    password: z.string(),
  }),

  // Google Cloud Storage
  gcs: z.object({
    bucket: z.string(),
    projectId: z.string(),
    location: z.string().default('us-central1'),
  }),

  // Google Gemini
  gemini: z.object({
    apiKey: z.string().startsWith('AIza'),
  }),

  // Google OAuth
  oauth: z.object({
    clientId: z.string().endsWith('.apps.googleusercontent.com'),
    clientSecret: z.string().startsWith('GOCSPX-').or(z.string()),
    redirectUri: z.string().url(),
  }),

  // Frontend
  frontendOrigin: z.string().url(),

  // Access control
  whitelistedEmails: z.array(z.string().email()),
});

// Parse and validate environment variables
function loadConfig() {
  const env = {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.GRAPHSTARZ_JWT_SECRET,
    neo4j: {
      uri: process.env.NEO4J_URI,
      username: process.env.NEO4J_USERNAME,
      password: process.env.NEO4J_PASSWORD,
    },
    gcs: {
      bucket: process.env.GCS_BUCKET,
      projectId: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_STORAGE_LOCATION,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    },
    oauth: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    },
    frontendOrigin: process.env.FRONTEND_ORIGIN,
    whitelistedEmails: process.env.WHITELISTED_EMAILS?.split(',').map(e => e.trim()) || [],
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment configuration:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n📝 Please check your .env file against .env.example');
      process.exit(1);
    }
    throw error;
  }
}

// Export validated config
export const config = loadConfig();

// Export type for use in other modules
export type Config = z.infer<typeof envSchema>;