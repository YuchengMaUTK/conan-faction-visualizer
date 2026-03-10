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
  const getArcDotColor = (name: string): string => {
    const orgKeywords = ['组织', '贝尔摩德', '赤与黑', '波本', '朗姆', 'FBI', '混沌'];
    const loveKeywords = ['伦敦', '修学旅行'];
    if (orgKeywords.some(k => name.includes(k))) return '#475569';
    if (loveKeywords.some(k => name.includes(k))) return '#f472b6';
    return '#ef4444';
  };

  return (
    <div style={styles.root} data-testid="arc-bookmark-bar">
      <span style={styles.label}>主线篇章</span>
      <div style={styles.chipContainer}>
        {storyArcs.map((arc) => {
          const isSelected = arc.id === selectedArcId;
          const dotColor = getArcDotColor(arc.name);
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
              <span style={{ ...styles.dot, background: isSelected ? '#0f172a' : dotColor }} />
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
    gap: 12,
    padding: '10px 16px',
    borderRadius: 14,
    background: 'linear-gradient(135deg, #1a1520 0%, #2d1f3d 100%)',
    border: '1px solid rgba(201, 168, 76, 0.25)',
    overflowX: 'auto',
    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: '#f5d680',
    whiteSpace: 'nowrap',
    letterSpacing: 1,
  },
  chipContainer: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 14px',
    borderRadius: 20,
    border: '1px solid rgba(201, 168, 76, 0.4)',
    background: 'rgba(255,255,255,0.05)',
    fontSize: 12,
    fontWeight: 600,
    color: '#d4b96a',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(4px)',
  },
  chipSelected: {
    background: 'linear-gradient(135deg, #c9a84c, #b8942e)',
    color: '#0f172a',
    borderColor: '#c9a84c',
    boxShadow: '0 2px 8px rgba(201, 168, 76, 0.4)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
};
