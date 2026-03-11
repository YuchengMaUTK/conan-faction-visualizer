import { describe, it, expect } from 'vitest';
import { search, filterByFaction } from '../engines/search-engine';
import type { Entity } from '../types';

describe('search-engine', () => {
  const mockEntities: Entity[] = [
    {
      entity_id: 'e_conan',
      true_name: {
        en: 'Edogawa Conan',
        zh: '江户川柯南',
        ja: '江戸川コナン',
        ja_romaji: 'Edogawa Konan',
      },
      status: 'shrunk',
      base_appearances: 1000,
      personas: [
        {
          persona_id: 'p_conan',
          name: { en: 'Edogawa Conan', zh: '江户川柯南' },
          faction: 'RED',
          avatar: 'conan.jpg',
          codename: 'Cool Kid',
          is_default_display: true,
        },
        {
          persona_id: 'p_shinichi',
          name: { en: 'Kudo Shinichi', zh: '工藤新一' },
          faction: 'RED',
          avatar: 'shinichi.jpg',
          codename: 'High School Detective',
          is_default_display: false,
        },
      ],
      nicknames: [
        { en: 'Detective Boy', zh: '名侦探' },
        { en: 'Cool Kid', zh: '酷小孩' },
      ],
    },
    {
      entity_id: 'e_akai',
      true_name: {
        en: 'Akai Shuichi',
        zh: '赤井秀一',
        ja: '赤井秀一',
        ja_romaji: 'Akai Shūichi',
      },
      status: 'alive',
      base_appearances: 80,
      personas: [
        {
          persona_id: 'p_akai_fbi',
          name: { en: 'Akai Shuichi', zh: '赤井秀一' },
          faction: 'RED',
          sub_faction: 'FBI',
          avatar: 'akai.jpg',
          codename: 'Rye',
          is_default_display: true,
        },
        {
          persona_id: 'p_furuya',
          name: { en: 'Furuya Rei', zh: '降谷零' },
          faction: 'BLACK',
          sub_faction: 'BO_OUTER',
          avatar: 'furuya.jpg',
          codename: 'Bourbon',
          is_default_display: false,
        },
      ],
    },
    {
      entity_id: 'e_gin',
      true_name: {
        en: 'Gin',
        zh: '琴酒',
        ja: 'ジン',
      },
      status: 'alive',
      base_appearances: 50,
      personas: [
        {
          persona_id: 'p_gin',
          name: { en: 'Gin', zh: '琴酒' },
          faction: 'BLACK',
          sub_faction: 'BO_CORE',
          avatar: 'gin.jpg',
          codename: 'Gin',
          is_default_display: true,
        },
      ],
    },
    {
      entity_id: 'e_ran',
      true_name: {
        en: 'Mouri Ran',
        zh: '毛利兰',
        ja: '毛利蘭',
        ja_romaji: 'Mōri Ran',
      },
      status: 'alive',
      base_appearances: 900,
      personas: [
        {
          persona_id: 'p_ran',
          name: { en: 'Mouri Ran', zh: '毛利兰' },
          faction: 'RED',
          sub_faction: 'DETECTIVE',
          avatar: 'ran.jpg',
          is_default_display: true,
        },
      ],
    },
  ];

  describe('search', () => {
    it('should search by English true_name', () => {
      const results = search(mockEntities, 'Edogawa');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_conan');
      expect(results[0].matched_persona_ids).toEqual(['p_conan', 'p_shinichi']);
    });

    it('should search by Chinese true_name', () => {
      const results = search(mockEntities, '江户川');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_conan');
    });

    it('should search by Japanese true_name', () => {
      const results = search(mockEntities, 'コナン');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_conan');
    });

    it('should search by Japanese romaji', () => {
      const results = search(mockEntities, 'Konan');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_conan');
    });

    it('should search by persona name', () => {
      const results = search(mockEntities, 'Shinichi');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_conan');
    });

    it('should search by codename', () => {
      const results = search(mockEntities, 'Rye');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_akai');
    });

    it('should search by nickname', () => {
      const results = search(mockEntities, 'Detective');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_conan');
    });

    it('should perform case-insensitive search', () => {
      const results1 = search(mockEntities, 'edogawa');
      const results2 = search(mockEntities, 'EDOGAWA');
      const results3 = search(mockEntities, 'Edogawa');

      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
    });

    it('should return all persona_ids for matching entity', () => {
      const results = search(mockEntities, 'Akai');

      expect(results).toHaveLength(1);
      expect(results[0].matched_persona_ids).toHaveLength(2);
      expect(results[0].matched_persona_ids).toContain('p_akai_fbi');
      expect(results[0].matched_persona_ids).toContain('p_furuya');
    });

    it('should return empty array for non-matching query', () => {
      const results = search(mockEntities, 'Nonexistent');

      expect(results).toHaveLength(0);
    });

    it('should return empty array for empty query', () => {
      const results = search(mockEntities, '');

      expect(results).toHaveLength(0);
    });

    it('should return empty array for whitespace-only query', () => {
      const results = search(mockEntities, '   ');

      expect(results).toHaveLength(0);
    });

    it('should match partial strings', () => {
      const results = search(mockEntities, 'Edo');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_conan');
    });

    it('should return multiple results for matching multiple entities', () => {
      const results = search(mockEntities, 'a');

      // Should match entities containing 'a' in any language field
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search across all languages in I18nName', () => {
      const resultsEn = search(mockEntities, 'Mouri');
      const resultsZh = search(mockEntities, '毛利');

      expect(resultsEn).toHaveLength(1);
      expect(resultsZh).toHaveLength(1);
      expect(resultsEn[0].entity_id).toBe('e_ran');
      expect(resultsZh[0].entity_id).toBe('e_ran');
    });

    it('should handle entities without nicknames', () => {
      const results = search(mockEntities, 'Akai');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_akai');
    });
  });

  describe('filterByFaction', () => {
    it('should filter entities by RED faction', () => {
      const results = filterByFaction(mockEntities, 'RED');

      expect(results).toHaveLength(3);
      expect(results.every((e) => e.personas.some((p) => p.faction === 'RED'))).toBe(true);
    });

    it('should filter entities by BLACK faction', () => {
      const results = filterByFaction(mockEntities, 'BLACK');

      expect(results).toHaveLength(2);
      expect(results.every((e) => e.personas.some((p) => p.faction === 'BLACK'))).toBe(true);
    });

    it('should filter entities by OTHER faction', () => {
      const results = filterByFaction(mockEntities, 'OTHER');

      expect(results).toHaveLength(0);
    });

    it('should filter entities by sub_faction', () => {
      const results = filterByFaction(mockEntities, undefined, 'FBI');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_akai');
    });

    it('should filter entities by both faction and sub_faction', () => {
      const results = filterByFaction(mockEntities, 'BLACK', 'BO_CORE');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_gin');
    });

    it('should return all entities when no filters provided', () => {
      const results = filterByFaction(mockEntities);

      expect(results).toHaveLength(4);
    });

    it('should handle entities with multiple personas of different factions', () => {
      const results = filterByFaction(mockEntities, 'RED');

      // Akai has both RED and BLACK personas, should be included
      expect(results.some((e) => e.entity_id === 'e_akai')).toBe(true);
    });

    it('should not include entities when no persona matches faction', () => {
      const results = filterByFaction(mockEntities, 'OTHER');

      expect(results).toHaveLength(0);
    });

    it('should include entities with any matching sub_faction', () => {
      const results = filterByFaction(mockEntities, undefined, 'DETECTIVE');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_ran');
    });

    it('should return empty array for non-existent faction', () => {
      const results = filterByFaction(mockEntities, 'NONEXISTENT' as any);

      expect(results).toHaveLength(0);
    });

    it('should return empty array for non-existent sub_faction', () => {
      const results = filterByFaction(mockEntities, undefined, 'NONEXISTENT' as any);

      expect(results).toHaveLength(0);
    });

    it('should filter by sub_faction regardless of faction', () => {
      const results = filterByFaction(mockEntities, 'RED', 'BO_CORE');

      expect(results).toHaveLength(0);
    });
  });

  describe('search and filter integration', () => {
    it('should work together: filter then search', () => {
      const filtered = filterByFaction(mockEntities, 'RED');
      const results = search(filtered, 'Akai');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_akai');
    });

    it('should work together: search then filter', () => {
      const searched = search(mockEntities, 'a');
      const matchedEntityIds = new Set(searched.map((r) => r.entity_id));
      const allMatches = mockEntities.filter((e) => matchedEntityIds.has(e.entity_id));
      const filtered = filterByFaction(allMatches, 'RED');

      expect(filtered.every((e) => e.personas.some((p) => p.faction === 'RED'))).toBe(true);
    });

    it('should handle multi-language search across filtered results', () => {
      const filtered = filterByFaction(mockEntities, 'RED');
      const resultsEn = search(filtered, 'Edogawa');
      const resultsZh = search(filtered, '江户川');

      expect(resultsEn).toHaveLength(1);
      expect(resultsZh).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty entities array', () => {
      const results = search([], 'test');
      const filtered = filterByFaction([], 'RED');

      expect(results).toHaveLength(0);
      expect(filtered).toHaveLength(0);
    });

    it('should handle special characters in search query', () => {
      const results = search(mockEntities, '毛利蘭');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_ran');
    });

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      const results = search(mockEntities, longQuery);

      expect(results).toHaveLength(0);
    });

    it('should handle entities with optional fields missing', () => {
      const minimalEntity: Entity = {
        entity_id: 'e_minimal',
        true_name: { en: 'Minimal' },
        status: 'alive',
        base_appearances: 10,
        personas: [
          {
            persona_id: 'p_minimal',
            name: { en: 'Minimal' },
            faction: 'RED',
            avatar: 'minimal.jpg',
            is_default_display: true,
          },
        ],
      };

      const results = search([minimalEntity], 'Minimal');

      expect(results).toHaveLength(1);
    });

    it('should handle Unicode characters in search', () => {
      const results = search(mockEntities, 'コ');

      expect(results).toHaveLength(1);
      expect(results[0].entity_id).toBe('e_conan');
    });
  });
});
