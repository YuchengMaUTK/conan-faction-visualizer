import { useCallback } from 'react';
import type { StoryArc } from '../types';

export interface ArcBookmarkBarProps {
  storyArcs: StoryArc[];
  selectedArcId: string | null;
  onArcSelect: (arcId: string) => void;
}

export default function ArcBookmarkBar({
  storyArcs,
  selectedArcId,
  onArcSelect,
}: ArcBookmarkBarProps) {
  const handleClick = useCallback(
    (arcId: string) => {
      onArcSelect(arcId);
    },
    [onArcSelect]
  );

  if (storyArcs.length === 0) return null;

  // Classify arcs by theme for dot color
  return (
    <div style={styles.root} data-testid="arc-bookmark-bar">
      <style>{`.arc-chips::-webkit-scrollbar { display: none; } .arc-chips { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      <span style={styles.label}>主线篇章</span>
      <div className="arc-chips" style={styles.chipContainer}>
        {storyArcs.map((arc) => {
          const isSelected = arc.id === selectedArcId;
          return (
            <button
              key={arc.id}
              data-testid={`arc-chip-${arc.id}`}
              style={{
                ...styles.chip,
                ...(isSelected ? styles.chipSelected : {}),
              }}
              onClick={() => handleClick(arc.id)}
              title={arc.description}
            >
              <span style={{ ...styles.dot, background: isSelected ? 'rgba(255,255,255,0.5)' : '#62666d' }} />
              {arc.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 14px',
    borderRadius: 12,
    background: '#0f1011',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  label: {
    fontSize: 12,
    fontWeight: 510,
    color: '#8a8f98',
    whiteSpace: 'nowrap',
    letterSpacing: 0.5,
  },
  chipContainer: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    flexWrap: 'nowrap',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 12px',
    borderRadius: 9999,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'transparent',
    fontSize: 12,
    fontWeight: 510,
    color: '#d0d6e0',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  chipSelected: {
    background: '#5e6ad2',
    color: '#ffffff',
    borderColor: 'transparent',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
  },
};
