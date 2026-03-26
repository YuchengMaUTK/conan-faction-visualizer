import { describe, it, expect, vi } from 'vitest';
import {
  parseDataSync,
  checkReferenceConsistency,
  generateId,
  serializeData,
} from '../engines/data-store';
import type { DataSet } from '../types';

describe('data-store', () => {
  // Mock schema
  const mockSchema = {
    type: 'object',
    required: ['entities', 'links', 'characterEvents', 'relationshipEvents'],
    properties: {
      entities: {
        type: 'array',
        items: {
          type: 'object',
          required: ['entity_id', 'true_name', 'status', 'base_appearances', 'personas'],
          properties: {
            entity_id: { type: 'string' },
            true_name: {
              type: 'object',
              required: ['en'],
              properties: {
                en: { type: 'string' },
                zh: { type: 'string' },
                ja: { type: 'string' },
              },
            },
            status: { type: 'string', enum: ['alive', 'dead', 'unknown', 'shrunk', 'missing'] },
            base_appearances: { type: 'number' },
            personas: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['persona_id', 'name', 'faction', 'avatar', 'is_default_display'],
                properties: {
                  persona_id: { type: 'string' },
                  name: {
                    type: 'object',
                    required: ['en'],
                    properties: { en: { type: 'string' } },
                  },
                  faction: { type: 'string', enum: ['RED', 'BLACK', 'OTHER'] },
                  avatar: { type: 'string' },
                  is_default_display: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
      links: {
        type: 'array',
        items: {
          type: 'object',
          required: ['source_persona_id', 'target_persona_id', 'type', 'label'],
          properties: {
            source_persona_id: { type: 'string' },
            target_persona_id: { type: 'string' },
            type: { type: 'string' },
            label: { type: 'object', required: ['en'], properties: { en: { type: 'string' } } },
          },
        },
      },
      characterEvents: { type: 'array' },
      relationshipEvents: { type: 'array' },
      episodeChapterMappings: { type: 'array' },
      storyArcs: { type: 'array' },
      metadata: {
        type: 'object',
        required: ['version', 'lastUpdated', 'totalEpisodes', 'totalChapters'],
      },
    },
  };

  describe('parseDataSync', () => {
    it('should parse valid JSON data', () => {
      const validJson = JSON.stringify({
        $schema: 'test',
        entities: [
          {
            entity_id: 'e_test_1',
            true_name: { en: 'Test Entity' },
            status: 'alive',
            base_appearances: 10,
            personas: [
              {
                persona_id: 'p_test_1',
                name: { en: 'Test Persona' },
                faction: 'RED',
                avatar: 'test.jpg',
                is_default_display: true,
              },
            ],
          },
        ],
        links: [],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      });

      const result = parseDataSync(validJson, mockSchema);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.entities).toHaveLength(1);
        expect(result.value.entities[0].entity_id).toBe('e_test_1');
      }
    });

    it('should fail with invalid JSON', () => {
      const invalidJson = '{ invalid json }';

      const result = parseDataSync(invalidJson, mockSchema);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveLength(1);
        expect(result.error[0].code).toBe('PARSE_ERROR');
      }
    });

    it('should fail with schema validation errors', () => {
      const invalidData = JSON.stringify({
        entities: [
          {
            // Missing required fields
            entity_id: 'e_test_1',
          },
        ],
        links: [],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      });

      const result = parseDataSync(invalidData, mockSchema);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('should clean invalid references and generate warnings', () => {
      const dataWithInvalidRefs = JSON.stringify({
        $schema: 'test',
        entities: [
          {
            entity_id: 'e_test_1',
            true_name: { en: 'Test Entity' },
            status: 'alive',
            base_appearances: 10,
            personas: [
              {
                persona_id: 'p_test_1',
                name: { en: 'Test Persona' },
                faction: 'RED',
                avatar: 'test.jpg',
                is_default_display: true,
              },
            ],
          },
        ],
        links: [
          {
            source_persona_id: 'p_nonexistent',
            target_persona_id: 'p_test_1',
            type: 'friendship',
            label: { en: 'Friend' },
          },
        ],
        characterEvents: [
          {
            id: 'evt_1',
            entity_id: 'e_nonexistent',
            type: 'JOIN',
            episodeIndex: 1,
            description: 'Test event',
          },
        ],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = parseDataSync(dataWithInvalidRefs, mockSchema);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Invalid link should be filtered out
        expect(result.value.links).toHaveLength(0);
        // Invalid character event should be filtered out
        expect(result.value.characterEvents).toHaveLength(0);
      }

      consoleWarnSpy.mockRestore();
    });

    it('should strip $schema field from parsed data', () => {
      const jsonWithSchema = JSON.stringify({
        $schema: 'test-schema',
        entities: [],
        links: [],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      });

      const result = parseDataSync(jsonWithSchema, mockSchema);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect('$schema' in result.value).toBe(false);
      }
    });
  });

  describe('checkReferenceConsistency', () => {
    it('should validate entity_id prefix', () => {
      const dataSet: DataSet = {
        entities: [
          {
            entity_id: 'invalid_id',
            true_name: { en: 'Test' },
            status: 'alive',
            base_appearances: 10,
            personas: [
              {
                persona_id: 'p_test',
                name: { en: 'Test' },
                faction: 'RED',
                avatar: 'test.jpg',
                is_default_display: true,
              },
            ],
          },
        ],
        links: [],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      };

      const result = checkReferenceConsistency(dataSet);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('INVALID_ID_PREFIX');
      expect(result.warnings[0].message).toContain('does not start with "e_"');
    });

    it('should validate persona_id prefix', () => {
      const dataSet: DataSet = {
        entities: [
          {
            entity_id: 'e_test',
            true_name: { en: 'Test' },
            status: 'alive',
            base_appearances: 10,
            personas: [
              {
                persona_id: 'invalid_persona',
                name: { en: 'Test' },
                faction: 'RED',
                avatar: 'test.jpg',
                is_default_display: true,
              },
            ],
          },
        ],
        links: [],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      };

      const result = checkReferenceConsistency(dataSet);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('INVALID_ID_PREFIX');
      expect(result.warnings[0].message).toContain('does not start with "p_"');
    });

    it('should validate entity has at least one persona', () => {
      const dataSet: DataSet = {
        entities: [
          {
            entity_id: 'e_test',
            true_name: { en: 'Test' },
            status: 'alive',
            base_appearances: 10,
            personas: [],
          },
        ],
        links: [],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      };

      const result = checkReferenceConsistency(dataSet);

      expect(result.warnings.length).toBeGreaterThan(0);
      const emptyPersonaWarning = result.warnings.find(w => w.code === 'EMPTY_PERSONAS');
      expect(emptyPersonaWarning).toBeDefined();
      expect(emptyPersonaWarning?.message).toContain('at least one Persona');
    });

    it('should validate entity has exactly one default display persona', () => {
      const dataSet: DataSet = {
        entities: [
          {
            entity_id: 'e_test',
            true_name: { en: 'Test' },
            status: 'alive',
            base_appearances: 10,
            personas: [
              {
                persona_id: 'p_test1',
                name: { en: 'Test1' },
                faction: 'RED',
                avatar: 'test.jpg',
                is_default_display: true,
              },
              {
                persona_id: 'p_test2',
                name: { en: 'Test2' },
                faction: 'RED',
                avatar: 'test.jpg',
                is_default_display: true,
              },
            ],
          },
        ],
        links: [],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      };

      const result = checkReferenceConsistency(dataSet);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('INVALID_DEFAULT_DISPLAY');
      expect(result.warnings[0].message).toContain('exactly one default display Persona');
    });

    it('should filter invalid character event references', () => {
      const dataSet: DataSet = {
        entities: [
          {
            entity_id: 'e_test',
            true_name: { en: 'Test' },
            status: 'alive',
            base_appearances: 10,
            personas: [
              {
                persona_id: 'p_test',
                name: { en: 'Test' },
                faction: 'RED',
                avatar: 'test.jpg',
                is_default_display: true,
              },
            ],
          },
        ],
        links: [],
        characterEvents: [
          {
            id: 'evt_1',
            entity_id: 'e_nonexistent',
            type: 'JOIN',
            episodeIndex: 1,
            description: 'Test',
          },
        ],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      };

      const result = checkReferenceConsistency(dataSet);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('INVALID_REFERENCE');
      expect(result.cleaned.characterEvents).toHaveLength(0);
    });

    it('should filter invalid link references', () => {
      const dataSet: DataSet = {
        entities: [
          {
            entity_id: 'e_test',
            true_name: { en: 'Test' },
            status: 'alive',
            base_appearances: 10,
            personas: [
              {
                persona_id: 'p_test',
                name: { en: 'Test' },
                faction: 'RED',
                avatar: 'test.jpg',
                is_default_display: true,
              },
            ],
          },
        ],
        links: [
          {
            source_persona_id: 'p_nonexistent',
            target_persona_id: 'p_test',
            type: 'friendship',
            label: { en: 'Friend' },
          },
        ],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      };

      const result = checkReferenceConsistency(dataSet);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('INVALID_REFERENCE');
      expect(result.cleaned.links).toHaveLength(0);
    });

    it('should filter invalid relative references', () => {
      const dataSet: DataSet = {
        entities: [
          {
            entity_id: 'e_test',
            true_name: { en: 'Test' },
            status: 'alive',
            base_appearances: 10,
            personas: [
              {
                persona_id: 'p_test',
                name: { en: 'Test' },
                faction: 'RED',
                avatar: 'test.jpg',
                is_default_display: true,
              },
            ],
            relatives: [
              {
                entity_id: 'e_nonexistent',
                relation: 'sibling',
              },
            ],
          },
        ],
        links: [],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      };

      const result = checkReferenceConsistency(dataSet);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('INVALID_REFERENCE');
      expect(result.cleaned.entities[0].relatives).toHaveLength(0);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test-\d+-[a-z0-9]{6}$/);
      expect(id2).toMatch(/^test-\d+-[a-z0-9]{6}$/);
    });

    it('should use different prefixes correctly', () => {
      const entity = generateId('e_');
      const persona = generateId('p_');

      expect(entity).toMatch(/^e_/);
      expect(persona).toMatch(/^p_/);
    });
  });

  describe('serializeData', () => {
    it('should serialize dataset to formatted JSON string', () => {
      const dataSet: DataSet = {
        entities: [],
        links: [],
        characterEvents: [],
        relationshipEvents: [],
        episodeChapterMappings: [],
        storyArcs: [],
        metadata: {
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          totalEpisodes: 100,
          totalChapters: 200,
        },
      };

      const serialized = serializeData(dataSet);

      expect(typeof serialized).toBe('string');
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(dataSet);
    });
  });
});
