/**
 * Fake configuration for tests. Set before any test imports src/config/env.ts,
 * and set unconditionally so a developer's real backend/.env is never used:
 * dotenv doesn't override variables that are already set.
 */
Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4999',
  GRAPHSTARZ_JWT_SECRET: 'test-only-jwt-secret-with-at-least-32-characters',
  NEO4J_URI: 'bolt://localhost:7687',
  NEO4J_USERNAME: 'neo4j',
  NEO4J_PASSWORD: 'test-only-password',
  GCS_BUCKET: 'test-bucket',
  GCP_PROJECT_ID: 'test-project',
  GCP_STORAGE_LOCATION: 'us-central1',
  GEMINI_API_KEY: 'AIza-test-only-not-a-key',
  GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-only-client-secret',
  GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3001',
  FRONTEND_ORIGIN: 'http://localhost:3001',
  // Mixed case on purpose: the allow-list check must ignore case
  WHITELISTED_EMAILS: 'approved@example.com, Second.Approved@Example.com',
});
