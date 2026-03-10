import { describe, it, expect } from 'vitest';
import { parseDataSync } from '../../engines/data-store';

// Minimal valid schema for testing - mirrors the structure of conan-data-schema.json
// We use a permissive schema here; the real schema is tested via the full integration path
const minimalSchema = {
  type: 'object',
  required: ['metadata', 'entities', 'characterEvents', 'links', 'relationshipEvents', 'episodeChapterMappings', 'storyArcs'],
  properties: {
    metadata: { type: 'object' },
    entities: { type: 'array' },
    characterEvents: { type: 'array' },
    links: { type: 'array' },
    relationshipEvents: { type: 'array' },
    episodeChapterMappings: { type: 'array' },
    storyArcs: { type: 'array' },
  },
};

const validDataSet = {
  metadata: { version: '1.0.0', lastUpdated: '2026-01-01', totalEpisodes: 100, totalChapters: 100 },
  entities: [
    {
      entity_id: 'e_test1',
      true_name: { en: 'Test One', zh: '测试一' },
      status: 'alive',
      base_appearances: 10,
      personas: [
        { persona_id: 'p_test1', name: { en: 'Test One' }, faction: 'RED', avatar: 'test.png', is_default_display: true },
      ],
    },
    {
      entity_id: 'e_test2',
      true_name: { en: 'Test Two', zh: '测试二' },
      status: 'alive',
      base_appearances: 8,
      personas: [
        { persona_id: 'p_test2', name: { en: 'Test Two' }, faction: 'BLACK', sub_faction: 'BO_CORE', avatar: 'test2.png', is_default_display: true },
      ],
    },
  ],
  characterEvents: [
    { id: 'e1', entity_id: 'e_test1', type: 'JOIN', episodeIndex: 1, chapterIndex: 1, description: 'Joined' },
  ],
  links: [
    { source_persona_id: 'p_test1', target_persona_id: 'p_test2', type: 'rivalry', label: { en: 'Rivals' } },
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

    expect(result.value.entities.length).toBe(2);
    expect(result.value.characterEvents.length).toBe(1);
    expect(result.value.links.length).toBe(1);
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

  it('should skip character events referencing non-existent entities', () => {
    const dataWithBadRef = {
      ...validDataSet,
      characterEvents: [
        { id: 'e1', entity_id: 'e_test1', type: 'JOIN', episodeIndex: 1, chapterIndex: 1, description: 'OK' },
        { id: 'e2', entity_id: 'e_nonexistent', type: 'JOIN', episodeIndex: 2, chapterIndex: 2, description: 'Bad ref' },
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
