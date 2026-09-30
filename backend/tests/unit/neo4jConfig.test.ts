import { describe, it, expect, vi } from 'vitest';

vi.mock('neo4j-driver', async (importOriginal) =>
  (await import('../helpers/fakes.js')).mockNeo4jDriver(await importOriginal()));

import neo4j from 'neo4j-driver';
import { initNeo4j } from '../../src/config/neo4j.js';

describe('Neo4j driver configuration', () => {
  it('asks the driver for plain JavaScript numbers instead of Integer objects', async () => {
    await initNeo4j();

    expect(neo4j.driver).toHaveBeenCalledWith(
      process.env.NEO4J_URI,
      expect.anything(),
      expect.objectContaining({ disableLosslessIntegers: true })
    );
  });
});
