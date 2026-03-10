import { useEffect, useState, useCallback, useRef } from 'react';
import type { RelationshipState, FactionSnapshot } from '../types';
import RelationshipLine from './RelationshipLine';

interface RelationshipOverlayProps {
  relationships: RelationshipState[];
  factionSnapshot: FactionSnapshot;
  containerRef: React.RefObject<HTMLDivElement | null>;
  showRelationships: boolean;
}

interface CharacterPosition {
  x: number;
  y: number;
}

/**
 * SVG overlay that renders relationship lines between character cards.
 * Uses data-character-id attributes on DOM elements to find card positions.
 */
export default function RelationshipOverlay({
  relationships,
  factionSnapshot,
  containerRef,
  showRelationships,
}: RelationshipOverlayProps) {
  const [positions, setPositions] = useState<Map<string, CharacterPosition>>(
    new Map()
  );
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const rafRef = useRef<number>(0);

  const updatePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });

    const newPositions = new Map<string, CharacterPosition>();

    // Find all character card elements within the container
    const cards = container.querySelectorAll<HTMLElement>('[data-character-id]');
    cards.forEach((card) => {
      const charId = card.getAttribute('data-character-id');
      if (!charId) return;

      const cardRect = card.getBoundingClientRect();
      // Position relative to the container
      newPositions.set(charId, {
        x: cardRect.left - rect.left + cardRect.width / 2,
        y: cardRect.top - rect.top + cardRect.height / 2,
      });
    });

    setPositions(newPositions);
  }, [containerRef]);

  useEffect(() => {
    if (!showRelationships) return;

    // Initial position calculation (delayed to allow layout)
    const timer = setTimeout(updatePositions, 100);

    // Observe container resize
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePositions);
    });
    observer.observe(container);

    // Also listen for window resize
    window.addEventListener('resize', updatePositions);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      window.removeEventListener('resize', updatePositions);
    };
  }, [showRelationships, updatePositions, containerRef]);

  // Re-calculate when relationships or snapshot change
  useEffect(() => {
    if (showRelationships) {
      const timer = setTimeout(updatePositions, 50);
      return () => clearTimeout(timer);
    }
  }, [relationships, factionSnapshot, showRelationships, updatePositions]);

  if (!showRelationships || relationships.length === 0) return null;

  // Build a set of primary character IDs for dual-identity dedup
  const dualIdentityPrimaryIds = getDualIdentityPrimaryIds(factionSnapshot);

  // Filter and deduplicate relationships for rendering
  const linesToRender = deduplicateRelationships(
    relationships,
    dualIdentityPrimaryIds,
    positions
  );

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: containerSize.width || '100%',
        height: containerSize.height || '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
      data-testid="relationship-overlay"
    >
      <g style={{ pointerEvents: 'auto' }}>
        {linesToRender.map((line) => (
          <RelationshipLine
            key={line.relationship.relationshipId}
            relationship={line.relationship}
            startPos={line.startPos}
            endPos={line.endPos}
            isCrossFaction={line.relationship.isCrossFaction}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * Get the set of character IDs that are dual-identity characters,
 * mapped to their primary faction's character ID.
 * For dual-identity characters, we only draw lines to the card
 * in their primary faction panel.
 */
function getDualIdentityPrimaryIds(
  snapshot: FactionSnapshot
): Set<string> {
  const dualIds = new Set<string>();
  const allChars = [...snapshot.redFaction, ...snapshot.blackFaction];
  for (const char of allChars) {
    if (char.isDualIdentity) {
      dualIds.add(char.characterId);
    }
  }
  return dualIds;
}

interface LineToRender {
  relationship: RelationshipState;
  startPos: CharacterPosition;
  endPos: CharacterPosition;
}

/**
 * Deduplicate relationship lines for dual-identity characters.
 * For cross-faction relationships involving a dual-identity character,
 * only draw ONE line to the primary CharacterCard.
 */
function deduplicateRelationships(
  relationships: RelationshipState[],
  _dualIdentityIds: Set<string>,
  positions: Map<string, CharacterPosition>
): LineToRender[] {
  const lines: LineToRender[] = [];
  const drawnPairs = new Set<string>();

  for (const rel of relationships) {
    const { character1Id, character2Id } = rel;

    // Create a canonical pair key to avoid duplicates
    const pairKey = [character1Id, character2Id].sort().join('::');
    if (drawnPairs.has(pairKey)) continue;

    const startPos = positions.get(character1Id);
    const endPos = positions.get(character2Id);

    // Only render if both positions are known
    if (!startPos || !endPos) continue;

    drawnPairs.add(pairKey);
    lines.push({ relationship: rel, startPos, endPos });
  }

  return lines;
}
