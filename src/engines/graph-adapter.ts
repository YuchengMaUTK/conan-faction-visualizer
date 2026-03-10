import type {
  FactionSnapshot,
  CharacterState,
  Entity,
  Link,
  LinkType,
  Faction,
} from '../types';

// --- Constants ---

const BASE_URL = import.meta.env.BASE_URL ?? '/';
const MIN_SYMBOL_SIZE = 20;
const MAX_SYMBOL_SIZE = 80;
const DEFAULT_SYMBOL_SIZE = 40;

const FACTION_COLORS: Record<string, string> = {
  RED: '#dc2626',
  BLACK: '#475569',
  OTHER: '#6b7280',
  DUAL: '#8b5cf6',
};

const CATEGORIES = [
  { name: 'RED', itemStyle: { color: '#dc2626' } },
  { name: 'BLACK', itemStyle: { color: '#475569' } },
  { name: 'OTHER', itemStyle: { color: '#6b7280' } },
  { name: 'DUAL', itemStyle: { color: '#8b5cf6' } },
];

/** Category indices */
const CATEGORY_RED = 0;
const CATEGORY_BLACK = 1;
const CATEGORY_OTHER = 2;
const CATEGORY_DUAL = 3;

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  romantic: '恋人',
  family: '家人',
  master_apprentice: '师徒',
  colleague: '同事',
  rivalry: '对手',
  friendship: '友情',
  superior_subordinate: '上下级',
};

// --- Interfaces ---

/** ECharts 图节点数据 */
export interface GraphNode {
  id: string;
  name: string;
  symbolSize: number;
  symbol: string;
  symbolClip?: boolean;
  category: number;
  itemStyle: {
    borderColor: string;
    borderWidth: number;
    color?: string;
  };
  label: {
    show: boolean;
    formatter: string;
    position: 'bottom';
    fontSize: number;
  };
  value: number;
  entity_id: string;
  persona_id?: string;
  avatarUrl?: string;  // original image URL for fallback handling
}

/** ECharts 图边数据 */
export interface GraphEdge {
  source: string;
  target: string;
  label: {
    show: boolean;
    formatter: string;
  };
  lineStyle: {
    color: string;
    width: number;
    type: 'solid' | 'dashed';
  };
}

/** 图数据适配器输出 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  categories: typeof CATEGORIES;
}

// --- Functions ---

/**
 * 计算节点尺寸。线性映射 base_appearances → [20, 80]。
 * 所有值相同时返回 40。
 */
export function computeSymbolSize(
  baseAppearances: number,
  allAppearances: number[]
): number {
  if (allAppearances.length === 0) return DEFAULT_SYMBOL_SIZE;

  const min = Math.min(...allAppearances);
  const max = Math.max(...allAppearances);

  if (max === min) return DEFAULT_SYMBOL_SIZE;

  const ratio = (baseAppearances - min) / (max - min);
  return MIN_SYMBOL_SIZE + ratio * (MAX_SYMBOL_SIZE - MIN_SYMBOL_SIZE);
}

/** Map a Faction value to its category index */
function factionToCategory(faction: Faction): number {
  switch (faction) {
    case 'RED':
      return CATEGORY_RED;
    case 'BLACK':
      return CATEGORY_BLACK;
    case 'OTHER':
      return CATEGORY_OTHER;
    default:
      return CATEGORY_OTHER;
  }
}

/** Get display name from I18nName: prefer zh, fallback to en */
function getDisplayName(name: { zh?: string; en: string }): string {
  return name.zh || name.en;
}

/** Resolve avatar URL: prepend BASE_URL for local paths */
function resolveAvatarUrl(avatar: string | undefined): string | undefined {
  if (!avatar) return undefined;
  if (avatar.startsWith('http')) return avatar;
  return `${BASE_URL}${avatar}`;
}

/** Check if a CharacterState passes the faction filter */
function passesFilter(
  cs: CharacterState,
  factionFilters: Record<string, boolean>
): boolean {
  if (factionFilters[cs.faction] === false) return false;
  if (cs.sub_faction != null && factionFilters[cs.sub_faction] === false) {
    return false;
  }
  return true;
}

/**
 * 将 FactionSnapshot + Links + Entities 转换为 ECharts graph 数据。
 *
 * Surface Mode (godEyeMode=false): 每个 Persona → 一个节点
 * God Eye Mode (godEyeMode=true): 每个 Entity → 一个合并节点
 */
export function buildGraphData(
  snapshot: FactionSnapshot,
  links: (Link & { isCrossFaction: boolean })[],
  entities: Entity[],
  godEyeMode: boolean,
  factionFilters: Record<string, boolean>
): GraphData {
  // Collect all character states from all three factions
  const allStates: CharacterState[] = [
    ...snapshot.redFaction,
    ...snapshot.blackFaction,
    ...snapshot.otherFaction,
  ];

  // Filter by faction filters and active status
  const filteredStates = allStates.filter(
    (cs) =>
      (cs.status === 'ACTIVE' || cs.status === 'EXPOSED') &&
      passesFilter(cs, factionFilters)
  );

  if (godEyeMode) {
    return buildGodEyeGraph(filteredStates, links, entities);
  } else {
    return buildSurfaceGraph(filteredStates, links);
  }
}

// --- Surface Mode ---

