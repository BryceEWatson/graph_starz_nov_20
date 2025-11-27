# Graph Starz Quick Reference

> *A living map of AI images, where creators are the stars.*

Fast navigation to all documentation and key files.

## 📚 Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [GRAPH_STARZ_MVP.md](./GRAPH_STARZ_MVP.md) | MVP spec, architecture, endpoints | Understanding project scope |
| [DEV_SETUP.md](./DEV_SETUP.md) | Development environment setup | First-time setup, troubleshooting |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | **Step-by-step code examples** | **Building features** |
| [TESTING.md](./TESTING.md) | Testing strategy and examples | Writing tests |
| [Backend README](../backend/README.md) | Backend quick start | Running backend |

## 🎯 Implementation Phases (with Code)

Each phase has **complete code examples** in [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md):

### Phase 1: Authentication ✅ Ready
- **Files to create**:
  - `backend/src/services/authService.ts`
  - `backend/src/middleware/authMiddleware.ts`
  - `backend/src/routes/auth.ts`
- **Endpoints**: `POST /auth/google`, `GET /auth/validate`, `POST /auth/logout`
- **Dependencies**: `google-auth-library`, `jsonwebtoken`

### Phase 2: Upload Pipeline ✅ Ready
- **Files to create**:
  - `backend/src/services/storageService.ts`
  - `backend/src/services/aiService.ts`
  - `backend/src/services/graphService.ts`
  - `backend/src/routes/uploads.ts`
- **Endpoints**: `POST /uploads/init`, `POST /uploads/complete`
- **Dependencies**: `@google-cloud/storage`, `@google/generative-ai`

### Phase 3: Graph Queries ✅ Ready
- **Files to extend**:
  - `backend/src/services/graphService.ts` (add graph query functions)
  - `backend/src/routes/graph.ts` (new file)
- **Endpoints**: `GET /graph/ego`, `GET /graph/global`, `GET /graph/image/:id`

### Phase 4: AI & Similarity ✅ Ready
- **Files to create**:
  - `backend/src/services/similarityService.ts`
  - `backend/src/services/jobService.ts` (optional background jobs)
- **Endpoints**: `POST /images/:id/similar`
- **Background**: Auto-calculate similarity on upload

### Phase 5: Muse Stars & Graph-Aware Prompt Suggestions ✅ Ready
- **Files to create**:
  - `backend/src/services/museStarService.ts`
  - `backend/src/services/aiMuseService.ts`
  - `backend/src/routes/museStars.ts`
- **Endpoints**: `GET /boards/:id/muse-stars`, `POST /muse-stars/prompts`
- **Feature**: Detect underexplored regions & generate context-aware prompts
- **Terminology**: "Muse Star" (UI) → `GapNode`/`MuseStarNode` (internal)

## 🗂️ Project Structure

```
graph-starz/
├── docs/
│   ├── GRAPH_STARZ_MVP.md          # ← WHAT to build
│   ├── IMPLEMENTATION_GUIDE.md     # ← HOW to build (with code!)
│   ├── DEV_SETUP.md                # ← Environment setup
│   ├── TESTING.md                  # ← Testing patterns
│   └── QUICK_REFERENCE.md          # ← This file
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts              # ✅ Environment variables
│   │   │   └── neo4j.ts            # ✅ Neo4j connection
│   │   ├── middleware/
│   │   │   ├── errorMiddleware.ts  # ✅ Error handling
│   │   │   └── authMiddleware.ts   # ✅ JWT auth middleware
│   │   ├── routes/
│   │   │   ├── health.ts           # ✅ Health check
│   │   │   ├── auth.ts             # ✅ Google OAuth, JWT, waitlist
│   │   │   ├── uploads.ts          # ✅ Signed URLs, AI analysis
│   │   │   ├── graph.ts            # ✅ Ego network, global graph
│   │   │   └── museStars.ts        # ✅ Muse Star detection, prompts
│   │   ├── services/
│   │   │   ├── authService.ts      # ✅ OAuth token exchange, whitelist
│   │   │   ├── storageService.ts   # ✅ GCS signed URLs, thumbnails
│   │   │   ├── aiService.ts        # ✅ Gemini image analysis
│   │   │   ├── graphService.ts     # ✅ Neo4j queries, graph creation
│   │   │   ├── similarityService.ts# ⏳ Phase 4 (future)
│   │   │   ├── museStarService.ts  # ✅ Gap detection
│   │   │   └── aiMuseService.ts    # ✅ Prompt generation
│   │   ├── utils/
│   │   │   └── logger.ts           # ✅ Winston logging
│   │   └── index.ts                # ✅ Express server
│   │
│   ├── scripts/
│   │   ├── init-neo4j.cypher       # ✅ Database schema
│   │   └── seed-dev-data.cypher    # ✅ Sample data
│   │
│   ├── tests/
│   │   └── unit/                   # ✅ Unit tests (vitest)
│   │
│   ├── .env                        # ✅ Configured
│   ├── .env.example                # ✅ Template
│   ├── package.json                # ✅ Dependencies
│   └── tsconfig.json               # ✅ TypeScript config
│
├── services/                       # ✅ Frontend API services
│   ├── authService.ts              # ✅ Auth API calls
│   ├── uploadService.ts            # ✅ Upload flow (init → GCS → complete)
│   ├── graphService.ts             # ✅ Graph API calls
│   └── museStarService.ts          # ✅ Muse Star API calls
│
├── contexts/                       # ✅ React contexts
│   ├── AuthContext.tsx             # ✅ Auth state management
│   └── GraphContext.tsx            # ✅ Graph data + refresh
│
├── components/                     # ✅ React components
│   ├── GraphCanvas.tsx             # ✅ D3 graph + Muse Stars
│   ├── UploadModal.tsx             # ✅ Real upload flow
│   ├── MuseStarPanel.tsx           # ✅ Prompt drawer
│   └── ...
│
└── App.tsx                         # ✅ Provider wiring
```

