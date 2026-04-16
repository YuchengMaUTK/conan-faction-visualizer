import { useState, useMemo, useCallback } from 'react';
import type {
  TimePoint,
  KeyEvent,
  RelationshipKeyEvent,
  StoryArc,
  EpisodeChapterMapping,
} from '../types';

export interface TimelineSliderProps {
  mode: 'episode' | 'chapter' | 'date';
  currentPoint: TimePoint;
  totalEpisodes: number;
  totalChapters: number;
  keyEvents: KeyEvent[];
  relationshipEvents: RelationshipKeyEvent[];
  storyArcs: StoryArc[];
  mappings: EpisodeChapterMapping[];
  onPointChange: (point: TimePoint) => void;
  onModeChange: (mode: 'episode' | 'chapter' | 'date') => void;
}

function dateToMonths(date: string): number {
  const [y, m] = date.split('-');
  return (parseInt(y, 10) || 0) * 12 + (parseInt(m, 10) || 1);
}

function monthsToDate(months: number): string {
  const y = Math.floor((months - 1) / 12);
  const m = ((months - 1) % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function getSliderValue(point: TimePoint, mode: string): number {
  if (mode === 'episode') return point.episodeIndex ?? 1;
  if (mode === 'chapter') return point.chapterIndex ?? 1;
  if (mode === 'date') return point.publicationDate ? dateToMonths(point.publicationDate) : 0;
  return 1;
}

function getPositionPercent(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

interface MarkerInfo {
  position: number;
  icon: string;
  label: string;
  description: string;
  timePoint: TimePoint;
  kind: 'character' | 'relationship' | 'arc';
}

export default function TimelineSlider({
  mode,
  currentPoint,
  totalEpisodes,
  totalChapters,
  keyEvents,
  relationshipEvents,
  storyArcs,
  mappings,
  onPointChange,
  onModeChange,
}: TimelineSliderProps) {
  const [hoveredMarker, setHoveredMarker] = useState<MarkerInfo | null>(null);

  const { min, max } = useMemo(() => {
    if (mode === 'episode') return { min: 1, max: totalEpisodes || 1 };
    if (mode === 'chapter') return { min: 1, max: totalChapters || 1 };
    if (mappings.length === 0) return { min: 0, max: 0 };
    const months = mappings.map((m) => dateToMonths(m.publicationDate));
    return { min: Math.min(...months), max: Math.max(...months) };
  }, [mode, totalEpisodes, totalChapters, mappings]);

  const sliderValue = getSliderValue(currentPoint, mode);

  const dateTicks = useMemo(() => {
    if (mode !== 'date' || mappings.length === 0) return [];
    const months = mappings.map((m) => dateToMonths(m.publicationDate));
    const minM = Math.min(...months);
    const maxM = Math.max(...months);
    const ticks: { value: number; label: string; isMajor: boolean }[] = [];
    for (let m = minM; m <= maxM; m++) {
      const monthNum = ((m - 1) % 12) + 1;
      const year = Math.floor((m - 1) / 12);
      if (monthNum === 1) {
        ticks.push({ value: m, label: `${year}`, isMajor: true });
      }
    }
    return ticks;
  }, [mode, mappings]);

  const markers = useMemo<MarkerInfo[]>(() => {
    const result: MarkerInfo[] = [];
    for (const evt of keyEvents) {
      const val = getEventValue(evt.timePoint, mode, mappings);
      if (val === null) continue;
      result.push({ position: getPositionPercent(val, min, max), icon: '★', label: evt.title, description: evt.description, timePoint: evt.timePoint, kind: 'character' });
    }
    for (const evt of relationshipEvents) {
      const val = getEventValue(evt.timePoint, mode, mappings);
      if (val === null) continue;
      result.push({ position: getPositionPercent(val, min, max), icon: '♥', label: evt.title, description: evt.description, timePoint: evt.timePoint, kind: 'relationship' });
    }
    for (const arc of storyArcs) {
      const tp: TimePoint = { episodeIndex: arc.startEpisodeIndex, chapterIndex: arc.startChapterIndex };
      const val = getEventValue(tp, mode, mappings);
      if (val === null) continue;
      result.push({ position: getPositionPercent(val, min, max), icon: '●', label: arc.name, description: arc.description, timePoint: tp, kind: 'arc' });
    }
    return result;
  }, [keyEvents, relationshipEvents, storyArcs, mode, min, max, mappings]);

  // Thin out dense markers: only show if >2% apart, always show character/relationship events
  const visibleMarkers = useMemo(() => {
    if (markers.length === 0) return [];
    const sorted = [...markers].sort((a, b) => a.position - b.position);
    const result: MarkerInfo[] = [];
    let lastPos = -Infinity;
    for (const m of sorted) {
      if (m.kind !== 'arc' || m.position - lastPos >= 2) {
        result.push(m);
        lastPos = m.position;
      }
    }
    return result;
  }, [markers]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (mode === 'episode') onPointChange({ episodeIndex: val });
      else if (mode === 'chapter') onPointChange({ chapterIndex: val });
      else onPointChange({ publicationDate: monthsToDate(val) });
    },
    [mode, onPointChange]
  );

  const handleMarkerClick = useCallback(
    (marker: MarkerInfo) => {
      if (mode === 'episode') {
        const ep = marker.timePoint.episodeIndex;
        if (ep !== undefined) onPointChange({ episodeIndex: ep });
      } else if (mode === 'chapter') {
        const ch = marker.timePoint.chapterIndex;
        if (ch !== undefined) onPointChange({ chapterIndex: ch });
      } else {
        const val = getEventValue(marker.timePoint, 'date', mappings);
        if (val !== null) onPointChange({ publicationDate: monthsToDate(val) });
      }
    },
    [mode, mappings, onPointChange]
  );

  const displayValue = useMemo(() => {
    if (mode === 'episode') return `第 ${currentPoint.episodeIndex ?? '?'} 集`;
    if (mode === 'chapter') return `第 ${currentPoint.chapterIndex ?? '?'} 话`;
    return currentPoint.publicationDate ?? '?';
  }, [mode, currentPoint]);

  const modeLabels: Record<string, string> = { episode: '集数', chapter: '话数', date: '时间线' };

  return (
    <div style={styles.root} data-testid="timeline-slider">
      <style>{`
        input[type="range"][data-testid="timeline-range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, rgba(94,106,210,0.1), rgba(94,106,210,0.3));
          border-radius: 2px;
          outline: none;
          cursor: pointer;
          margin: 6px 0;
        }
        input[type="range"][data-testid="timeline-range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, #dc2626 0%, #dc2626 47%, #d1d5db 50%, #ffffff 53%, #ffffff 100%);
          border: 1.5px solid #374151;
          box-shadow: 
            0 2px 6px rgba(220, 38, 38, 0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: -5px;
        }
        input[type="range"][data-testid="timeline-range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 
            0 3px 10px rgba(220, 38, 38, 0.5),
            inset 0 1px 0 rgba(255,255,255,0.4);
        }
        input[type="range"][data-testid="timeline-range"]::-webkit-slider-thumb:active {
          transform: scale(1.05);
          box-shadow: 
            0 2px 6px rgba(220, 38, 38, 0.7),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }
        input[type="range"][data-testid="timeline-range"]::-moz-range-thumb {
          width: 28px;
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, #dc2626 0%, #dc2626 47%, #d1d5db 50%, #ffffff 53%, #ffffff 100%);
          border: 1.5px solid #374151;
          box-shadow: 
            0 2px 6px rgba(220, 38, 38, 0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        input[type="range"][data-testid="timeline-range"]::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 
            0 3px 10px rgba(220, 38, 38, 0.5),
            inset 0 1px 0 rgba(255,255,255,0.4);
        }
        input[type="range"][data-testid="timeline-range"]::-webkit-slider-runnable-track {
          background: linear-gradient(90deg, rgba(220, 38, 38, 0.08), rgba(94, 106, 210, 0.25));
          height: 4px;
          border-radius: 2px;
        }
        input[type="range"][data-testid="timeline-range"]::-moz-range-track {
          background: linear-gradient(90deg, rgba(220, 38, 38, 0.08), rgba(94, 106, 210, 0.25));
          height: 4px;
          border-radius: 2px;
          border: none;
        }
        .timeline-marker { opacity: 0.45; transition: opacity 0.15s ease; }
        .timeline-marker:hover { opacity: 1; }
      `}</style>
      <div style={styles.modeBar}>
        {(['episode', 'chapter', 'date'] as const).map((m) => (
          <button key={m} data-testid={`mode-btn-${m}`}
            style={{ ...styles.modeBtn, ...(mode === m ? styles.modeBtnActive : {}) }}
            onClick={() => onModeChange(m)}>
            {modeLabels[m]}
          </button>
        ))}
        <span style={styles.currentValue}>{displayValue}</span>
      </div>
      <div style={styles.trackContainer}>
        {mode === 'date' && dateTicks.map((tick, i) => (
          <div key={i} style={{ ...styles.tick, left: `${getPositionPercent(tick.value, min, max)}%`, height: tick.isMajor ? 14 : 8, background: tick.isMajor ? '#5e6ad2' : '#62666d' }}>
            <span style={{ ...styles.tickLabel, fontSize: tick.isMajor ? 10 : 8, fontWeight: tick.isMajor ? 700 : 400 }}>{tick.label}</span>
          </div>
        ))}
        {visibleMarkers.map((marker, i) => (
          <div key={`marker-${i}`} className="timeline-marker" style={{ ...styles.marker, left: `${Math.max(0, Math.min(100, marker.position))}%` }}
            onMouseEnter={() => setHoveredMarker(marker)} onMouseLeave={() => setHoveredMarker(null)}
            onClick={() => handleMarkerClick(marker)} data-testid={`marker-${marker.kind}`} title={marker.label}>
            <span style={{ ...styles.markerIcon, color: marker.kind === 'character' ? '#7170ff' : marker.kind === 'relationship' ? '#f472b6' : '#5e6ad2' }}>{marker.icon}</span>
          </div>
        ))}
        {hoveredMarker && (
          <div style={{ ...styles.tooltip, left: `${Math.max(5, Math.min(85, hoveredMarker.position))}%` }} data-testid="marker-tooltip">
            <div style={styles.tooltipTitle}><span style={{ color: hoveredMarker.kind === 'character' ? '#7170ff' : hoveredMarker.kind === 'relationship' ? '#f472b6' : '#5e6ad2' }}>{hoveredMarker.icon}</span> {hoveredMarker.label}</div>
            <div style={styles.tooltipDesc}>{hoveredMarker.description}</div>
          </div>
        )}
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={sliderValue} 
          onChange={handleSliderChange} 
          style={styles.slider} 
          data-testid="timeline-range"
          title="APTX-4869 时间胶囊 - 拖动改变时间点"
        />
      </div>
    </div>
  );
}

function getEventValue(tp: TimePoint, mode: string, mappings: EpisodeChapterMapping[]): number | null {
  if (mode === 'episode') {
    if (tp.episodeIndex !== undefined) return tp.episodeIndex;
    if (tp.chapterIndex !== undefined && mappings.length > 0) {
      let best = mappings[0]; let bestDist = Infinity;
      for (const m of mappings) { const d = Math.abs(m.chapterIndex - tp.chapterIndex); if (d < bestDist) { bestDist = d; best = m; } }
      return best.episodeIndex;
    }
    return null;
  }
  if (mode === 'chapter') {
    if (tp.chapterIndex !== undefined) return tp.chapterIndex;
    if (tp.episodeIndex !== undefined && mappings.length > 0) {
      let best = mappings[0]; let bestDist = Infinity;
      for (const m of mappings) { const d = Math.abs(m.episodeIndex - tp.episodeIndex); if (d < bestDist) { bestDist = d; best = m; } }
      return best.chapterIndex;
    }
    return null;
  }
  if (mode === 'date') {
    if (tp.publicationDate) return dateToMonths(tp.publicationDate);
    const idx = tp.episodeIndex ?? tp.chapterIndex;
    if (idx !== undefined && mappings.length > 0) {
      const field = tp.episodeIndex !== undefined ? 'episodeIndex' : 'chapterIndex';
      let best = mappings[0]; let bestDist = Infinity;
      for (const m of mappings) { const d = Math.abs((m as any)[field] - idx); if (d < bestDist) { bestDist = d; best = m; } }
      return dateToMonths(best.publicationDate);
    }
    return null;
  }
  return null;
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    padding: '12px 16px',
    borderRadius: 12,
    background: '#0f1011',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  modeBar: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 },
  modeBtn: {
    padding: '3px 12px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.08)',
    background: 'transparent', fontSize: 12, fontWeight: 510,
    cursor: 'pointer', color: '#8a8f98', transition: 'all 0.2s ease',
    fontFamily: "'Inter Variable', Inter, 'Noto Sans SC', system-ui, sans-serif",
  },
  modeBtnActive: {
    background: '#5e6ad2', color: '#ffffff',
    borderColor: '#5e6ad2',
  },
  currentValue: { marginLeft: 'auto', fontSize: 13, fontWeight: 510, color: '#7170ff', letterSpacing: 0 },
  trackContainer: { position: 'relative', height: 72, paddingTop: 24 },
  slider: { width: '100%', cursor: 'pointer' },
  tick: { position: 'absolute', bottom: 0, width: 1, transform: 'translateX(-50%)' },
  tickLabel: { position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', color: '#62666d' },
  marker: { position: 'absolute', top: 4, transform: 'translateX(-50%)', cursor: 'pointer', zIndex: 2, userSelect: 'none' },
  markerIcon: { fontSize: 8, lineHeight: 1 },
  tooltip: {
    position: 'absolute', top: -56, transform: 'translateX(-50%)',
    background: '#191a1b', color: '#f7f8f8',
    padding: '6px 10px', borderRadius: 8, fontSize: 12, zIndex: 10, maxWidth: 200,
    pointerEvents: 'none', whiteSpace: 'nowrap',
    border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  },
  tooltipTitle: { fontWeight: 590, marginBottom: 2, fontSize: 12 },
  tooltipDesc: { fontWeight: 400, opacity: 0.7, whiteSpace: 'normal', color: '#d0d6e0', fontSize: 11 },
};
