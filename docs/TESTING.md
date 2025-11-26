# Graph Starz Testing Guide

This document outlines the testing strategy for Graph Starz, covering unit tests, integration tests, and end-to-end testing approaches.

## Testing Philosophy

- **Test behavior, not implementation** - Focus on what the code does, not how
- **Real dependencies when possible** - Use real Neo4j for integration tests
- **Mock external services** - Mock Gemini API and GCS to avoid costs/quotas
- **Fast feedback loops** - Unit tests should run in milliseconds
- **Confidence over coverage** - 80% coverage of critical paths > 100% coverage

## Test Structure

```
graph-starz/
├── backend/
│   ├── src/
│   │   └── **/*.test.ts       # Unit tests (next to source)
│   ├── tests/
│   │   ├── integration/       # API integration tests
│   │   ├── fixtures/          # Test data and mocks
│   │   └── helpers/           # Test utilities
│   └── jest.config.js
├── frontend/
│   ├── src/
│   │   └── **/*.test.tsx      # Component unit tests
│   ├── tests/
│   │   ├── e2e/              # Playwright E2E tests
│   │   └── setup/             # Test configuration
│   └── vitest.config.ts
```

## Backend Testing

### 1. Unit Tests

Unit tests for individual services and utilities.

#### Example: Graph Service Test
```typescript
// backend/src/services/graphService.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { graphService } from './graphService';
import { getTestDriver } from '../../tests/helpers/neo4j';

describe('GraphService', () => {
  let driver;

  beforeAll(async () => {
    driver = await getTestDriver();
    await graphService.init(driver);
  });

  afterAll(async () => {
    await driver.close();
  });

  describe('createUser', () => {
    it('should create a user with unique email', async () => {
      const user = await graphService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        id: expect.any(String),
      });
    });

    it('should throw on duplicate email', async () => {
      await expect(
        graphService.createUser({ email: 'test@example.com', name: 'Duplicate' })
      ).rejects.toThrow('User already exists');
    });
  });
});
```

#### Example: AI Service Test (Mocked)
```typescript
// backend/src/services/aiService.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import { aiService } from './aiService';

jest.mock('@google/generativeai');

describe('AIService', () => {
  describe('analyzeImage', () => {
    it('should extract title and attributes from image', async () => {
      // Mock Gemini response
      const mockResponse = {
        title: 'Sunset Over Mountains',
        description: 'A vibrant sunset painting the mountains orange',
        attributes: [
          { type: 'subject', value: 'landscape', confidence: 0.95 },
          { type: 'mood', value: 'peaceful', confidence: 0.88 },
          { type: 'style', value: 'photographic', confidence: 0.92 },
        ],
      };

      jest.spyOn(aiService, 'callGemini').mockResolvedValue(mockResponse);

      const result = await aiService.analyzeImage('gs://bucket/image.jpg');

      expect(result.title).toBe('Sunset Over Mountains');
      expect(result.attributes).toHaveLength(3);
      expect(result.attributes[0].confidence).toBeGreaterThan(0.8);
    });

    it('should handle API errors gracefully', async () => {
      jest.spyOn(aiService, 'callGemini').mockRejectedValue(new Error('API quota exceeded'));

      await expect(aiService.analyzeImage('gs://bucket/image.jpg'))
        .rejects.toThrow('Failed to analyze image');
    });
  });
});
```

### 2. Integration Tests

Test API endpoints with real Neo4j but mocked external services.

#### Example: Upload Endpoint Test
```typescript
// backend/tests/integration/upload.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { testHelpers } from '../helpers';

describe('POST /uploads/complete', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    await testHelpers.clearDatabase();
    testUser = await testHelpers.createTestUser();
    authToken = await testHelpers.getAuthToken(testUser);
  });

  it('should process uploaded image and create graph nodes', async () => {
    // Mock GCS and Gemini
    testHelpers.mockGCSUrl('test-image.jpg');
    testHelpers.mockGeminiAnalysis({
      title: 'Test Image',
      attributes: [{ type: 'test', value: 'mock' }],
    });

    const response = await request(app)
      .post('/uploads/complete')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        filename: 'test-image.jpg',
        gcsPath: 'images/test-image.jpg',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      image: {
        id: expect.any(String),
        title: 'Test Image',
        url: expect.stringContaining('test-image.jpg'),
      },
      attributes: expect.arrayContaining([
        expect.objectContaining({ type: 'test', value: 'mock' }),
      ]),
    });

    // Verify graph was updated
    const imageInDb = await testHelpers.getImage(response.body.image.id);
    expect(imageInDb).toBeDefined();
    expect(imageInDb.uploaderId).toBe(testUser.id);
  });
});
```

