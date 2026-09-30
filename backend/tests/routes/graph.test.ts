import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('neo4j-driver', async (importOriginal) =>
  (await import('../helpers/fakes.js')).mockNeo4jDriver(await importOriginal()));
vi.mock('@google/generative-ai', async () => (await import('../helpers/fakes.js')).mockGenerativeAi());
vi.mock('@google-cloud/storage', async () => (await import('../helpers/fakes.js')).mockCloudStorage());
vi.mock('google-auth-library', async () => (await import('../helpers/fakes.js')).mockGoogleAuth());

import neo4j from 'neo4j-driver';
import { createApp } from '../../src/app.js';
import { initNeo4j } from '../../src/config/neo4j.js';
import { fakeNeo4j, APPROVED_USER } from '../helpers/fakes.js';
import { bearer } from '../helpers/session.js';
import { useGraphRows, GLOBAL_GRAPH_QUERY } from '../helpers/fixtures.js';

const app = createApp();

const EMAIL_PATTERN = /[^\s@"]+@[^\s@"]+\.[^\s@"]+/;

/** Every place in a JSON value that holds an email address or an "email" field. */
function findEmails(value: unknown, path = '$'): string[] {
  if (typeof value === 'string') {
    return EMAIL_PATTERN.test(value) ? [path] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => findEmails(item, `${path}[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => [
      ...(key.toLowerCase().includes('email') ? [`${path}.${key}`] : []),
      ...findEmails(item, `${path}.${key}`),
    ]);
  }
  return [];
}

function getGlobal(query = '') {
  return request(app).get(`/graph/global${query}`).set('Authorization', bearer(APPROVED_USER));
}

/** The SKIP and LIMIT values the global map query sent to Neo4j. */
function sentPaging() {
  const [params] = fakeNeo4j.paramsFor(GLOBAL_GRAPH_QUERY);
  return params as { skip: unknown; limit: unknown };
}

beforeAll(async () => {
  await initNeo4j();
});

beforeEach(() => {
  fakeNeo4j.reset();
  useGraphRows();
});

describe('graph responses never include email addresses', () => {
  it('GET /graph/global leaves out every uploader\'s email', async () => {
    const res = await getGlobal();

    expect(res.status).toBe(200);
    const users = res.body.nodes.filter((n: { type: string }) => n.type === 'user');
    expect(users).toHaveLength(2);
    expect(users[1].properties).toEqual({
      id: 'user-other',
      name: 'Other Creator',
      profilePictureUrl: 'https://example.com/other.png',
    });
    expect(findEmails(res.body)).toEqual([]);
  });

  it('GET /graph/ego leaves out the email too, including the caller\'s own', async () => {
    const res = await request(app).get('/graph/ego').set('Authorization', bearer(APPROVED_USER));

    expect(res.status).toBe(200);
    expect(res.body.nodes.some((n: { type: string }) => n.type === 'user')).toBe(true);
    expect(findEmails(res.body)).toEqual([]);
  });
});

describe('GET /graph/global paging', () => {
  it('sends SKIP and LIMIT to Neo4j as integers, 100 and 0 by default', async () => {
    const res = await getGlobal();

    expect(res.status).toBe(200);
    const { skip, limit } = sentPaging();
    expect(neo4j.isInt(limit)).toBe(true);
    expect(neo4j.isInt(skip)).toBe(true);
    expect(neo4j.integer.toNumber(limit as number)).toBe(100);
    expect(neo4j.integer.toNumber(skip as number)).toBe(0);
  });

  it('passes a page within range through unchanged', async () => {
    const res = await getGlobal('?limit=25&skip=50');

    expect(res.status).toBe(200);
    const { skip, limit } = sentPaging();
    expect(neo4j.integer.toNumber(limit as number)).toBe(25);
    expect(neo4j.integer.toNumber(skip as number)).toBe(50);
  });

  it('caps a larger page size at 100', async () => {
    const res = await getGlobal('?limit=1000000');

    expect(res.status).toBe(200);
    expect(neo4j.integer.toNumber(sentPaging().limit as number)).toBe(100);
  });

  it('accepts the deepest offset allowed', async () => {
    const res = await getGlobal('?skip=10000');

    expect(res.status).toBe(200);
    expect(neo4j.integer.toNumber(sentPaging().skip as number)).toBe(10000);
  });

  it.each([
    'limit=abc',
    'limit=0',
    'limit=-5',
    'limit=2.5',
    'limit=',
    'limit=1&limit=2',
    'skip=abc',
    'skip=-1',
    'skip=1.5',
    'skip=10001',
    'skip=1e300',
  ])('rejects ?%s with 400 before querying', async (query) => {
    const res = await getGlobal(`?${query}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(fakeNeo4j.paramsFor(GLOBAL_GRAPH_QUERY)).toHaveLength(0);
  });
});
