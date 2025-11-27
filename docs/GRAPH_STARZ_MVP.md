# Graph Starz MVP Specification

## Product Vision

> **Graph Starz is a living map of AI images, where creators are the stars and every contribution expands the universe.**

Graph Starz is a **global graph index of AI-generated images**—a living map where every image is a point, every creator is a star, and connections reveal patterns across the visual universe. Under the hood, it's a knowledge graph of users, images, and AI-extracted attributes powered by Neo4j.

### The AI Muse

The **AI Muse** reads this map and helps creators discover what to make next. Many potential images already exist **in latent space inside AI image models**—they're plausible combinations of styles, subjects, and moods that haven't been created yet. The Muse surfaces these opportunities as **Muse Stars**: subtle suggested nodes in the graph pointing to underexplored regions where a new image would make sense.

### Core Ideas
- **Living map / graph index**: Not a feed or gallery—a navigable, interconnected map of images.
- **Creators are the stars**: Each user anchors regions of the map with their unique style and contributions.
- **Muse Stars**: Suggested points that help creators extend their corner of the universe.
- **Graph-aware prompts**: When you click a Muse Star, the AI generates 2-3 contextual prompts based on nearby images and target attributes.

## Overview

Graph Starz creates an interconnected network of users, images, and AI-generated attributes. Every upload enriches the global graph, revealing patterns and connections across the community's shared visual content.

## Core Concepts

### Entities (Nodes)

1. **User**
   - Properties: `id`, `email`, `name`, `profilePictureUrl`, `createdAt`
   - Represents authenticated users who can upload and interact with images

2. **Image**
   - Properties: `id`, `url`, `thumbnailUrl`, `title`, `description`, `uploadedAt`
   - Title and description are AI-generated via Google Gemini

3. **Attribute**
   - Properties: `type`, `value`
   - Examples:
     - `type: "style", value: "cyberpunk"`
     - `type: "mood", value: "energetic"`
     - `type: "subject", value: "cityscape"`
     - `type: "color", value: "neon"`

4. **Board**
   - Properties: `id`, `name`, `description`, `createdAt`, `ownerId`
   - Represents a workspace or collection that contains a subset of the graph for focused exploration

5. **Muse Star** (UI: "Muse Star", Internal: `GapNode` or `MuseStarNode`)
   - Properties: `id`, `type`, `targetAttributes`, `context`, `boardId`
   - Represents a suggested point in the graph where a new image could expand underexplored regions
   - **Mapping**: In code/DTOs, this may be called `GapNode`, but in UI and docs we refer to them as "Muse Stars"
   - Generated dynamically based on current board/graph state

6. **Prompt Suggestion**
   - Properties: `id`, `museStarId`, `promptText`, `context`, `generatedAt`
   - AI-generated prompt ideas for a specific Muse Star
   - Based on nearby images and target attributes

7. **Constellation** (Stretch Goal)
   - Properties: `id`, `name`, `description`, `createdAt`
   - User-created collections that group related images

### Relationships (Edges)

1. **UPLOADED** (User → Image)
   - Properties: `timestamp`
   - Tracks who uploaded which image

2. **HAS_ATTRIBUTE** (Image → Attribute)
   - Properties: `confidence` (0.0-1.0)
   - Links images to their AI-detected attributes

3. **SIMILAR_TO** (Image ↔ Image)
   - Properties: `similarity` (0.0-1.0)
   - Bidirectional relationship based on shared attributes
   - Calculated when similarity exceeds threshold (e.g., 0.7)

4. **INCLUDES** (Constellation → Image) [Stretch Goal]
   - Properties: `addedAt`
   - Links constellations to their member images

## API Endpoints

### Authentication
- `POST /auth/google` - Exchange Google auth code for JWT
- `POST /auth/logout` - Invalidate session
- `GET /auth/validate` - Check JWT validity

### Upload Pipeline
- `POST /uploads/init` - Get signed URL for GCS upload
- `POST /uploads/complete` - Trigger AI analysis after upload

### Graph Queries
- `GET /graph/ego` - Get user's ego network (their uploads + attributes)
- `GET /graph/global` - Get sampled global graph (paginated)
- `GET /graph/image/:id` - Get specific image with its network

### User Operations
- `GET /me` - Current user profile
- `GET /me/uploads` - User's uploaded images
- `GET /me/constellations` - User's collections

### Discovery
- `GET /users/:id/similar` - Find users with similar taste
- `GET /images/trending` - Recently popular images
- `POST /images/:id/similar` - Find visually similar images

### Muse Stars & Prompt Suggestions
- `GET /boards/:id/muse-stars` - Get Muse Stars for a board (suggested nodes)
- `POST /muse-stars/:id/prompts` - Generate graph-aware prompts for a Muse Star
- `GET /graph/explore` - Get graph data with Muse Stars included

### Constellation Management [Stretch Goal]
- `POST /constellations` - Create new constellation
- `PUT /constellations/:id` - Update constellation
- `POST /constellations/:id/add` - Add image to constellation
- `DELETE /constellations/:id/remove` - Remove image

## Technical Architecture

### Backend Stack
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express.js
- **Database**: Neo4j (graph database)
- **Storage**: Google Cloud Storage (image blobs)
- **AI**: Google Gemini 2.5 Flash via @google/genai SDK
- **Auth**: Google OAuth 2.0 with JWT sessions

### Frontend Stack (Already Built)
- **Framework**: React 19 + TypeScript
- **Build**: Vite 6
- **Visualization**: D3.js 7.9 (force-directed graph)
- **Styling**: Tailwind CSS
- **Auth**: Google Identity Services (Code Model)