## 🚀 Quick Commands

```bash
# Backend
cd backend
npm install              # Install dependencies
npm run dev              # Start dev server (hot reload)
npm run build            # Compile TypeScript
npm start                # Run production build
npm test                 # Run tests

# Neo4j
# Open browser: http://localhost:7474
# Run: backend/scripts/init-neo4j.cypher
# Run: backend/scripts/seed-dev-data.cypher (optional)

# Frontend
cd ..
npm install              # Install dependencies
npm run dev              # Start Vite dev server
npm run build            # Production build
npm test                 # Run tests

# Health Checks
curl http://localhost:4000/health          # Backend health
curl http://localhost:5173                 # Frontend
```

## 🔑 Environment Variables

All configured in `backend/.env`:

| Variable | Status | Description |
|----------|--------|-------------|
| `PORT` | ✅ Set | Backend port (4000) |
| `NEO4J_URI` | ✅ Set | bolt://localhost:7687 |
| `NEO4J_PASSWORD` | ✅ Set | Your Neo4j password |
| `GCS_BUCKET` | ✅ Set | starz-images |
| `GCP_PROJECT_ID` | ✅ Set | starz-439218 |
| `GEMINI_API_KEY` | ✅ Set | AIzaSy... |
| `GOOGLE_CLIENT_ID` | ✅ Set | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ Set | OAuth secret |
| `GRAPHSTARZ_JWT_SECRET` | ✅ Set | Auto-generated |

## 📝 Neo4j Cypher Quick Reference

```cypher
// View all nodes
MATCH (n) RETURN n LIMIT 25;

// View graph schema
CALL db.schema.visualization();

// Check constraints
SHOW CONSTRAINTS;

// Check indexes
SHOW INDEXES;

// Find user's uploads
MATCH (u:User {email: "alice@example.com"})-[:UPLOADED]->(i:Image)
RETURN u, i;

// Find images with specific attribute
MATCH (i:Image)-[:HAS_ATTRIBUTE]->(a:Attribute {type: "style", value: "cyberpunk"})
RETURN i, a;

// Find similar images
MATCH (i1:Image {id: "img_001"})-[s:SIMILAR_TO]-(i2:Image)
RETURN i1, s, i2;

// Clear all data (CAREFUL!)
MATCH (n) DETACH DELETE n;
```

## 🐛 Common Issues & Solutions

### Backend won't start
```bash
# Check Neo4j is running
neo4j status  # or check Neo4j Desktop

# Check port not in use
lsof -i :4000  # Mac/Linux
netstat -ano | findstr :4000  # Windows

# Check environment variables
cd backend
cat .env
```

### Neo4j connection failed
```bash
# Verify credentials
# Open Neo4j Browser: http://localhost:7474
# Try connecting there first

# Check .env has correct password
# NEO4J_PASSWORD should match your Neo4j Desktop password
```

### GCS upload fails
```bash
# Verify service account
ls backend/service-account.json

# Test GCS access
gcloud storage buckets list --project=starz-439218

# Check CORS configuration
gcloud storage buckets describe gs://starz-images
```

### Gemini API errors
```bash
# Verify API key
curl -H "x-goog-api-key: YOUR_KEY" \
  https://generativelanguage.googleapis.com/v1/models

# Check quota
# Visit: https://aistudio.google.com/apikey
```

## 📊 Testing Endpoints

```bash
# Health check
curl http://localhost:4000/health

# Auth (requires frontend to get OAuth code first)
curl -X POST http://localhost:4000/auth/google \
  -H "Content-Type: application/json" \
  -d '{"code":"GOOGLE_AUTH_CODE"}'

# Upload init (requires JWT)
curl -X POST http://localhost:4000/uploads/init \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg"}'

# Get ego network (requires JWT)
curl http://localhost:4000/graph/ego \
  -H "Authorization: Bearer YOUR_JWT"
```

## 🎯 Next Session Checklist

Before starting implementation:

1. **Backend running**: `cd backend && npm run dev` ✅
2. **Neo4j initialized**: Ran `init-neo4j.cypher` ⏳
3. **Sample data loaded**: Ran `seed-dev-data.cypher` (optional) ⏳
4. **Read**: [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for phase you're building ⏳
5. **Copy code**: From implementation guide into your project ⏳
6. **Test**: Using curl or Postman ⏳
7. **Celebrate**: Feature complete! 🎉

## 📚 External Resources

- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j JavaScript Driver](https://neo4j.com/docs/javascript-manual/current/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Google Cloud Storage Node.js](https://cloud.google.com/storage/docs/reference/libraries#client-libraries-install-nodejs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Zod Documentation](https://zod.dev/)

## 💡 Pro Tips

1. **Keep backend running** - `npm run dev` auto-reloads on changes
2. **Use Neo4j Browser** - Great for testing Cypher queries visually
3. **Check logs** - Backend logs show all requests and errors
4. **Test incrementally** - Build one endpoint, test it, move to next
5. **Use the implementation guide** - Copy the code, understand it, customize it

---

**Ready to code?** Start with [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) Phase 1! 🚀