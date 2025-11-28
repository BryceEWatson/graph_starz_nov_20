# Graph Starz

> **Graph Starz is a living map of AI images, where creators are the stars and every contribution expands the universe.**

Graph Starz is a global graph index of AI-generated images, users, and attributes. Every uploaded image becomes a point in this living map, revealing connections between styles, subjects, and moods. An AI Muse reads this map and suggests what to create next through **Muse Stars**—subtle suggested nodes that point to underexplored regions where a new image could expand the universe.

## Features

- **Living Map Visualization**: Interactive force-directed graph where creators are stars in a universe of AI images. Navigate the connections between users, images, and attributes.
- **AI-Powered Understanding**: Gemini 3 Pro automatically analyzes images to extract titles, descriptions, and semantic attributes (style, mood, subject, color).
- **Muse Stars & Graph-Aware Suggestions**: The AI Muse identifies underexplored regions of your map and suggests prompts for images that could exist in model latent space but haven't been created yet.
- **Semantic Connections**: Visualize how images relate through shared attributes, creating constellations of similar visual ideas.
- **Secure Authentication**: Google OAuth sign-in with backend-enforced access control.
- **Dark Mode UI**: Space-themed interface that reflects the star-map metaphor.

## Prerequisites

- Node.js 20+
- A Google Cloud Project with:
  - **Gemini API Key** (AI Studio)
  - **OAuth 2.0 Client ID** (Google Identity Services)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/BryceEWatson/graph_starz_nov_20.git
   cd graph_starz_nov_20
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Configuration

This project requires environment variables for both frontend and backend.

### Frontend Environment Variables

Create a `.env` file in the **root directory**:

```env
# Required for Google Sign-In (Frontend)
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

### Backend Environment Variables

Create a `.env` file in the **backend** directory. See `backend/.env.example` for a complete template:

```env
# Server
PORT=4000
NODE_ENV=development

# JWT Secret (generate a secure random string)
GRAPHSTARZ_JWT_SECRET=your_jwt_secret_here

# Neo4j Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password

# Google Cloud Storage
GCS_BUCKET=your_gcs_bucket_name
GCP_PROJECT_ID=your_gcp_project_id
GCP_STORAGE_LOCATION=us-central1

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth (Backend)
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret_here
GOOGLE_OAUTH_REDIRECT_URI=postmessage

# Frontend Origin (CORS)
FRONTEND_ORIGIN=http://localhost:3000

# Access Control (comma-separated emails)
WHITELISTED_EMAILS=your.email@gmail.com,another@example.com
```

### How to get keys:
1. **Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/) to generate an API key.
2. **Google OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project and configure the OAuth Consent Screen.
   - Create Credentials > OAuth Client ID (Web Application).
   - Add `http://localhost:3000` (or your dev URL) to "Authorized JavaScript origins".
   - Note both the Client ID and Client Secret.
3. **Neo4j**: Install Neo4j Desktop or use Neo4j Aura (cloud).
4. **Google Cloud Storage**:
   - Create a GCS bucket in your GCP project.
   - **For MVP/Development**: Set the bucket to **public read access** (or use IAM to allow public access to objects). The backend fetches uploaded images via public URLs for AI analysis.
   - **For Production**: Consider using signed read URLs or GCS SDK direct access instead of public URLs. See [backend/src/services/aiService.ts](backend/src/services/aiService.ts) for implementation details.

## Access Control

By default, the application is gated. Only whitelisted users can upload images and access full features.

**To manage the whitelist:**
1. Open `backend/.env`
2. Add authorized email addresses to the `WHITELISTED_EMAILS` environment variable (comma-separated):
   ```env
   WHITELISTED_EMAILS=demo@example.com,your.email@gmail.com
   ```

**Note:** Access control is enforced in the **backend only**. The frontend authenticates users via Google OAuth, but upload permissions and data access are controlled server-side.

## Running the App

**Start the backend server:**
```bash
cd backend
npm run dev
```

**Start the frontend (in a separate terminal):**
```bash
npm run dev
```

The app will be available at:
- Frontend: `http://localhost:5173` (Vite default)
- Backend API: `http://localhost:4000`

**Note:** Neo4j must be running before starting the backend. See [Development Setup](./docs/DEV_SETUP.md) for details.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite/Webpack
- **Styling**: Tailwind CSS
- **Visualization**: D3.js
- **AI**: Google Gemini SDK (@google/genai)
- **Auth**: Google Identity Services (GSI)
- **Backend**: Node.js, Express, TypeScript
- **Database**: Neo4j (Graph Database)
- **Storage**: Google Cloud Storage

## Documentation

> *A living map of AI images, where creators are the stars.*

### 🚀 Getting Started
- **[Quick Reference](./docs/QUICK_REFERENCE.md)** - Fast navigation to everything you need
- **[Development Setup](./docs/DEV_SETUP.md)** - Complete setup guide (one-time)

### 💻 Building Features
- **[Implementation Guide](./docs/IMPLEMENTATION_GUIDE.md)** - **Step-by-step code examples for all MVP phases**
- **[MVP Specification](./docs/GRAPH_STARZ_MVP.md)** - Full feature spec and architecture

### 🧪 Testing & Backend
- **[Testing Guide](./docs/TESTING.md)** - Testing strategy and examples
- **[Backend README](./backend/README.md)** - Backend-specific instructions
