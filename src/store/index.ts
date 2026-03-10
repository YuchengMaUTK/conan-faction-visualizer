import { create } from 'zustand';
import type {
  DataSet,
  TimePoint,
  FactionSnapshot,
  RelationshipState,
  SubFaction,
} from '../types';
import { parseData } from '../engines/data-store';
import { computeSnapshot } from '../engines/event-engine';
import { computeRelationships } from '../engines/relationship-engine';
import { convertTimePoint } from '../engines/timeline-utils';
import { search } from '../engines/search-engine';

/**
 * Clamp a TimePoint to the valid range defined by the DataSet.
 * - episode mode: clamp to [1, totalEpisodes]
 * - chapter mode: clamp to [1, totalChapters]
 * - date mode: clamp to [earliest mapping date, latest mapping date]
 */
function clampTimePoint(point: TimePoint, dataSet: DataSet): TimePoint {
  const result: TimePoint = {};

  if (point.episodeIndex !== undefined) {
    result.episodeIndex = Math.max(1, Math.min(point.episodeIndex, dataSet.metadata.totalEpisodes));
  }

  if (point.chapterIndex !== undefined) {
    result.chapterIndex = Math.max(1, Math.min(point.chapterIndex, dataSet.metadata.totalChapters));
  }

  if (point.publicationDate !== undefined) {
    const mappings = dataSet.episodeChapterMappings;
    if (mappings.length > 0) {
      const sorted = [...mappings].sort((a, b) => a.publicationDate.localeCompare(b.publicationDate));
      const earliest = sorted[0].publicationDate;
      const latest = sorted[sorted.length - 1].publicationDate;
      if (point.publicationDate < earliest) {
        result.publicationDate = earliest;
      } else if (point.publicationDate > latest) {
        result.publicationDate = latest;
      } else {
        result.publicationDate = point.publicationDate;
      }
    } else {
      result.publicationDate = point.publicationDate;
    }
  }

  return result;
}

export interface AppState {
  // Data
  dataSet: DataSet | null;
  loadingState: 'idle' | 'loading' | 'loaded' | 'error';
  loadError?: string;

  // Timeline
  timelineMode: 'episode' | 'chapter' | 'date';
  currentTimePoint: TimePoint;

  // Computed snapshots
  factionSnapshot: FactionSnapshot | null;
  relationshipStates: RelationshipState[];

  // UI state
  searchQuery: string;
  searchResults: string[];
  subFactionFilter: SubFaction | null;
  showRelationships: boolean;
  selectedCharacterId: string | null;
  selectedCPId: string | null;
  highlightedCharacterIds: Set<string>;
  selectedArcId: string | null;

  // Actions
  loadData: (url: string) => Promise<void>;
  setTimePoint: (point: TimePoint) => void;
  setTimelineMode: (mode: 'episode' | 'chapter' | 'date') => void;
  setSearchQuery: (query: string) => void;
  setSubFactionFilter: (filter: SubFaction | null) => void;
  toggleRelationships: () => void;
  selectCharacter: (id: string | null) => void;
  selectCP: (id: string | null) => void;
  selectArc: (arcId: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Data
  dataSet: null,
  loadingState: 'idle',
  loadError: undefined,

  // Timeline
  timelineMode: 'episode',
  currentTimePoint: {},

  // Computed snapshots
  factionSnapshot: null,
  relationshipStates: [],

  // UI state
  searchQuery: '',
  searchResults: [],
  subFactionFilter: null,
  showRelationships: false,
  selectedCharacterId: null,
  selectedCPId: null,
  highlightedCharacterIds: new Set<string>(),
  selectedArcId: null,

  loadData: async (url: string) => {
    set({ loadingState: 'loading', loadError: undefined });
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const json = await resp.text();
      const result = await parseData(json);

      if (!result.ok) {
        const msg = result.error.map((e) => `[${e.path}] ${e.message}`).join('\n');
        console.error('[Store] Validation errors:', result.error);
        set({ loadingState: 'error', loadError: msg });
        return;
      }

      const data = result.value;
      const latestTimePoint: TimePoint = {
        episodeIndex: data.metadata.totalEpisodes,
      };

      const snapshot = computeSnapshot(data, latestTimePoint);
      const relationships = computeRelationships(data, latestTimePoint);

      set({
        dataSet: data,
        loadingState: 'loaded',
        currentTimePoint: latestTimePoint,
        factionSnapshot: snapshot,
        relationshipStates: relationships,
      });
    } catch (err) {
      set({
        loadingState: 'error',
        loadError: (err as Error).message,
      });
    }
  },

