import { useState } from 'react';
import type { RelationshipState, RelationshipEvent, RelationshipType, RelationshipStatus, DataSet } from '../types';
import { getCPHistory } from '../engines/relationship-engine';

interface CPPanelProps {
  relationshipStates: RelationshipState[];
  dataSet: DataSet;
  selectedCPId: string | null;
  onCPSelect: (id: string | null) => void;
}

const TYPE_ICONS: Record<RelationshipType, string> = {
  LOVE: '❤️',
  CRUSH: '💭',
  MARRIED: '💍',
  CHILDHOOD_SWEETHEART: '🌸',
  AMBIGUOUS: '❓',
};

const STATUS_LABELS: Record<RelationshipStatus, string> = {
  UNCONFESSED: '未表白',
  CONFESSED: '已表白',
  DATING: '交往中',
  CONFIRMED: '已确认',
  SEPARATED: '已分离',
};

const STATUS_COLORS: Record<RelationshipStatus, string> = {
  DATING: '#ec4899',
  CONFIRMED: '#ec4899',
  UNCONFESSED: '#9ca3af',
  CONFESSED: '#ef4444',
  SEPARATED: '#4b5563',
};

function getCharacterName(dataSet: DataSet, charId: string): string {
  const char = dataSet.characters.find((c) => c.id === charId);
  return char?.name ?? charId;
}

export default function CPPanel({
  relationshipStates,
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

  if (relationshipStates.length === 0) {
    return (
      <div style={styles.container} data-testid="cp-panel">
        <div style={styles.title}>💕 CP 面板</div>
        <div style={styles.empty}>暂无情感关系数据</div>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="cp-panel">
      <div style={styles.title}>💕 CP 面板</div>
      <div style={styles.list}>
        {relationshipStates.map((rel) => {
          const isSelected = selectedCPId === rel.relationshipId;
          const isExpanded = expandedCPId === rel.relationshipId;
          const name1 = getCharacterName(dataSet, rel.character1Id);
          const name2 = getCharacterName(dataSet, rel.character2Id);
          const statusColor = STATUS_COLORS[rel.status];

          return (
            <div key={rel.relationshipId}>
              <div
                style={{
                  ...styles.cpItem,
                  ...(isSelected ? styles.cpItemSelected : {}),
                }}
                onClick={() => handleCPClick(rel.relationshipId)}
                data-testid={`cp-item-${rel.relationshipId}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleCPClick(rel.relationshipId);
                }}
              >
                <div style={styles.cpNames}>
                  <span style={styles.typeIcon}>{TYPE_ICONS[rel.type]}</span>
                  <span style={styles.nameText}>{name1}</span>
                  <span style={styles.cross}>×</span>
                  <span style={styles.nameText}>{name2}</span>
                </div>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: statusColor + '20',
                    color: statusColor,
                    borderColor: statusColor + '40',
                  }}
                >
                  {STATUS_LABELS[rel.status]}
                </span>
              </div>

              {isExpanded && (
                <CPEventHistory events={getHistory(rel.relationshipId)} />
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
              <span style={{
                ...styles.historyStatus,
                color: STATUS_COLORS[evt.newStatus],
              }}>
                → {STATUS_LABELS[evt.newStatus]}
              </span>
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
  statusBadge: {
    fontSize: 10,
    padding: '3px 10px',
    borderRadius: 9999,
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    border: '1px solid',
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
  historyStatus: {
    fontWeight: 700,
  },
};
