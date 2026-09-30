/**
 * Stand-ins for the app's outside services, swapped in at their client libraries
 * with vi.mock so every line of the app's own code still runs:
 *   neo4j-driver          -> fakeNeo4j (tests register the rows each query returns;
 *                            whole numbers come back the way the real driver returns them)
 *   @google/generative-ai -> fakeGemini
 *   @google-cloud/storage -> an in-memory bucket
 *   google-auth-library   -> fakeGoogleSignIn
 *
 * Usage, at the top of a test file:
 *   vi.mock('neo4j-driver', async (importOriginal) =>
 *     (await import('../helpers/fakes.js')).mockNeo4jDriver(await importOriginal()));
 *
 * This file must not import anything from src/, because the mocks load it while
 * src/ modules are still being imported.
 */
import { vi } from 'vitest';

type Row = Record<string, unknown>;
type QueryHandler = (params: Row) => Row[];

export interface FakeUser {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string;
  waitlisted?: boolean;
}

export const APPROVED_USER: FakeUser = {
  id: 'user-approved',
  email: 'approved@example.com',
  name: 'Approved Creator',
  profilePictureUrl: 'https://example.com/approved.png',
};

/** On the allow-list as "Second.Approved@Example.com". */
export const SECOND_APPROVED_USER: FakeUser = {
  id: 'user-second-approved',
  email: 'second.approved@example.com',
  name: 'Second Creator',
};

/** Signed in with Google, but not on the allow-list. */
export const VISITOR: FakeUser = {
  id: 'user-visitor',
  email: 'visitor@example.com',
  name: 'Visitor',
};

/** A graph node as the driver returns it. */
export function node<T extends object>(properties: T) {
  return { properties };
}

// Queries the auth code runs, answered from fakeNeo4j.users
export const USER_LOOKUP_QUERY = /MATCH \(u:User \{id: \$userId\}\)\s+RETURN u/;
const WAITLIST_QUERY = /SET u\.waitlisted = true/;
const FIND_OR_CREATE_USER_QUERY = /MERGE \(u:User \{email: \$email\}\)/;

function userNode(user: FakeUser) {
  return node({
    ...user,
    waitlisted: user.waitlisted ?? false,
    createdAt: '2025-11-28T00:00:00Z',
  });
}

export const fakeNeo4j = {
  users: new Map<string, FakeUser>(),
  handlers: [] as Array<{ pattern: RegExp; handler: QueryHandler }>,
  queries: [] as Array<{ query: string; params: Row }>,

  reset(users: FakeUser[] = [APPROVED_USER, SECOND_APPROVED_USER, VISITOR]) {
    this.users = new Map(users.map((user) => [user.id, { ...user }]));
    this.handlers = [];
    this.queries = [];
  },

  /** Answer any query matching `pattern` with the rows `handler` returns. */
  on(pattern: RegExp, handler: QueryHandler) {
    this.handlers.unshift({ pattern, handler });
  },

  /** Parameters of every query run so far that matches `pattern`. */
  paramsFor(pattern: RegExp): Row[] {
    return this.queries.filter((q) => pattern.test(q.query)).map((q) => q.params);
  },
};

function answerUserQuery(query: string, params: Row): Row[] | undefined {
  if (USER_LOOKUP_QUERY.test(query)) {
    const user = fakeNeo4j.users.get(String(params.userId));
    return user ? [{ u: userNode(user) }] : [];
  }
  if (WAITLIST_QUERY.test(query)) {
    const user = fakeNeo4j.users.get(String(params.userId));
    if (!user) return [];
    user.waitlisted = true;
    return [{ u: userNode(user) }];
  }
  if (FIND_OR_CREATE_USER_QUERY.test(query)) {
    let user = [...fakeNeo4j.users.values()].find((u) => u.email === params.email);
    if (!user) {
      user = {
        id: `user-${fakeNeo4j.users.size + 1}`,
        email: String(params.email),
        name: String(params.name),
      };
      fakeNeo4j.users.set(user.id, user);
    }
    return [{ u: userNode(user) }];
  }
  return undefined;
}

