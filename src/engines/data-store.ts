import Ajv, { type ErrorObject } from 'ajv';
import type {
  DataSet,
  Result,
  ValidationError,
  Entity,
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

export function checkReferenceConsistency(data: DataSet): { cleaned: DataSet; warnings: ValidationError[] } {
  const warnings: ValidationError[] = [];

  // 1. Build entityIdSet and personaIdSet
  const entityIdSet = new Set<string>();
  const personaIdSet = new Set<string>();

  for (const entity of data.entities) {
    entityIdSet.add(entity.entity_id);
    for (const persona of entity.personas) {
      personaIdSet.add(persona.persona_id);
    }
  }

  // 2. Validate entity_id prefix (e_) and persona_id prefix (p_)
  for (const entity of data.entities) {
    if (!entity.entity_id.startsWith('e_')) {
      warnings.push({
        path: `entities[${entity.entity_id}].entity_id`,
        message: `Entity ID "${entity.entity_id}" does not start with "e_" prefix`,
        code: 'INVALID_ID_PREFIX',
      });
    }

    for (const persona of entity.personas) {
      if (!persona.persona_id.startsWith('p_')) {
        warnings.push({
          path: `entities[${entity.entity_id}].personas[${persona.persona_id}].persona_id`,
          message: `Persona ID "${persona.persona_id}" does not start with "p_" prefix`,
          code: 'INVALID_ID_PREFIX',
        });
      }
    }
  }

  // 3. Validate each Entity has at least one Persona
  for (const entity of data.entities) {
    if (!entity.personas || entity.personas.length < 1) {
      warnings.push({
        path: `entities[${entity.entity_id}].personas`,
        message: `Entity "${entity.entity_id}" must have at least one Persona`,
        code: 'EMPTY_PERSONAS',
      });
    }
  }

  // 4. Validate each Entity has exactly one is_default_display = true Persona
  for (const entity of data.entities) {
    const defaultCount = entity.personas.filter((p) => p.is_default_display).length;
    if (defaultCount !== 1) {
      warnings.push({
        path: `entities[${entity.entity_id}].personas`,
        message: `Entity "${entity.entity_id}" must have exactly one default display Persona, found ${defaultCount}`,
        code: 'INVALID_DEFAULT_DISPLAY',
      });
    }
  }

  // 5. Validate characterEvents[].entity_id references a valid Entity
  const validCharacterEvents = data.characterEvents.filter((evt) => {
    if (!entityIdSet.has(evt.entity_id)) {
      warnings.push({
        path: `characterEvents[${evt.id}].entity_id`,
        message: `CharacterEvent "${evt.id}" references non-existent entity "${evt.entity_id}"`,
        code: 'INVALID_REFERENCE',
      });
      return false;
    }
    return true;
  });

  // 6. Validate links[].source_persona_id and target_persona_id reference valid Personas
  const validLinks = data.links.filter((link) => {
    let valid = true;
    if (!personaIdSet.has(link.source_persona_id)) {
      warnings.push({
        path: `links[${link.source_persona_id}->${link.target_persona_id}].source_persona_id`,
        message: `Link references non-existent source persona "${link.source_persona_id}"`,
        code: 'INVALID_REFERENCE',
      });
      valid = false;
    }
    if (!personaIdSet.has(link.target_persona_id)) {
      warnings.push({
        path: `links[${link.source_persona_id}->${link.target_persona_id}].target_persona_id`,
        message: `Link references non-existent target persona "${link.target_persona_id}"`,
        code: 'INVALID_REFERENCE',
      });
      valid = false;
    }
    return valid;
  });

  // 7. Validate relatives[].entity_id references a valid Entity
  const cleanedEntities: Entity[] = data.entities.map((entity) => {
    if (!entity.relatives || entity.relatives.length === 0) return entity;

    const validRelatives = entity.relatives.filter((rel) => {
      if (!entityIdSet.has(rel.entity_id)) {
        warnings.push({
          path: `entities[${entity.entity_id}].relatives[${rel.entity_id}].entity_id`,
          message: `Relative in entity "${entity.entity_id}" references non-existent entity "${rel.entity_id}"`,
          code: 'INVALID_REFERENCE',
        });
        return false;
      }
      return true;
    });

    return { ...entity, relatives: validRelatives };
  });

  // Filter relationship events — keep only those referencing existing link pairs
  // (RelationshipEvents use relationshipId which is a separate concept, keep as-is for now)
  const validRelationshipEvents = data.relationshipEvents;

  return {
    cleaned: {
      ...data,
      entities: cleanedEntities,
      characterEvents: validCharacterEvents,
      links: validLinks,
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

  // 4. Reference consistency check (filter invalid, log warnings)
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

// ─── generateId ───

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
