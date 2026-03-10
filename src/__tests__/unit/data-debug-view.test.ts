import { describe, it, expect } from 'vitest';
import { parseDataSync } from '../../engines/data-store';

// Minimal valid schema for testing - mirrors the structure of conan-data-schema.json
// We use a permissive schema here; the real schema is tested via the full integration path
const minimalSchema = {
  type: 'object',
  required: ['metadata', 'characters', 'characterEvents', 'relationships', 'relationshipEvents', 'episodeChapterMappings', 'storyArcs'],
  properties: {
    metadata: { type: 'object' },
    characters: { type: 'array' },
    characterEvents: { type: 'array' },
    relationships: { type: 'array' },
    relationshipEvents: { type: 'array' },
    episodeChapterMappings: { type: 'array' },
    storyArcs: { type: 'array' },
  },
};

const validDataSet = {
  metadata: { version: '1.0.0', lastUpdated: '2026-01-01', totalEpisodes: 100, totalChapters: 100 },
  characters: [
    { id: 'c1', name: 'Test', faction: 'RED', avatar: 'test.png', appearanceCount: { episodeCount: 10, mentionCount: 5 }, isDualIdentity: false },
    { id: 'c2', name: 'Test2', faction: 'BLACK', avatar: 'test2.png', appearanceCount: { episodeCount: 8, mentionCount: 3 }, isDualIdentity: false },
  ],
  characterEvents: [
    { id: 'e1', characterId: 'c1', type: 'JOIN', episodeIndex: 1, chapterIndex: 1, description: 'Joined' },
  ],
  relationships: [
    { id: 'r1', character1Id: 'c1', character2Id: 'c2', type: 'LOVE', initialStatus: 'UNCONFESSED' },
  ],
  relationshipEvents: [],
  episodeChapterMappings: [{ episodeIndex: 1, chapterIndex: 1, publicationDate: '2020-01' }],
  storyArcs: [
    { id: 'a1', name: 'Arc1', description: 'Test arc', startEpisodeIndex: 1, startChapterIndex: 1 },
  ],
};

describe('Data layer: parseDataSync', () => {
  it('should successfully parse valid data', () => {
    const result = parseDataSync(JSON.stringify(validDataSet), minimalSchema);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.characters.length).toBe(2);
    expect(result.value.characterEvents.length).toBe(1);
    expect(result.value.relationships.length).toBe(1);
    expect(result.value.storyArcs.length).toBe(1);
  });

  it('should report validation errors for invalid JSON', () => {
    const result = parseDataSync('{ invalid json }', minimalSchema);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0].code).toBe('PARSE_ERROR');
  });

  it('should report schema validation errors for data missing required fields', () => {
    const invalidData = JSON.stringify({ metadata: { version: '1.0.0' } });
    const result = parseDataSync(invalidData, minimalSchema);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('should skip character events referencing non-existent characters', () => {
    const dataWithBadRef = {
      ...validDataSet,
      characterEvents: [
        { id: 'e1', characterId: 'c1', type: 'JOIN', episodeIndex: 1, chapterIndex: 1, description: 'OK' },
        { id: 'e2', characterId: 'nonexistent', type: 'JOIN', episodeIndex: 2, chapterIndex: 2, description: 'Bad ref' },
      ],
    };
    const result = parseDataSync(JSON.stringify(dataWithBadRef), minimalSchema);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The bad reference event should be filtered out
    expect(result.value.characterEvents.length).toBe(1);
    expect(result.value.characterEvents[0].id).toBe('e1');
  });
});
