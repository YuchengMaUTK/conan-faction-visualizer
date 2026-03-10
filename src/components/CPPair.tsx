import type { CharacterState, RelationshipState, RelationshipType, RelationshipStatus } from '../types';
import { computeScale } from '../engines/scale';
import CharacterCard from './CharacterCard';

interface CPPairProps {
  char1: CharacterState;
  char2: CharacterState;
  relationship: RelationshipState;
  allCharacters: CharacterState[];
  highlightedIds: Set<string>;
  searchSet: Set<string> | null;
  onCharacterClick?: (id: string) => void;
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

export default function CPPair({
  char1,
  char2,
  relationship,
  allCharacters,
  highlightedIds,
  searchSet,
  onCharacterClick,
}: CPPairProps) {
  const scale1 = computeScale(char1, allCharacters);
  const scale2 = computeScale(char2, allCharacters);

  const isHL1 = highlightedIds.has(char1.characterId) || (searchSet?.has(char1.characterId) ?? false);
  const isHL2 = highlightedIds.has(char2.characterId) || (searchSet?.has(char2.characterId) ?? false);
  const isDimmed = searchSet !== null && searchSet.size > 0 && !searchSet.has(char1.characterId) && !searchSet.has(char2.characterId);

  const color = STATUS_COLORS[relationship.status];

  return (
    <div style={{ ...pairStyle, opacity: isDimmed ? 0.35 : 1 }} data-testid={`cp-pair-${relationship.relationshipId}`}>
      <div data-character-id={char1.characterId}>
        <CharacterCard character={char1} scale={scale1} isHighlighted={isHL1} onClick={() => onCharacterClick?.(char1.characterId)} />
      </div>
      <div style={{ ...badgeStyle, borderColor: color + '60', color }}>
        <span style={{ fontSize: 18 }}>{TYPE_ICONS[relationship.type]}</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>{STATUS_LABELS[relationship.status]}</span>
        {relationship.description && (
          <span style={{ fontSize: 9, opacity: 0.7, color: '#e2e8f0' }}>
            {relationship.description.length > 12 ? relationship.description.slice(0, 12) + '…' : relationship.description}
          </span>
        )}
      </div>
      <div data-character-id={char2.characterId}>
        <CharacterCard character={char2} scale={scale2} isHighlighted={isHL2} onClick={() => onCharacterClick?.(char2.characterId)} />
      </div>
    </div>
  );
}

const pairStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'opacity 0.3s ease',
};

const badgeStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  padding: '8px 10px',
  borderRadius: 14,
  border: '2px dashed',
  background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.08))',
  minWidth: 54,
  textAlign: 'center',
  backdropFilter: 'blur(4px)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};