  setTimePoint: (point: TimePoint) => {
    const { dataSet } = get();
    if (!dataSet) return;

    // Clamp time point to valid range
    const clamped = clampTimePoint(point, dataSet);

    // If the point only has publicationDate, convert to episodeIndex for snapshot computation
    // because computeSnapshot compares by episodeIndex/chapterIndex
    let snapshotPoint = clamped;
    if (clamped.publicationDate && !clamped.episodeIndex && !clamped.chapterIndex) {
      snapshotPoint = convertTimePoint(clamped, 'episode', dataSet.episodeChapterMappings);
    }

    const snapshot = computeSnapshot(dataSet, snapshotPoint);
    const relationships = computeRelationships(dataSet, snapshotPoint);

    // Re-apply search if active
    const { searchQuery } = get();
    let searchResults: string[] = [];
    if (searchQuery) {
      const allChars = [...snapshot.redFaction, ...snapshot.blackFaction];
      searchResults = search(allChars, searchQuery);
    }

    set({
      currentTimePoint: clamped,
      factionSnapshot: snapshot,
      relationshipStates: relationships,
      searchResults,
    });
  },

  setTimelineMode: (mode: 'episode' | 'chapter' | 'date') => {
    const { currentTimePoint, dataSet } = get();
    if (!dataSet) {
      set({ timelineMode: mode });
      return;
    }

    const converted = convertTimePoint(
      currentTimePoint,
      mode,
      dataSet.episodeChapterMappings
    );

    // For snapshot computation, always need episodeIndex or chapterIndex
    let snapshotPoint = converted;
    if (converted.publicationDate && !converted.episodeIndex && !converted.chapterIndex) {
      snapshotPoint = convertTimePoint(converted, 'episode', dataSet.episodeChapterMappings);
    }

    // Recompute snapshots at the converted time point
    const snapshot = computeSnapshot(dataSet, snapshotPoint);
    const relationships = computeRelationships(dataSet, snapshotPoint);

    set({
      timelineMode: mode,
      currentTimePoint: converted,
      factionSnapshot: snapshot,
      relationshipStates: relationships,
    });
  },

  setSearchQuery: (query: string) => {
    const { factionSnapshot } = get();
    if (!factionSnapshot) {
      set({ searchQuery: query, searchResults: [] });
      return;
    }

    const allChars = [
      ...factionSnapshot.redFaction,
      ...factionSnapshot.blackFaction,
    ];
    const results = search(allChars, query);

    set({ searchQuery: query, searchResults: results });
  },

  setSubFactionFilter: (filter: SubFaction | null) => {
    set({ subFactionFilter: filter });
  },

  toggleRelationships: () => {
    set((state) => ({ showRelationships: !state.showRelationships }));
  },

  selectCharacter: (id: string | null) => {
    set({
      selectedCharacterId: id,
      highlightedCharacterIds: id ? new Set([id]) : new Set<string>(),
    });
  },

  selectCP: (id: string | null) => {
    if (!id) {
      set({
        selectedCPId: null,
        highlightedCharacterIds: new Set<string>(),
      });
      return;
    }

    // Find the relationship to highlight both characters
    const { dataSet } = get();
    const rel = dataSet?.relationships.find((r) => r.id === id);
    const highlighted = rel
      ? new Set([rel.character1Id, rel.character2Id])
      : new Set<string>();

    set({
      selectedCPId: id,
      highlightedCharacterIds: highlighted,
    });
  },

  selectArc: (arcId: string | null) => {
    const { dataSet } = get();
    if (!arcId || !dataSet) {
      set({ selectedArcId: null });
      return;
    }

    const arc = dataSet.storyArcs.find((a) => a.id === arcId);
    if (!arc) {
      set({ selectedArcId: arcId });
      return;
    }

    // Jump to the arc's start time point based on current timeline mode
    const { timelineMode } = get();
    let point: TimePoint;
    if (timelineMode === 'chapter') {
      point = { chapterIndex: arc.startChapterIndex };
    } else if (timelineMode === 'date') {
      // Convert the arc's start episode to a date via mappings
      const converted = convertTimePoint(
        { episodeIndex: arc.startEpisodeIndex },
        'date',
        dataSet.episodeChapterMappings
      );
      point = converted;
    } else {
      point = { episodeIndex: arc.startEpisodeIndex };
    }

    const snapshot = computeSnapshot(dataSet, point.publicationDate && !point.episodeIndex && !point.chapterIndex
      ? convertTimePoint(point, 'episode', dataSet.episodeChapterMappings)
      : point);
    const relationships = computeRelationships(dataSet, point.publicationDate && !point.episodeIndex && !point.chapterIndex
      ? convertTimePoint(point, 'episode', dataSet.episodeChapterMappings)
      : point);

    set({
      selectedArcId: arcId,
      currentTimePoint: point,
      factionSnapshot: snapshot,
      relationshipStates: relationships,
    });
  },
}));
