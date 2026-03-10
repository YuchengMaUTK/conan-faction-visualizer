import { useEffect, useMemo } from 'react';
import { useStore } from '../store';
import FactionPanel from './FactionPanel';
import CPPair from './CPPair';
import TimelineSlider from './TimelineSlider';
import ArcBookmarkBar from './ArcBookmarkBar';
import SearchBar from './SearchBar';
import CPPanel from './CPPanel';
import CharacterDetail from './CharacterDetail';
import ErrorBoundary from './ErrorBoundary';
import { getKeyEvents } from '../engines/event-engine';
import { getRelationshipKeyEvents } from '../engines/relationship-engine';

interface VisualizerProps {
  dataUrl: string;
}

/* ── Main Visualizer ── */

export default function Visualizer({ dataUrl }: VisualizerProps) {
  const {
    loadingState,
    loadError,
    dataSet,
    factionSnapshot,
    relationshipStates,
    highlightedCharacterIds,
    searchQuery,
    searchResults,
    subFactionFilter,
    showRelationships,
    selectedCharacterId,
    selectedCPId,
    timelineMode,
    currentTimePoint,
    selectedArcId,
    loadData,
    selectCharacter,
    selectCP,
    setTimePoint,
    setTimelineMode,
    setSearchQuery,
    setSubFactionFilter,
    selectArc,
    toggleRelationships,
  } = useStore();

  useEffect(() => {
    loadData(dataUrl);
  }, [dataUrl, loadData]);

  // Compute key events from data
  const keyEvents = useMemo(
    () => (dataSet ? getKeyEvents(dataSet) : []),
    [dataSet]
  );
  const relKeyEvents = useMemo(
    () => (dataSet ? getRelationshipKeyEvents(dataSet) : []),
    [dataSet]
  );

  if (loadingState === 'loading') {
    return <div style={styles.center}>⏳ 数据加载中...</div>;
  }

  if (loadingState === 'error') {
    return (
      <div style={styles.errorBox}>
        <p style={{ fontWeight: 600, margin: '0 0 8px' }}>❌ 数据加载失败</p>
        <pre style={styles.errorPre}>{loadError}</pre>
        <button style={styles.retryBtn} onClick={() => loadData(dataUrl)}>
          重试
        </button>
      </div>
    );
  }

  if (loadingState !== 'loaded' || !factionSnapshot || !dataSet) {
    return null;
  }

  // Check if there are cross-faction relationships to adjust spacing
  const hasCrossFactionRelationships =
    showRelationships &&
    relationshipStates.some((r) => r.isCrossFaction);

  return (
    <div style={styles.root}>
      {/* Arc Bookmark Bar */}
      <ErrorBoundary>
        <ArcBookmarkBar
          storyArcs={dataSet.storyArcs}
          selectedArcId={selectedArcId}
          onArcSelect={selectArc}
        />
      </ErrorBoundary>

      {/* Search Bar + Relationship Toggle */}
      <div style={styles.toolBar}>
        <ErrorBoundary>
          <SearchBar
            searchQuery={searchQuery}
            subFactionFilter={subFactionFilter}
            onSearchChange={setSearchQuery}
            onFilterChange={setSubFactionFilter}
          />
        </ErrorBoundary>
        <button
          data-testid="relationship-toggle"
          style={{
            ...styles.relToggle,
            ...(showRelationships ? styles.relToggleActive : {}),
          }}
          onClick={toggleRelationships}
        >
          {showRelationships ? '❤️ 隐藏情感关系' : '🤍 显示情感关系'}
        </button>
      </div>

      {/* Faction Panels with Relationship Overlay */}
      <PanelContainerWithOverlay
        factionSnapshot={factionSnapshot}
        relationshipStates={relationshipStates}
        highlightedCharacterIds={highlightedCharacterIds}
        searchQuery={searchQuery}
        searchResults={searchResults}
        subFactionFilter={subFactionFilter}
        showRelationships={showRelationships}
        hasCrossFactionRelationships={hasCrossFactionRelationships}
        selectCharacter={selectCharacter}
      />

      {/* Timeline Slider */}
      <ErrorBoundary>
        <TimelineSlider
          mode={timelineMode}
          currentPoint={currentTimePoint}
          totalEpisodes={dataSet.metadata.totalEpisodes}
          totalChapters={dataSet.metadata.totalChapters}
          keyEvents={keyEvents}
          relationshipEvents={relKeyEvents}
          storyArcs={dataSet.storyArcs}
          mappings={dataSet.episodeChapterMappings}
          onPointChange={setTimePoint}
          onModeChange={setTimelineMode}
        />
      </ErrorBoundary>

      {/* CP Panel */}
      <ErrorBoundary>
        <CPPanel
          relationshipStates={relationshipStates}
          dataSet={dataSet}
          selectedCPId={selectedCPId}
          onCPSelect={selectCP}
        />
      </ErrorBoundary>

      {/* Character Detail Modal */}
      {selectedCharacterId && (
        <CharacterDetail
          characterId={selectedCharacterId}
          dataSet={dataSet}
          onClose={() => selectCharacter(null)}
        />
      )}
    </div>
  );
}

