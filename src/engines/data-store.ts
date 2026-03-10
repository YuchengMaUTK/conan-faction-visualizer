import Ajv, { type ErrorObject } from 'ajv';
import type {
  DataSet,
  AIUpdate,
  AIUpdateOperation,
  Result,
  ValidationError,
  Character,
  CharacterEvent,
  RomanticRelationship,
  RelationshipEvent,
  StoryArc,
} from '../types/index';

// ─── Schema Validator Setup ───

let cachedSchema: object | null = null;

async function loadSchema(): Promise<object> {
  if (cachedSchema) return cachedSchema;
  const resp = await fetch(`${import.meta.env.BASE_URL}conan-data-schema.json`);
  cachedSchema = await resp.json();
  return cachedSchema!;
}

function createValidator(schema: object) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  return ajv.compile(schema);
}

function ajvErrorsToValidationErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
  if (!errors) return [];
  return errors.map((e) => ({
    path: e.instancePath || '/',
    message: e.message ?? 'Unknown validation error',
    code: e.keyword,
  }));
}

// ─── Reference Consistency Checks ───

function checkReferenceConsistency(data: DataSet): { cleaned: DataSet; warnings: ValidationError[] } {
  const warnings: ValidationError[] = [];
  const characterIds = new Set(data.characters.map((c) => c.id));
  const relationshipIds = new Set(data.relationships.map((r) => r.id));

  // Filter character events with invalid character references
  const validCharacterEvents = data.characterEvents.filter((evt) => {
    if (!characterIds.has(evt.characterId)) {
      const err: ValidationError = {
        path: `characterEvents[${evt.id}].characterId`,
        message: `CharacterEvent "${evt.id}" references non-existent character "${evt.characterId}"`,
        code: 'INVALID_REFERENCE',
      };
      warnings.push(err);
      console.warn(`[DataStore] ${err.message}`);
      return false;
    }
    return true;
  });

  // Filter relationship events with invalid relationship references
  const validRelationshipEvents = data.relationshipEvents.filter((evt) => {
    if (!relationshipIds.has(evt.relationshipId)) {
      const err: ValidationError = {
        path: `relationshipEvents[${evt.id}].relationshipId`,
        message: `RelationshipEvent "${evt.id}" references non-existent relationship "${evt.relationshipId}"`,
        code: 'INVALID_REFERENCE',
      };
      warnings.push(err);
      console.warn(`[DataStore] ${err.message}`);
      return false;
    }
    return true;
  });

  // Check relationship character references
  const validRelationships = data.relationships.filter((rel) => {
    if (!characterIds.has(rel.character1Id)) {
      const err: ValidationError = {
        path: `relationships[${rel.id}].character1Id`,
        message: `Relationship "${rel.id}" references non-existent character "${rel.character1Id}"`,
        code: 'INVALID_REFERENCE',
      };
      warnings.push(err);
      console.warn(`[DataStore] ${err.message}`);
      return false;
    }
    if (!characterIds.has(rel.character2Id)) {
      const err: ValidationError = {
        path: `relationships[${rel.id}].character2Id`,
        message: `Relationship "${rel.id}" references non-existent character "${rel.character2Id}"`,
        code: 'INVALID_REFERENCE',
      };
      warnings.push(err);
      console.warn(`[DataStore] ${err.message}`);
      return false;
    }
    return true;
  });

  return {
    cleaned: {
      ...data,
      characterEvents: validCharacterEvents,
      relationships: validRelationships,
      relationshipEvents: validRelationshipEvents,
    },
    warnings,
  };
}

// ─── parseData ───

