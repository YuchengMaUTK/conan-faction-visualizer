// ============================================================
// 基础类型 — 时间、映射、事件
// ============================================================

/** 时间节点，支持动画集数、漫画话数和真实时间线三种索引 */
export interface TimePoint {
  episodeIndex?: number;
  chapterIndex?: number;
  publicationDate?: string; // YYYY-MM 格式
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

// ============================================================
// 多语言名称
// ============================================================

/** 多语言名称，en 为必填主键，其余语言可选 */
export interface I18nName {
  /** 英文名（必填，作为主键） */
  en: string;
  /** 日文名（汉字） */
  ja?: string;
  /** 日文罗马字转写（如 "Akai Shūichi"） */
  ja_romaji?: string;
  /** 中文名 */
  zh?: string;
  /** 索引签名，支持扩展更多语言 */
  [lang: string]: string | undefined;
}

// ============================================================
// Entity 辅助类型
// ============================================================

/** 首次登场信息 */
export interface FirstAppearance {
  /** 漫画话数（File 编号） */
  manga_file?: number;
  /** 动画集数 */
  anime_episode?: number;
}

/** 声优信息 */
export interface VoiceActors {
  /** 日文声优 */
  ja?: string;
  /** 英文声优 */
  en?: string;
}

/** 家庭关系类型 */
export type RelativeType =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'spouse'
  | 'cousin'
  | 'grandparent'
  | 'grandchild'
  | 'uncle_aunt'
  | 'nephew_niece';

/** 家庭关系 */
export interface Relative {
  /** 关联的 Entity ID */
  entity_id: string;
  /** 关系类型 */
  relation: RelativeType;
}

// ============================================================
// 阵营与子阵营
// ============================================================

/** 阵营（RED=正义方, BLACK=黑衣组织, OTHER=其他） */
export type Faction = 'RED' | 'BLACK' | 'OTHER';

/** 子阵营 */
export type SubFaction =
  | 'FBI'
  | 'CIA'
  | 'MI6'
  | 'PSB'
  | 'TOKYO_MPD'
  | 'OSAKA_PD'
  | 'NAGANO_PD'
  | 'OTHER_PD'
  | 'DETECTIVE'
  | 'DETECTIVE_BOYS'
  | 'BO_CORE'
  | 'BO_OUTER'
  | 'MAGIC_KAITO'
  | string;

// ============================================================
// Persona（身份/面具）
// ============================================================

/** 身份/面具 — Entity 在不同阵营或社会场景下使用的身份 */
export interface Persona {
  /** 唯一标识符，以 "p_" 为前缀 */
  persona_id: string;
  /** 该身份使用的名称 */
  name: I18nName;
  /** 所属阵营 */
  faction: Faction;
  /** 子阵营（可选） */
  sub_faction?: SubFaction;
  /** 头像 URL */
  avatar: string;
  /** 代号（可选，如 "Rye"、"Bourbon"） */
  codename?: string | null;
  /** 是否为默认展示身份 */
  is_default_display: boolean;
  /** 简要描述（可选，如职业） */
  description?: I18nName;
}

// ============================================================
// Entity（实体 — 物理意义上的同一个人）
// ============================================================

/** 角色状态（扩展，对齐 Wiki） */
export type EntityStatus =
  | 'alive'
  | 'dead'
  | 'unknown'
  | 'shrunk'    // 缩小状态（如柯南、灰原）
  | 'missing';  // 失踪

/** 实体 — 物理意义上的同一个人，是所有 Persona 的根节点 */
export interface Entity {
  /** 唯一标识符，以 "e_" 为前缀 */
  entity_id: string;
  /** 真实姓名 */
  true_name: I18nName;
  /** 角色状态 */
  status: EntityStatus;
  /** 总出场次数 */
  base_appearances: number;
  /** 至少包含一个 Persona */
  personas: Persona[];
  /** Wiki 页面 URL（溯源） */
  wiki_url?: string;
  /** 昵称列表（如 "Shu"、"Silver Bullet"） */
  nicknames?: I18nName[];
  /** 首次登场信息 */
  first_appearance?: FirstAppearance;
  /** 声优信息 */
  voice_actors?: VoiceActors;
  /** 性别 */
  gender?: 'male' | 'female' | 'unknown';
  /** 年龄（可选） */
  age?: number | null;
  /** 家庭关系 */
  relatives?: Relative[];
}

// ============================================================
// Link（关系边 — 绑定在 Persona 之间）
// ============================================================

/** 关系类型（扩展，对齐 Wiki 关系分析） */
export type LinkType =
  | 'romantic'             // 恋爱关系
  | 'family'               // 家人
  | 'master_apprentice'    // 师徒
  | 'colleague'            // 同事/同伙
  | 'rivalry'              // 对手/敌对
  | 'friendship'           // 友情
  | 'superior_subordinate'; // 上下级

/** 关系边 — 绑定在 Persona 之间 */
export interface Link {
  /** 源 Persona ID */
  source_persona_id: string;
  /** 目标 Persona ID */
  target_persona_id: string;
  /** 关系类型 */
  type: LinkType;
  /** 显示标签 */
  label: I18nName;
  /** 关系状态（可选） */
  status?: string;
}

// ============================================================
// 角色事件（entity_id 替代 characterId）
// ============================================================

/** 角色事件类型 */
export type CharacterEventType = 'JOIN' | 'LEAVE' | 'DEATH' | 'EXPOSED' | 'DEFECT';

/** 角色事件 */
export interface CharacterEvent {
  id: string;
  /** 引用 Entity */
  entity_id: string;
  type: CharacterEventType;
  episodeIndex?: number;
  chapterIndex?: number;
  description: string;
}

// ============================================================
// 关系事件（保留，后续更新）
// ============================================================

/** 情感关系状态（保留，供 RelationshipEvent 使用） */
export type RelationshipStatus =
  | 'UNCONFESSED'
  | 'CONFESSED'
  | 'DATING'
  | 'CONFIRMED'
  | 'SEPARATED';

/** 关系事件 */
export interface RelationshipEvent {
  id: string;
  relationshipId: string;
  episodeIndex?: number;
  chapterIndex?: number;
  newStatus: RelationshipStatus;
  description: string;
}

/** 关系关键事件（时间轴标注用） */
export interface RelationshipKeyEvent {
  timePoint: TimePoint;
  relationshipId: string;
  title: string;
  description: string;
  involvedCharacterIds: string[];
}

// ============================================================
// 快照类型（事件引擎输出）
// ============================================================

/** 角色状态（快照中，基于 Persona 展开） */
export interface CharacterState {
  /** 所属 Entity */
  entity_id: string;
  /** 对应 Persona */
  persona_id: string;
  /** 多语言名称 */
  name: I18nName;
  codename?: string;
  avatar: string;
  status: 'ACTIVE' | 'LEFT' | 'DEAD' | 'EXPOSED';
  /** 所属阵营 */
  faction: Faction;
  /** 子阵营（可选） */
  sub_faction?: SubFaction;
  /** 总出场次数 */
  base_appearances: number;
  importanceRank: number;
  hasCurrentEvent: boolean;
  currentEvent?: CharacterEvent;
}

/** 阵营快照（含三阵营） */
export interface FactionSnapshot {
  redFaction: CharacterState[];
  blackFaction: CharacterState[];
  otherFaction: CharacterState[];
}

// ============================================================
// 完整数据集
// ============================================================

/** 完整数据集 */
export interface DataSet {
  entities: Entity[];
  characterEvents: CharacterEvent[];
  links: Link[];
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

// ============================================================
// 通用工具类型
// ============================================================

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
