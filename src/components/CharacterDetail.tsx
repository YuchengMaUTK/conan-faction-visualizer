import type { CharacterEvent, CharacterEventType, DataSet } from '../types';
import { getCharacterHistory } from '../engines/event-engine';

interface CharacterDetailProps {
  characterId: string;
  dataSet: DataSet;
  onClose: () => void;
}

const EVENT_TYPE_LABELS: Record<CharacterEventType, string> = {
  JOIN: '加入',
  LEAVE: '离开',
  DEATH: '牺牲',
  EXPOSED: '身份暴露',
  DEFECT: '叛变',
};

const EVENT_TYPE_ICONS: Record<CharacterEventType, string> = {
  JOIN: '🟢',
  LEAVE: '🔵',
  DEATH: '⚫',
  EXPOSED: '🟡',
  DEFECT: '🔴',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '活跃',
  LEFT: '已离开',
  DEAD: '已牺牲',
  EXPOSED: '身份暴露',
};

export default function CharacterDetail({
  characterId,
  dataSet,
  onClose,
}: CharacterDetailProps) {
  const character = dataSet.characters.find((c) => c.id === characterId);
  if (!character) return null;

  const events = getCharacterHistory(dataSet, characterId);

  // Compute current status from events
  let currentStatus = 'ACTIVE';
  for (const evt of events) {
    if (evt.type === 'DEATH') currentStatus = 'DEAD';
    else if (evt.type === 'LEAVE') currentStatus = 'LEFT';
    else if (evt.type === 'EXPOSED') currentStatus = 'EXPOSED';
    else if (evt.type === 'JOIN' || evt.type === 'DEFECT') currentStatus = 'ACTIVE';
  }

  return (
    <div style={styles.overlay} onClick={onClose} data-testid="character-detail-modal">
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${character.name} 角色详情`}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.avatarCircle}>{character.name.charAt(0)}</div>
          <div style={styles.headerInfo}>
            <div style={styles.name}>{character.name}</div>
            {character.codename && (
              <div style={styles.codename}>{character.codename}</div>
            )}
            <div style={styles.meta}>
              <span style={styles.factionBadge}>
                {character.faction === 'RED' ? '🔴 正义阵营' : '⚫ 黑衣组织'}
              </span>
              {character.subFaction && (
                <span style={styles.subFactionBadge}>{character.subFaction}</span>
              )}
              <span style={styles.statusBadge}>
                {STATUS_LABELS[currentStatus] ?? currentStatus}
              </span>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        {/* Dual identity info */}
        {character.isDualIdentity && character.dualIdentityInfo && (
          <div style={styles.dualIdentityBox}>
            <div style={styles.dualTitle}>🕵️ 双重身份</div>
            <div style={styles.dualRow}>
              <span style={styles.dualLabel}>
                {character.dualIdentityInfo.secondaryFaction === 'RED'
                  ? '正义阵营身份'
                  : '组织身份'}
                ：
              </span>
              <span style={styles.dualValue}>
                {character.dualIdentityInfo.secondaryName ?? character.name}
                {character.dualIdentityInfo.secondaryCodename &&
                  ` (${character.dualIdentityInfo.secondaryCodename})`}
              </span>
            </div>
            <div style={styles.dualRow}>
              <span style={styles.dualLabel}>
                {character.faction === 'RED' ? '正义阵营身份' : '组织身份'}：
              </span>
              <span style={styles.dualValue}>
                {character.name}
                {character.codename && ` (${character.codename})`}
              </span>
            </div>
          </div>
        )}

        {/* Event history */}
        <div style={styles.historySection}>
          <div style={styles.historyTitle}>📜 事件历史</div>
          {events.length === 0 ? (
            <div style={styles.noEvents}>暂无事件记录</div>
          ) : (
            <div style={styles.eventList}>
              {events.map((evt) => (
                <EventItem key={evt.id} event={evt} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventItem({ event }: { event: CharacterEvent }) {
  return (
    <div style={styles.eventItem} data-testid={`event-${event.id}`}>
      <span style={styles.eventIcon}>{EVENT_TYPE_ICONS[event.type]}</span>
      <div style={styles.eventContent}>
        <div style={styles.eventDesc}>{event.description}</div>
        <div style={styles.eventMeta}>
          <span style={styles.eventType}>{EVENT_TYPE_LABELS[event.type]}</span>
          {event.episodeIndex != null && <span>第{event.episodeIndex}集</span>}
          {event.chapterIndex != null && <span>第{event.chapterIndex}话</span>}
        </div>
      </div>
    </div>
  );
}


const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 500,
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 24,
    fontWeight: 700,
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1f2937',
  },
  codename: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  meta: {
    display: 'flex',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap' as const,
  },
  factionBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 9999,
    background: '#f3f4f6',
    fontWeight: 600,
  },
  subFactionBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 9999,
    background: '#ede9fe',
    color: '#7c3aed',
    fontWeight: 600,
  },
  statusBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 9999,
    background: '#ecfdf5',
    color: '#059669',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#9ca3af',
    padding: 4,
    lineHeight: 1,
  },
  dualIdentityBox: {
    padding: '12px 14px',
    borderRadius: 10,
    background: '#faf5ff',
    border: '1px solid #e9d5ff',
    marginBottom: 16,
  },
  dualTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#7c3aed',
    marginBottom: 8,
  },
  dualRow: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  dualLabel: {
    color: '#6b7280',
  },
  dualValue: {
    fontWeight: 600,
  },
  historySection: {
    marginTop: 4,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 10,
  },
  noEvents: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 12,
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  eventItem: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '8px 10px',
    borderRadius: 8,
    background: '#f9fafb',
  },
  eventIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventDesc: {
    fontSize: 13,
    color: '#1f2937',
    lineHeight: 1.4,
  },
  eventMeta: {
    display: 'flex',
    gap: 8,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 3,
  },
  eventType: {
    fontWeight: 600,
    color: '#4b5563',
  },
};
