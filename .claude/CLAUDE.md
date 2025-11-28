# Graph Starz - Claude Assistant Guide

This file helps Claude effectively assist with the Graph Starz project by leveraging the comprehensive documentation already created.

## 🎯 Core Principle

**ALWAYS check documentation before writing new code or answering architecture questions.**

The project has extensive documentation with working code examples. Don't reinvent solutions that are already documented.

---

## 🎨 Brand & Voice

### Product Narrative

**Primary Tagline:**
> Graph Starz is a living map of AI images, where creators are the stars and every contribution expands the universe.

**Short Tagline:**
> A living map of AI images, where creators are the stars.

### Core Concepts to Weave In

- **Living map / graph index**: Not a feed or gallery—a navigable, interconnected map of images
- **Creators are the stars**: Each user anchors regions of the map with their unique contributions
- **AI Muse**: The system that reads the map and suggests what to create next
- **Muse Stars**: Subtle suggested nodes pointing to underexplored regions where new images could expand the universe
- **Latent space surfacing**: Many potential images exist in AI model latent space; Muse Stars help surface these undiscovered possibilities

### Terminology Mapping

**User-Facing (UI/Docs):**
- "Muse Star" — A suggested node in the graph
- "Living map" — The graph visualization
- "AI Muse" — The recommendation system
- "Extend the universe" — Create images in underexplored regions

**Internal (Code/DTOs):**
- `GapNode` or `MuseStarNode` — Backend representation of Muse Stars
- `graph index` — Technical term for the Neo4j database
- `museStarService` — Detection service
- `aiMuseService` — Prompt generation service

**Always explicitly map** these terms in documentation where both appear.

### Tone Guidelines

✅ **Do:**
- Use star/universe metaphor as **seasoning, not the whole meal**
- Keep technical docs precise and grounded
- Be poetic in UI-facing docs, but still clear
- Explain the "living map" concept when introducing the project
- Reference "creators as stars" when discussing user contributions

❌ **Don't:**
- Force star metaphors into every sentence or technical detail
- Overexplain the "universe" concept—let it emerge naturally
- Use space jargon in API endpoints or code comments
- Replace clear technical terms with metaphors

### Examples of Good vs Bad Usage

✅ **Good:**
- "The Muse Star feature detects underexplored regions of your map"
- "In code, Muse Stars are represented as `GapNode` entities"
- "The AI Muse generates prompts based on nearby images"

❌ **Bad:**
- "The cosmic star navigator traverses the celestial graph nebula"
- "Quantum entanglement of image nodes in the metaverse"
- Forcing "star" into every variable name (`starUser`, `starNode`, `starGraph`)

---

## 📚 Documentation Structure

### 1. **QUICK_REFERENCE.md** - Start here
- **Location**: `docs/QUICK_REFERENCE.md`
- **When to use**: Beginning of EVERY session
- **Purpose**: Fast navigation, project structure, common commands
- **Read first**: To understand what's already done and what's next

### 2. **IMPLEMENTATION_GUIDE.md** - The source of truth for code
- **Location**: `docs/IMPLEMENTATION_GUIDE.md`
- **When to use**: When implementing ANY feature
- **Purpose**: Complete working code examples for all MVP phases
- **Contains**:
  - Phase 1: Authentication (OAuth + JWT)
  - Phase 2: Upload Pipeline (GCS + Gemini AI)
  - Phase 3: Graph Queries (Neo4j)
  - Phase 4: Similarity Calculations
  - Phase 5: Muse Stars & Graph-Aware Prompt Suggestions
  - Common patterns (validation, error handling, logging)

**CRITICAL**: Before writing new service/route/middleware code, check if example exists here first!

### 3. **GRAPH_STARZ_MVP.md** - Architecture reference
- **Location**: `docs/GRAPH_STARZ_MVP.md`
- **When to use**: Understanding system architecture
- **Purpose**: Entity models, relationships, API contracts
- **Contains**: Database schema, workflows, success criteria

### 4. **DEV_SETUP.md** - Environment troubleshooting
- **Location**: `docs/DEV_SETUP.md`
- **When to use**: Setup issues, environment questions
- **Purpose**: Step-by-step setup, troubleshooting

### 5. **TESTING.md** - Testing patterns
- **Location**: `docs/TESTING.md`
- **When to use**: Writing tests
- **Purpose**: Unit/integration/E2E test examples

---

## 🚨 Decision Flow for Common Tasks

