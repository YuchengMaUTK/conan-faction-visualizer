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
      <span style={styles.icon}>{godEyeMode ? '◆' : '●'}</span>
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
    padding: '8px 16px',
    borderRadius: 9999,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 510,
    transition: 'all 0.2s ease',
    width: '100%',
    justifyContent: 'center',
  },
  active: {
    background: 'rgba(94, 106, 210, 0.15)',
    borderColor: '#5e6ad2',
    color: '#7170ff',
    boxShadow: '0 0 0 1px #5e6ad2',
  },
  inactive: {
    background: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#8a8f98',
  },
  icon: {
    fontSize: 12,
    lineHeight: 1,
  },
  label: {
    lineHeight: 1,
  },
};
