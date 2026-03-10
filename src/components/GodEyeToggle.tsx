interface GodEyeToggleProps {
  godEyeMode: boolean;
  onToggle: () => void;
}

export default function GodEyeToggle({ godEyeMode, onToggle }: GodEyeToggleProps) {
  return (
    <button
      data-testid="god-eye-toggle"
      style={{
        ...styles.button,
        ...(godEyeMode ? styles.active : styles.inactive),
      }}
      onClick={onToggle}
    >
      <span style={styles.icon}>{godEyeMode ? '👁' : '🌐'}</span>
      <span style={styles.label}>
        {godEyeMode ? '上帝视角' : '表世界'}
      </span>
    </button>
  );
}

/* ── Styles ── */

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 0.2s',
    width: '100%',
    justifyContent: 'center',
  },
  active: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
    color: '#c4b5fd',
    boxShadow: '0 0 12px rgba(139, 92, 246, 0.35)',
  },
  inactive: {
    background: '#334155',
    borderColor: '#475569',
    color: '#94a3b8',
  },
  icon: {
    fontSize: 16,
    lineHeight: 1,
  },
  label: {
    lineHeight: 1,
  },
};