// Like the real driver, return whole numbers as the driver's Integer objects
// unless the app created the driver with disableLosslessIntegers.
let returnsIntegerObjects = true;
let toDriverInteger: (value: number) => unknown = (value) => value;

function asDriverValue(value: unknown): unknown {
  if (typeof value === 'number' && Number.isInteger(value) && returnsIntegerObjects) {
    return toDriverInteger(value);
  }
  if (Array.isArray(value)) {
    return value.map(asDriverValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, asDriverValue(item)]));
  }
  return value;
}

function toRecord(row: Row) {
  const values = asDriverValue(row) as Row;
  return {
    keys: Object.keys(values),
    get(key: string) {
      if (!(key in values)) {
        throw new Error(`fakeNeo4j: record has no field "${key}"`);
      }
      return values[key];
    },
    toObject: () => values,
  };
}

async function run(query: string, params: Row = {}) {
  fakeNeo4j.queries.push({ query, params });

  const rows =
    answerUserQuery(query, params) ??
    fakeNeo4j.handlers.find((h) => h.pattern.test(query))?.handler(params);

  if (!rows) {
    throw new Error(`fakeNeo4j: no rows registered for query:\n${query}`);
  }
  return { records: rows.map(toRecord) };
}

const fakeTransaction = { run };

export const fakeDriver = {
  verifyConnectivity: async () => ({}),
  session: () => ({
    run,
    executeRead: <T>(work: (tx: typeof fakeTransaction) => Promise<T>) => work(fakeTransaction),
    executeWrite: <T>(work: (tx: typeof fakeTransaction) => Promise<T>) => work(fakeTransaction),
    close: async () => undefined,
  }),
  close: async () => undefined,
};

export function mockNeo4jDriver(actual: any) {
  toDriverInteger = (value) => actual.default.int(value);
  const driver = vi.fn(
    (_uri: string, _auth: unknown, config?: { disableLosslessIntegers?: boolean }) => {
      returnsIntegerObjects = !config?.disableLosslessIntegers;
      return fakeDriver;
    }
  );
  return { ...actual, driver, default: { ...actual.default, driver } };
}

export const fakeGemini = {
  generateContent: vi.fn(),
  /** Reply to AI Muse calls, which send a text prompt. */
  museReply: '[]',
  /** Reply to upload analysis calls, which send the image and a prompt. */
  imageAnalysisReply: '{}',

  reset() {
    this.generateContent.mockReset();
    this.generateContent.mockImplementation(async (input: unknown) => {
      const text = Array.isArray(input) ? this.imageAnalysisReply : this.museReply;
      return { response: { text: () => text } };
    });
  },
};

class FakeGoogleGenerativeAI {
  getGenerativeModel() {
    return { generateContent: fakeGemini.generateContent };
  }
}

export function mockGenerativeAi() {
  return { GoogleGenerativeAI: FakeGoogleGenerativeAI };
}

class FakeStorage {
  bucket(bucketName: string) {
    return {
      file: (path: string) => ({
        getSignedUrl: async () => [`https://storage.test/${bucketName}/${path}?signature=fake`],
        download: async () => [Buffer.from('fake image bytes')],
      }),
    };
  }
}

export function mockCloudStorage() {
  return { Storage: FakeStorage };
}

/** The Google account the next sign-in (POST /auth/google) returns. */
export const fakeGoogleSignIn = { email: VISITOR.email, name: VISITOR.name };

class FakeOAuth2Client {
  async getToken() {
    return { tokens: { id_token: 'fake-id-token' } };
  }

  setCredentials() {}

  async verifyIdToken() {
    return { getPayload: () => ({ ...fakeGoogleSignIn }) };
  }
}

export function mockGoogleAuth() {
  return { OAuth2Client: FakeOAuth2Client };
}
