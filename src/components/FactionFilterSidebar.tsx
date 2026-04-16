interface FactionFilterSidebarProps {
  filters: Record<string, boolean>;
  onFilterChange: (key: string, value: boolean) => void;
}

/** Faction → sub-faction mapping (updated for Entity-Persona model) */
const FACTION_TREE: Record<string, { label: string; subFactions: { key: string; label: string }[] }> = {
  RED: {
    label: '正义阵营',
    subFactions: [
      { key: 'FBI', label: 'FBI' },
      { key: 'CIA', label: 'CIA' },
      { key: 'MI6', label: 'MI6' },
      { key: 'PSB', label: '公安警察' },
      { key: 'TOKYO_MPD', label: '东京警视厅' },
      { key: 'OSAKA_PD', label: '大阪府警' },
      { key: 'NAGANO_PD', label: '长野县警' },
      { key: 'OTHER_PD', label: '其他警察' },
      { key: 'DETECTIVE_BOYS', label: '少年侦探团' },
      { key: 'DETECTIVE', label: '侦探' },
    ],
  },
  BLACK: {
    label: '黑衣组织',
    subFactions: [
      { key: 'BO_CORE', label: '组织核心' },
      { key: 'BO_OUTER', label: '组织外围' },
    ],
  },
  OTHER: {
    label: '其他',
    subFactions: [
      { key: 'MAGIC_KAITO', label: '怪盗基德' },
    ],
  },
};

const FACTION_COLORS: Record<string, string> = {
  RED: '#dc2626',
  BLACK: '#475569',
  OTHER: '#6b7280',
};

export default function FactionFilterSidebar({ filters, onFilterChange }: FactionFilterSidebarProps) {
  const handleMainToggle = (factionKey: string, checked: boolean) => {
    onFilterChange(factionKey, checked);
    const tree = FACTION_TREE[factionKey];
    if (tree) {
      for (const sub of tree.subFactions) {
        onFilterChange(sub.key, checked);
      }
    }
  };

  return (
    <div style={styles.sidebar} data-testid="faction-filter-sidebar">
      <div style={styles.title}>阵营筛选</div>

      {Object.entries(FACTION_TREE).map(([factionKey, { label, subFactions }]) => (
        <div key={factionKey} style={styles.factionGroup}>
          {/* Main faction toggle */}
          <label style={styles.mainToggleLabel} data-testid={`filter-toggle-${factionKey}`}>
            <span style={styles.mainToggleText}>
              <span
                style={{ ...styles.factionDot, background: FACTION_COLORS[factionKey] }}
              />
              {label}
            </span>
            <input
              type="checkbox"
              checked={!!filters[factionKey]}
              onChange={(e) => handleMainToggle(factionKey, e.target.checked)}
              style={styles.hiddenCheckbox}
              data-testid={`filter-checkbox-${factionKey}`}
            />
            <span
              style={{
                ...styles.toggle,
                background: filters[factionKey] ? (FACTION_COLORS[factionKey] ?? '#64748b') : '#28282c',
              }}
            >
              <span
                style={{
                  ...styles.toggleKnob,
                  transform: filters[factionKey] ? 'translateX(14px)' : 'translateX(0)',
                }}
              />
            </span>
          </label>

          {/* Sub-faction checkboxes */}
          <div style={styles.subFactionList}>
            {subFactions.map(({ key, label: subLabel }) => (
              <label key={key} style={styles.subFactionLabel} data-testid={`filter-sub-${key}`}>
                <input
                  type="checkbox"
                  checked={!!filters[key]}
                  onChange={(e) => onFilterChange(key, e.target.checked)}
                  style={styles.checkbox}
                  data-testid={`filter-checkbox-${key}`}
                />
                <span style={styles.subFactionText}>{subLabel}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Styles ── */

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 200,
    minWidth: 200,
    background: '#0f1011',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 12,
    fontWeight: 590,
    color: '#8a8f98',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
  },
  factionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  mainToggleLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none' as const,
    padding: '2px 0',
  },
  mainToggleText: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 510,
    color: '#f7f8f8',
  },
  factionDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  hiddenCheckbox: {
    position: 'absolute' as const,
    opacity: 0,
    width: 0,
    height: 0,
    pointerEvents: 'none' as const,
  },
  toggle: {
    position: 'relative' as const,
    width: 32,
    height: 18,
    borderRadius: 9,
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.2s',
  },
  subFactionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingLeft: 16,
  },
  subFactionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    userSelect: 'none' as const,
    padding: '3px 4px',
    borderRadius: 4,
  },
  checkbox: {
    accentColor: '#5e6ad2',
    width: 14,
    height: 14,
    cursor: 'pointer',
  },
  subFactionText: {
    fontSize: 13,
    color: '#d0d6e0',
  },
};
