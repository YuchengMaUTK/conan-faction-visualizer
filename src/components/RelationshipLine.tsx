import { useState, useId } from 'react';
import type { RelationshipState, RelationshipType, RelationshipStatus } from '../types';

export interface RelationshipLineProps {
  relationship: RelationshipState;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  isCrossFaction: boolean;
}

/* ── Color mapping: RelationshipStatus → color ── */
const STATUS_COLORS: Record<RelationshipStatus, string> = {
  DATING: '#ec4899',     // pink
  CONFIRMED: '#ec4899',  // pink
  UNCONFESSED: '#9ca3af', // gray
  CONFESSED: '#ef4444',   // red
  SEPARATED: '#4b5563',   // dark gray
};

/* ── Line style mapping: RelationshipType → stroke-dasharray ── */
const TYPE_DASH: Record<RelationshipType, string> = {
  LOVE: '',              // solid
  CRUSH: '8 4',          // dashed
  MARRIED: '',           // solid (double handled separately)
  CHILDHOOD_SWEETHEART: '4 2 1 2', // wavy approximation via dash pattern
  AMBIGUOUS: '2 4',      // dotted
};

/* ── Relationship type labels (Chinese) ── */
const TYPE_LABELS: Record<RelationshipType, string> = {
  LOVE: '❤️ 恋爱',
  CRUSH: '💭 暗恋',
  MARRIED: '💍 已婚',
  CHILDHOOD_SWEETHEART: '🌸 青梅竹马',
  AMBIGUOUS: '❓ 暧昧',
};

/* ── Relationship type icons for midpoint ── */
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

export default function RelationshipLine({
  relationship,
  startPos,
  endPos,
  isCrossFaction,
}: RelationshipLineProps) {
  const [hovered, setHovered] = useState(false);
  const uniqueId = useId();

  const { type, status, description } = relationship;
  const color = STATUS_COLORS[status];
  const dashArray = TYPE_DASH[type];
  const isMarried = type === 'MARRIED';
  const isWavy = type === 'CHILDHOOD_SWEETHEART';

  // Midpoint for cross-faction icon
  const midX = (startPos.x + endPos.x) / 2;
  const midY = (startPos.y + endPos.y) / 2;

  // Tooltip position
  const tooltipX = midX;
  const tooltipY = midY - 30;

  // Build the path
  const pathD = isWavy
    ? buildWavyPath(startPos, endPos)
    : `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`;

  const gradientId = `grad-${uniqueId}`;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
      data-testid={`relationship-line-${relationship.relationshipId}`}
    >
      {/* Gradient definition for cross-faction lines */}
      {isCrossFaction && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
        </defs>
      )}

      {/* Invisible wider hit area for hover */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />

      {/* Main line */}
      <path
        d={pathD}
        fill="none"
        stroke={isCrossFaction ? `url(#${gradientId})` : color}
        strokeWidth={hovered ? 3 : 2}
        strokeDasharray={isWavy ? undefined : dashArray}
        strokeLinecap="round"
        style={{
          transition: 'stroke-width 0.2s ease, stroke 0.5s ease',
        }}
      />

      {/* Double line for MARRIED type */}
      {isMarried && (
        <path
          d={pathD}
          fill="none"
          stroke={isCrossFaction ? `url(#${gradientId})` : color}
          strokeWidth={hovered ? 3 : 2}
          strokeDasharray=""
          strokeLinecap="round"
          transform={`translate(0, 4)`}
          style={{
            transition: 'stroke-width 0.2s ease, stroke 0.5s ease',
          }}
        />
      )}

      {/* Cross-faction midpoint icon */}
      {isCrossFaction && (
        <text
          x={midX}
          y={midY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={14}
          style={{ pointerEvents: 'none' }}
        >
          {TYPE_ICONS[type]}
        </text>
      )}

      {/* Tooltip on hover */}
      {hovered && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={tooltipX - 90}
            y={tooltipY - 36}
            width={180}
            height={description ? 56 : 40}
            rx={8}
            fill="rgba(0,0,0,0.85)"
          />
          <text
            x={tooltipX}
            y={tooltipY - 18}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight={600}
          >
            {TYPE_LABELS[type]} · {STATUS_LABELS[status]}
          </text>
          {description && (
            <text
              x={tooltipX}
              y={tooltipY}
              textAnchor="middle"
              fill="#d1d5db"
              fontSize={10}
            >
              {description.length > 20
                ? description.slice(0, 20) + '…'
                : description}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

/**
 * Build a wavy SVG path between two points using quadratic bezier curves.
 */
function buildWavyPath(
  start: { x: number; y: number },
  end: { x: number; y: number }
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const segments = Math.max(4, Math.round(dist / 30));
  const amplitude = 6;

  // Normal vector (perpendicular)
  const nx = -dy / dist;
  const ny = dx / dist;

  let d = `M ${start.x} ${start.y}`;

  for (let i = 0; i < segments; i++) {
    const t1 = (i + 0.5) / segments;
    const t2 = (i + 1) / segments;

    const cx = start.x + dx * t1 + nx * amplitude * (i % 2 === 0 ? 1 : -1);
    const cy = start.y + dy * t1 + ny * amplitude * (i % 2 === 0 ? 1 : -1);
    const ex = start.x + dx * t2;
    const ey = start.y + dy * t2;

    d += ` Q ${cx} ${cy} ${ex} ${ey}`;
  }

  return d;
}

/* ── Utility exports for style mapping (used in tests) ── */

export function getLineColor(status: RelationshipStatus): string {
  return STATUS_COLORS[status];
}

export function getLineDash(type: RelationshipType): string {
  return TYPE_DASH[type];
}

export function isDoubleLineType(type: RelationshipType): boolean {
  return type === 'MARRIED';
}

export function isWavyLineType(type: RelationshipType): boolean {
  return type === 'CHILDHOOD_SWEETHEART';
}
