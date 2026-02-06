# E2E Testing Setup

This guide describes how to run end-to-end tests locally and in CI using Neo4j and a GCS emulator.

## Services

The repo ships a dedicated E2E compose file that starts:
- **Neo4j** on `bolt://localhost:7687` and `http://localhost:7474`
- **fake-gcs-server** on `http://localhost:4443`

Start them with:

```bash
docker compose -f docker-compose.e2e.yml up -d
```

## GCS Emulator Bucket

Create the bucket once (the example below matches the seed data URLs):

```bash
curl -X POST "http://localhost:4443/storage/v1/b?project=graph-starz-e2e" \
  -H "Content-Type: application/json" \
  -d '{"name":"graph-starz-e2e"}'
```

## Environment Variables

### Required for seed/cleanup scripts

The E2E seed/cleanup scripts only need Neo4j credentials:

```bash
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="testpassword"
```

### Required to run the backend API locally

The backend config validates all environment variables, so provide the following when starting the API server:

```bash
export NODE_ENV="test"
export PORT="4000"
export GRAPHSTARZ_JWT_SECRET="changeme-changeme-changeme-changeme"

export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="testpassword"

export GCS_BUCKET="graph-starz-e2e"
export GCP_PROJECT_ID="graph-starz-e2e"
export GCP_STORAGE_LOCATION="us-central1"
export STORAGE_EMULATOR_HOST="http://localhost:4443"

export GEMINI_API_KEY="AIza-placeholder-placeholder"

export GOOGLE_CLIENT_ID="graph-starz-e2e.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="GOCSPX-placeholder"
export GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/oauth2/callback"

export FRONTEND_ORIGIN="http://localhost:3000"
export WHITELISTED_EMAILS="e2e.user@graphstarz.test"
```

> **Note**: If your E2E suite never hits Gemini or OAuth endpoints, placeholder values are acceptable as long as they satisfy the validation formats.

## Seeding & Cleanup

From the repo root:

```bash
npm --prefix backend run cleanup:e2e
npm --prefix backend run seed:e2e
```

The seed script inserts:
- One test user
- Two sample images with attributes
- One board containing those images
- One constellation linking the same images

## Local E2E Flow (Example)

```bash
docker compose -f docker-compose.e2e.yml up -d
npm --prefix backend run cleanup:e2e
npm --prefix backend run seed:e2e
npm --prefix backend run dev
```

## CI Notes

In CI, run the same steps:

1. Start services with `docker compose -f docker-compose.e2e.yml up -d`.
2. Export the environment variables above.
3. Run `npm --prefix backend run cleanup:e2e` followed by `npm --prefix backend run seed:e2e`.
4. Execute your E2E test runner.
