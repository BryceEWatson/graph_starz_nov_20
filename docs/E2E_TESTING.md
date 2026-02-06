# E2E Testing Setup

This guide describes how to run end-to-end tests locally and in CI using Neo4j and a GCS emulator.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ installed
- Backend dependencies installed (`npm --prefix backend install`)

## Services

The repo ships a dedicated E2E compose file that starts:
- **Neo4j** on `bolt://localhost:7687` and `http://localhost:7474`
- **fake-gcs-server** on `http://localhost:4443`

Start them with:

```bash
docker compose -f docker-compose.e2e.yml up -d
```

Wait for services to be healthy (healthchecks are configured):

```bash
docker compose -f docker-compose.e2e.yml ps
```

Both services should show status as "healthy".

## GCS Emulator Bucket

Create the bucket once (the example below matches the seed data URLs):

```bash
curl -X POST "http://localhost:4443/storage/v1/b?project=graph-starz-e2e" \
  -H "Content-Type: application/json" \
  -d '{"name":"graph-starz-e2e"}'
```

## Environment Variables

### Required for seed/cleanup scripts

The E2E seed/cleanup scripts require Neo4j credentials and a NODE_ENV setting:

```bash
export NODE_ENV="test"
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="testpassword"
```

> **Security Note**: The cleanup script (`cleanup:e2e`) will only run when `NODE_ENV` is set to `test` or `development` to prevent accidental data loss in production environments.

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
2. Wait for services to be healthy: `docker compose -f docker-compose.e2e.yml ps`.
3. Export the environment variables above.
4. Run `npm --prefix backend run cleanup:e2e` followed by `npm --prefix backend run seed:e2e`.
5. Execute your E2E test runner.

## Cleanup & Teardown

### Clean up test data only
To reset the database without stopping services:

```bash
npm --prefix backend run cleanup:e2e
```

### Stop services
To stop the services but keep volumes:

```bash
docker compose -f docker-compose.e2e.yml down
```

### Complete cleanup (remove volumes)
To remove all data and volumes:

```bash
docker compose -f docker-compose.e2e.yml down -v
```

### Remove dangling containers
If you encounter port conflicts or container name conflicts:

```bash
docker rm -f graph-starz-e2e-neo4j graph-starz-e2e-fake-gcs
```

## Troubleshooting

### Connection Refused Errors

**Problem**: Scripts fail with "Connection refused" or "ECONNREFUSED"

**Solution**:
1. Verify services are running: `docker compose -f docker-compose.e2e.yml ps`
2. Check if services are healthy (may take 30-60 seconds on first start)
3. Check logs: `docker compose -f docker-compose.e2e.yml logs neo4j`
4. Ensure no other services are using ports 7474, 7687, or 4443

### Port Conflicts

**Problem**: "Port is already allocated" error

**Solution**:
1. Check what's using the port: `lsof -i :7687` (or :7474, :4443)
2. Stop conflicting services or change ports in `docker-compose.e2e.yml`
3. Remove existing containers: `docker rm -f graph-starz-e2e-neo4j graph-starz-e2e-fake-gcs`

### Seed Script Fails

**Problem**: Seed script fails with validation errors

**Solution**:
1. Run cleanup first: `npm --prefix backend run cleanup:e2e`
2. Verify Neo4j is accessible: `docker exec graph-starz-e2e-neo4j cypher-shell -u neo4j -p testpassword "RETURN 1"`
3. Check environment variables are set correctly
4. Review logs for specific error messages

### Healthcheck Failures

**Problem**: Services show as "unhealthy" in `docker compose ps`

**Solution**:
1. Check logs: `docker compose -f docker-compose.e2e.yml logs [service-name]`
2. For Neo4j: Ensure sufficient memory is available
3. For fake-gcs: Verify port 4443 is accessible
4. Wait longer - Neo4j can take 60+ seconds to initialize on first start
5. Restart services: `docker compose -f docker-compose.e2e.yml restart`

### Permission Denied (Docker)

**Problem**: "Permission denied" when running docker commands

**Solution**:
1. Add your user to docker group: `sudo usermod -aG docker $USER`
2. Log out and back in, or run: `newgrp docker`
3. Or prefix commands with `sudo`

### Database Not Empty After Cleanup

**Problem**: Cleanup script reports success but database still has data

**Solution**:
1. Check NODE_ENV is set to `test` or `development`
2. Manually verify: `docker exec graph-starz-e2e-neo4j cypher-shell -u neo4j -p testpassword "MATCH (n) RETURN count(n)"`
3. Force cleanup via cypher-shell if needed

### GCS Bucket Not Found

**Problem**: Seed script or app fails to access GCS bucket

**Solution**:
1. Ensure you created the bucket (see "GCS Emulator Bucket" section above)
2. Verify fake-gcs-server is running and healthy
3. Recreate bucket: `curl -X POST "http://localhost:4443/storage/v1/b?project=graph-starz-e2e" -H "Content-Type: application/json" -d '{"name":"graph-starz-e2e"}'`

### Slow Performance

**Problem**: Neo4j is slow or unresponsive

**Solution**:
1. Increase memory allocation in `docker-compose.e2e.yml`
2. Ensure Docker has sufficient resources allocated (Settings > Resources)
3. Stop other resource-intensive containers
4. Clean up old volumes: `docker volume prune`
