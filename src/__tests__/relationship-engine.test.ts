import { describe, it, expect } from 'vitest';
import {
  computeLinks,
  getCPHistory,
  getRelationshipKeyEvents,
} from '../engines/relationship-engine';
import type { DataSet, Entity, Link, RelationshipEvent } from '../types';

describe('relationship-engine', () => {
  const mockEntities: Entity[] = [
    {
      entity_id: 'e_akai',
      true_name: { en: 'Akai Shuichi' },
      status: 'alive',
      base_appearances: 50,
      personas: [
        {
          persona_id: 'p_akai_fbi',
          name: { en: 'Akai Shuichi' },
          faction: 'RED',
          avatar: 'akai.jpg',
          is_default_display: true,
        },
        {
          persona_id: 'p_furuya',
          name: { en: 'Furuya Rei' },
          faction: 'BLACK',
          avatar: 'furuya.jpg',
          is_default_display: false,
        },
      ],
    },
    {
      entity_id: 'e_ai',
      true_name: { en: 'Haibara Ai' },
      status: 'shrunk',
      base_appearances: 80,
      personas: [
        {
          persona_id: 'p_ai',
          name: { en: 'Haibara Ai' },
          faction: 'RED',
          avatar: 'ai.jpg',
          is_default_display: true,
        },
      ],
    },
    {
      entity_id: 'e_gin',
      true_name: { en: 'Gin' },
      status: 'alive',
      base_appearances: 40,
      personas: [
        {
          persona_id: 'p_gin',
          name: { en: 'Gin' },
          faction: 'BLACK',
          avatar: 'gin.jpg',
          is_default_display: true,
        },
      ],
    },
  ];

  const mockLinks: Link[] = [
    {
      source_persona_id: 'p_akai_fbi',
      target_persona_id: 'p_ai',
      type: 'friendship',
      label: { en: 'Friend' },
    },
    {
      source_persona_id: 'p_furuya',
      target_persona_id: 'p_gin',
      type: 'colleague',
      label: { en: 'Colleague' },
    },
    {
      source_persona_id: 'p_ai',
      target_persona_id: 'p_gin',
      type: 'rivalry',
      label: { en: 'Enemy' },
    },
  ];

  const mockRelationshipEvents: RelationshipEvent[] = [
    {
      id: 're_1',
      relationshipId: 'rel_akai_ai',
      episodeIndex: 10,
      chapterIndex: 100,
      newStatus: 'UNCONFESSED',
      description: 'Akai and Ai first meet',
    },
    {
      id: 're_2',
      relationshipId: 'rel_akai_ai',
      episodeIndex: 20,
      chapterIndex: 200,
      newStatus: 'CONFIRMED',
      description: 'Akai and Ai relationship confirmed',
    },
    {
      id: 're_3',
      relationshipId: 'rel_ai_gin',
      episodeIndex: 5,
      chapterIndex: 50,
      newStatus: 'SEPARATED',
      description: 'Ai escapes from Gin',
    },
  ];

  const mockDataSet: DataSet = {
    entities: mockEntities,
    links: mockLinks,
    characterEvents: [],
    relationshipEvents: mockRelationshipEvents,
    episodeChapterMappings: [],
    storyArcs: [],
    metadata: {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      totalEpisodes: 100,
      totalChapters: 200,
    },
  };

  describe('computeLinks', () => {
    it('should compute links with cross-faction annotation', () => {
      const result = computeLinks(mockDataSet, {});

      expect(result).toHaveLength(3);

      // First link: RED -> RED (not cross-faction)
      expect(result[0].isCrossFaction).toBe(false);

      // Second link: BLACK -> BLACK (not cross-faction)
      expect(result[1].isCrossFaction).toBe(false);

      // Third link: RED -> BLACK (cross-faction)
      expect(result[2].isCrossFaction).toBe(true);
    });

    it('should preserve original link properties', () => {
      const result = computeLinks(mockDataSet, {});

      expect(result[0].source_persona_id).toBe('p_akai_fbi');
      expect(result[0].target_persona_id).toBe('p_ai');
      expect(result[0].type).toBe('friendship');
    });

    it('should handle empty links array', () => {
      const emptyDataSet = {
        ...mockDataSet,
        links: [],
      };

      const result = computeLinks(emptyDataSet, {});

      expect(result).toHaveLength(0);
    });

    it('should handle missing persona references gracefully', () => {
      const dataSetWithInvalidLinks = {
        ...mockDataSet,
        links: [
          {
            source_persona_id: 'p_nonexistent',
            target_persona_id: 'p_ai',
            type: 'friendship' as const,
            label: { en: 'Friend' },
          },
        ],
      };

      const result = computeLinks(dataSetWithInvalidLinks, {});

      // Should still return the link, but isCrossFaction might be false due to missing data
      expect(result).toHaveLength(1);
    });
  });

  describe('getCPHistory', () => {
    it('should return relationship history for a specific relationship', () => {
      const history = getCPHistory(mockDataSet, 'rel_akai_ai');

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('re_1');
      expect(history[1].id).toBe('re_2');
    });

    it('should sort events chronologically by episodeIndex', () => {
      const history = getCPHistory(mockDataSet, 'rel_akai_ai');

      expect(history[0].episodeIndex).toBeLessThan(history[1].episodeIndex!);
    });

    it('should sort events chronologically by chapterIndex when episodeIndex is missing', () => {
      const mixedEvents: RelationshipEvent[] = [
        {
          id: 're_1',
          relationshipId: 'rel_test',
          chapterIndex: 200,
          newStatus: 'UNCONFESSED',
          description: 'Event 1',
        },
        {
          id: 're_2',
          relationshipId: 'rel_test',
          chapterIndex: 100,
          newStatus: 'CONFIRMED',
          description: 'Event 2',
        },
      ];

      const testDataSet = {
        ...mockDataSet,
        relationshipEvents: mixedEvents,
      };

      const history = getCPHistory(testDataSet, 'rel_test');

      expect(history[0].chapterIndex).toBeLessThan(history[1].chapterIndex!);
    });

    it('should return empty array for non-existent relationship', () => {
      const history = getCPHistory(mockDataSet, 'rel_nonexistent');

      expect(history).toHaveLength(0);
    });

    it('should return empty array for empty dataset', () => {
      const emptyDataSet = {
        ...mockDataSet,
        relationshipEvents: [],
      };

      const history = getCPHistory(emptyDataSet, 'rel_akai_ai');

      expect(history).toHaveLength(0);
    });

    it('should not include events from other relationships', () => {
      const history = getCPHistory(mockDataSet, 'rel_akai_ai');

      expect(history.every((e) => e.relationshipId === 'rel_akai_ai')).toBe(true);
      expect(history.find((e) => e.relationshipId === 'rel_ai_gin')).toBeUndefined();
    });
  });

  describe('getRelationshipKeyEvents', () => {
    it('should return all relationship events as key events', () => {
      const keyEvents = getRelationshipKeyEvents(mockDataSet);

      expect(keyEvents).toHaveLength(3);
    });

    it('should populate timePoint from episodeIndex', () => {
      const keyEvents = getRelationshipKeyEvents(mockDataSet);

      const eventWithEpisode = keyEvents.find((ke) => ke.relationshipId === 'rel_akai_ai');
      expect(eventWithEpisode?.timePoint.episodeIndex).toBeDefined();
    });

    it('should populate timePoint from chapterIndex when episodeIndex is missing', () => {
      const dataSetWithChapterOnly = {
        ...mockDataSet,
        relationshipEvents: [
          {
            id: 're_1',
            relationshipId: 'rel_test',
            chapterIndex: 100,
            newStatus: 'UNCONFESSED' as const,
            description: 'Test event',
          },
        ],
      };

      const keyEvents = getRelationshipKeyEvents(dataSetWithChapterOnly);
      const event = keyEvents[0];

      expect(event.timePoint.chapterIndex).toBe(100);
      expect(event.timePoint.episodeIndex).toBeUndefined();
    });

    it('should map relationshipId and description to key event', () => {
      const keyEvents = getRelationshipKeyEvents(mockDataSet);

      const firstEvent = keyEvents[0];
      expect(firstEvent.relationshipId).toBeDefined();
      expect(firstEvent.title).toBeDefined();
      expect(firstEvent.description).toBeDefined();
    });

    it('should sort key events chronologically', () => {
      const keyEvents = getRelationshipKeyEvents(mockDataSet);

      // Check if sorted
      for (let i = 1; i < keyEvents.length; i++) {
        const timeA = keyEvents[i - 1].timePoint.episodeIndex ?? keyEvents[i - 1].timePoint.chapterIndex ?? 0;
        const timeB = keyEvents[i].timePoint.episodeIndex ?? keyEvents[i].timePoint.chapterIndex ?? 0;
        expect(timeA).toBeLessThanOrEqual(timeB);
      }
    });

    it('should return empty array for empty dataset', () => {
      const emptyDataSet = {
        ...mockDataSet,
        relationshipEvents: [],
      };

      const keyEvents = getRelationshipKeyEvents(emptyDataSet);

      expect(keyEvents).toHaveLength(0);
    });

    it('should handle events without both episodeIndex and chapterIndex', () => {
      const dataSetWithNoTimeIndex = {
        ...mockDataSet,
        relationshipEvents: [
          {
            id: 're_1',
            relationshipId: 'rel_test',
            newStatus: 'UNCONFESSED' as const,
            description: 'Event without time index',
          },
        ],
      };

      const keyEvents = getRelationshipKeyEvents(dataSetWithNoTimeIndex);

      expect(keyEvents).toHaveLength(1);
      expect(keyEvents[0].timePoint).toEqual({});
    });
  });

  describe('integration tests', () => {
    it('should correctly handle cross-faction detection with persona from same entity', () => {
      const dataSet: DataSet = {
        entities: [
          {
            entity_id: 'e_dual',
            true_name: { en: 'Dual Persona' },
            status: 'alive',
            base_appearances: 30,
            personas: [
              {
                persona_id: 'p_red',
                name: { en: 'Red Persona' },
                faction: 'RED',
                avatar: 'red.jpg',
                is_default_display: true,
              },
              {
                persona_id: 'p_black',
                name: { en: 'Black Persona' },
                faction: 'BLACK',
                avatar: 'black.jpg',
                is_default_display: false,
              },
            ],
          },
          {
            entity_id: 'e_other',
            true_name: { en: 'Other' },
            status: 'alive',
            base_appearances: 20,
            personas: [
              {
                persona_id: 'p_other',
                name: { en: 'Other' },
                faction: 'RED',
                avatar: 'other.jpg',
                is_default_display: true,
              },
            ],
          },
        ],
        links: [
          {
            source_persona_id: 'p_black',
            target_persona_id: 'p_other',
            type: 'rivalry',
            label: { en: 'Rival' },
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

      const result = computeLinks(dataSet, {});

      expect(result).toHaveLength(1);
      expect(result[0].isCrossFaction).toBe(true); // BLACK -> RED is cross-faction
    });
  });
});
