import { useState } from 'react';
import type { CharacterState, I18nName } from '../types';

interface CharacterCardProps {
  character: CharacterState;
  scale: number;
  isHighlighted?: boolean;
  onClick?: () => void;
}

const STATUS_LABELS: Record<CharacterState['status'], string> = {
  ACTIVE: '活跃',
  LEFT: '已离开',
  DEAD: '已牺牲',
  EXPOSED: '身份暴露',
};

const STATUS_COLORS: Record<CharacterState['status'], string> = {
  ACTIVE: '#22c55e',
  LEFT: '#94a3b8',
  DEAD: '#6b7280',
  EXPOSED: '#f59e0b',
};

/** Get display name from I18nName: prefer zh, fallback to en */
function getDisplayName(name: I18nName): string {
  return name.zh || name.en;
}

export default function CharacterCard({
  character,
  scale,
  isHighlighted = false,
  onClick,
}: CharacterCardProps) {
  const displayName = getDisplayName(character.name);
  const { codename, status, avatar, hasCurrentEvent, faction } = character;
  const [imgError, setImgError] = useState(false);

  const isDead = status === 'DEAD';
  const isLeft = status === 'LEFT';
  const avatarSrc = avatar.startsWith('http') ? avatar : `${import.meta.env.BASE_URL}${avatar}`;
  const isValidAvatar = !!avatar;

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: `${10 * scale}px`,
    borderRadius: 8,
    background: '#191a1b',
    boxShadow: isHighlighted
      ? '0 0 0 2px #7170ff, 0 4px 16px rgba(94,106,210,0.3)'
      : 'rgba(0,0,0,0.2) 0px 0px 0px 1px',
    cursor: onClick ? 'pointer' : 'default',
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease',
    border: '1px solid rgba(255,255,255,0.05)',
    opacity: isLeft ? 0.5 : 1,
    filter: isDead ? 'grayscale(100%)' : 'none',
    position: 'relative',
    minWidth: 76,
    maxWidth: 110,
  };

  const avatarContainerStyle: React.CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: '50%',
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    border: `2px solid ${faction === 'RED' ? '#dc2626' : faction === 'BLACK' ? '#475569' : '#6b7280'}`,
    background: '#191a1b',
    flexShrink: 0,
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'top center',
  };

  const fallbackStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#28282c',
    color: '#f7f8f8',
    fontSize: 20,
    fontWeight: 590,
  };

  return (
    <div style={cardStyle} onClick={onClick}
      data-testid={`character-card-${character.persona_id}`}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}>
      <div style={avatarContainerStyle}>
        {isValidAvatar && !imgError ? (
          <img src={avatarSrc} alt={displayName} style={imgStyle}
            onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <div style={fallbackStyle}>{displayName.charAt(0)}</div>
        )}
        {hasCurrentEvent && (
          <span style={{ position: 'absolute', top: 1, right: 1, width: 10, height: 10,
            borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 590, textAlign: 'center', lineHeight: 1.3,
        color: '#f7f8f8', marginBottom: codename ? 1 : 3 }}>{displayName}</div>
      {codename && <div style={{ fontSize: 10, color: '#8a8f98', textAlign: 'center',
        marginBottom: 3, fontStyle: 'italic' }}>{codename}</div>}
      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 9999,
        backgroundColor: STATUS_COLORS[status] + '20', color: STATUS_COLORS[status],
        fontWeight: 700, border: `1px solid ${STATUS_COLORS[status]}30` }}>
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}
