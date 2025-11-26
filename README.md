# Graph Starz

> **Graph Starz is a living map of AI images, where creators are the stars and every contribution expands the universe.**

Graph Starz is a global graph index of AI-generated images, users, and attributes. Every uploaded image becomes a point in this living map, revealing connections between styles, subjects, and moods. An AI Muse reads this map and suggests what to create next through **Muse Stars**—subtle suggested nodes that point to underexplored regions where a new image could expand the universe.

## Features

- **Living Map Visualization**: Interactive force-directed graph where creators are stars in a universe of AI images. Navigate the connections between users, images, and attributes.
- **AI-Powered Understanding**: Gemini 2.5 Flash automatically analyzes images to extract titles, descriptions, and semantic attributes (style, mood, subject, color).
- **Muse Stars & Graph-Aware Suggestions**: The AI Muse identifies underexplored regions of your map and suggests prompts for images that could exist in model latent space but haven't been created yet.
- **Semantic Connections**: Visualize how images relate through shared attributes, creating constellations of similar visual ideas.
- **Secure Authentication**: Google OAuth sign-in with backend-enforced access control.
- **Dark Mode UI**: Space-themed interface that reflects the star-map metaphor.

## Prerequisites

- Node.js (v18 or higher)
- A Google Cloud Project with:
  - **Gemini API Key** (AI Studio)
  - **OAuth 2.0 Client ID** (Google Identity Services)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/graph-starz.git
   cd graph-starz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Configuration

This project requires environment variables to function correctly. Create a `.env` file in the root directory:

```env
# Required for Image Analysis
API_KEY=your_google_gemini_api_key_here

# Required for Authentication
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

### How to get keys:
1. **Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/) to generate an API key.
2. **Google Client ID**: 
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project and configure the OAuth Consent Screen.
   - Create Credentials > OAuth Client ID (Web Application).
   - Add `http://localhost:3000` (or your dev URL) to "Authorized JavaScript origins".

## Whitelist / Waitlist

By default, the application is gated. Only users in the whitelist can access the main graph.

To manage access:
1. Open `constants.ts`.
2. Add authorized email addresses to the `WHITELIST` array:
   ```typescript
   export const WHITELIST = [
     'demo@example.com',
     'your.email@gmail.com' 
   ];
   ```

## Running the App

Start the development server:

```bash
npm start
```

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
