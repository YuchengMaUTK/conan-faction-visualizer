import { useEffect, useMemo } from 'react';
import { useStore } from '../store';
import ForceGraph from './ForceGraph';
import FactionFilterSidebar from './FactionFilterSidebar';
import GodEyeToggle from './GodEyeToggle';
import TimelineSlider from './TimelineSlider';
import ArcBookmarkBar from './ArcBookmarkBar';
import SearchBar from './SearchBar';
import CPPanel from './CPPanel';
import CharacterDetail from './CharacterDetail';
import ErrorBoundary from './ErrorBoundary';
import { getKeyEvents } from '../engines/event-engine';
import { getRelationshipKeyEvents } from '../engines/relationship-engine';
import { buildGraphData } from '../engines/graph-adapter';

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
    links,
    searchQuery,
    searchResults,
    selectedCharacterId,
    selectedCPId,
    timelineMode,
    currentTimePoint,
    selectedArcId,
    godEyeMode,
    graphFactionFilters,
    loadData,
    selectCharacter,
    selectCP,
    setTimePoint,
    setTimelineMode,
    setSearchQuery,
    selectArc,
    toggleGodEyeMode,
    setGraphFactionFilter,
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

  // Compute graph data from snapshot + links
  const graphData = useMemo(() => {
    if (!factionSnapshot || !dataSet) return null;
    return buildGraphData(
      factionSnapshot,
      links,
      dataSet.entities,
      godEyeMode,
      graphFactionFilters
    );
  }, [factionSnapshot, links, dataSet, godEyeMode, graphFactionFilters]);

  // Check if all faction filters are off
  const allFiltersOff = useMemo(
    () => Object.values(graphFactionFilters).every((v) => !v),
    [graphFactionFilters]
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

      {/* Search Bar (simplified — just the search input) */}
      <div style={styles.toolBar}>
        <ErrorBoundary>
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </ErrorBoundary>
      </div>

      {/* Main content: Sidebar + ForceGraph */}
      <div style={styles.mainContent}>
        {/* Left sidebar: FactionFilter + GodEyeToggle */}
        <div style={styles.sidebar}>
          <ErrorBoundary>
            <FactionFilterSidebar
              filters={graphFactionFilters}
              onFilterChange={setGraphFactionFilter}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <GodEyeToggle
              godEyeMode={godEyeMode}
              onToggle={toggleGodEyeMode}
            />
          </ErrorBoundary>
        </div>

        {/* Right: ForceGraph or empty state */}
        <div style={styles.graphArea}>
          {allFiltersOff ? (
            <div style={styles.emptyState} data-testid="filters-empty-state">
              <p style={styles.emptyStateText}>请至少选择一个阵营</p>
            </div>
          ) : graphData ? (
            <ErrorBoundary>
              <ForceGraph
                graphData={graphData}
                searchResults={searchResults}
                searchQuery={searchQuery}
                onNodeClick={(id) => selectCharacter(id)}
              />
            </ErrorBoundary>
          ) : null}
        </div>
      </div>

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
          links={links}
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
  mainContent: {
    display: 'flex',
    gap: 16,
    minHeight: 500,
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flexShrink: 0,
  },
  graphArea: {
    flex: 1,
    minWidth: 0,
  },
  emptyState: {
    width: '100%',
    height: '100%',
    minHeight: 500,
    background: '#0f172a',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 16,
  },
};