### User asks: "Implement authentication"

```
❌ DON'T: Start writing auth code from scratch
✅ DO:
   1. Read docs/IMPLEMENTATION_GUIDE.md Phase 1
   2. Copy the authService.ts code
   3. Copy the authMiddleware.ts code
   4. Copy the auth.ts routes
   5. Customize if needed
   6. Test
```

### User asks: "How does the upload flow work?"

```
❌ DON'T: Explain from memory or general knowledge
✅ DO:
   1. Read docs/GRAPH_STARZ_MVP.md "Image Upload Flow"
   2. Reference docs/IMPLEMENTATION_GUIDE.md Phase 2
   3. Explain using project's actual architecture
```

### User asks: "The backend won't start"

```
❌ DON'T: Generic troubleshooting
✅ DO:
   1. Check docs/QUICK_REFERENCE.md "Common Issues"
   2. Check docs/DEV_SETUP.md troubleshooting section
   3. Verify environment variables in backend/.env
   4. Check backend/src/config/env.ts for validation errors
```

### User asks: "How do I query the graph database?"

```
❌ DON'T: Generic Neo4j examples
✅ DO:
   1. Read docs/IMPLEMENTATION_GUIDE.md Phase 3
   2. Reference docs/QUICK_REFERENCE.md "Neo4j Cypher Quick Reference"
   3. Show project-specific examples from graphService.ts
```

### User asks: "Create a new API endpoint"

```
✅ DO:
   1. Check docs/GRAPH_STARZ_MVP.md for endpoint specification
   2. Read docs/IMPLEMENTATION_GUIDE.md for similar endpoint pattern
   3. Follow existing patterns in backend/src/routes/
   4. Use middleware from backend/src/middleware/authMiddleware.ts
   5. Use error patterns from backend/src/middleware/errorMiddleware.ts
```

---

## 🏗️ Project Structure Reference

Always reference this structure (from QUICK_REFERENCE.md):

```
graph-starz/
├── docs/
│   ├── QUICK_REFERENCE.md          # ← Navigation hub
│   ├── IMPLEMENTATION_GUIDE.md     # ← Code examples (USE THIS!)
│   ├── GRAPH_STARZ_MVP.md          # ← Architecture spec
│   ├── DEV_SETUP.md                # ← Setup guide
│   └── TESTING.md                  # ← Test patterns
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts              # ✅ Environment validation
│   │   │   └── neo4j.ts            # ✅ Database connection
│   │   ├── middleware/
│   │   │   ├── errorMiddleware.ts  # ✅ Error handling
│   │   │   └── authMiddleware.ts   # ⏳ See IMPLEMENTATION_GUIDE
│   │   ├── routes/
│   │   │   ├── health.ts           # ✅ Health checks
│   │   │   ├── auth.ts             # ⏳ See IMPLEMENTATION_GUIDE
│   │   │   ├── uploads.ts          # ⏳ See IMPLEMENTATION_GUIDE
│   │   │   └── graph.ts            # ⏳ See IMPLEMENTATION_GUIDE
│   │   ├── services/
│   │   │   ├── authService.ts      # ⏳ See IMPLEMENTATION_GUIDE
│   │   │   ├── storageService.ts   # ⏳ See IMPLEMENTATION_GUIDE
│   │   │   ├── aiService.ts        # ⏳ See IMPLEMENTATION_GUIDE
│   │   │   ├── graphService.ts     # ⏳ See IMPLEMENTATION_GUIDE
│   │   │   └── similarityService.ts# ⏳ See IMPLEMENTATION_GUIDE
│   │   └── utils/
│   │       └── logger.ts           # ✅ Winston logging
│   │
│   ├── scripts/
│   │   ├── init-neo4j.cypher       # ✅ Database schema
│   │   └── seed-dev-data.cypher    # ✅ Sample data
│   │
│   └── .env                        # ✅ All credentials configured
```

**Legend**:
- ✅ = Already implemented
- ⏳ = Implementation code available in IMPLEMENTATION_GUIDE.md

---

## 🔑 Key Configuration

All environment is configured in `backend/.env`:

```bash
✅ Project: starz-439218
✅ Neo4j: bolt://localhost:7687 (password: p4neo4j!)
✅ GCS Bucket: starz-images
✅ Gemini API: AIzaSyAW9Mk_g7kUwXQCWu1Kc3FmABukNj2tMSw
✅ OAuth: Configured with client ID and secret
✅ JWT Secret: Auto-generated
```