#### Example: Graph Query Test
```typescript
// backend/tests/integration/graph.test.ts
describe('GET /graph/ego', () => {
  beforeAll(async () => {
    // Seed test graph
    await testHelpers.seedGraphWithPattern({
      users: 2,
      imagesPerUser: 3,
      attributesPerImage: 4,
      similarityThreshold: 0.7,
    });
  });

  it('should return user ego network', async () => {
    const response = await request(app)
      .get('/graph/ego')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      nodes: expect.arrayContaining([
        expect.objectContaining({ type: 'user' }),
        expect.objectContaining({ type: 'image' }),
        expect.objectContaining({ type: 'attribute' }),
      ]),
      edges: expect.arrayContaining([
        expect.objectContaining({ type: 'UPLOADED' }),
        expect.objectContaining({ type: 'HAS_ATTRIBUTE' }),
      ]),
    });

    // Verify it's actually the user's network
    const userNode = response.body.nodes.find(n => n.type === 'user');
    expect(userNode.id).toBe(testUser.id);
  });
});
```

### 3. Test Helpers

Reusable utilities for tests.

```typescript
// backend/tests/helpers/index.ts
export const testHelpers = {
  async clearDatabase() {
    await driver.session().run('MATCH (n) DETACH DELETE n');
  },

  async createTestUser(overrides = {}) {
    const user = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      ...overrides,
    };
    return await graphService.createUser(user);
  },

  async seedGraphWithPattern(config) {
    // Create interconnected test data
    const batch = [];
    for (let i = 0; i < config.users; i++) {
      // ... build CREATE queries
    }
    await driver.session().run(batch.join('\n'));
  },

  mockGeminiAnalysis(response) {
    jest.spyOn(aiService, 'analyze').mockResolvedValue(response);
  },

  mockGCSUrl(filename) {
    jest.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
      `https://storage.googleapis.com/test-bucket/${filename}`
    );
  },
};
```

### Muse Stars & Prompt Suggestions

Test Muse Star detection and prompt generation.

```typescript
// backend/src/services/museStarService.test.ts
describe('MuseStarService', () => {
  describe('detectMuseStars', () => {
    beforeAll(async () => {
      // Create test board with underexplored attributes
      await testHelpers.seedBoardWithGaps({
        boardId: 'test-board',
        commonAttributes: ['style:photographic', 'mood:energetic'],
        rareAttributes: ['style:watercolor'], // Only 1-2 images
      });
    });

    it('should detect underexplored attribute regions', async () => {
      const museStars = await museStarService.detectMuseStars('test-board', 5);

      expect(museStars).toBeArrayOfSize(1);
      expect(museStars[0]).toMatchObject({
        type: 'muse_star',
        targetAttributes: expect.arrayContaining([
          { type: 'style', value: 'watercolor' },
        ]),
        context: {
          nearbyImages: expect.any(Array),
          attributeGap: expect.stringContaining('watercolor'),
        },
      });
    });

    it('should return empty array for well-explored boards', async () => {
      await testHelpers.seedWellBalancedBoard('balanced-board');

      const museStars = await museStarService.detectMuseStars('balanced-board');

      expect(museStars).toBeArrayOfSize(0);
    });
  });
});

