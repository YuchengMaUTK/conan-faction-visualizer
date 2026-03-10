import type {
  DataSet,
  TimePoint,
  FactionSnapshot,
  CharacterState,
  CharacterEvent,
  CharacterEventType,
  KeyEvent,
  Character,
  AppearanceCount,
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
  // If timePoint uses publicationDate, we need to resolve via episodeIndex or chapterIndex
  // For publicationDate mode, caller should convert to episode/chapter first
  // Fallback: if event has episodeIndex and timePoint has chapterIndex (or vice versa), try the available one
  if (timePoint.episodeIndex !== undefined && event.chapterIndex !== undefined) {
    // Can't directly compare, but if event has no episodeIndex, skip it conservatively
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
 * Compute the total appearance count (episodeCount + mentionCount).
 */
function totalAppearance(ac: AppearanceCount): number {
  return ac.episodeCount + ac.mentionCount;
}

/**
 * Compute importance ranks within a faction list.
 * Higher appearance count = lower rank number (rank 1 = most important).
 */
function assignImportanceRanks(states: CharacterState[]): void {
  // Sort by total appearance descending
  const sorted = [...states].sort(
    (a, b) => totalAppearance(b.appearanceCount) - totalAppearance(a.appearanceCount)
  );
  // Assign ranks (1-based, ties get same rank)
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && totalAppearance(sorted[i].appearanceCount) < totalAppearance(sorted[i - 1].appearanceCount)) {
      currentRank = i + 1;
    }
    // Find the original entry and set its rank
    const target = states.find(s => s.characterId === sorted[i].characterId);
    if (target) {
      target.importanceRank = currentRank;
    }
  }
}

/**
 * Compute a FactionSnapshot at the given timePoint.
 *
 * For each character:
 * 1. Apply all CharacterEvents before (inclusive) the timePoint in chronological order
 * 2. Determine cumulative status
 * 3. For isDualIdentity characters, create entries in BOTH factions
 * 4. Compute importanceRank within each faction
 * 5. Set hasCurrentEvent if the character has an event at exactly the timePoint
 *
 * Requirements: 3.1, 3.2, 4.1, 4.4
 */
export function computeSnapshot(data: DataSet, timePoint: TimePoint): FactionSnapshot {
  const redFaction: CharacterState[] = [];
  const blackFaction: CharacterState[] = [];

  for (const character of data.characters) {
    // Get all events for this character that are at or before the timePoint
    const relevantEvents = sortEventsChronologically(
      data.characterEvents.filter(
        (e) => e.characterId === character.id && isEventBeforeOrAt(e, timePoint)
      )
    );

    // If no events at all, character hasn't appeared yet — skip
    if (relevantEvents.length === 0) continue;

    // Compute cumulative status by applying events in order
    let status: CharacterState['status'] = 'ACTIVE';
    for (const event of relevantEvents) {
      status = statusFromEventType(event.type);
    }

    // Check if there's an event at exactly the current timePoint
    const currentEvents = relevantEvents.filter((e) => isEventAtExact(e, timePoint));
    const hasCurrentEvent = currentEvents.length > 0;
    const currentEvent = hasCurrentEvent ? currentEvents[currentEvents.length - 1] : undefined;

    // Build the primary CharacterState
    const primaryState: CharacterState = {
      characterId: character.id,
      name: character.name,
      codename: character.codename ?? undefined,
      avatar: character.avatar,
      status,
      isDualIdentity: character.isDualIdentity,
      subFaction: character.subFaction,
      appearanceCount: { ...character.appearanceCount },
      importanceRank: 0, // will be assigned later
      hasCurrentEvent,
      currentEvent,
    };

    // Place in primary faction
    if (character.faction === 'RED') {
      redFaction.push(primaryState);
    } else {
      blackFaction.push(primaryState);
    }

    // Handle dual identity: create a secondary entry in the other faction
    if (character.isDualIdentity && character.dualIdentityInfo) {
      const dualInfo = character.dualIdentityInfo;
      const secondaryState: CharacterState = {
        characterId: character.id,
        name: dualInfo.secondaryName ?? character.name,
        codename: dualInfo.secondaryCodename ?? character.codename ?? undefined,
        avatar: character.avatar,
        status,
        isDualIdentity: true,
        appearanceCount: { ...character.appearanceCount },
        importanceRank: 0, // will be assigned later
        hasCurrentEvent,
        currentEvent,
      };

      if (dualInfo.secondaryFaction === 'RED') {
        redFaction.push(secondaryState);
      } else {
        blackFaction.push(secondaryState);
      }
    }
  }

  // Assign importance ranks within each faction
  assignImportanceRanks(redFaction);
  assignImportanceRanks(blackFaction);

  return { redFaction, blackFaction };
}

/**
 * Get the complete event history for a specific character, in chronological order.
 * No duplicates, no omissions.
 *
 * Requirements: 3.5
 */
export function getCharacterHistory(data: DataSet, characterId: string): CharacterEvent[] {
  const events = data.characterEvents.filter((e) => e.characterId === characterId);
  return sortEventsChronologically(events);
}

/**
 * Get key events for the timeline.
 * A key event is a timePoint where multiple character state changes occur,
 * or any significant character event that should be marked on the timeline.
 *
 * Requirements: 7.1
 */
export function getKeyEvents(data: DataSet): KeyEvent[] {
  // Group character events by their time point (episodeIndex or chapterIndex)
  const timePointMap = new Map<string, CharacterEvent[]>();

  for (const event of data.characterEvents) {
    // Create a key from the time coordinates
    const key = `ep:${event.episodeIndex ?? 'none'}_ch:${event.chapterIndex ?? 'none'}`;
    const existing = timePointMap.get(key) ?? [];
    existing.push(event);
    timePointMap.set(key, existing);
  }

  const keyEvents: KeyEvent[] = [];

  for (const [, events] of timePointMap) {
    // Mark as major event if multiple characters are involved
    const involvedCharacterIds = [...new Set(events.map((e) => e.characterId))];

    // Build a descriptive title
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