See `backend/.env.example` for complete reference.

---

## 💡 Best Practices

### When starting a task:
1. **Read QUICK_REFERENCE.md** to see current state
2. **Check IMPLEMENTATION_GUIDE.md** for existing code examples
3. **Reference GRAPH_STARZ_MVP.md** for architecture decisions
4. **Only write new code** if documentation doesn't cover it

### When user asks questions:
1. **Quote from docs** when explaining architecture
2. **Link to specific doc sections** for detailed info
3. **Use project-specific examples**, not generic ones

### When implementing features:
1. **Copy from IMPLEMENTATION_GUIDE.md** as starting point
2. **Follow existing patterns** in codebase
3. **Use configured services** (logger, neo4j, config)
4. **Test incrementally** using examples from docs

### When debugging:
1. **Check QUICK_REFERENCE.md "Common Issues"** first
2. **Verify .env configuration** against .env.example
3. **Check logs** with winston logger
4. **Test with curl examples** from QUICK_REFERENCE.md

---

## 🚫 What NOT to Do

1. ❌ **Don't write auth code from scratch** - Use IMPLEMENTATION_GUIDE.md Phase 1
2. ❌ **Don't suggest generic Neo4j queries** - Use project's graphService patterns
3. ❌ **Don't ignore existing middleware** - Use authMiddleware, errorMiddleware
4. ❌ **Don't create new error patterns** - Use ApiError from errorMiddleware
5. ❌ **Don't bypass validation** - Use Zod schemas like existing routes
6. ❌ **Don't skip documentation** - Always check IMPLEMENTATION_GUIDE first
7. ❌ **Don't change default local ports** - Kill conflicting processes instead

---

## 📋 Session Startup Checklist

At the start of EVERY session assisting with Graph Starz:

```
[ ] Read docs/QUICK_REFERENCE.md to understand current state
[ ] Check backend server status (should be running on :4000)
[ ] Note what phase user is working on (1-4)
[ ] Reference IMPLEMENTATION_GUIDE.md for that phase
[ ] Be ready to copy/paste/customize existing code examples
```

---

## 🎯 Success Metrics

You're helping effectively when:

✅ User copies working code from IMPLEMENTATION_GUIDE.md
✅ User tests feature immediately (examples in docs)
✅ User doesn't ask "how do I structure this?" (already documented)
✅ User references docs for future questions
✅ Features work on first try (code examples are tested)

---

## 📞 Quick Commands Reference

```bash
# Backend
cd backend && npm run dev        # Start server
curl http://localhost:4000/health # Test backend

# Neo4j
# Open http://localhost:7474
# Run: backend/scripts/init-neo4j.cypher

# Documentation
open docs/QUICK_REFERENCE.md     # Start here
open docs/IMPLEMENTATION_GUIDE.md # Code examples
```

---

## 🔄 Keeping This Guide Updated

When you add new features/docs:

1. Update QUICK_REFERENCE.md with new files/commands
2. Add code examples to IMPLEMENTATION_GUIDE.md if reusable
3. Update GRAPH_STARZ_MVP.md if architecture changes
4. Update this CLAUDE.md if documentation structure changes

---

## 📝 PR Review Best Practices

### Pre-Merge Checklist (CRITICAL)

Before merging ANY PR, verify:

```bash
# 1. Verify all new files are actually tracked in git
git status                          # Check for untracked files
git ls-files | grep <new-feature>  # Verify expected files are tracked
git diff --cached --name-only      # Check staged files

# 2. Verify build works from clean state
git stash                          # Save local changes
npm run build                      # Test production build
git stash pop                      # Restore changes

# 3. Check for common issues
grep -r "console\." src/           # No console statements
grep -r "TODO\|FIXME" src/         # Document TODOs
git diff main --stat               # Review file changes
```

### Common Critical Issues (Lessons from PR #1)

#### 🔴 Memory Leaks
```typescript
// ❌ BAD: ObjectURL never revoked
const url = URL.createObjectURL(file);

// ✅ GOOD: Cleanup in useEffect
useEffect(() => {
  return () => {
    nodes.forEach(node => {
      if (node.image?.startsWith('blob:')) {
        URL.revokeObjectURL(node.image);
      }
    });
  };
}, [nodes]);
```

