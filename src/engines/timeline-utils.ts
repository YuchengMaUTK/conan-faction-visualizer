import type { TimePoint, EpisodeChapterMapping } from '../types';

/**
 * Find the nearest mapping entry by a numeric index field.
 */
function findNearestMapping(
  value: number,
  field: 'episode' | 'chapter',
  mappings: EpisodeChapterMapping[]
): EpisodeChapterMapping {
  if (mappings.length === 0) {
    throw new Error('No mappings available');
  }

  let best = mappings[0];
  let bestDist = Infinity;

  for (const m of mappings) {
    const mValue = field === 'episode' ? m.episodeIndex : m.chapterIndex;
    const dist = Math.abs(mValue - value);
    if (dist < bestDist) {
      bestDist = dist;
      best = m;
    }
  }

  return best;
}

/**
 * Find the nearest mapping entry by publication date string (YYYY-MM).
 */
function findNearestMappingByDate(
  date: string,
  mappings: EpisodeChapterMapping[]
): EpisodeChapterMapping {
  if (mappings.length === 0) {
    throw new Error('No mappings available');
  }

  let best = mappings[0];
  let bestDist = Infinity;

  for (const m of mappings) {
    const dist = Math.abs(dateToMonths(m.publicationDate) - dateToMonths(date));
    if (dist < bestDist) {
      bestDist = dist;
      best = m;
    }
  }

  return best;
}

/**
 * Convert a YYYY-MM date string to a comparable numeric value (total months).
 */
function dateToMonths(date: string): number {
  const [yearStr, monthStr] = date.split('-');
  const year = parseInt(yearStr, 10) || 0;
  const month = parseInt(monthStr, 10) || 1;
  return year * 12 + month;
}

/**
 * Convert a TimePoint from its current mode to a target mode using
 * the nearest mapping entry to preserve story position.
 *
 * Supports episode, chapter, date mode conversion.
 *
 * Requirements: 2.7
 */
export function convertTimePoint(
  current: TimePoint,
  targetMode: 'episode' | 'chapter' | 'date',
  mappings: EpisodeChapterMapping[]
): TimePoint {
  if (mappings.length === 0) return current;

  if (targetMode === 'episode') {
    if (current.episodeIndex !== undefined) return { episodeIndex: current.episodeIndex };
    if (current.chapterIndex !== undefined) {
      const nearest = findNearestMapping(current.chapterIndex, 'chapter', mappings);
      return { episodeIndex: nearest.episodeIndex };
    }
    if (current.publicationDate !== undefined) {
      const nearest = findNearestMappingByDate(current.publicationDate, mappings);
      return { episodeIndex: nearest.episodeIndex };
    }
  }

  if (targetMode === 'chapter') {
    if (current.chapterIndex !== undefined) return { chapterIndex: current.chapterIndex };
    if (current.episodeIndex !== undefined) {
      const nearest = findNearestMapping(current.episodeIndex, 'episode', mappings);
      return { chapterIndex: nearest.chapterIndex };
    }
    if (current.publicationDate !== undefined) {
      const nearest = findNearestMappingByDate(current.publicationDate, mappings);
      return { chapterIndex: nearest.chapterIndex };
    }
  }

  if (targetMode === 'date') {
    if (current.publicationDate !== undefined) return { publicationDate: current.publicationDate };
    if (current.episodeIndex !== undefined) {
      const nearest = findNearestMapping(current.episodeIndex, 'episode', mappings);
      return { publicationDate: nearest.publicationDate };
    }
    if (current.chapterIndex !== undefined) {
      const nearest = findNearestMapping(current.chapterIndex, 'chapter', mappings);
      return { publicationDate: nearest.publicationDate };
    }
  }

  return current;
}