// backend/src/services/aiMuseService.test.ts
describe('AIMuseService', () => {
  describe('generatePromptsForMuseStar', () => {
    it('should generate contextual prompts', async () => {
      const museStar = {
        id: 'test-muse-1',
        type: 'muse_star' as const,
        boardId: 'test-board',
        targetAttributes: [{ type: 'style', value: 'watercolor' }],
        context: {
          nearbyImages: ['img-1', 'img-2'],
          attributeGap: 'Only 1 image with style: watercolor',
        },
      };

      // Mock nearby images in DB
      await testHelpers.createImages([
        { id: 'img-1', title: 'Mountain Sunset', description: 'Vibrant colors' },
        { id: 'img-2', title: 'Forest Path', description: 'Peaceful nature' },
      ]);

      const prompts = await aiMuseService.generatePromptsForMuseStar(museStar);

      expect(prompts).toBeArrayOfSize(2, 3); // 2-3 prompts
      expect(prompts[0]).toMatchObject({
        promptText: expect.stringContaining('watercolor'),
        rationale: expect.any(String),
        museStarId: 'test-muse-1',
      });
    });

    it('should handle empty nearby context', async () => {
      const museStar = {
        id: 'isolated-muse',
        type: 'muse_star' as const,
        boardId: 'empty-board',
        targetAttributes: [{ type: 'mood', value: 'mysterious' }],
        context: {
          nearbyImages: [],
          attributeGap: 'No images with mood: mysterious',
        },
      };

      const prompts = await aiMuseService.generatePromptsForMuseStar(museStar);

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].promptText).toBeTruthy();
    });
  });
});
```

### Integration: Muse Star Endpoints

```typescript
// backend/tests/integration/museStars.test.ts
describe('Muse Star API', () => {
  let authToken: string;
  let testBoardId: string;

  beforeAll(async () => {
    const user = await testHelpers.createTestUser();
    authToken = await testHelpers.getAuthToken(user);

    testBoardId = await testHelpers.createBoard({
      userId: user.id,
      name: 'Test Board',
    });

    await testHelpers.seedBoardWithGaps({
      boardId: testBoardId,
      rareAttributes: ['style:abstract'],
    });
  });

  describe('GET /boards/:id/muse-stars', () => {
    it('should return Muse Stars for board', async () => {
      const response = await request(app)
        .get(`/api/boards/${testBoardId}/muse-stars`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        museStars: expect.arrayContaining([
          expect.objectContaining({
            type: 'muse_star',
            targetAttributes: expect.any(Array),
          }),
        ]),
        message: expect.stringContaining('Muse Stars'),
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/boards/${testBoardId}/muse-stars`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /muse-stars/prompts', () => {
    it('should generate prompts for Muse Star', async () => {
      const response = await request(app)
        .post('/api/muse-stars/prompts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          boardId: testBoardId,
          targetAttributes: [{ type: 'style', value: 'abstract' }],
          context: {
            nearbyImages: [],
            attributeGap: 'Few abstract images',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        prompts: expect.arrayContaining([
          expect.objectContaining({
            promptText: expect.any(String),
            rationale: expect.any(String),
          }),
        ]),
        message: expect.stringContaining('AI Muse'),
      });
    });
  });
});
```

## Frontend Testing

### 1. Component Unit Tests

Test React components in isolation.

#### Example: GraphCanvas Test
```tsx
// src/components/GraphCanvas.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { GraphCanvas } from './GraphCanvas';
import { mockGraphData } from '../../tests/fixtures/graphData';

describe('GraphCanvas', () => {
  it('should render nodes and edges', () => {
    render(<GraphCanvas data={mockGraphData} />);

    // Check SVG elements are created
    const svg = screen.getByRole('img', { name: /graph visualization/i });
    expect(svg).toBeInTheDocument();

    // Check nodes are rendered
    const nodes = svg.querySelectorAll('.node');
    expect(nodes).toHaveLength(mockGraphData.nodes.length);
  });

  it('should handle node click', () => {
    const onNodeClick = vi.fn();
    render(<GraphCanvas data={mockGraphData} onNodeClick={onNodeClick} />);

    const firstNode = screen.getByTestId(`node-${mockGraphData.nodes[0].id}`);
    fireEvent.click(firstNode);

    expect(onNodeClick).toHaveBeenCalledWith(mockGraphData.nodes[0]);
  });

  it('should update on data change', () => {
    const { rerender } = render(<GraphCanvas data={mockGraphData} />);

    const updatedData = {
      ...mockGraphData,
      nodes: [...mockGraphData.nodes, { id: 'new', type: 'image' }],
    };

    rerender(<GraphCanvas data={updatedData} />);

    const nodes = screen.getAllByRole('node');
    expect(nodes).toHaveLength(updatedData.nodes.length);
  });
});
```

#### Example: UploadModal Test
```tsx
// src/components/UploadModal.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadModal } from './UploadModal';
import { uploadService } from '../services/uploadService';

vi.mock('../services/uploadService');

describe('UploadModal', () => {
  it('should handle file upload flow', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    // Mock upload service
    vi.spyOn(uploadService, 'initUpload').mockResolvedValue({
      uploadUrl: 'https://storage.googleapis.com/signed-url',
      imageId: 'test-123',
    });
    vi.spyOn(uploadService, 'completeUpload').mockResolvedValue({
      image: { id: 'test-123', title: 'Processed Image' },
    });

    render(<UploadModal isOpen={true} onComplete={onComplete} />);

    // Select file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/choose file/i);
    await user.upload(input, file);

    // Click upload
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);

    // Wait for processing
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-123' })
      );
    });
  });

  it('should validate file type', async () => {
    const user = userEvent.setup();
    render(<UploadModal isOpen={true} onComplete={vi.fn()} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/choose file/i);
    await user.upload(input, file);

    expect(screen.getByText(/only image files are allowed/i)).toBeInTheDocument();
  });
});
```

### 2. E2E Tests (Playwright)

Test complete user workflows.

```typescript
// tests/e2e/upload-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Image Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock backend responses
    await page.route('**/api/auth/validate', (route) => {
      route.fulfill({ json: { valid: true, user: { email: 'test@example.com' } } });
    });
  });

  test('should complete full upload and graph update', async ({ page }) => {
    await page.goto('/');

    // Sign in
    await page.click('button:has-text("Sign in with Google")');
    // (Mock OAuth flow)

    // Open upload modal
    await page.click('button:has-text("Upload")');

    // Select file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample-image.jpg');

    // Upload
    await page.click('button:has-text("Upload Image")');

    // Wait for processing
    await expect(page.locator('.upload-progress')).toHaveText(/processing/i);
    await expect(page.locator('.upload-success')).toBeVisible({ timeout: 10000 });

    // Verify graph updated
    await page.click('button:has-text("View in Graph")');
    const newNode = page.locator(`[data-node-id="${uploadedId}"]`);
    await expect(newNode).toBeVisible();
  });
});
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/services/graphService.test.ts

# Run in watch mode
pnpm test:watch

# Run integration tests only
pnpm test:integration

# Run with real Neo4j (requires running instance)
NEO4J_TEST_URI=bolt://localhost:7687 pnpm test:integration
```

### Frontend Tests

```bash
# From project root

# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e

# Run E2E in headed mode (see browser)
pnpm test:e2e:headed

# Run E2E against production build
pnpm build && pnpm test:e2e:prod
```

## Test Configuration

### Jest Configuration (Backend)
```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
};
```

### Vitest Configuration (Frontend)
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup/vitest.setup.ts',
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/', '*.config.ts'],
    },
  },
});
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      neo4j:
        image: neo4j:5
        env:
          NEO4J_AUTH: neo4j/testpassword
        ports:
          - 7687:7687
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd backend && pnpm install
      - run: cd backend && pnpm test:coverage
        env:
          NEO4J_TEST_URI: bolt://localhost:7687
          NEO4J_TEST_PASSWORD: testpassword

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: pnpm install
      - run: pnpm test:coverage
      - run: pnpm build
      - run: pnpm test:e2e
```

## Testing Best Practices

### 1. Test Naming
```typescript
// ✅ Good: Descriptive behavior
it('should return 404 when image does not exist', ...);

// ❌ Bad: Implementation detail
it('should call findById with correct parameters', ...);
```

### 2. Test Data
```typescript
// ✅ Good: Explicit test data
const testUser = {
  email: 'alice@test.com',
  name: 'Alice Test',
};

// ❌ Bad: Random data
const testUser = faker.person();
```

### 3. Assertions
```typescript
// ✅ Good: Specific assertions
expect(response.body.error).toBe('Image not found');
expect(response.status).toBe(404);

// ❌ Bad: Vague assertions
expect(response).toBeDefined();
expect(response.body).toBeObject();
```

### 4. Async Testing
```typescript
// ✅ Good: Proper async handling
it('should process async', async () => {
  const result = await service.process();
  expect(result).toBe('done');
});

// ❌ Bad: Missing await
it('should process async', () => {
  const result = service.process(); // Promise!
  expect(result).toBe('done'); // Will fail
});
```

### 5. Test Isolation
```typescript
// ✅ Good: Clean state for each test
beforeEach(async () => {
  await testHelpers.clearDatabase();
  testUser = await testHelpers.createTestUser();
});

// ❌ Bad: Shared state between tests
let sharedUser; // Modified by multiple tests
```

## Performance Testing

### Load Testing with Artillery
```yaml
# backend/tests/load/upload.yml
config:
  target: 'http://localhost:4000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'Upload Image'
    flow:
      - post:
          url: '/uploads/init'
          headers:
            Authorization: 'Bearer {{ $testToken }}'
      - post:
          url: '/uploads/complete'
          json:
            filename: 'test-{{ $uuid }}.jpg'
```

Run with: `artillery run tests/load/upload.yml`

## Debugging Tests

### VS Code Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "cwd": "${workspaceFolder}/backend",
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Tips
1. Use `console.log` liberally in tests
2. Run single test with `.only`
3. Increase test timeout for debugging: `jest.setTimeout(30000)`
4. Use `--inspect` flag: `node --inspect-brk node_modules/.bin/jest`

## Next Steps

1. **Set up CI/CD** - Automate test runs on push
2. **Add mutation testing** - Ensure test quality with Stryker
3. **Performance benchmarks** - Track regression over time
4. **Visual regression tests** - For graph rendering consistency
5. **Security testing** - OWASP ZAP for API scanning