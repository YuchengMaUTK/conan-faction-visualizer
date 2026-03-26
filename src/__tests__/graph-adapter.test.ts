import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildGraphData,
  computeSymbolSize,
} from '../engines/graph-adapter';
import type { FactionSnapshot, Entity, Link } from '../types';

// Mock import.meta.env

beforeEach(() => {
  vi.stubGlobal('import.meta', {
    env: {
      BASE_URL: '',
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('graph-adapter', () => {
  const mockSnapshot: FactionSnapshot = {
    redFaction: [
      {
        entity_id: 'e_conan',
        persona_id: 'p_conan',
        name: { en: 'Edogawa Conan', zh: '江户川柯南' },
        avatar: 'conan.jpg',
        status: 'ACTIVE',
        faction: 'RED',
        base_appearances: 1000,
        importanceRank: 1,
        hasCurrentEvent: false,
      },
      {
        entity_id: 'e_ran',
        persona_id: 'p_ran',
        name: { en: 'Mouri Ran', zh: '毛利兰' },
        avatar: 'ran.jpg',
        status: 'ACTIVE',
        faction: 'RED',
        base_appearances: 900,
        importanceRank: 2,
        hasCurrentEvent: false,
      },
    ],
    blackFaction: [
      {
        entity_id: 'e_gin',
        persona_id: 'p_gin',
        name: { en: 'Gin', zh: '琴酒' },
        avatar: 'gin.jpg',
        status: 'ACTIVE',
        faction: 'BLACK',
        base_appearances: 200,
        importanceRank: 5,
        hasCurrentEvent: false,
      },
    ],
    otherFaction: [
      {
        entity_id: 'e_other',
        persona_id: 'p_other',
        name: { en: 'Other Character', zh: '其他角色' },
        avatar: 'other.jpg',
        status: 'ACTIVE',
        faction: 'OTHER',
        base_appearances: 50,
        importanceRank: 10,
        hasCurrentEvent: false,
      },
    ],
  };

  const mockEntities: Entity[] = [
    {
      entity_id: 'e_conan',
      true_name: { en: 'Edogawa Conan', zh: '江户川柯南' },
      status: 'alive',
      base_appearances: 1000,
      personas: [
        {
          persona_id: 'p_conan',
          name: { en: 'Edogawa Conan', zh: '江户川柯南' },
          faction: 'RED',
          avatar: 'conan.jpg',
          is_default_display: true,
        },
        {
          persona_id: 'p_shinichi',
          name: { en: 'Kudo Shinichi', zh: '工藤新一' },
          faction: 'RED',
          avatar: 'shinichi.jpg',
          is_default_display: false,
        },
      ],
    },
    {
      entity_id: 'e_ran',
      true_name: { en: 'Mouri Ran', zh: '毛利兰' },
      status: 'alive',
      base_appearances: 900,
      personas: [
        {
          persona_id: 'p_ran',
          name: { en: 'Mouri Ran', zh: '毛利兰' },
          faction: 'RED',
          avatar: 'ran.jpg',
          is_default_display: true,
        },
      ],
    },
    {
      entity_id: 'e_gin',
      true_name: { en: 'Gin', zh: '琴酒' },
      status: 'alive',
      base_appearances: 200,
      personas: [
        {
          persona_id: 'p_gin',
          name: { en: 'Gin', zh: '琴酒' },
          faction: 'BLACK',
          avatar: 'gin.jpg',
          is_default_display: true,
        },
      ],
    },
    {
      entity_id: 'e_other',
      true_name: { en: 'Other Character', zh: '其他角色' },
      status: 'alive',
      base_appearances: 50,
      personas: [
        {
          persona_id: 'p_other',
          name: { en: 'Other Character', zh: '其他角色' },
          faction: 'OTHER',
          avatar: 'other.jpg',
          is_default_display: true,
        },
      ],
    },
  ];

  const mockLinks: (Link & { isCrossFaction: boolean })[] = [
    {
      source_persona_id: 'p_conan',
      target_persona_id: 'p_ran',
      type: 'romantic',
      label: { en: 'Romantic' },
      isCrossFaction: false,
    },
    {
      source_persona_id: 'p_conan',
      target_persona_id: 'p_gin',
      type: 'rivalry',
      label: { en: 'Enemy' },
      isCrossFaction: true,
    },
  ];

  const factionFilters: Record<string, boolean> = {
    RED: true,
    BLACK: true,
    OTHER: true,
    FBI: true,
    CIA: true,
    MI6: true,
    PSB: true,
    TOKYO_MPD: true,
    OSAKA_PD: true,
    NAGANO_PD: true,
    OTHER_PD: true,
    DETECTIVE: true,
    DETECTIVE_BOYS: true,
    BO_CORE: true,
    BO_OUTER: true,
    MAGIC_KAITO: true,
  };

  describe('computeSymbolSize', () => {
    it('should return DEFAULT_SYMBOL_SIZE when array is empty', () => {
      const result = computeSymbolSize(100, []);
      expect(result).toBe(40);
    });

    it('should return DEFAULT_SYMBOL_SIZE when all values are the same', () => {
      const appearances = [100, 100, 100, 100];
      const result = computeSymbolSize(100, appearances);
      expect(result).toBe(40);
    });

    it('should map minimum value to MIN_SYMBOL_SIZE', () => {
      const appearances = [10, 20, 30, 40, 50];
      const result = computeSymbolSize(10, appearances);
      expect(result).toBe(20);
    });

    it('should map maximum value to MAX_SYMBOL_SIZE', () => {
      const appearances = [10, 20, 30, 40, 50];
      const result = computeSymbolSize(50, appearances);
      expect(result).toBe(80);
    });

    it('should scale values proportionally', () => {
      const appearances = [10, 20, 30, 40, 50];
      const result = computeSymbolSize(30, appearances);
      expect(result).toBe(50);
    });
  });

  describe('buildGraphData - Surface Mode', () => {
    it('should build graph with nodes for each persona', () => {
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, false, factionFilters);
      expect(result.nodes).toHaveLength(4);
    });

    it('should set correct category based on faction', () => {
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, false, factionFilters);
      const redNode = result.nodes.find((n) => n.entity_id === 'e_conan');
      const blackNode = result.nodes.find((n) => n.entity_id === 'e_gin');
      const otherNode = result.nodes.find((n) => n.entity_id === 'e_other');
      expect(redNode?.category).toBe(0);
      expect(blackNode?.category).toBe(1);
      expect(otherNode?.category).toBe(2);
    });

    it('should use Chinese name when available', () => {
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, false, factionFilters);
      const conanNode = result.nodes.find((n) => n.entity_id === 'e_conan');
      expect(conanNode?.name).toBe('江户川柯南');
    });

    it('should build edges for valid links', () => {
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, false, factionFilters);
      expect(result.edges).toHaveLength(2);
    });

    it('should resolve avatar URLs with BASE_URL', () => {
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, false, factionFilters);
      const conanNode = result.nodes.find((n) => n.entity_id === 'e_conan');
      // BASE_URL from vite.config.ts is '/conan-faction-visualizer/'
      expect(conanNode?.avatarUrl).toBe('/conan-faction-visualizer/conan.jpg');
    });
  });

  describe('buildGraphData - God Eye Mode', () => {
    it('should build graph with nodes for each entity', () => {
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, true, factionFilters);
      expect(result.nodes).toHaveLength(4);
    });

    it('should use entity_id as node id', () => {
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, true, factionFilters);
      expect(result.nodes[0].id).toBeDefined();
      expect(result.nodes.every((n) => !n.persona_id)).toBe(true);
    });
  });

  describe('buildGraphData - Faction Filters', () => {
    it('should filter out nodes by faction', () => {
      const filters = { ...factionFilters, BLACK: false };
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, false, filters);
      expect(result.nodes.every((n) => n.category !== 1)).toBe(true);
    });

    it('should filter out edges when endpoints are filtered', () => {
      const filters = { ...factionFilters, BLACK: false };
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, false, filters);
      expect(result.edges).toHaveLength(1);
    });
  });

  describe('buildGraphData - Categories', () => {
    it('should return correct category definitions', () => {
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, false, factionFilters);
      expect(result.categories).toHaveLength(4);
      expect(result.categories[0].name).toBe('RED');
      expect(result.categories[1].name).toBe('BLACK');
      expect(result.categories[2].name).toBe('OTHER');
      expect(result.categories[3].name).toBe('DUAL');
    });

    it('should use correct colors for categories', () => {
      const result = buildGraphData(mockSnapshot, mockLinks, mockEntities, false, factionFilters);
      expect(result.categories[0].itemStyle.color).toBe('#dc2626');
      expect(result.categories[1].itemStyle.color).toBe('#475569');
      expect(result.categories[2].itemStyle.color).toBe('#6b7280');
      expect(result.categories[3].itemStyle.color).toBe('#8b5cf6');
    });
  });
});
