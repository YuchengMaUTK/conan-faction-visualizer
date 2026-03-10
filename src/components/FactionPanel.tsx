import type { CharacterState, RelationshipState, SubFaction } from '../types';
import { computeScale } from '../engines/scale';
import { filterBySubFaction } from '../engines/search-engine';
import CharacterCard from './CharacterCard';
import CPPair from './CPPair';

export interface FactionPanelProps {
  faction: 'red' | 'black';
  characters: CharacterState[];
  relationships?: RelationshipState[];
  highlightedIds?: Set<string>;
  searchResults?: string[];
  subFactionFilter?: SubFaction | null;
  showRelationships?: boolean;
  onCharacterClick?: (id: string) => void;
}

export default function FactionPanel({
  faction,
  characters,
  relationships = [],
  highlightedIds = new Set(),
  searchResults,
  subFactionFilter,
  showRelationships = false,
  onCharacterClick,
}: FactionPanelProps) {
  const isRed = faction === 'red';
  const filtered = subFactionFilter ? filterBySubFaction(characters, subFactionFilter) : characters;
  const searchSet = searchResults ? new Set(searchResults) : null;

  // Build character lookup
  const charMap = new Map(filtered.map(c => [c.characterId, c]));

  // Find same-faction CP pairs when relationships are shown
  const pairs: { rel: RelationshipState; c1: CharacterState; c2: CharacterState }[] = [];
  const pairedIds = new Set<string>();

  if (showRelationships) {
    for (const rel of relationships) {
      if (rel.isCrossFaction) continue;
      const c1 = charMap.get(rel.character1Id);
      const c2 = charMap.get(rel.character2Id);
      if (c1 && c2 && !pairedIds.has(c1.characterId) && !pairedIds.has(c2.characterId)) {
        pairs.push({ rel, c1, c2 });
        pairedIds.add(c1.characterId);
        pairedIds.add(c2.characterId);
      }
    }
  }

  // Unpaired characters
  const unpaired = filtered.filter(c => !pairedIds.has(c.characterId));
  const sorted = [...unpaired].sort((a, b) => a.importanceRank - b.importanceRank);
  const orders = assignCenterOrders(sorted.length);

  // Sort pairs by combined importance
  pairs.sort((a, b) => (a.c1.importanceRank + a.c2.importanceRank) - (b.c1.importanceRank + b.c2.importanceRank));

  const panelStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 300,
    padding: 24,
    borderRadius: 20,
    background: isRed
      ? 'linear-gradient(160deg, #2d0a0a 0%, #4a1525 40%, #6b2040 100%)'
      : 'linear-gradient(160deg, #0a0a1a 0%, #111827 40%, #1e293b 100%)',
    border: 'none',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: isRed
      ? '0 8px 32px rgba(127, 29, 29, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
  };

  const accentBorderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: isRed
      ? 'linear-gradient(90deg, #dc2626, #f87171, #fbbf24, #f87171, #dc2626)'
      : 'linear-gradient(90deg, #475569, #94a3b8, #c9a84c, #94a3b8, #475569)',
    borderRadius: '20px 20px 0 0',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 900,
    marginBottom: 20,
    textAlign: 'center',
    color: isRed ? '#fca5a5' : '#e2e8f0',
    letterSpacing: 4,
    textShadow: isRed
      ? '0 2px 12px rgba(239, 68, 68, 0.4)'
      : '0 2px 12px rgba(148, 163, 184, 0.3)',
  };

  return (
    <div style={panelStyle} data-testid={`faction-panel-${faction}`}>
      <div style={accentBorderStyle} />
      <div style={titleStyle}>
        <span style={{
          display: 'inline-block',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: isRed ? '#ef4444' : '#475569',
          marginRight: 8,
          verticalAlign: 'middle',
          boxShadow: isRed ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 8px rgba(71,85,105,0.5)',
        }} />
        {isRed ? '正义阵营' : '黑衣组织'}
      </div>

      {/* CP Pairs section */}
      {pairs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
          {pairs.map(({ rel, c1, c2 }) => (
            <CPPair key={rel.relationshipId} char1={c1} char2={c2} relationship={rel}
              allCharacters={filtered} highlightedIds={highlightedIds} searchSet={searchSet}
              onCharacterClick={onCharacterClick} />
          ))}
        </div>
      )}

      {/* Unpaired characters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        {sorted.map((char, idx) => {
          const scale = computeScale(char, filtered);
          const isHighlighted = highlightedIds.has(char.characterId) || (searchSet !== null && searchSet.has(char.characterId));
          const isDimmed = searchSet !== null && searchSet.size > 0 && !searchSet.has(char.characterId);
          return (
            <div key={`${char.characterId}-${idx}`} style={{ order: orders[idx], opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.3s ease' }}
              data-character-id={char.characterId}>
              <CharacterCard character={char} scale={scale} isHighlighted={isHighlighted}
                onClick={() => onCharacterClick?.(char.characterId)} />
            </div>
          );
        })}
      </div>

      <div style={{
        textAlign: 'center',
        fontSize: 12,
        color: isRed ? 'rgba(252,165,165,0.5)' : 'rgba(148,163,184,0.4)',
        marginTop: 16,
        letterSpacing: 1,
      }}>
        共 {filtered.length} 名成员{subFactionFilter && ` (筛选: ${subFactionFilter})`}
      </div>
    </div>
  );
}

function assignCenterOrders(count: number): number[] {
  if (count === 0) return [];
  const orders: number[] = new Array(count);
  const mid = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    if (i === 0) orders[i] = mid;
    else if (i % 2 === 1) orders[i] = mid - Math.ceil(i / 2);
    else orders[i] = mid + Math.floor(i / 2);
  }
  return orders;
}
