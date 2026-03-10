import type { Entity, Faction, SubFaction, I18nName } from '../types';

/**
 * Search result: an Entity and all its Persona IDs.
 */
export interface SearchResult {
  entity_id: string;
  matched_persona_ids: string[];
}

/**
 * Check if any language field in an I18nName matches the query (case-insensitive).
 */
function matchesI18nName(name: I18nName, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return Object.values(name).some(
    (v) => typeof v === 'string' && v.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Multi-language fuzzy search across Entities and their Personas.
 *
 * Search logic:
 * 1. For each Entity, search in `true_name` all language fields (en, ja, ja_romaji, zh, etc.)
 * 2. For each Persona, search in `name` all language fields and `codename`
 * 3. Search in Entity's `nicknames` all language fields (if present)
 * 4. Case-insensitive matching
 * 5. When any Persona matches, return ALL persona_ids of that Entity
 *
 * Requirements: 3.6, 7.1, 7.2, 7.3
 */
export function search(entities: Entity[], query: string): SearchResult[] {
  if (!query || query.trim() === '') return [];

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const entity of entities) {
    let matched = false;

    // 1. Search in Entity's true_name
    if (matchesI18nName(entity.true_name, lowerQuery)) {
      matched = true;
    }

    // 2. Search in each Persona's name and codename
    if (!matched) {
      for (const persona of entity.personas) {
        if (matchesI18nName(persona.name, lowerQuery)) {
          matched = true;
          break;
        }
        if (
          persona.codename &&
          persona.codename.toLowerCase().includes(lowerQuery)
        ) {
          matched = true;
          break;
        }
      }
    }

    // 3. Search in Entity's nicknames
    if (!matched && entity.nicknames) {
      for (const nickname of entity.nicknames) {
        if (matchesI18nName(nickname, lowerQuery)) {
          matched = true;
          break;
        }
      }
    }

    // 5. If matched, return ALL persona_ids of this Entity
    if (matched) {
      results.push({
        entity_id: entity.entity_id,
        matched_persona_ids: entity.personas.map((p) => p.persona_id),
      });
    }
  }

  return results;
}

/**
 * Filter entities by faction and optionally sub_faction.
 * Returns entities where at least one Persona matches the given faction
 * (and optionally sub_faction).
 *
 * Requirements: 7.4
 */
export function filterByFaction(
  entities: Entity[],
  faction?: Faction,
  subFaction?: SubFaction
): Entity[] {
  if (!faction && !subFaction) return entities;

  return entities.filter((entity) =>
    entity.personas.some((persona) => {
      if (faction && persona.faction !== faction) return false;
      if (subFaction && persona.sub_faction !== subFaction) return false;
      return true;
    })
  );
}
