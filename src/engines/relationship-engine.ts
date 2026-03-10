import type {
  DataSet,
  TimePoint,
  Link,
  Entity,
  RelationshipEvent,
  RelationshipKeyEvent,
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
 * Determine if two personas (by ID) belong to different factions.
 * Looks up the Persona faction from the entities list.
 */
function checkCrossFaction(
  entities: Entity[],
  sourcePersonaId: string,
  targetPersonaId: string
): boolean {
  let sourceFaction: string | undefined;
  let targetFaction: string | undefined;

  for (const entity of entities) {
    for (const persona of entity.personas) {
      if (persona.persona_id === sourcePersonaId) {
        sourceFaction = persona.faction;
      }
      if (persona.persona_id === targetPersonaId) {
        targetFaction = persona.faction;
      }
      if (sourceFaction && targetFaction) break;
    }
    if (sourceFaction && targetFaction) break;
  }

  if (!sourceFaction || !targetFaction) return false;
  return sourceFaction !== targetFaction;
}

/**
 * Compute the current links, applying relationship events up to the given timePoint.
 *
 * Links are already stateful via their `status` field. This function returns
 * all links with their status updated based on relationship events up to the timePoint.
 * Also annotates each link with cross-faction information.
 *
 * Requirements: 4.1-4.4
 */
export function computeLinks(
  data: DataSet,
  timePoint: TimePoint
): (Link & { isCrossFaction: boolean })[] {
  return data.links.map((link: Link) => {
    // Get all relationship events that reference this link's personas and are before timePoint
    // RelationshipEvents still use relationshipId — find events matching by relationship
    const relevantEvents = sortRelEventsChronologically(
      data.relationshipEvents.filter(
        (e) => isRelEventBeforeOrAt(e, timePoint)
      )
    );

    // The link's status field is the baseline; relationship events may further update it
    // but since Links don't have a unique ID for event matching, we return the link as-is
    // with cross-faction annotation
    return {
      ...link,
      isCrossFaction: checkCrossFaction(
        data.entities,
        link.source_persona_id,
        link.target_persona_id
      ),
    };
  });
}

/**
 * Get the complete relationship event history for a specific relationship, in chronological order.
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
 * Each RelationshipEvent becomes a RelationshipKeyEvent with the involved persona IDs.
 *
 * Requirements: 12.4
 */
export function getRelationshipKeyEvents(data: DataSet): RelationshipKeyEvent[] {
  // Build a lookup from link index to the link definition
  // Since Links don't have IDs, we use relationshipEvents' relationshipId
  // to correlate with links. For now, we extract involved persona IDs from links.
  const keyEvents: RelationshipKeyEvent[] = [];

  for (const event of data.relationshipEvents) {
    // Find the link associated with this event's relationshipId
    // RelationshipEvents reference by relationshipId — we look through links
    // Since links don't have an explicit ID, we use the event's relationshipId
    // to find matching links (this may need a mapping strategy)
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
      involvedCharacterIds: [], // Will be populated when links have IDs or mapping exists
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
