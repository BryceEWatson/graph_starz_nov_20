import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('neo4j-driver', async (importOriginal) =>
  (await import('../helpers/fakes.js')).mockNeo4jDriver(await importOriginal()));
vi.mock('@google/generative-ai', async () => (await import('../helpers/fakes.js')).mockGenerativeAi());
vi.mock('@google-cloud/storage', async () => (await import('../helpers/fakes.js')).mockCloudStorage());
vi.mock('google-auth-library', async () => (await import('../helpers/fakes.js')).mockGoogleAuth());

import { createApp } from '../../src/app.js';
import { initNeo4j } from '../../src/config/neo4j.js';
import {
  fakeNeo4j,
  fakeGemini,
  fakeGoogleSignIn,
  APPROVED_USER,
  SECOND_APPROVED_USER,
  VISITOR,
  USER_LOOKUP_QUERY,
} from '../helpers/fakes.js';
import { bearer } from '../helpers/session.js';
import {
  useGraphRows,
  useMuseStarRows,
  useUploadRows,
  useGeminiReplies,
  validPromptRequest,
  validUploadCompletion,
} from '../helpers/fixtures.js';

const app = createApp();

// Every route that serves the app itself. Each request is otherwise valid, so
// only the allow-list gate can explain a 401 or 403.
const PROTECTED_ROUTES = [
  { method: 'get', path: '/graph/ego', body: undefined },
  { method: 'get', path: '/graph/global', body: undefined },
  { method: 'get', path: '/muse-stars/ego', body: undefined },
  { method: 'post', path: '/muse-stars/prompts', body: validPromptRequest() },
  { method: 'post', path: '/uploads/init', body: { filename: 'harbor.png', contentType: 'image/png' } },
  { method: 'post', path: '/uploads/complete', body: validUploadCompletion() },
] as const;

type Route = (typeof PROTECTED_ROUTES)[number];

function send(route: Route, authorization?: string) {
  const req = route.method === 'get' ? request(app).get(route.path) : request(app).post(route.path);
  if (authorization) req.set('Authorization', authorization);
  return route.body ? req.send(route.body) : req;
}

beforeAll(async () => {
  await initNeo4j();
});

beforeEach(() => {
  fakeNeo4j.reset();
  useGeminiReplies();
  useGraphRows();
  useMuseStarRows();
  useUploadRows();
});

describe('allow-list gate', () => {
  it.each(PROTECTED_ROUTES)('$method $path rejects requests with no session (401)', async (route) => {
    const res = await send(route);

    expect(res.status).toBe(401);
    expect(fakeNeo4j.queries).toHaveLength(0);
    expect(fakeGemini.generateContent).not.toHaveBeenCalled();
  });

  it.each(PROTECTED_ROUTES)('$method $path rejects signed-in users who are not on the allow-list (403)', async (route) => {
    const res = await send(route, bearer(VISITOR));

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('This account is not on the allow-list yet');
    // Only the session lookup reached the database, and Gemini was never called
    expect(fakeNeo4j.queries.every((q) => USER_LOOKUP_QUERY.test(q.query))).toBe(true);
    expect(fakeGemini.generateContent).not.toHaveBeenCalled();
  });

  it.each(PROTECTED_ROUTES)('$method $path serves allow-listed users', async (route) => {
    const res = await send(route, bearer(APPROVED_USER));

    expect(res.status).toBe(200);
  });

  it('matches the allow-list without regard to case', async () => {
    // Listed as "Second.Approved@Example.com", stored as "second.approved@example.com"
    const res = await request(app)
      .get('/muse-stars/ego')
      .set('Authorization', bearer(SECOND_APPROVED_USER));

    expect(res.status).toBe(200);
  });

  it('protects routes that are added later, by default', async () => {
    const anonymous = await request(app).get('/a-route-added-later');
    const visitor = await request(app)
      .get('/a-route-added-later')
      .set('Authorization', bearer(VISITOR));

    expect(anonymous.status).toBe(401);
    expect(visitor.status).toBe(403);
  });

  it('rejects a token whose user no longer exists', async () => {
    const token = bearer(APPROVED_USER);
    fakeNeo4j.users.delete(APPROVED_USER.id);

    const res = await request(app).get('/graph/ego').set('Authorization', token);

    expect(res.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app)
      .get('/graph/ego')
      .set('Authorization', `${bearer(APPROVED_USER)}tampered`);

    expect(res.status).toBe(401);
  });
});

describe('open routes and the waitlist flow', () => {
  it('serves health checks with no session', async () => {
    const res = await request(app).get('/health/live');

    expect(res.status).toBe(200);
  });

  it('lets someone off the allow-list sign in, check the session and join the waitlist, and nothing else', async () => {
    Object.assign(fakeGoogleSignIn, { email: 'newcomer@example.com', name: 'Newcomer' });

    const signIn = await request(app).post('/auth/google').send({ code: 'google-auth-code' });
    expect(signIn.status).toBe(200);
    expect(signIn.body.whitelisted).toBe(false);
    const authorization = `Bearer ${signIn.body.token}`;

    const session = await request(app).get('/auth/validate').set('Authorization', authorization);
    expect(session.status).toBe(200);
    expect(session.body).toMatchObject({ valid: true, whitelisted: false });

    const waitlist = await request(app).post('/auth/waitlist').set('Authorization', authorization);
    expect(waitlist.status).toBe(200);
    expect(waitlist.body.user.waitlisted).toBe(true);

    for (const route of PROTECTED_ROUTES) {
      const res = await send(route, authorization);
      expect(res.status, `${route.method} ${route.path}`).toBe(403);
    }
    expect(fakeGemini.generateContent).not.toHaveBeenCalled();
  });

  it('lets someone on the allow-list sign in and use the app', async () => {
    Object.assign(fakeGoogleSignIn, { email: APPROVED_USER.email, name: APPROVED_USER.name });

    const signIn = await request(app).post('/auth/google').send({ code: 'google-auth-code' });
    expect(signIn.status).toBe(200);
    expect(signIn.body.whitelisted).toBe(true);

    const res = await request(app)
      .get('/muse-stars/ego')
      .set('Authorization', `Bearer ${signIn.body.token}`);
    expect(res.status).toBe(200);
  });
});
