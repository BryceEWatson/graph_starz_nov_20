import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('neo4j-driver', async (importOriginal) =>
  (await import('../helpers/fakes.js')).mockNeo4jDriver(await importOriginal()));
vi.mock('@google/generative-ai', async () => (await import('../helpers/fakes.js')).mockGenerativeAi());
vi.mock('@google-cloud/storage', async () => (await import('../helpers/fakes.js')).mockCloudStorage());
vi.mock('google-auth-library', async () => (await import('../helpers/fakes.js')).mockGoogleAuth());

import { createApp } from '../../src/app.js';
import { initNeo4j } from '../../src/config/neo4j.js';
import { GEMINI_RATE_LIMITS } from '../../src/middleware/rateLimitMiddleware.js';
import { fakeNeo4j, fakeGemini, APPROVED_USER, SECOND_APPROVED_USER, FakeUser } from '../helpers/fakes.js';
import { bearer } from '../helpers/session.js';
import {
  useMuseStarRows,
  useUploadRows,
  useGeminiReplies,
  validPromptRequest,
  validUploadCompletion,
} from '../helpers/fixtures.js';

const app = createApp();

// Both routes call Gemini. All requests come from the same address, so a limit
// keyed on the address would block the second user too.
const GEMINI_ROUTES = [
  {
    name: 'POST /muse-stars/prompts',
    limit: GEMINI_RATE_LIMITS.musePrompts.limit,
    message: 'Too many AI Muse requests. Please try again later.',
    send: (user: FakeUser) =>
      request(app).post('/muse-stars/prompts').set('Authorization', bearer(user)).send(validPromptRequest()),
  },
  {
    name: 'POST /uploads/complete',
    limit: GEMINI_RATE_LIMITS.uploadAnalysis.limit,
    message: 'Too many uploads analyzed. Please try again later.',
    send: (user: FakeUser) =>
      request(app).post('/uploads/complete').set('Authorization', bearer(user)).send(validUploadCompletion()),
  },
];

beforeAll(async () => {
  await initNeo4j();
});

beforeEach(() => {
  fakeNeo4j.reset();
  useGeminiReplies();
  useMuseStarRows();
  useUploadRows();
});

describe('per-user Gemini rate limits', () => {
  it.each(GEMINI_ROUTES)('$name answers 429 once a user passes the limit, without calling Gemini', async (route) => {
    for (let i = 0; i < route.limit; i++) {
      const res = await route.send(APPROVED_USER);
      expect(res.status, `request ${i + 1}`).toBe(200);
    }

    const blocked = await route.send(APPROVED_USER);

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toBe(route.message);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(fakeGemini.generateContent).toHaveBeenCalledTimes(route.limit);

    // A second user from the same address still has their own quota
    const otherUser = await route.send(SECOND_APPROVED_USER);
    expect(otherUser.status).toBe(200);
  });
});