export function parseDataSync(json: string, schema: object): Result<DataSet, ValidationError[]> {
  // 1. Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return {
      ok: false,
      error: [{ path: '/', message: `Invalid JSON: ${(e as Error).message}`, code: 'PARSE_ERROR' }],
    };
  }

  // 2. Schema validation
  const validate = createValidator(schema);
  const valid = validate(raw);
  if (!valid) {
    return { ok: false, error: ajvErrorsToValidationErrors(validate.errors) };
  }

  // 3. Strip $schema key from parsed data before casting
  const { $schema: _schema, ...dataWithoutSchema } = raw as Record<string, unknown>;
  void _schema;
  const dataSet = dataWithoutSchema as unknown as DataSet;

  // 4. Reference consistency check (skip invalid, log warnings)
  const { cleaned, warnings } = checkReferenceConsistency(dataSet);
  if (warnings.length > 0) {
    console.warn(`[DataStore] ${warnings.length} reference inconsistencies found and skipped.`);
  }

  return { ok: true, value: cleaned };
}

export async function parseData(json: string): Promise<Result<DataSet, ValidationError[]>> {
  const schema = await loadSchema();
  return parseDataSync(json, schema);
}

// ─── serializeData ───

export function serializeData(data: DataSet): string {
  return JSON.stringify(data, null, 2);
}

