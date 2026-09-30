# Graph Starz Backend

Express.js backend API server for Graph Starz, providing graph database operations, image processing, and authentication.

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your actual values

# Run development server
pnpm dev
```

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm start` - Run production server (requires build)
- `pnpm test` - Run test suite (unit tests, plus route tests that drive the real Express app with Neo4j, Gemini, Cloud Storage and Google sign-in replaced at their client libraries; see `tests/helpers/fakes.ts`)
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate test coverage report
- `pnpm lint` - Check code style
- `pnpm format` - Auto-format code

## Database Setup

1. **Initialize Neo4j schema**:
   - Open Neo4j Browser (http://localhost:7474 or Aura console)
   - Copy contents of `scripts/init-neo4j.cypher`
   - Paste and run in Browser

2. **Load sample data** (optional):
   - Copy contents of `scripts/seed-dev-data.cypher`
   - Paste and run in Browser

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration modules
│   │   ├── env.ts      # Environment variables
│   │   └── neo4j.ts    # Database connection
│   ├── middleware/     # Express middleware
│   │   └── errorMiddleware.ts
│   ├── routes/         # API route handlers
│   │   └── health.ts   # Health check endpoints
│   ├── services/       # Business logic services
│   │   ├── graphService.ts    # (TODO) Neo4j operations
│   │   ├── aiService.ts       # (TODO) Gemini integration
│   │   └── storageService.ts  # (TODO) GCS operations
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   │   └── logger.ts   # Winston logger
│   └── index.ts        # Server entry point
├── scripts/            # Database scripts
│   ├── init-neo4j.cypher     # Schema initialization
│   └── seed-dev-data.cypher  # Sample data
├── tests/              # Test files
├── .env.example        # Environment template
├── package.json        # Dependencies
└── tsconfig.json       # TypeScript config
```

## API Endpoints

### Open (no allow-list check)
- `GET /health` - Service health status
- `GET /health/live` - Kubernetes liveness probe
- `GET /health/ready` - Kubernetes readiness probe
- `POST /auth/google` - Google OAuth sign-in (issues a session to anyone, with a `whitelisted` flag)
- `GET /auth/validate` - Session check (any signed-in user)
- `POST /auth/logout` - Logout
- `POST /auth/waitlist` - Join the waitlist (any signed-in user)

### Allow-listed users only (`WHITELISTED_EMAILS`)
Enforced once in `src/app.ts`: no session is 401, a session for someone not on the list is 403, and routes added below the check are covered automatically.
- `POST /uploads/init` - Initialize image upload
- `POST /uploads/complete` - Complete upload and trigger AI (30 per user per hour)
- `GET /graph/ego` - User's ego network
- `GET /graph/global` - Global graph sample (`limit` 1-100, larger values are capped at 100; `skip` 0-10,000)
- `GET /muse-stars/ego` - Muse Stars for the user's map
- `POST /muse-stars/prompts` - AI Muse prompt suggestions (30 per user per hour; field sizes limited by `MUSE_PROMPT_LIMITS` in `src/shared/museStarContract.ts`)

Graph responses never include email addresses.

### Planned (TODO)
- `GET /me` - Current user profile
- `GET /me/uploads` - User's images

## Environment Variables

See `.env.example` for all required variables. Key ones:

- `NEO4J_URI` - Neo4j database connection string
- `GCS_BUCKET` - Google Cloud Storage bucket name
- `GEMINI_API_KEY` - Google AI API key
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GRAPHSTARZ_JWT_SECRET` - JWT signing secret (32+ chars)

## Development Tips

1. **Watch logs**: Backend uses Winston logger, check console output
2. **Test Neo4j queries**: Use Neo4j Browser to test Cypher queries
3. **API testing**: Use tools like Postman or curl
4. **Type safety**: TypeScript strict mode is enabled

## Troubleshooting

### Neo4j Connection Failed
- Check Neo4j is running: `neo4j status` or check Desktop
- Verify credentials in `.env`
- Try connecting via Browser first

### Port Already in Use
```bash
# Find process using port 4000
lsof -i :4000  # Mac/Linux
netstat -ano | findstr :4000  # Windows

# Or change port in .env
PORT=4001
```

### TypeScript Errors
```bash
# Clean and rebuild
rm -rf dist
pnpm build
```

## Next Steps

After backend is running:

1. Implement authentication service
2. Add upload pipeline with GCS
3. Integrate Gemini AI service
4. Build graph query services
5. Add comprehensive tests

See [Development Setup](../docs/DEV_SETUP.md) for full instructions.