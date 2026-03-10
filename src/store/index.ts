import { create } from 'zustand';
import type {
  DataSet,
  TimePoint,
  FactionSnapshot,
  Link,
} from '../types';
import { parseData } from '../engines/data-store';
import { computeSnapshot } from '../engines/event-engine';
import { computeLinks } from '../engines/relationship-engine';
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
  links: (Link & { isCrossFaction: boolean })[];

  // UI state
  searchQuery: string;
  searchResults: string[]; // flattened persona IDs from SearchResult[]
  selectedCharacterId: string | null;
  selectedCPId: string | null;
  highlightedCharacterIds: Set<string>;
  selectedArcId: string | null;

  // Graph state
  godEyeMode: boolean;
  graphFactionFilters: Record<string, boolean>;

  // Actions
  loadData: (url: string) => Promise<void>;
  setTimePoint: (point: TimePoint) => void;
  setTimelineMode: (mode: 'episode' | 'chapter' | 'date') => void;
  setSearchQuery: (query: string) => void;
  selectCharacter: (id: string | null) => void;
  selectCP: (id: string | null) => void;
  selectArc: (arcId: string | null) => void;
  toggleGodEyeMode: () => void;
  setGraphFactionFilter: (key: string, value: boolean) => void;
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
  links: [],

  // UI state
  searchQuery: '',
  searchResults: [],
  selectedCharacterId: null,
  selectedCPId: null,
  highlightedCharacterIds: new Set<string>(),
  selectedArcId: null,

  // Graph state
  godEyeMode: false,
  graphFactionFilters: {
    RED: true,
    BLACK: true,
    OTHER: true,
    FBI: true,
    CIA: true,
    MI6: true,
    PSB: true,
    TOKYO_MPD: true,
    OSAKA_PD: true,
    NAGANO_PD: true,
    OTHER_PD: true,
    DETECTIVE_BOYS: true,
    DETECTIVE: true,
    BO_CORE: true,
    BO_OUTER: true,
    MAGIC_KAITO: true,
  },

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
      const computedLinks = computeLinks(data, latestTimePoint);

      set({
        dataSet: data,
        loadingState: 'loaded',
        currentTimePoint: latestTimePoint,
        factionSnapshot: snapshot,
        links: computedLinks,
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

    const clamped = clampTimePoint(point, dataSet);

    let snapshotPoint = clamped;
    if (clamped.publicationDate && !clamped.episodeIndex && !clamped.chapterIndex) {
      snapshotPoint = convertTimePoint(clamped, 'episode', dataSet.episodeChapterMappings);
    }

    const snapshot = computeSnapshot(dataSet, snapshotPoint);
    const computedLinks = computeLinks(dataSet, snapshotPoint);

    // Re-apply search if active
    const { searchQuery } = get();
    let searchResults: string[] = [];
    if (searchQuery) {
      const results = search(dataSet.entities, searchQuery);
      searchResults = results.flatMap((r) => r.matched_persona_ids);
    }

    set({
      currentTimePoint: clamped,
      factionSnapshot: snapshot,
      links: computedLinks,
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

    let snapshotPoint = converted;
    if (converted.publicationDate && !converted.episodeIndex && !converted.chapterIndex) {
      snapshotPoint = convertTimePoint(converted, 'episode', dataSet.episodeChapterMappings);
    }

    const snapshot = computeSnapshot(dataSet, snapshotPoint);
    const computedLinks = computeLinks(dataSet, snapshotPoint);

    set({
      timelineMode: mode,
      currentTimePoint: converted,
      factionSnapshot: snapshot,
      links: computedLinks,
    });
  },

  setSearchQuery: (query: string) => {
    const { dataSet } = get();
    if (!dataSet) {
      set({ searchQuery: query, searchResults: [] });
      return;
    }

    const results = search(dataSet.entities, query);
    const searchResults = results.flatMap((r) => r.matched_persona_ids);

    set({ searchQuery: query, searchResults });
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

    // Find the link to highlight both personas
    const { dataSet } = get();
    const link = dataSet?.links.find(
      (l) => `${l.source_persona_id}--${l.target_persona_id}` === id
    );
    const highlighted = link
      ? new Set([link.source_persona_id, link.target_persona_id])
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

    const { timelineMode } = get();
    let point: TimePoint;
    if (timelineMode === 'chapter') {
      point = { chapterIndex: arc.startChapterIndex };
    } else if (timelineMode === 'date') {
      const converted = convertTimePoint(
        { episodeIndex: arc.startEpisodeIndex },
        'date',
        dataSet.episodeChapterMappings
      );
      point = converted;
    } else {
      point = { episodeIndex: arc.startEpisodeIndex };
    }

    const snapshotPoint = point.publicationDate && !point.episodeIndex && !point.chapterIndex
      ? convertTimePoint(point, 'episode', dataSet.episodeChapterMappings)
      : point;

    const snapshot = computeSnapshot(dataSet, snapshotPoint);
    const computedLinks = computeLinks(dataSet, snapshotPoint);

    set({
      selectedArcId: arcId,
      currentTimePoint: point,
      factionSnapshot: snapshot,
      links: computedLinks,
    });
  },

  toggleGodEyeMode: () => {
    set((state) => ({ godEyeMode: !state.godEyeMode }));
  },

  setGraphFactionFilter: (key: string, value: boolean) => {
    set((state) => ({
      graphFactionFilters: { ...state.graphFactionFilters, [key]: value },
    }));
  },
}));
