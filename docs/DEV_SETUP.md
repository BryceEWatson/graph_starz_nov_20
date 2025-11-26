# Graph Starz Development Setup

This guide walks through setting up Graph Starz for local development **without Docker**.

## Prerequisites

- **Node.js 20+** (verify: `node --version`)
- **pnpm** or npm (we'll use pnpm in examples)
- **Neo4j Desktop** or **Neo4j Aura** account
- **Google Cloud Platform** account (for GCS and Gemini)
- **Git** (for version control)

## Quick Start

If you've done this before and just need the commands:

```bash
# Backend setup
cd backend
cp .env.example .env  # Then fill in your values
pnpm install
pnpm dev

# Frontend setup (in another terminal)
cd ..
pnpm install
pnpm dev
```

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/BryceEWatson/graph_starz_nov_20.git
cd graph_starz_nov_20
```

### 2. Neo4j Database Setup

#### Option A: Neo4j Desktop (Recommended for Development)

1. **Download Neo4j Desktop** from https://neo4j.com/download/
2. **Create a new project** called "Graph Starz"
3. **Add a local database** (version 5.x recommended)
4. **Start the database** and note:
   - Bolt URI: `bolt://localhost:7687` (default)
   - Username: `neo4j` (default)
   - Password: (you set this on first start)

5. **Run initialization script** in Neo4j Browser:
   - Open Neo4j Browser (click "Open" in Desktop)
   - Copy contents of `backend/scripts/init-neo4j.cypher`
   - Paste and execute in Browser

6. **Seed development data** (optional but recommended):
   - Copy contents of `backend/scripts/seed-dev-data.cypher`
   - Paste and execute in Browser

#### Option B: Neo4j Aura (Cloud)

1. **Sign up** at https://console.neo4j.io/
2. **Create a free instance** (AuraDB Free tier)
3. **Save credentials**:
   - Connection URI: `neo4j+s://xxxxx.databases.neo4j.io`
   - Username: `neo4j`
   - Password: (generated, save this!)

4. **Run init and seed scripts** same as Desktop option

### 3. Google Cloud Setup

#### Google Cloud Storage (GCS)

1. **Create a GCP Project**:
   - Go to https://console.cloud.google.com
   - Create new project or select existing
   - Note your Project ID

2. **Create a Storage Bucket**:
   ```bash
   # Using gcloud CLI (if installed)
   gcloud storage buckets create gs://your-graph-starz-images \
     --location=us-central1 \
     --uniform-bucket-level-access

   # Or use the Console UI:
   # Storage > Create Bucket > Name it uniquely
   ```

3. **Create a Service Account**:
   - IAM & Admin > Service Accounts > Create
   - Name: `graph-starz-backend`
   - Grant role: `Storage Object Admin`
   - Create JSON key and download
   - Save as `backend/service-account.json` (git-ignored)

4. **Enable CORS** on your bucket:
   ```bash
   # Create cors.json file
   echo '[
     {
       "origin": ["http://localhost:5173", "http://localhost:3000"],
       "method": ["GET", "PUT", "POST"],
       "maxAgeSeconds": 3600
     }
   ]' > cors.json

   # Apply to bucket
   gcloud storage buckets update gs://your-bucket-name --cors-file=cors.json
   ```

#### Google Gemini API

1. **Get API Key**:
   - Go to https://aistudio.google.com/
   - Click "Get API Key"
   - Create key in your GCP project
   - Copy the key (starts with `AIza...`)

#### Google OAuth (Authentication)

1. **Configure OAuth Consent Screen**:
   - APIs & Services > OAuth consent screen
   - User type: External
   - App name: Graph Starz
   - Support email: your email
   - Authorized domains: (leave empty for dev)

2. **Create OAuth Client**:
   - APIs & Services > Credentials > Create Credentials > OAuth Client ID
   - Application type: Web application
   - Name: Graph Starz Dev
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     http://localhost:3000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:4000/auth/google/callback
     ```
   - Save Client ID and Client Secret

### 4. Backend Configuration

1. **Navigate to backend**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   # or: npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env`** with your values:
   ```env
   # Server Config
   PORT=4000
   NODE_ENV=development

   # JWT Secret (generate a random string)
   GRAPHSTARZ_JWT_SECRET=your-random-secret-here-32-chars-min

   # Neo4j Connection
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your-neo4j-password

   # Google Cloud Storage
   GCS_BUCKET=your-bucket-name
   GCP_PROJECT_ID=your-project-id
   GCP_STORAGE_LOCATION=us-central1

   # Google Gemini AI
   GEMINI_API_KEY=AIza...your-key-here

   # Google OAuth
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_OAUTH_REDIRECT_URI=http://localhost:4000/auth/google/callback

   # Frontend URL (for CORS)
   FRONTEND_ORIGIN=http://localhost:5173
   ```

5. **Set up GCS authentication**:
   ```bash
   # If using service account JSON:
   export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"

   # Or use gcloud auth for development:
   gcloud auth application-default login
   ```

### 5. Frontend Configuration

1. **Navigate to project root**:
   ```bash
   cd ..  # Back to root from backend/
   ```

2. **Install frontend dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure frontend environment**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env`** for frontend:
   ```env
   # Frontend only needs the public client ID
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   VITE_BACKEND_URL=http://localhost:4000
   ```

### 6. Running the Application

#### Start Backend (Terminal 1):
```bash
cd backend
pnpm dev

# You should see:
# ✅ Server running on port 4000
# ✅ Neo4j connected to bolt://localhost:7687
# ✅ Environment: development
```

#### Start Frontend (Terminal 2):
```bash
# From project root
pnpm dev

# Vite will start on http://localhost:5173
```

#### Verify Setup:
1. Open http://localhost:5173 in browser
2. Check backend health: http://localhost:4000/health
3. Try Google Sign-In on frontend
4. Upload a test image (if implemented)

### 7. Development Workflow

#### Database Management:
```bash
# Reset database (in Neo4j Browser)
MATCH (n) DETACH DELETE n;

# Re-run init and seed scripts
# Copy from backend/scripts/*.cypher
```

#### Backend Development:
```bash
cd backend
pnpm dev          # Hot reload with nodemon/tsx
pnpm build        # TypeScript compile
pnpm start        # Run compiled JS
pnpm test         # Run tests (when added)
```

#### Frontend Development:
```bash
pnpm dev          # Vite dev server
pnpm build        # Production build
pnpm preview      # Preview production build
```

## Troubleshooting

### Neo4j Connection Issues
- **"Connection refused"**: Check Neo4j is running
- **"Authentication failed"**: Verify username/password in .env
- **Aura timeout**: Check firewall/network, try neo4j+s:// protocol

### Google Cloud Issues
- **"Permission denied" on GCS**: Check service account has Storage Admin role
- **CORS errors**: Verify bucket CORS configuration includes your frontend URL
- **Gemini quota exceeded**: Check API quotas in Google AI Studio

### Frontend-Backend Connection
- **CORS errors**: Ensure FRONTEND_ORIGIN in backend .env matches frontend URL
- **"Cannot reach backend"**: Check backend is running on configured port
- **Auth redirect fails**: Verify redirect URI matches in OAuth client and backend

### Port Conflicts
```bash
# Find what's using a port
lsof -i :4000  # Mac/Linux
netstat -ano | findstr :4000  # Windows

# Use different ports in .env files if needed
```

## Environment Variables Reference

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Backend server port | 4000 |
| NODE_ENV | Environment mode | development |
| GRAPHSTARZ_JWT_SECRET | JWT signing secret (32+ chars) | random-string-here |
| NEO4J_URI | Neo4j connection string | bolt://localhost:7687 |
| NEO4J_USERNAME | Neo4j username | neo4j |
| NEO4J_PASSWORD | Neo4j password | your-password |
| GCS_BUCKET | GCS bucket name | graph-starz-images |
| GCP_PROJECT_ID | GCP project ID | my-project-123 |
| GCP_STORAGE_LOCATION | Bucket location | us-central1 |
| GEMINI_API_KEY | Google AI API key | AIza... |
| GOOGLE_CLIENT_ID | OAuth client ID | xxx.apps.googleusercontent.com |
| GOOGLE_CLIENT_SECRET | OAuth client secret | GOCSPX-... |
| GOOGLE_OAUTH_REDIRECT_URI | OAuth callback URL | http://localhost:4000/auth/google/callback |
| FRONTEND_ORIGIN | Frontend URL for CORS | http://localhost:5173 |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_GOOGLE_CLIENT_ID | OAuth client ID | xxx.apps.googleusercontent.com |
| VITE_BACKEND_URL | Backend API URL | http://localhost:4000 |

## Next Steps

Once your environment is running:

1. **Run tests** (see [Testing Guide](./TESTING.md))
2. **Implement MVP features** (see [MVP Spec](./GRAPH_STARZ_MVP.md))
3. **Deploy to production** (guide coming soon)

## Useful Commands

```bash
# Neo4j Cypher queries for debugging
MATCH (n) RETURN n LIMIT 25;  # See sample nodes
MATCH (u:User)-[:UPLOADED]->(i:Image) RETURN u, i;  # See uploads
CALL db.schema.visualization();  # Visualize schema

# Check backend logs
curl http://localhost:4000/health  # Health check
tail -f backend/logs/*.log  # If logging to files

# Frontend debugging
npm run build  # Check for TS/build errors
npm run preview  # Test production build locally
```

## Getting Help

- **Neo4j Docs**: https://neo4j.com/docs/
- **Express.js Guide**: https://expressjs.com/
- **Google Cloud Storage**: https://cloud.google.com/storage/docs
- **Gemini API**: https://ai.google.dev/
- **Project Issues**: Create issue in GitHub repo