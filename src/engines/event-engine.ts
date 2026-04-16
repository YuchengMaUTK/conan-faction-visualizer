import type {
  DataSet,
  TimePoint,
  FactionSnapshot,
  CharacterState,
  CharacterEvent,
  CharacterEventType,
  KeyEvent,
} from '../types';

/**
 * Compare an event's time against a TimePoint.
 * Returns true if the event occurs at or before the given timePoint.
 * Uses episodeIndex first, falls back to chapterIndex.
 */
function isEventBeforeOrAt(event: CharacterEvent, timePoint: TimePoint): boolean {
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
 * Check if an event occurs exactly at the given timePoint.
 */
function isEventAtExact(event: CharacterEvent, timePoint: TimePoint): boolean {
  if (timePoint.episodeIndex !== undefined && event.episodeIndex !== undefined) {
    return event.episodeIndex === timePoint.episodeIndex;
  }
  if (timePoint.chapterIndex !== undefined && event.chapterIndex !== undefined) {
    return event.chapterIndex === timePoint.chapterIndex;
  }
  return false;
}

/**
 * Sort events in chronological order by episodeIndex, then chapterIndex.
 */
function sortEventsChronologically(events: CharacterEvent[]): CharacterEvent[] {
  return [...events].sort((a, b) => {
    const aTime = a.episodeIndex ?? a.chapterIndex ?? 0;
    const bTime = b.episodeIndex ?? b.chapterIndex ?? 0;
    return aTime - bTime;
  });
}

/**
 * Derive the character status from an event type.
 */
function statusFromEventType(eventType: CharacterEventType): CharacterState['status'] {
  switch (eventType) {
    case 'JOIN':
    case 'DEFECT':
      return 'ACTIVE';
    case 'LEAVE':
      return 'LEFT';
    case 'DEATH':
      return 'DEAD';
    case 'EXPOSED':
      return 'EXPOSED';
  }
}

/**
 * Compute importance ranks within a faction list.
 * Higher base_appearances = lower rank number (rank 1 = most important).
 */
function assignImportanceRanks(states: CharacterState[]): void {
  const sorted = [...states].sort(
    (a, b) => b.base_appearances - a.base_appearances
  );
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].base_appearances < sorted[i - 1].base_appearances) {
      currentRank = i + 1;
    }
    // Find the original entry by persona_id (unique per CharacterState)
    const target = states.find(s => s.persona_id === sorted[i].persona_id);
    if (target) {
      target.importanceRank = currentRank;
    }
  }
}

/**
 * Compute a FactionSnapshot at the given timePoint.
 *
 * For each Entity:
 * 1. Gather all CharacterEvents for this entity (via entity_id)
 * 2. Filter to events at or before the timePoint, sort chronologically
 * 3. Compute cumulative status from events
 * 4. For each Persona of the Entity, create a CharacterState sharing the same status
 * 5. Assign each CharacterState to redFaction/blackFaction/otherFaction based on Persona's faction
 * 6. Compute importanceRank within each faction
 *
 * Requirements: 6.1-6.4
 */
export function computeSnapshot(data: DataSet, timePoint: TimePoint): FactionSnapshot {
  const redFaction: CharacterState[] = [];
  const blackFaction: CharacterState[] = [];
  const otherFaction: CharacterState[] = [];

  for (const entity of data.entities) {
    // Get all events for this entity that are at or before the timePoint
    const relevantEvents = sortEventsChronologically(
      data.characterEvents.filter(
        (e) => e.entity_id === entity.entity_id && isEventBeforeOrAt(e, timePoint)
      )
    );

    // Compute cumulative status by applying events in order
    // Entities with no events default to ACTIVE (they should still be displayed)
    let status: CharacterState['status'] = 'ACTIVE';
    for (const event of relevantEvents) {
      status = statusFromEventType(event.type);
    }

    // Check if there's an event at exactly the current timePoint
    const currentEvents = relevantEvents.filter((e) => isEventAtExact(e, timePoint));
    const hasCurrentEvent = currentEvents.length > 0;
    const currentEvent = hasCurrentEvent ? currentEvents[currentEvents.length - 1] : undefined;

    // For each Persona of this Entity, create a CharacterState
    // All Personas share the same event status (status sync)
    for (const persona of entity.personas) {
      const characterState: CharacterState = {
        entity_id: entity.entity_id,
        persona_id: persona.persona_id,
        name: persona.name,
        codename: persona.codename ?? undefined,
        avatar: persona.avatar,
        status,
        faction: persona.faction,
        sub_faction: persona.sub_faction,
        base_appearances: entity.base_appearances,
        importanceRank: 0, // will be assigned later
        hasCurrentEvent,
        currentEvent,
      };

      // Assign to the correct faction list based on Persona's faction
      if (persona.faction === 'RED') {
        redFaction.push(characterState);
      } else if (persona.faction === 'BLACK') {
        blackFaction.push(characterState);
      } else {
        otherFaction.push(characterState);
      }
    }
  }

  // Assign importance ranks within each faction
  assignImportanceRanks(redFaction);
  assignImportanceRanks(blackFaction);
  assignImportanceRanks(otherFaction);

  return { redFaction, blackFaction, otherFaction };
}

/**
 * Get the complete event history for a specific entity, in chronological order.
 * Uses entity_id instead of characterId.
 *
 * Requirements: 3.5
 */
export function getCharacterHistory(data: DataSet, entityId: string): CharacterEvent[] {
  const events = data.characterEvents.filter((e) => e.entity_id === entityId);
  return sortEventsChronologically(events);
}

/**
 * Get key events for the timeline.
 * Groups character events by their time point and generates KeyEvent entries.
 * Uses entity_id for grouping involved characters.
 *
 * Requirements: 7.1
 */
export function getKeyEvents(data: DataSet): KeyEvent[] {
  // Group character events by their time point (episodeIndex or chapterIndex)
  const timePointMap = new Map<string, CharacterEvent[]>();

  for (const event of data.characterEvents) {
    const key = `ep:${event.episodeIndex ?? 'none'}_ch:${event.chapterIndex ?? 'none'}`;
    const existing = timePointMap.get(key) ?? [];
    existing.push(event);
    timePointMap.set(key, existing);
  }

  const keyEvents: KeyEvent[] = [];

  for (const [, events] of timePointMap) {
    // Use entity_id for involved character IDs
    const involvedCharacterIds = [...new Set(events.map((e) => e.entity_id))];

    const title =
      events.length > 1
        ? `${events.length} 个角色事件`
        : events[0].description;

    const description = events.map((e) => e.description).join('；');

    const timePoint: TimePoint = {};
    if (events[0].episodeIndex !== undefined) {
      timePoint.episodeIndex = events[0].episodeIndex;
    }
    if (events[0].chapterIndex !== undefined) {
      timePoint.chapterIndex = events[0].chapterIndex;
    }

    keyEvents.push({
      timePoint,
      title,
      description,
      involvedCharacterIds,
      type: 'character',
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