#### 🔴 Race Conditions in Async Operations
```typescript
// ❌ BAD: No cancellation
useEffect(() => {
  loadData().then(setData);
}, []);

// ✅ GOOD: Cancellation flag
useEffect(() => {
  let cancelled = false;
  loadData().then(data => {
    if (!cancelled) setData(data);
  });
  return () => { cancelled = true; };
}, []);
```

#### 🔴 Security: Frontend Whitelist
```typescript
// ❌ NEVER: Whitelist in frontend
export const WHITELIST = ['user@example.com'];

// ✅ ALWAYS: Whitelist only in backend
// Backend should enforce all access control
```

#### 🔴 Console Statements in Production
```typescript
// ❌ BAD: Logging to console
console.error('Login failed:', error);

// ✅ GOOD: Remove or use proper logging
// Errors are handled through state/exceptions
```

#### 🔴 Missing Type Safety
```typescript
// ❌ BAD: Using 'any'
function handler(event: any, data: NodeType) { }

// ✅ GOOD: Proper types
function handler(event: d3.D3DragEvent<SVGGElement, NodeType, NodeType>, data: NodeType) { }
```

### D3.js + React Patterns (Graph Starz Specific)

#### ✅ Separation of Concerns
```typescript
// Effect 1: Setup simulation (runs on data change)
useEffect(() => {
  const simulation = d3.forceSimulation(nodes)...
  return () => simulation.stop();
}, [data]);

// Effect 2: Update styling (runs on interaction)
useEffect(() => {
  nodeSelection.transition().attr('opacity', ...);
}, [hoveredId, selectedId]);
```

#### ✅ Image Pre-loading with Cleanup
```typescript
useEffect(() => {
  let cancelled = false;

  const loadImages = async () => {
    await Promise.all(nodes.map(node => loadImage(node)));
    if (!cancelled) setLoaded(true);
  };

  loadImages();
  return () => { cancelled = true; };
}, [nodes]);
```

#### ✅ Proper Ref Management
```typescript
// Store D3 selections in refs to avoid re-renders
const nodeSelectionRef = useRef<d3.Selection<...>>(null);

// Use in separate effects for independent updates
useEffect(() => {
  nodeSelectionRef.current?.transition()...
}, [selectedId]);
```

### Git Verification (Prevent Missing Files)

**Why this matters:** PR #1 had a critical issue where `services/authService.ts` was used but not tracked in git. The build passed locally but would fail for anyone cloning the repo.

```bash
# Before creating PR:
git add -A                         # Stage all changes
git status                         # Verify nothing is untracked
git diff --cached --name-only     # Review all files being committed

# Check imports match files:
grep -r "from.*services" src/     # Find all service imports
git ls-files src/services/        # Verify services are tracked

# Before merging PR:
git ls-tree -r HEAD --name-only   # List all tracked files in PR branch
diff <(git ls-tree -r HEAD --name-only) <(git ls-tree -r main --name-only)  # Compare
```

---

## 🎯 Code Quality Standards (From PR #1 Review)

### ✅ Excellent Patterns to Follow

1. **Comprehensive commit messages**
   ```
   feat: Enhance graph visualization with aspect ratio support

   ## Graph Visualization Enhancements
   - Implement aspect ratio preservation using SVG clip paths
   - Add pre-loading of images to calculate dimensions

   ## Visual Improvements
   - Add smooth transitions (300ms cubic-bezier)
   - Implement curved links using quadratic bezier

   🤖 Generated with [Claude Code](...)
   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

2. **Proper cleanup mechanisms**
   - useEffect cleanup functions
   - Cancellation flags for async operations
   - Resource disposal (ObjectURLs, event listeners)

3. **Strong type safety**
   - Avoid `any` types
   - Use proper D3 types
   - Interface definitions for all data structures

4. **Separation of concerns**
   - Services for business logic
   - Contexts for state management
   - Components for presentation

### ❌ Antipatterns to Avoid

1. **Frontend security bypass** - Never put access control logic in frontend
2. **Untracked dependencies** - Always verify files are in git
3. **Console statements** - Remove before production
4. **Uncleaned resources** - Always implement cleanup in useEffect
5. **Missing type annotations** - Avoid `any`, use proper types

---

**Remember**: The goal is to make future Claude sessions (and human developers) **instantly productive** by leveraging comprehensive, tested documentation. Always point to docs first, write new code second.

---

*Last updated: 2025-11-26 (Added PR review learnings from feature/ui-enhancements merge)*