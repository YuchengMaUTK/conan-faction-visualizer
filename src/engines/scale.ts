const MIN_SCALE = 0.75;
const MAX_SCALE = 1.2;

interface HasBaseAppearances {
  base_appearances: number;
}

/**
 * Compute the visual scale for a character card based on base_appearances
 * relative to the faction's min/max.
 *
 * Linear mapping to [0.75, 1.2] range.
 * If all characters have the same count, returns 1.0.
 *
 * Requirements: 1.4
 */
export function computeScale(
  character: HasBaseAppearances,
  factionCharacters: HasBaseAppearances[]
): number {
  const total = character.base_appearances;

  const counts = factionCharacters.map((c) => c.base_appearances);

  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);

  if (maxCount === minCount) return 1.0;

  const ratio = (total - minCount) / (maxCount - minCount);
  return MIN_SCALE + ratio * (MAX_SCALE - MIN_SCALE);
}