// ─── applyUpdate ───

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function applyUpdate(
  current: DataSet,
  update: AIUpdate
): Result<DataSet, ValidationError[]> {
  const errors: ValidationError[] = [];

  if (!update.operations || update.operations.length === 0) {
    return {
      ok: false,
      error: [{ path: 'operations', message: 'Update must contain at least one operation', code: 'EMPTY_OPERATIONS' }],
    };
  }

  // Deep clone to avoid mutating the original
  const result: DataSet = JSON.parse(JSON.stringify(current));
  const characterIds = new Set(result.characters.map((c) => c.id));
  const relationshipIds = new Set(result.relationships.map((r) => r.id));

  for (let i = 0; i < update.operations.length; i++) {
    const op = update.operations[i];
    const opPath = `operations[${i}]`;

    switch (op.type) {
      case 'ADD_CHARACTER': {
        const charData = op.data;
        if (!charData.name || !charData.faction || !charData.avatar) {
          errors.push({
            path: `${opPath}.data`,
            message: 'ADD_CHARACTER requires name, faction, and avatar fields',
            code: 'MISSING_REQUIRED_FIELD',
          });
          break;
        }
        const newChar: Character = { id: generateId('char'), ...charData };
        result.characters.push(newChar);
        characterIds.add(newChar.id);
        break;
      }

      case 'ADD_EVENT': {
        const evtData = op.data;
        if (!evtData.characterId || !evtData.type || !evtData.description) {
          errors.push({
            path: `${opPath}.data`,
            message: 'ADD_EVENT requires characterId, type, and description fields',
            code: 'MISSING_REQUIRED_FIELD',
          });
          break;
        }
        if (!characterIds.has(evtData.characterId)) {
          errors.push({
            path: `${opPath}.data.characterId`,
            message: `ADD_EVENT references non-existent character "${evtData.characterId}"`,
            code: 'INVALID_REFERENCE',
          });
          break;
        }
        const newEvt: CharacterEvent = { id: generateId('evt'), ...evtData };
        result.characterEvents.push(newEvt);
        break;
      }

      case 'UPDATE_APPEARANCE': {
        if (!op.characterId) {
          errors.push({
            path: `${opPath}.characterId`,
            message: 'UPDATE_APPEARANCE requires characterId',
            code: 'MISSING_REQUIRED_FIELD',
          });
          break;
        }
        if (!characterIds.has(op.characterId)) {
          errors.push({
            path: `${opPath}.characterId`,
            message: `UPDATE_APPEARANCE references non-existent character "${op.characterId}"`,
            code: 'INVALID_REFERENCE',
          });
          break;
        }
        const char = result.characters.find((c) => c.id === op.characterId);
        if (char && op.delta) {
          if (op.delta.episodeCount !== undefined) {
            char.appearanceCount.episodeCount += op.delta.episodeCount;
          }
          if (op.delta.mentionCount !== undefined) {
            char.appearanceCount.mentionCount += op.delta.mentionCount;
          }
        }
        break;
      }

      case 'ADD_RELATIONSHIP': {
        const relData = op.data;
        if (!relData.character1Id || !relData.character2Id || !relData.type || !relData.initialStatus) {
          errors.push({
            path: `${opPath}.data`,
            message: 'ADD_RELATIONSHIP requires character1Id, character2Id, type, and initialStatus',
            code: 'MISSING_REQUIRED_FIELD',
          });
          break;
        }
        if (!characterIds.has(relData.character1Id)) {
          errors.push({
            path: `${opPath}.data.character1Id`,
            message: `ADD_RELATIONSHIP references non-existent character "${relData.character1Id}"`,
            code: 'INVALID_REFERENCE',
          });
          break;
        }
        if (!characterIds.has(relData.character2Id)) {
          errors.push({
            path: `${opPath}.data.character2Id`,
            message: `ADD_RELATIONSHIP references non-existent character "${relData.character2Id}"`,
            code: 'INVALID_REFERENCE',
          });
          break;
        }
        const newRel: RomanticRelationship = { id: generateId('rel'), ...relData };
        result.relationships.push(newRel);
        relationshipIds.add(newRel.id);
        break;
      }

      case 'ADD_RELATIONSHIP_EVENT': {
        const revtData = op.data;
        if (!revtData.relationshipId || !revtData.newStatus || !revtData.description) {
          errors.push({
            path: `${opPath}.data`,
            message: 'ADD_RELATIONSHIP_EVENT requires relationshipId, newStatus, and description',
            code: 'MISSING_REQUIRED_FIELD',
          });
          break;
        }
        if (!relationshipIds.has(revtData.relationshipId)) {
          errors.push({
            path: `${opPath}.data.relationshipId`,
            message: `ADD_RELATIONSHIP_EVENT references non-existent relationship "${revtData.relationshipId}"`,
            code: 'INVALID_REFERENCE',
          });
          break;
        }
        const newRevt: RelationshipEvent = { id: generateId('revt'), ...revtData };
        result.relationshipEvents.push(newRevt);
        break;
      }

      case 'ADD_STORY_ARC': {
        const arcData = op.data;
        if (!arcData.name || !arcData.description || !arcData.startEpisodeIndex || !arcData.startChapterIndex) {
          errors.push({
            path: `${opPath}.data`,
            message: 'ADD_STORY_ARC requires name, description, startEpisodeIndex, and startChapterIndex',
            code: 'MISSING_REQUIRED_FIELD',
          });
          break;
        }
        const newArc: StoryArc = { id: generateId('arc'), ...arcData };
        result.storyArcs.push(newArc);
        break;
      }

      default: {
        errors.push({
          path: opPath,
          message: `Unknown operation type: ${(op as AIUpdateOperation).type}`,
          code: 'UNKNOWN_OPERATION',
        });
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: errors };
  }

  return { ok: true, value: result };
}

// ─── generatePromptTemplate ───

export function generatePromptTemplate(current: DataSet): string {
  const characterSummary = current.characters
    .map((c) => `  - ${c.id}: ${c.name}${c.codename ? ` (${c.codename})` : ''} [${c.faction}${c.subFaction ? '/' + c.subFaction : ''}]`)
    .join('\n');

  return `# 名侦探柯南阵营数据更新指南 / Detective Conan Faction Data Update Guide

## 数据模式说明 / Data Schema Description

你需要生成一个符合 AIUpdate 格式的 JSON 对象，用于更新柯南阵营可视化数据。

### AIUpdate 结构
\`\`\`json
{
  "description": "更新描述（自然语言）",
  "episodeIndex": 1100,
  "chapterIndex": 1120,
  "operations": [ ... ]
}
\`\`\`

### 支持的操作类型 / Supported Operation Types

1. **ADD_CHARACTER** - 新增角色
   - data: { name, codename?, faction("RED"|"BLACK"), subFaction?, avatar, appearanceCount: { episodeCount, mentionCount }, isDualIdentity, dualIdentityInfo? }

2. **ADD_EVENT** - 新增角色事件
   - data: { characterId, type("JOIN"|"LEAVE"|"DEATH"|"EXPOSED"|"DEFECT"), episodeIndex?, chapterIndex?, description }

3. **UPDATE_APPEARANCE** - 更新出场次数
   - characterId: 角色ID
   - delta: { episodeCount?, mentionCount? } (增量值)

4. **ADD_RELATIONSHIP** - 新增情感关系
   - data: { character1Id, character2Id, type("LOVE"|"CRUSH"|"CHILDHOOD_SWEETHEART"|"MARRIED"|"AMBIGUOUS"), initialStatus("UNCONFESSED"|"CONFESSED"|"DATING"|"CONFIRMED"|"SEPARATED"), description? }

5. **ADD_RELATIONSHIP_EVENT** - 新增关系事件
   - data: { relationshipId, episodeIndex?, chapterIndex?, newStatus("UNCONFESSED"|"CONFESSED"|"DATING"|"CONFIRMED"|"SEPARATED"), description }

6. **ADD_STORY_ARC** - 新增剧情篇章
   - data: { name, description, startEpisodeIndex, startChapterIndex, endEpisodeIndex?, endChapterIndex? }

## 现有角色列表 / Existing Characters

${characterSummary}

共 ${current.characters.length} 个角色，${current.characterEvents.length} 个事件，${current.relationships.length} 对情感关系，${current.storyArcs.length} 个剧情篇章。

## 事件类型枚举 / Event Type Enums

- CharacterEventType: JOIN, LEAVE, DEATH, EXPOSED, DEFECT
- RelationshipType: LOVE, CRUSH, CHILDHOOD_SWEETHEART, MARRIED, AMBIGUOUS
- RelationshipStatus: UNCONFESSED, CONFESSED, DATING, CONFIRMED, SEPARATED

## 输出格式示例 / Output Format Examples

### 示例 1：新增角色 + 新增事件

\`\`\`json
{
  "description": "第1120话新角色登场：黑田兵卫正式加入剧情",
  "episodeIndex": 1100,
  "chapterIndex": 1120,
  "operations": [
    {
      "type": "ADD_CHARACTER",
      "data": {
        "name": "黑田兵卫",
        "codename": null,
        "faction": "RED",
        "subFaction": "POLICE",
        "avatar": "kuroda.png",
        "appearanceCount": { "episodeCount": 30, "mentionCount": 20 },
        "isDualIdentity": false
      }
    },
    {
      "type": "ADD_EVENT",
      "data": {
        "characterId": "kuroda",
        "type": "JOIN",
        "episodeIndex": 1100,
        "chapterIndex": 1120,
        "description": "黑田兵卫管理官首次正式登场"
      }
    }
  ]
}
\`\`\`

### 示例 2：更新出场次数 + 新增关系事件 + 新增篇章

\`\`\`json
{
  "description": "第1130话：服部平次向远山和叶表白，新篇章开始",
  "episodeIndex": 1110,
  "chapterIndex": 1130,
  "operations": [
    {
      "type": "UPDATE_APPEARANCE",
      "characterId": "heiji",
      "delta": { "episodeCount": 5, "mentionCount": 2 }
    },
    {
      "type": "UPDATE_APPEARANCE",
      "characterId": "kazuha",
      "delta": { "episodeCount": 5, "mentionCount": 1 }
    },
    {
      "type": "ADD_RELATIONSHIP_EVENT",
      "data": {
        "relationshipId": "rel-002",
        "episodeIndex": 1110,
        "chapterIndex": 1130,
        "newStatus": "CONFESSED",
        "description": "服部平次向远山和叶表白——大阪篇"
      }
    },
    {
      "type": "ADD_STORY_ARC",
      "data": {
        "name": "大阪告白篇",
        "description": "服部平次终于向远山和叶表白的经典篇章",
        "startEpisodeIndex": 1108,
        "startChapterIndex": 1128,
        "endEpisodeIndex": 1112,
        "endChapterIndex": 1132
      }
    }
  ]
}
\`\`\`

## 注意事项 / Notes

- characterId 必须引用现有角色列表中的 ID
- relationshipId 必须引用现有关系的 ID
- UPDATE_APPEARANCE 的 delta 是增量值，会累加到现有数值上
- 每个操作的 id 字段会自动生成，无需提供
- 请使用中文填写 description 字段
`;
}
