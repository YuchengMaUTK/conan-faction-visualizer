import type { AppearanceCount } from '../types';

const MIN_SCALE = 0.75;
const MAX_SCALE = 1.2;

interface HasAppearanceCount {
  appearanceCount: AppearanceCount;
}

/**
 * Compute the visual scale for a character card based on total appearance count
 * (episodeCount + mentionCount) relative to the faction's min/max.
 *
 * Linear mapping to [0.6, 1.4] range.
 * If all characters have the same count, returns 1.0.
 *
 * Requirements: 1.5
 */
export function computeScale(
  character: HasAppearanceCount,
  factionCharacters: HasAppearanceCount[]
): number {
  const total =
    character.appearanceCount.episodeCount +
    character.appearanceCount.mentionCount;

  const counts = factionCharacters.map(
    (c) => c.appearanceCount.episodeCount + c.appearanceCount.mentionCount
  );

  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);

  if (maxCount === minCount) return 1.0;

  const ratio = (total - minCount) / (maxCount - minCount);
  return MIN_SCALE + ratio * (MAX_SCALE - MIN_SCALE);
}
