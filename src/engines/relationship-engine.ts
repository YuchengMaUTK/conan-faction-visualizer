import type {
  DataSet,
  TimePoint,
  RelationshipState,
  RelationshipEvent,
  RelationshipKeyEvent,
  RomanticRelationship,
  RelationshipStatus,
} from '../types';

/**
 * Check if a RelationshipEvent occurs at or before the given timePoint.
 * Uses episodeIndex first, falls back to chapterIndex.
 */
function isRelEventBeforeOrAt(event: RelationshipEvent, timePoint: TimePoint): boolean {
  if (timePoint.episodeIndex !== undefined && event.episodeIndex !== undefined) {
    return event.episodeIndex <= timePoint.episodeIndex;
  }
  if (timePoint.chapterIndex !== undefined && event.chapterIndex !== undefined) {
    return event.chapterIndex <= timePoint.chapterIndex;
  }
  if (timePoint.episodeIndex !== undefined && event.chapterIndex !== undefined) {
    return false;
  }
  if (timePoint.chapterIndex !== undefined && event.episodeIndex !== undefined) {
    return false;
  }
  return false;
}

/**
 * Sort relationship events in chronological order by episodeIndex, then chapterIndex.
 */
function sortRelEventsChronologically(events: RelationshipEvent[]): RelationshipEvent[] {
  return [...events].sort((a, b) => {
    const aTime = a.episodeIndex ?? a.chapterIndex ?? 0;
    const bTime = b.episodeIndex ?? b.chapterIndex ?? 0;
    return aTime - bTime;
  });
}

/**
 * Determine if two characters belong to different factions.
 */
function checkCrossFaction(data: DataSet, char1Id: string, char2Id: string): boolean {
  const char1 = data.characters.find((c) => c.id === char1Id);
  const char2 = data.characters.find((c) => c.id === char2Id);
  if (!char1 || !char2) return false;
  return char1.faction !== char2.faction;
}

/**
 * Compute the state of all romantic relationships at the given timePoint.
 *
 * For each RomanticRelationship:
 * 1. Start with the initialStatus
 * 2. Apply all RelationshipEvents before (inclusive) the timePoint in chronological order
 * 3. The last applied event's newStatus becomes the cumulative status
 * 4. Mark isCrossFaction based on whether the two characters belong to different factions
 *
 * Requirements: 12.2
 */
export function computeRelationships(data: DataSet, timePoint: TimePoint): RelationshipState[] {
  return data.relationships.map((rel: RomanticRelationship) => {
    // Get all events for this relationship that are at or before the timePoint
    const relevantEvents = sortRelEventsChronologically(
      data.relationshipEvents.filter(
        (e) => e.relationshipId === rel.id && isRelEventBeforeOrAt(e, timePoint)
      )
    );

    // Start with initial status, then apply events in order
    let status: RelationshipStatus = rel.initialStatus;
    for (const event of relevantEvents) {
      status = event.newStatus;
    }

    return {
      relationshipId: rel.id,
      character1Id: rel.character1Id,
      character2Id: rel.character2Id,
      type: rel.type,
      status,
      isCrossFaction: checkCrossFaction(data, rel.character1Id, rel.character2Id),
      description: rel.description,
    };
  });
}

/**
 * Get the complete relationship event history for a specific CP, in chronological order.
 * No duplicates, no omissions.
 *
 * Requirements: 11.5
 */
export function getCPHistory(data: DataSet, relationshipId: string): RelationshipEvent[] {
  const events = data.relationshipEvents.filter((e) => e.relationshipId === relationshipId);
  return sortRelEventsChronologically(events);
}

/**
 * Get relationship key events for the timeline.
 * Each RelationshipEvent becomes a RelationshipKeyEvent with the involved characters.
 *
 * Requirements: 12.4
 */
export function getRelationshipKeyEvents(data: DataSet): RelationshipKeyEvent[] {
  // Build a lookup from relationship ID to the relationship definition
  const relMap = new Map(data.relationships.map((r) => [r.id, r]));

  const keyEvents: RelationshipKeyEvent[] = [];

  for (const event of data.relationshipEvents) {
    const rel = relMap.get(event.relationshipId);
    if (!rel) continue;

    const timePoint: TimePoint = {};
    if (event.episodeIndex !== undefined) {
      timePoint.episodeIndex = event.episodeIndex;
    }
    if (event.chapterIndex !== undefined) {
      timePoint.chapterIndex = event.chapterIndex;
    }

    keyEvents.push({
      timePoint,
      relationshipId: event.relationshipId,
      title: event.description,
      description: event.description,
      involvedCharacterIds: [rel.character1Id, rel.character2Id],
    });
  }

  // Sort by time
  keyEvents.sort((a, b) => {
    const aTime = a.timePoint.episodeIndex ?? a.timePoint.chapterIndex ?? 0;
    const bTime = b.timePoint.episodeIndex ?? b.timePoint.chapterIndex ?? 0;
    return aTime - bTime;
  });

  return keyEvents;
}