function buildSurfaceGraph(
  filteredStates: CharacterState[],
  links: (Link & { isCrossFaction: boolean })[]
): GraphData {
  const allAppearances = filteredStates.map((cs) => cs.base_appearances);
  const nodeIdSet = new Set<string>();
  const nodes: GraphNode[] = [];

  for (const cs of filteredStates) {
    const category = factionToCategory(cs.faction);
    const borderColor = FACTION_COLORS[cs.faction] ?? FACTION_COLORS.OTHER;
    const symbolSize = computeSymbolSize(cs.base_appearances, allAppearances);
    const displayName = getDisplayName(cs.name);

    const node: GraphNode = {
      id: cs.persona_id,
      name: displayName,
      symbolSize,
      symbol: 'circle',
      category,
      itemStyle: {
        borderColor,
        borderWidth: 3,
      },
      label: {
        show: true,
        formatter: displayName,
        position: 'bottom',
        fontSize: 12,
      },
      value: cs.base_appearances,
      entity_id: cs.entity_id,
      persona_id: cs.persona_id,
      avatarUrl: resolveAvatarUrl(cs.avatar),
    };
    nodes.push(node);
    nodeIdSet.add(cs.persona_id);
  }

  // Build edges — direct persona_id mapping
  const edges: GraphEdge[] = [];
  for (const link of links) {
    const sourceId = link.source_persona_id;
    const targetId = link.target_persona_id;

    if (!nodeIdSet.has(sourceId) || !nodeIdSet.has(targetId)) continue;
    if (sourceId === targetId) continue;

    edges.push(createEdge(link, sourceId, targetId));
  }

  return { nodes, edges, categories: CATEGORIES };
}

// --- God Eye Mode ---

function buildGodEyeGraph(
  filteredStates: CharacterState[],
  links: (Link & { isCrossFaction: boolean })[],
  entities: Entity[]
): GraphData {
  // Build persona → entity mapping from entities
  const personaToEntityMap = new Map<string, string>();
  for (const entity of entities) {
    for (const persona of entity.personas) {
      personaToEntityMap.set(persona.persona_id, entity.entity_id);
    }
  }

  // Build entity map for quick lookup
  const entityMap = new Map<string, Entity>();
  for (const entity of entities) {
    entityMap.set(entity.entity_id, entity);
  }

  // Group filtered states by entity_id
  const entityGroups = new Map<string, CharacterState[]>();
  for (const cs of filteredStates) {
    const group = entityGroups.get(cs.entity_id);
    if (group) {
      group.push(cs);
    } else {
      entityGroups.set(cs.entity_id, [cs]);
    }
  }

  // Compute all appearances for symbol sizing (one per entity)
  const allAppearances: number[] = [];
  for (const [, states] of entityGroups) {
    // All personas of the same entity share base_appearances
    allAppearances.push(states[0].base_appearances);
  }

  const nodeIdSet = new Set<string>();
  const nodes: GraphNode[] = [];

  for (const [entityId, states] of entityGroups) {
    const entity = entityMap.get(entityId);

    // Determine category: DUAL if personas span multiple factions
    const factions = new Set(states.map((cs) => cs.faction));
    let category: number;
    let borderColor: string;
    if (factions.size > 1) {
      category = CATEGORY_DUAL;
      borderColor = FACTION_COLORS.DUAL;
    } else {
      const singleFaction = states[0].faction;
      category = factionToCategory(singleFaction);
      borderColor = FACTION_COLORS[singleFaction] ?? FACTION_COLORS.OTHER;
    }

    // Find the default display persona for name and avatar
    let displayState = states[0]; // fallback
    if (entity) {
      const defaultPersona = entity.personas.find((p) => p.is_default_display);
      if (defaultPersona) {
        // Find the matching CharacterState, or use entity data directly
        const matchingState = states.find(
          (cs) => cs.persona_id === defaultPersona.persona_id
        );
        if (matchingState) {
          displayState = matchingState;
        }
      }
    }

    const displayName = getDisplayName(displayState.name);
    const symbolSize = computeSymbolSize(
      states[0].base_appearances,
      allAppearances
    );

    const node: GraphNode = {
      id: entityId,
      name: displayName,
      symbolSize,
      symbol: 'circle',
      category,
      itemStyle: {
        borderColor,
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: displayName,
        position: 'bottom',
        fontSize: 12,
      },
      value: states[0].base_appearances,
      entity_id: entityId,
      avatarUrl: resolveAvatarUrl(displayState.avatar),
    };
    nodes.push(node);
    nodeIdSet.add(entityId);
  }

  // Build edges — redirect persona endpoints to entity, deduplicate
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  for (const link of links) {
    const sourceEntityId =
      personaToEntityMap.get(link.source_persona_id) ?? link.source_persona_id;
    const targetEntityId =
      personaToEntityMap.get(link.target_persona_id) ?? link.target_persona_id;

    // Skip if endpoints not in visible nodes
    if (!nodeIdSet.has(sourceEntityId) || !nodeIdSet.has(targetEntityId))
      continue;
    // Skip self-loops (same entity on both ends)
    if (sourceEntityId === targetEntityId) continue;

    // Deduplicate: same entity pair should only have one edge
    const edgeKey =
      sourceEntityId < targetEntityId
        ? `${sourceEntityId}--${targetEntityId}`
        : `${targetEntityId}--${sourceEntityId}`;
    if (edgeSet.has(edgeKey)) continue;
    edgeSet.add(edgeKey);

    edges.push(createEdge(link, sourceEntityId, targetEntityId));
  }

  return { nodes, edges, categories: CATEGORIES };
}

// --- Shared helpers ---

function createEdge(
  link: Link & { isCrossFaction: boolean },
  sourceId: string,
  targetId: string
): GraphEdge {
  return {
    source: sourceId,
    target: targetId,
    label: {
      show: true,
      formatter: LINK_TYPE_LABELS[link.type] ?? link.type,
    },
    lineStyle: {
      color: '#f9a8d4',
      width: 2,
      type: link.isCrossFaction ? 'dashed' : 'solid',
    },
  };
}
