import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for Muse Star detection
 *
 * These tests validate the MuseStar interface shape and detection logic.
 * For full integration tests, use a test Neo4j instance.
 */

// Mock the neo4j module
vi.mock('../../src/config/neo4j.js', () => ({
  runReadTransaction: vi.fn(),
}));

import { runReadTransaction } from '../../src/config/neo4j.js';
import {
  detectMuseStarsForUser,
  detectMuseStarsByBuckets,
  getMuseStarsForUser,
  MuseStar,
} from '../../src/services/museStarService.js';

describe('MuseStarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectMuseStarsForUser', () => {
    it('should return empty array when no underexplored attributes exist', async () => {
      const mockTx = {
        run: vi.fn().mockResolvedValue({ records: [] }),
      };
      vi.mocked(runReadTransaction).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await detectMuseStarsForUser('user-123');

      expect(result).toEqual([]);
      expect(mockTx.run).toHaveBeenCalledTimes(1);
    });

    it('should return Muse Stars for underexplored attributes', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const data: Record<string, any> = {
              attrType: 'style',
              attrValue: 'watercolor',
              imageCount: 1,
              imageIds: ['img-1'],
            };
            return data[key];
          },
        },
        {
          get: (key: string) => {
            const data: Record<string, any> = {
              attrType: 'mood',
              attrValue: 'peaceful',
              imageCount: 2,
              imageIds: ['img-2', 'img-3'],
            };
            return data[key];
          },
        },
      ];

      const mockTx = {
        run: vi.fn().mockResolvedValue({ records: mockRecords }),
      };
      vi.mocked(runReadTransaction).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await detectMuseStarsForUser('user-123', 5);

      expect(result).toHaveLength(2);

      // First Muse Star
      expect(result[0].id).toBe('muse-star-user-123-0');
      expect(result[0].type).toBe('muse_star');
      expect(result[0].userId).toBe('user-123');
      expect(result[0].targetAttributes).toEqual([{ type: 'style', value: 'watercolor' }]);
      expect(result[0].context.imageCount).toBe(1);
      expect(result[0].context.attributeGap).toContain('Only 1 image(s)');
      expect(result[0].context.nearbyImages).toEqual(['img-1']);

      // Second Muse Star
      expect(result[1].targetAttributes).toEqual([{ type: 'mood', value: 'peaceful' }]);
      expect(result[1].context.imageCount).toBe(2);
    });

    it('should respect the limit parameter', async () => {
      const mockTx = {
        run: vi.fn().mockResolvedValue({ records: [] }),
      };
      vi.mocked(runReadTransaction).mockImplementation(async (fn: any) => fn(mockTx));

      await detectMuseStarsForUser('user-123', 3);

      // Verify limit was passed to the query
      expect(mockTx.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ userId: 'user-123', limit: 3 })
      );
    });
  });

  describe('detectMuseStarsByBuckets', () => {
    it('should detect style+mood combination gaps', async () => {
      const mockRecords = [
        {
          get: (key: string) => {
            const data: Record<string, any> = {
              styleValue: 'cyberpunk',
              moodValue: 'energetic',
              imageCount: 1,
              imageIds: ['img-1'],
            };
            return data[key];
          },
        },
      ];

      const mockTx = {
        run: vi.fn().mockResolvedValue({ records: mockRecords }),
      };
      vi.mocked(runReadTransaction).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await detectMuseStarsByBuckets('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].targetAttributes).toHaveLength(2);
      expect(result[0].targetAttributes).toContainEqual({ type: 'style', value: 'cyberpunk' });
      expect(result[0].targetAttributes).toContainEqual({ type: 'mood', value: 'energetic' });
      expect(result[0].context.attributeGap).toContain('cyberpunk style');
      expect(result[0].context.attributeGap).toContain('energetic mood');
    });
  });

  describe('getMuseStarsForUser', () => {
    it('should try bucket detection first, then fall back to single-attribute', async () => {
      // First call (buckets) returns empty
      // Second call (single-attribute) returns results
      const mockTx = {
        run: vi
          .fn()
          .mockResolvedValueOnce({ records: [] }) // buckets: empty
          .mockResolvedValueOnce({
            records: [
              {
                get: (key: string) => {
                  const data: Record<string, any> = {
                    attrType: 'style',
                    attrValue: 'minimal',
                    imageCount: 1,
                    imageIds: ['img-1'],
                  };
                  return data[key];
                },
              },
            ],
          }), // single-attribute: has results
      };
      vi.mocked(runReadTransaction).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await getMuseStarsForUser('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].targetAttributes[0].value).toBe('minimal');
      // Both methods should have been called
      expect(mockTx.run).toHaveBeenCalledTimes(2);
    });

    it('should return bucket results without fallback when buckets has results', async () => {
      const mockTx = {
        run: vi.fn().mockResolvedValueOnce({
          records: [
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  styleValue: 'abstract',
                  moodValue: 'dreamy',
                  imageCount: 1,
                  imageIds: ['img-1'],
                };
                return data[key];
              },
            },
          ],
        }),
      };
      vi.mocked(runReadTransaction).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await getMuseStarsForUser('user-123');

      expect(result).toHaveLength(1);
      // Only bucket method should have been called
      expect(mockTx.run).toHaveBeenCalledTimes(1);
    });
  });

  describe('MuseStar interface shape', () => {
    it('should have correct shape for frontend consumption', () => {
      const museStar: MuseStar = {
        id: 'muse-star-test',
        type: 'muse_star',
        userId: 'user-123',
        targetAttributes: [{ type: 'style', value: 'watercolor' }],
        context: {
          nearbyImages: ['img-1', 'img-2'],
          attributeGap: 'Only 1 image with this attribute',
          imageCount: 1,
        },
      };

      expect(museStar.type).toBe('muse_star');
      expect(museStar.targetAttributes).toBeInstanceOf(Array);
      expect(museStar.context.nearbyImages).toBeInstanceOf(Array);
      expect(typeof museStar.context.imageCount).toBe('number');
    });
  });
});
