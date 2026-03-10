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
  romantic: '❤️',
  family: '👨‍👩‍👧',
  master_apprentice: '🎓',
  colleague: '🤝',
  rivalry: '⚔️',
  friendship: '🫂',
  superior_subordinate: '📋',
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
        <div style={styles.title}>💕 关系面板</div>
        <div style={styles.empty}>暂无关系数据</div>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="cp-panel">
      <div style={styles.title}>💕 关系面板</div>
      <div style={styles.list}>
        {links.map((link) => {
          const id = linkId(link);
          const isSelected = selectedCPId === id;
          const isExpanded = expandedCPId === id;
          const name1 = getPersonaName(dataSet, link.source_persona_id);
          const name2 = getPersonaName(dataSet, link.target_persona_id);
          const typeLabel = LINK_TYPE_LABELS[link.type] ?? link.type;
          const typeIcon = LINK_TYPE_ICONS[link.type] ?? '🔗';

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
                  <span style={styles.typeIcon}>{typeIcon}</span>
                  <span style={styles.nameText}>{name1}</span>
                  <span style={styles.cross}>×</span>
                  <span style={styles.nameText}>{name2}</span>
                </div>
                <span style={styles.typeBadge}>
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
          <span style={styles.historyDot}>💗</span>
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
    padding: '16px 18px',
    borderRadius: 16,
    background: 'linear-gradient(135deg, #1a0a1e 0%, #2d1033 50%, #1a0a1e 100%)',
    border: '1px solid rgba(236, 72, 153, 0.25)',
    boxShadow: '0 4px 20px rgba(236, 72, 153, 0.1)',
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    color: '#f9a8d4',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 2,
    textShadow: '0 2px 8px rgba(236, 72, 153, 0.3)',
  },
  empty: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    padding: 12,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 320,
    overflowY: 'auto',
  },
  cpItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid rgba(255,255,255,0.06)',
    backdropFilter: 'blur(4px)',
  },
  cpItemSelected: {
    borderColor: 'rgba(244, 114, 182, 0.5)',
    background: 'rgba(236, 72, 153, 0.12)',
    boxShadow: '0 0 0 2px rgba(249, 168, 212, 0.3), 0 4px 12px rgba(236, 72, 153, 0.15)',
  },
  cpNames: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
  },
  typeIcon: {
    fontSize: 15,
  },
  nameText: {
    fontWeight: 700,
    color: '#f1f5f9',
  },
  cross: {
    color: '#d946ef',
    fontWeight: 800,
    fontSize: 13,
  },
  typeBadge: {
    fontSize: 10,
    padding: '3px 10px',
    borderRadius: 9999,
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    border: '1px solid rgba(249, 168, 212, 0.4)',
    backgroundColor: 'rgba(249, 168, 212, 0.15)',
    color: '#f9a8d4',
    letterSpacing: 0.5,
  },
  historyContainer: {
    padding: '10px 14px 10px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  historyEmpty: {
    padding: '8px 14px 8px 28px',
    fontSize: 12,
    color: '#6b7280',
  },
  historyItem: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
    padding: '8px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  historyDot: {
    fontSize: 12,
    marginTop: 2,
  },
  historyContent: {
    flex: 1,
  },
  historyDesc: {
    fontSize: 12,
    color: '#e2e8f0',
    lineHeight: 1.5,
  },
  historyMeta: {
    display: 'flex',
    gap: 8,
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
};
