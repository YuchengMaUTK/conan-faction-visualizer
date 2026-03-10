/** 时间节点，支持动画集数、漫画话数和真实时间线三种索引 */
export interface TimePoint {
  episodeIndex?: number;
  chapterIndex?: number;
  publicationDate?: string; // YYYY-MM 格式
}

/** 出场/提及次数 */
export interface AppearanceCount {
  episodeCount: number;
  mentionCount: number;
}

/** 阵营子分类 */
export type SubFaction =
  | 'FBI'
  | 'CIA'
  | 'PSB'
  | 'DETECTIVE_BOYS'
  | 'DETECTIVE'
  | 'POLICE'
  | 'BO_CORE'
  | 'BO_OUTER'
  | string;

/** 角色基本信息 */
export interface Character {
  id: string;
  name: string;
  codename?: string | null;
  faction: 'RED' | 'BLACK';
  subFaction?: SubFaction;
  avatar: string;
  appearanceCount: AppearanceCount;
  isDualIdentity: boolean;
  dualIdentityInfo?: {
    secondaryFaction: 'RED' | 'BLACK';
    secondaryName?: string;
    secondaryCodename?: string;
  };
}

/** 角色事件类型 */
export type CharacterEventType = 'JOIN' | 'LEAVE' | 'DEATH' | 'EXPOSED' | 'DEFECT';

/** 角色事件 */
export interface CharacterEvent {
  id: string;
  characterId: string;
  type: CharacterEventType;
  episodeIndex?: number;
  chapterIndex?: number;
  description: string;
}

/** 情感关系类型 */
export type RelationshipType =
  | 'LOVE'
  | 'CRUSH'
  | 'CHILDHOOD_SWEETHEART'
  | 'MARRIED'
  | 'AMBIGUOUS';

/** 情感关系状态 */
export type RelationshipStatus =
  | 'UNCONFESSED'
  | 'CONFESSED'
  | 'DATING'
  | 'CONFIRMED'
  | 'SEPARATED';

/** 情感关系 */
export interface RomanticRelationship {
  id: string;
  character1Id: string;
  character2Id: string;
  type: RelationshipType;
  initialStatus: RelationshipStatus;
  description?: string;
}

/** 关系事件 */
export interface RelationshipEvent {
  id: string;
  relationshipId: string;
  episodeIndex?: number;
  chapterIndex?: number;
  newStatus: RelationshipStatus;
  description: string;
}

/** 集数-话数映射（含发行日期） */
export interface EpisodeChapterMapping {
  episodeIndex: number;
  chapterIndex: number;
  publicationDate: string; // YYYY-MM 格式
}

/** 关键事件（时间轴标注用） */
export interface KeyEvent {
  timePoint: TimePoint;
  title: string;
  description: string;
  involvedCharacterIds: string[];
  type: 'character' | 'relationship';
}

/** 剧情篇章 */
export interface StoryArc {
  id: string;
  name: string;
  description: string;
  startEpisodeIndex: number;
  startChapterIndex: number;
  endEpisodeIndex?: number;
  endChapterIndex?: number;
}

/** 完整数据集 */
export interface DataSet {
  characters: Character[];
  characterEvents: CharacterEvent[];
  relationships: RomanticRelationship[];
  relationshipEvents: RelationshipEvent[];
  episodeChapterMappings: EpisodeChapterMapping[];
  storyArcs: StoryArc[];
  metadata: {
    version: string;
    lastUpdated: string;
    totalEpisodes: number;
    totalChapters: number;
  };
}

/** AI 更新操作类型 */
export type AIUpdateOperation =
  | { type: 'ADD_CHARACTER'; data: Omit<Character, 'id'> }
  | { type: 'ADD_EVENT'; data: Omit<CharacterEvent, 'id'> }
  | { type: 'UPDATE_APPEARANCE'; characterId: string; delta: Partial<AppearanceCount> }
  | { type: 'ADD_RELATIONSHIP'; data: Omit<RomanticRelationship, 'id'> }
  | { type: 'ADD_RELATIONSHIP_EVENT'; data: Omit<RelationshipEvent, 'id'> }
  | { type: 'ADD_STORY_ARC'; data: Omit<StoryArc, 'id'> };

/** AI 更新数据包 */
export interface AIUpdate {
  description: string;
  episodeIndex?: number;
  chapterIndex?: number;
  operations: AIUpdateOperation[];
}

/** 角色状态（快照中的角色） */
export interface CharacterState {
  characterId: string;
  name: string;
  codename?: string;
  avatar: string;
  status: 'ACTIVE' | 'LEFT' | 'DEAD' | 'EXPOSED';
  isDualIdentity: boolean;
  subFaction?: SubFaction;
  appearanceCount: AppearanceCount;
  importanceRank: number;
  hasCurrentEvent: boolean;
  currentEvent?: CharacterEvent;
}

/** 阵营快照 */
export interface FactionSnapshot {
  redFaction: CharacterState[];
  blackFaction: CharacterState[];
}

/** 关系状态 */
export interface RelationshipState {
  relationshipId: string;
  character1Id: string;
  character2Id: string;
  type: RelationshipType;
  status: RelationshipStatus;
  isCrossFaction: boolean;
  description?: string;
}

/** 结果类型 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** 校验错误 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/** 关系关键事件（时间轴标注用） */
export interface RelationshipKeyEvent {
  timePoint: TimePoint;
  relationshipId: string;
  title: string;
  description: string;
  involvedCharacterIds: string[];
}
