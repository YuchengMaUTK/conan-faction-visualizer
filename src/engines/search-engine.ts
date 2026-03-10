import type { CharacterState, SubFaction } from '../types';

/**
 * Fuzzy search on character name and codename, case-insensitive.
 * Returns matching character IDs.
 *
 * Requirements: 6.1, 6.3
 */
export function search(characters: CharacterState[], query: string): string[] {
  if (!query || query.trim() === '') return [];

  const lowerQuery = query.toLowerCase();

  return characters
    .filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(lowerQuery);
      const codenameMatch = c.codename
        ? c.codename.toLowerCase().includes(lowerQuery)
        : false;
      return nameMatch || codenameMatch;
    })
    .map((c) => c.characterId);
}

/**
 * Filter characters by subFaction.
 * Returns only characters whose subFaction matches the given value.
 *
 * Requirements: 6.3
 */
export function filterBySubFaction(
  characters: CharacterState[],
  subFaction: SubFaction
): CharacterState[] {
  return characters.filter((c) => c.subFaction === subFaction);
}
