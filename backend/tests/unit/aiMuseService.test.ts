import { describe, it, expect } from 'vitest';

/**
 * Unit tests for AI Muse prompt generation
 *
 * These tests demonstrate parsing of Gemini responses
 */

describe('AiMuseService', () => {
  describe('JSON parsing from Gemini responses', () => {
    it('should extract JSON from markdown code blocks', () => {
      const response = `\`\`\`json
{
  "prompts": [
    {"label": "Safe", "text": "A peaceful landscape"},
    {"label": "Bold", "text": "A dramatic sunset"}
  ]
}
\`\`\``;

      const jsonMatch =
        response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);

      expect(jsonMatch).toBeTruthy();
      const parsed = JSON.parse(jsonMatch![1] || jsonMatch![0]);
      expect(parsed.prompts).toHaveLength(2);
      expect(parsed.prompts[0].label).toBe('Safe');
    });

    it('should extract JSON without markdown fences', () => {
      const response = `{
  "prompts": [
    {"label": "Experimental", "text": "A surreal scene"}
  ]
}`;

      const jsonMatch = response.match(/\{[\s\S]*\}/);

      expect(jsonMatch).toBeTruthy();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.prompts).toHaveLength(1);
    });
  });
});