### Key Workflows

#### 1. Image Upload Flow
```
1. User initiates upload from frontend
2. Backend provides signed GCS URL
3. Frontend uploads directly to GCS
4. Backend triggers Gemini analysis
5. AI extracts title, description, attributes
6. Neo4j stores nodes and relationships
7. Similarity calculations run async
8. Frontend updates graph visualization
```

#### 2. Graph Navigation Flow
```
1. User loads initial ego network
2. Force simulation positions nodes
3. Click on node to expand connections
4. Hover shows image preview
5. Click image for full view + details
6. Navigate between connected images
```

## MVP Success Criteria

### Phase 1: Core Infrastructure ✅
- [x] Frontend with mock data
- [x] Basic auth flow (Google Sign-In)
- [x] Backend Express server
- [x] Neo4j connection
- [x] GCS integration
- [x] JWT authentication middleware
- [x] Auth routes (/auth/google, /auth/validate, /auth/logout, /auth/waitlist)

### Phase 2: Upload Pipeline ✅
- [x] Signed URL generation (storageService.ts)
- [x] Gemini AI analysis (aiService.ts - using gemini-2.0-flash-exp)
- [x] Attribute extraction (style, mood, subject, color)
- [x] Graph persistence (graphService.ts - createImageWithAttributes)
- [x] Upload routes (/uploads/init, /uploads/complete)
- [x] Whitelist enforcement on uploads

### Phase 3: Graph Visualization ✅
- [x] Ego network queries (getUserEgoNetwork)
- [x] Global graph queries (getGlobalGraphSample)
- [x] Graph routes (/graph/ego, /graph/global)
- [ ] Frontend integration with real graph data (TODO: replace INITIAL_GRAPH_DATA)
- [ ] Real-time graph updates (TODO: after upload)
- [ ] Interactive navigation (frontend exists, needs backend integration)
- [ ] Similarity relationships (structure in place, calculation not yet implemented)

### Phase 4: Discovery Features (Future)
- [ ] User similarity matching
- [ ] Trending algorithm
- [ ] Search by attributes
- [ ] Constellation creation

### Phase 5: Muse Stars & Graph-Aware Prompt Suggestions ✅ (MVP)
- [x] Detect underexplored regions in user's ego network (museStarService.ts)
- [x] Simple bucket-based detection (style + mood combinations)
- [x] Generate graph-aware prompts via AI Muse service (aiMuseService.ts)
- [x] Muse Star routes (/muse-stars/ego, /muse-stars/prompts)
- [x] Context-aware prompt generation based on nearby images and target attributes
- [x] Variety in prompts (Safe, Bold, Experimental)
- [ ] Frontend visualization of Muse Stars (TODO)
- [ ] Click interaction: Muse Star → Prompt drawer (TODO)

**Note**: Phase 5 is currently scoped to user ego networks. Board-based Muse Stars require implementing Board entity (Phase 4).

## Database Schema (Neo4j)

### Indexes & Constraints
```cypher
CREATE CONSTRAINT user_email_unique IF NOT EXISTS
  FOR (u:User) REQUIRE u.email IS UNIQUE;

CREATE CONSTRAINT image_id_unique IF NOT EXISTS
  FOR (i:Image) REQUIRE i.id IS UNIQUE;

CREATE INDEX attribute_lookup IF NOT EXISTS
  FOR (a:Attribute) ON (a.type, a.value);
```

### Sample Graph Pattern
```
(alice:User {email: "alice@example.com"})
  -[:UPLOADED]->
(img1:Image {title: "Neon Dreams"})
  -[:HAS_ATTRIBUTE {confidence: 0.9}]->
(attr1:Attribute {type: "style", value: "cyberpunk"})
  <-[:HAS_ATTRIBUTE {confidence: 0.85}]-
(img2:Image {title: "Digital Rain"})
  <-[:UPLOADED]-
(bob:User {email: "bob@example.com"})

(img1)-[:SIMILAR_TO {similarity: 0.82}]->(img2)
```

## Success Criteria & Non-Goals

### Success Metrics
- Creators understand the "living map" and "Muse Stars" concepts
- Users navigate the graph intuitively as a star-map interface
- Muse Stars lead to creation of images in underexplored regions
- Prompt suggestions feel contextual and helpful

### Non-Goals
- Don't force star metaphors into every technical detail
- Don't overexplain the "universe" concept—let it emerge naturally
- Keep technical docs grounded and precise
- Use the metaphor as seasoning, not the whole meal

## Security Considerations

1. **Authentication**: Google OAuth only, JWT for sessions
2. **Authorization**: Users can only modify their own content
3. **Rate Limiting**: Upload and AI analysis throttling
4. **Input Validation**: Zod schemas for all endpoints
5. **CORS**: Restrict to frontend origin
6. **Secrets**: All keys in environment variables
7. **SQL Injection**: Not applicable (Neo4j uses Cypher with parameters)

## Performance Targets

- Graph load: < 2s for 100-node ego network
- Upload complete: < 5s including AI analysis
- Similarity calc: Async, < 10s for 1000 comparisons
- Graph render: 60fps for up to 500 nodes

## Future Enhancements

1. **Social Features**
   - Follow/unfollow users
   - Like/save images
   - Comments on images

2. **Advanced AI**
   - Style transfer suggestions
   - Auto-constellation generation
   - Trend prediction

3. **Gamification**
   - Upload streaks
   - Rare attribute badges
   - Constellation challenges

## Links

- [Development Setup](./DEV_SETUP.md)
- [Testing Guide](./TESTING.md)
- [API Documentation](./API.md) (TODO)