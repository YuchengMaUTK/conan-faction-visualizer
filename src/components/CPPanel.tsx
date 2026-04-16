import { useState } from 'react';
import type { Link, RelationshipEvent, DataSet, I18nName, LinkType } from '../types';
import { getCPHistory } from '../engines/relationship-engine';

interface CPPanelProps {
  links: (Link & { isCrossFaction: boolean })[];
  dataSet: DataSet;
  selectedCPId: string | null;
  onCPSelect: (id: string | null) => void;
}

const LINK_TYPE_ICONS: Record<LinkType, string> = {
  romantic: '●',
  family: '●',
  master_apprentice: '●',
  colleague: '●',
  rivalry: '●',
  friendship: '●',
  superior_subordinate: '●',
};

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  romantic: '恋爱',
  family: '家人',
  master_apprentice: '师徒',
  colleague: '同事',
  rivalry: '对手',
  friendship: '友情',
  superior_subordinate: '上下级',
};

const LINK_TYPE_COLORS: Record<LinkType, string> = {
  romantic: '#ec4899',
  family: '#f59e0b',
  master_apprentice: '#5e6ad2',
  colleague: '#22c55e',
  rivalry: '#ef4444',
  friendship: '#7170ff',
  superior_subordinate: '#8a8f98',
};

/** Get display name from I18nName: prefer zh, fallback to en */
function getDisplayName(name: I18nName): string {
  return name.zh || name.en;
}

/** Look up a persona's display name from entities */
function getPersonaName(dataSet: DataSet, personaId: string): string {
  for (const entity of dataSet.entities) {
    for (const persona of entity.personas) {
      if (persona.persona_id === personaId) {
        return getDisplayName(persona.name);
      }
    }
  }
  return personaId;
}

/** Generate a stable ID for a link (links don't have explicit IDs) */
function linkId(link: Link): string {
  return `${link.source_persona_id}--${link.target_persona_id}`;
}

export default function CPPanel({
  links,
  dataSet,
  selectedCPId,
  onCPSelect,
}: CPPanelProps) {
  const [expandedCPId, setExpandedCPId] = useState<string | null>(null);

  const handleCPClick = (id: string) => {
    setExpandedCPId((prev) => (prev === id ? null : id));
    onCPSelect(id === selectedCPId ? null : id);
  };

  const getHistory = (relationshipId: string): RelationshipEvent[] => {
    return getCPHistory(dataSet, relationshipId);
  };

  if (links.length === 0) {
    return (
      <div style={styles.container} data-testid="cp-panel">
        <div style={styles.title}>关系面板</div>
        <div style={styles.empty}>暂无关系数据</div>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="cp-panel">
      <div style={styles.title}>关系面板</div>
      <div style={styles.list}>
        {links.map((link) => {
          const id = linkId(link);
          const isSelected = selectedCPId === id;
          const isExpanded = expandedCPId === id;
          const name1 = getPersonaName(dataSet, link.source_persona_id);
          const name2 = getPersonaName(dataSet, link.target_persona_id);
          const typeLabel = LINK_TYPE_LABELS[link.type] ?? link.type;
          const typeIcon = LINK_TYPE_ICONS[link.type] ?? '●';
          const typeColor = LINK_TYPE_COLORS[link.type] ?? '#8a8f98';

          return (
            <div key={id}>
              <div
                style={{
                  ...styles.cpItem,
                  ...(isSelected ? styles.cpItemSelected : {}),
                }}
                onClick={() => handleCPClick(id)}
                data-testid={`cp-item-${id}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleCPClick(id);
                }}
              >
                <div style={styles.cpNames}>
                  <span style={{ ...styles.typeIcon, color: typeColor }}>{typeIcon}</span>
                  <span style={styles.nameText}>{name1}</span>
                  <span style={styles.cross}>×</span>
                  <span style={styles.nameText}>{name2}</span>
                </div>
                <span style={{ ...styles.typeBadge, backgroundColor: `${typeColor}26`, color: typeColor, borderColor: 'transparent' }}>
                  {typeLabel}
                </span>
              </div>

              {isExpanded && (
                <CPEventHistory events={getHistory(id)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CPEventHistory({ events }: { events: RelationshipEvent[] }) {
  if (events.length === 0) {
    return (
      <div style={styles.historyEmpty}>暂无关系事件记录</div>
    );
  }

  return (
    <div style={styles.historyContainer} data-testid="cp-event-history">
      {events.map((evt) => (
        <div key={evt.id} style={styles.historyItem}>
          <span style={styles.historyDot}>●</span>
          <div style={styles.historyContent}>
            <div style={styles.historyDesc}>{evt.description}</div>
            <div style={styles.historyMeta}>
              {evt.episodeIndex != null && <span>第{evt.episodeIndex}集</span>}
              {evt.chapterIndex != null && <span>第{evt.chapterIndex}话</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '14px 16px',
    borderRadius: 12,
    background: '#0f1011',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 14,
    fontWeight: 510,
    color: '#d0d6e0',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0,
  },
  empty: {
    fontSize: 13,
    color: '#62666d',
    textAlign: 'center',
    padding: 12,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    maxHeight: 320,
    overflowY: 'auto',
  },
  cpItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 12px',
    borderRadius: 0,
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  cpItemSelected: {
    background: 'rgba(94,106,210,0.1)',
  },
  cpNames: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
  },
  typeIcon: {
    fontSize: 6,
  },
  nameText: {
    fontWeight: 510,
    color: '#f7f8f8',
  },
  cross: {
    color: '#62666d',
    fontWeight: 510,
    fontSize: 12,
  },
  typeBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 9999,
    fontWeight: 510,
    whiteSpace: 'nowrap' as const,
    border: '1px solid transparent',
    letterSpacing: 0.3,
  },
  historyContainer: {
    padding: '8px 12px 8px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  historyEmpty: {
    padding: '6px 12px 6px 24px',
    fontSize: 12,
    color: '#62666d',
  },
  historyItem: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
    padding: '6px 10px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.02)',
  },
  historyDot: {
    fontSize: 6,
    marginTop: 5,
    color: '#62666d',
  },
  historyContent: {
    flex: 1,
  },
  historyDesc: {
    fontSize: 12,
    color: '#f7f8f8',
    lineHeight: 1.5,
  },
  historyMeta: {
    display: 'flex',
    gap: 8,
    fontSize: 11,
    color: '#8a8f98',
    marginTop: 3,
  },
};
