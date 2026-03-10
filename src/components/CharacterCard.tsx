import { useState } from 'react';
import type { CharacterState } from '../types';

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

export default function CharacterCard({
  character,
  scale,
  isHighlighted = false,
  onClick,
}: CharacterCardProps) {
  const { name, codename, status, isDualIdentity, avatar, hasCurrentEvent } = character;
  const [imgError, setImgError] = useState(false);

  const isDead = status === 'DEAD';
  const isLeft = status === 'LEFT';
  const isValidAvatar = avatar.startsWith('http') || avatar.startsWith('/avatars/');

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: `${10 * scale}px`,
    borderRadius: 14,
    background: isDualIdentity
      ? 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(59,130,246,0.06))'
      : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(241,245,249,0.95))',
    boxShadow: isHighlighted
      ? '0 0 0 3px #fbbf24, 0 4px 16px rgba(251,191,36,0.3)'
      : isDualIdentity
        ? '0 0 0 2px #7c3aed, 0 0 0 3px #3b82f6, 0 4px 12px rgba(124,58,237,0.25)'
        : '0 2px 10px rgba(0,0,0,0.1)',
    cursor: onClick ? 'pointer' : 'default',
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease',
    border: isDualIdentity ? 'none' : '1px solid rgba(226,232,240,0.5)',
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
    border: isDualIdentity ? '2px solid #7c3aed' : '2px solid rgba(255,255,255,0.8)',
    background: '#e2e8f0',
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
    background: 'linear-gradient(135deg, #475569, #94a3b8)',
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
  };

  return (
    <div style={cardStyle} onClick={onClick}
      data-testid={`character-card-${character.characterId}`}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}>
      <div style={avatarContainerStyle}>
        {isValidAvatar && !imgError ? (
          <img src={avatar} alt={name} style={imgStyle}
            onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <div style={fallbackStyle}>{name.charAt(0)}</div>
        )}
        {hasCurrentEvent && (
          <span style={{ position: 'absolute', top: 1, right: 1, width: 10, height: 10,
            borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.3,
        color: '#1f2937', marginBottom: codename ? 1 : 3 }}>{name}</div>
      {codename && <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center',
        marginBottom: 3, fontStyle: 'italic' }}>{codename}</div>}
      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 9999,
        backgroundColor: STATUS_COLORS[status] + '20', color: STATUS_COLORS[status],
        fontWeight: 700, border: `1px solid ${STATUS_COLORS[status]}30` }}>
        {STATUS_LABELS[status]}
      </span>
      {isDualIdentity && (
        <span style={{ fontSize: 8, color: '#7c3aed', marginTop: 3, fontWeight: 600 }}>
          双重身份
        </span>
      )}
    </div>
  );
}
