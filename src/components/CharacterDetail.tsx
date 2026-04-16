import type { CharacterEvent, CharacterEventType, DataSet, Entity, I18nName, Faction } from '../types';
import { getCharacterHistory } from '../engines/event-engine';

interface CharacterDetailProps {
  /** Can be an entity_id or persona_id — we resolve to the Entity */
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

const EVENT_TYPE_COLORS: Record<CharacterEventType, string> = {
  JOIN: '#22c55e',
  LEAVE: '#5e6ad2',
  DEATH: '#6b7280',
  EXPOSED: '#f59e0b',
  DEFECT: '#ef4444',
};

const FACTION_LABELS: Record<Faction, string> = {
  RED: '正义阵营',
  BLACK: '黑衣组织',
  OTHER: '其他',
};

const FACTION_DOT_COLORS: Record<Faction, string> = {
  RED: '#dc2626',
  BLACK: '#475569',
  OTHER: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  alive: '存活',
  dead: '已故',
  unknown: '未知',
  shrunk: '缩小状态',
  missing: '失踪',
};

/** Get display name from I18nName: prefer zh, fallback to en */
function getDisplayName(name: I18nName): string {
  return name.zh || name.en;
}

/** Find Entity by entity_id or persona_id */
function findEntity(dataSet: DataSet, id: string): Entity | undefined {
  // Try entity_id first
  const byEntity = dataSet.entities.find((e) => e.entity_id === id);
  if (byEntity) return byEntity;
  // Try persona_id
  return dataSet.entities.find((e) =>
    e.personas.some((p) => p.persona_id === id)
  );
}

export default function CharacterDetail({
  characterId,
  dataSet,
  onClose,
}: CharacterDetailProps) {
  const entity = findEntity(dataSet, characterId);
  if (!entity) return null;

  const events = getCharacterHistory(dataSet, entity.entity_id);

  return (
    <div style={styles.overlay} onClick={onClose} data-testid="character-detail-modal">
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${getDisplayName(entity.true_name)} 角色详情`}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.avatarCircle}>
            {getDisplayName(entity.true_name).charAt(0)}
          </div>
          <div style={styles.headerInfo}>
            <div style={styles.name}>{getDisplayName(entity.true_name)}</div>
            {entity.true_name.en !== (entity.true_name.zh ?? '') && (
              <div style={styles.subName}>{entity.true_name.en}</div>
            )}
            {entity.true_name.ja && (
              <div style={styles.subName}>{entity.true_name.ja}</div>
            )}
            <div style={styles.meta}>
              <span style={styles.statusBadge}>
                {STATUS_LABELS[entity.status] ?? entity.status}
              </span>
              {entity.gender && (
                <span style={styles.genderBadge}>
                  {entity.gender === 'male' ? '♂' : entity.gender === 'female' ? '♀' : '?'}
                </span>
              )}
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        {/* Personas list */}
        <div style={styles.personasSection}>
          <div style={styles.sectionTitle}>身份列表</div>
          <div style={styles.personasList}>
            {entity.personas.map((persona) => (
              <div key={persona.persona_id} style={styles.personaCard}>
                <div style={styles.personaHeader}>
                  <span style={styles.personaName}>
                    {getDisplayName(persona.name)}
                  </span>
                  {persona.codename && (
                    <span style={styles.codename}>「{persona.codename}」</span>
                  )}
                  {persona.is_default_display && (
                    <span style={styles.defaultBadge}>默认</span>
                  )}
                </div>
                <div style={styles.personaMeta}>
                  <span style={styles.factionBadge}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: FACTION_DOT_COLORS[persona.faction], marginRight: 4, verticalAlign: 'middle' }} />
                    {FACTION_LABELS[persona.faction]}
                  </span>
                  {persona.sub_faction && (
                    <span style={styles.subFactionBadge}>{persona.sub_faction}</span>
                  )}
                </div>
                {persona.description && (
                  <div style={styles.personaDesc}>
                    {getDisplayName(persona.description)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Entity info */}
        <div style={styles.infoSection}>
          {entity.nicknames && entity.nicknames.length > 0 && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>昵称：</span>
              <span style={styles.infoValue}>
                {entity.nicknames.map((n) => getDisplayName(n)).join('、')}
              </span>
            </div>
          )}
          {entity.voice_actors && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>声优：</span>
              <span style={styles.infoValue}>
                {entity.voice_actors.ja && `日: ${entity.voice_actors.ja}`}
                {entity.voice_actors.ja && entity.voice_actors.en && ' / '}
                {entity.voice_actors.en && `英: ${entity.voice_actors.en}`}
              </span>
            </div>
          )}
          {entity.first_appearance && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>首次登场：</span>
              <span style={styles.infoValue}>
                {entity.first_appearance.manga_file != null && `漫画 File ${entity.first_appearance.manga_file}`}
                {entity.first_appearance.manga_file != null && entity.first_appearance.anime_episode != null && ' / '}
                {entity.first_appearance.anime_episode != null && `动画第${entity.first_appearance.anime_episode}集`}
              </span>
            </div>
          )}
          {entity.wiki_url && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Wiki：</span>
              <a href={entity.wiki_url} target="_blank" rel="noopener noreferrer" style={styles.wikiLink}>
                查看 Wiki 页面 ↗
              </a>
            </div>
          )}
        </div>

        {/* Event history */}
        <div style={styles.historySection}>
          <div style={styles.sectionTitle}>事件历史</div>
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
      <span style={{ ...styles.eventIcon, display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: EVENT_TYPE_COLORS[event.type], marginTop: 5 }} />
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
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.15s ease',
  },
  modal: {
    background: '#191a1b',
    borderRadius: 12,
    padding: 24,
    maxWidth: 520,
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
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
    background: '#5e6ad2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 24,
    fontWeight: 590,
    flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.1)',
  },
  headerInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: 590, color: '#f7f8f8' },
  subName: { fontSize: 13, color: '#8a8f98', marginTop: 2 },
  meta: { display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' as const },
  statusBadge: {
    fontSize: 11, padding: '2px 8px', borderRadius: 9999,
    background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 510,
  },
  genderBadge: {
    fontSize: 11, padding: '2px 8px', borderRadius: 9999,
    background: 'rgba(255,255,255,0.05)', fontWeight: 510, color: '#d0d6e0',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'transparent', border: 'none', fontSize: 16,
    cursor: 'pointer', color: '#62666d', display: 'flex',
    alignItems: 'center', justifyContent: 'center', lineHeight: 1,
    transition: 'background 0.15s ease',
  },
  personasSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 510, color: '#8a8f98', marginBottom: 10, letterSpacing: 0.5 },
  personasList: { display: 'flex', flexDirection: 'column', gap: 8 },
  personaCard: {
    padding: '10px 14px', borderRadius: 8,
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
  },
  personaHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  personaName: { fontSize: 14, fontWeight: 590, color: '#f7f8f8' },
  codename: { fontSize: 12, color: '#7170ff', fontStyle: 'italic' },
  defaultBadge: {
    fontSize: 9, padding: '1px 6px', borderRadius: 9999,
    background: 'rgba(94,106,210,0.15)', color: '#7170ff', fontWeight: 510,
  },
  personaMeta: { display: 'flex', gap: 6, flexWrap: 'wrap' as const },
  factionBadge: {
    fontSize: 11, padding: '2px 8px', borderRadius: 9999,
    background: 'rgba(255,255,255,0.05)', fontWeight: 510, color: '#d0d6e0',
  },
  subFactionBadge: {
    fontSize: 11, padding: '2px 8px', borderRadius: 9999,
    background: 'rgba(113,112,255,0.15)', color: '#7170ff', fontWeight: 510,
  },
  personaDesc: { fontSize: 12, color: '#8a8f98', marginTop: 4 },
  infoSection: {
    padding: '12px 14px', borderRadius: 8,
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 16,
  },
  infoRow: { fontSize: 13, color: '#d0d6e0', marginBottom: 4 },
  infoLabel: { color: '#8a8f98' },
  infoValue: { fontWeight: 510 },
  wikiLink: { color: '#7170ff', textDecoration: 'none', fontWeight: 510 },
  historySection: { marginTop: 4 },
  noEvents: { fontSize: 13, color: '#62666d', textAlign: 'center', padding: 12 },
  eventList: { display: 'flex', flexDirection: 'column', gap: 8 },
  eventItem: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)',
  },
  eventIcon: { fontSize: 14, marginTop: 2 },
  eventContent: { flex: 1 },
  eventDesc: { fontSize: 13, color: '#f7f8f8', lineHeight: 1.4 },
  eventMeta: { display: 'flex', gap: 8, fontSize: 11, color: '#62666d', marginTop: 3 },
  eventType: { fontWeight: 510, color: '#8a8f98' },
};