/**
 * Extracted panel container with ref for RelationshipOverlay positioning.
 * When cross-faction relationships are shown, increases gap between panels.
 */
function PanelContainerWithOverlay({
  factionSnapshot,
  relationshipStates,
  highlightedCharacterIds,
  searchQuery,
  searchResults,
  subFactionFilter,
  showRelationships,
  hasCrossFactionRelationships,
  selectCharacter,
}: {
  factionSnapshot: NonNullable<ReturnType<typeof useStore>['factionSnapshot']>;
  relationshipStates: ReturnType<typeof useStore>['relationshipStates'];
  highlightedCharacterIds: ReturnType<typeof useStore>['highlightedCharacterIds'];
  searchQuery: string;
  searchResults: string[];
  subFactionFilter: ReturnType<typeof useStore>['subFactionFilter'];
  showRelationships: boolean;
  hasCrossFactionRelationships: boolean;
  selectCharacter: (id: string | null) => void;
}) {
  // Build character lookup for cross-faction pairs
  const allChars = [...factionSnapshot.redFaction, ...factionSnapshot.blackFaction];
  const charMap = new Map(allChars.map(c => [c.characterId, c]));
  const searchSet = searchQuery ? new Set(searchResults) : null;

  // Find cross-faction CP pairs
  const crossFactionPairs = showRelationships
    ? relationshipStates
        .filter(r => r.isCrossFaction)
        .map(rel => ({
          rel,
          c1: charMap.get(rel.character1Id),
          c2: charMap.get(rel.character2Id),
        }))
        .filter((p): p is { rel: typeof p.rel; c1: NonNullable<typeof p.c1>; c2: NonNullable<typeof p.c2> } => !!p.c1 && !!p.c2)
    : [];

  return (
    <div data-testid="panel-container">
      <div style={{ ...styles.panelContainer, position: 'relative' }}>
        <ErrorBoundary>
          <FactionPanel faction="red" characters={factionSnapshot.redFaction}
            relationships={relationshipStates} highlightedIds={highlightedCharacterIds}
            searchResults={searchQuery ? searchResults : undefined} subFactionFilter={subFactionFilter}
            showRelationships={showRelationships} onCharacterClick={(id) => selectCharacter(id)} />
        </ErrorBoundary>
        <ErrorBoundary>
          <FactionPanel faction="black" characters={factionSnapshot.blackFaction}
            relationships={relationshipStates} highlightedIds={highlightedCharacterIds}
            searchResults={searchQuery ? searchResults : undefined} subFactionFilter={subFactionFilter}
            showRelationships={showRelationships} onCharacterClick={(id) => selectCharacter(id)} />
        </ErrorBoundary>
      </div>

      {/* Cross-faction CP pairs */}
      {crossFactionPairs.length > 0 && (
        <div style={styles.crossFactionSection}>
          <div style={styles.crossFactionTitle}>💔 跨阵营情感关系</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
            {crossFactionPairs.map(({ rel, c1, c2 }) => (
              <CPPair key={rel.relationshipId} char1={c1} char2={c2} relationship={rel}
                allCharacters={allChars} highlightedIds={highlightedCharacterIds} searchSet={searchSet}
                onCharacterClick={(id) => selectCharacter(id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxWidth: 1400,
    margin: '0 auto',
  },
  center: {
    textAlign: 'center',
    padding: 40,
    fontSize: 18,
    color: '#64748b',
  },
  errorBox: {
    maxWidth: 600,
    margin: '24px auto',
    padding: 20,
    background: '#fef2f2',
    borderRadius: 12,
    border: '1px solid #fca5a5',
    color: '#991b1b',
  },
  errorPre: {
    fontSize: 13,
    whiteSpace: 'pre-wrap',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 12,
    padding: '8px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#dc2626',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  toolBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  relToggle: {
    padding: '6px 16px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    color: '#64748b',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
  },
  relToggleActive: {
    background: '#fdf2f8',
    borderColor: '#f9a8d4',
    color: '#be185d',
  },
  panelContainer: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
  },
  crossFactionSection: {
    marginTop: 16,
    padding: '16px 20px',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #fef2f2 0%, #f0f0ff 50%, #1a1a2e08 100%)',
    border: '1px dashed #d946ef',
  },
  crossFactionTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: '#a855f7',
    marginBottom: 12,
  },
};

// (placeholder styles removed - real components now used)
