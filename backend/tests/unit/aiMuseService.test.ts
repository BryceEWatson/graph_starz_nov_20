import { describe, it, expect } from 'vitest';
import { parsePromptSuggestions } from '../../src/services/aiMuseService.js';

/**
 * Unit tests for parsing the AI Muse's Gemini reply
 */

const SUGGESTIONS = [
  { label: 'Safe', promptText: 'A peaceful watercolor landscape', rationale: 'Fills the gap directly.' },
  { label: 'Bold', promptText: 'A dramatic watercolor sunset', rationale: 'Pushes the mood.' },
];

describe('parsePromptSuggestions', () => {
  it('reads a JSON array inside a ```json fence', () => {
    const reply = `Here you go:\n\`\`\`json\n${JSON.stringify(SUGGESTIONS)}\n\`\`\``;

    const prompts = parsePromptSuggestions(reply, 'muse-star-1');

    expect(prompts.map((p) => [p.label, p.promptText, p.rationale])).toEqual([
      ['Safe', 'A peaceful watercolor landscape', 'Fills the gap directly.'],
      ['Bold', 'A dramatic watercolor sunset', 'Pushes the mood.'],
    ]);
  });

  it('reads a bare JSON array', () => {
    const prompts = parsePromptSuggestions(JSON.stringify(SUGGESTIONS), 'muse-star-1');

    expect(prompts).toHaveLength(2);
  });

  it('gives each suggestion an id, its Muse Star and an ISO timestamp', () => {
    const [first, second] = parsePromptSuggestions(JSON.stringify(SUGGESTIONS), 'muse-star-1');

    expect(first.id).toBe('muse-star-1-prompt-0');
    expect(second.id).toBe('muse-star-1-prompt-1');
    expect(first.museStarId).toBe('muse-star-1');
    expect(new Date(first.generatedAt).toISOString()).toBe(first.generatedAt);
  });

  it('labels an unlabeled suggestion by its position', () => {
    const [prompt] = parsePromptSuggestions('[{"promptText": "A quiet street"}]', 'muse-star-1');

    expect(prompt.label).toBe('Prompt 1');
  });

  it('throws when the reply has no JSON array', () => {
    expect(() => parsePromptSuggestions('I cannot help with that.', 'muse-star-1')).toThrow(
      'Failed to parse AI Muse response'
    );
  });
});
