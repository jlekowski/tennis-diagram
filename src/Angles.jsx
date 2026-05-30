const ANGLES_COLOR = "#eab308";
const ANGLES_FILL_OPACITY = 0.16;

export function angleFrom(source, point) {
  return Math.atan2(point.y - source.y, point.x - source.x);
}

/**
 * Intersect a ray (origin + u*dir, u >= 0) with a line segment.
 * Returns the intersection point or null.
 */
export function rayIntersectSegment(origin, dir, segStart, segEnd) {
  const ex = segEnd.x - segStart.x;
  const ey = segEnd.y - segStart.y;
  const det = dir.x * -ey - dir.y * -ex;
  if (Math.abs(det) < 1e-9) return null;
  const u =
    ((segStart.x - origin.x) * -ey - (segStart.y - origin.y) * -ex) / det;
  if (u < 0) return null;
  return { x: origin.x + u * dir.x, y: origin.y + u * dir.y };
}

/**
 * Angular bisection of the wedge (source, left, right).
 * levels=0 → []; levels=1 → 1 bisect line (50%);
 * levels=2 → 3 bisect lines (25%, 50%, 75%).
 * Each line goes from source to the intersection with segment (left→right).
 */
export function bisectEndpoints(source, left, right, levels) {
  if (!levels) return [];
  const aL = angleFrom(source, left);
  const aR = angleFrom(source, right);
  // Normalize the swept angle to (−π, π]
  let diff = aR - aL;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;

  const fractions = [];
  if (levels >= 1) fractions.push(0.5);
  if (levels >= 2) fractions.push(0.25, 0.75);

  return fractions
    .map((f) => {
      const angle = aL + diff * f;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      return rayIntersectSegment(source, dir, left, right);
    })
    .filter(Boolean);
}

export default function Angles({ angles, selected, preview }) {
  const { id, source, left, right, label, bisects = 0 } = angles;
  if (!source || !left || !right) return null;

  const points = `${source.x},${source.y} ${left.x},${left.y} ${right.x},${right.y}`;
  const marker = selected ? "arrow-ball-sel" : "arrow-ball";
  const strokeWidth = selected ? 3 : 2.5;
  const bisects_pts = bisectEndpoints(source, left, right, bisects);

  // Label at centroid of the wedge
  const cx = (source.x + left.x + right.x) / 3;
  const cy = (source.y + left.y + right.y) / 3;

  return (
    <g
      data-angles-id={preview ? undefined : id}
      style={{ cursor: preview ? "default" : "pointer" }}
    >
      <polygon
        points={points}
        fill={ANGLES_COLOR}
        fillOpacity={preview ? 0.08 : ANGLES_FILL_OPACITY}
        stroke="none"
        pointerEvents={preview ? "none" : "fill"}
      />
      {/* Left edge */}
      <line
        x1={source.x} y1={source.y} x2={left.x} y2={left.y}
        stroke={ANGLES_COLOR}
        strokeWidth={strokeWidth}
        markerEnd={`url(#${marker})`}
        pointerEvents={preview ? "none" : "stroke"}
        opacity={preview ? 0.7 : 1}
      />
      {/* Right edge */}
      <line
        x1={source.x} y1={source.y} x2={right.x} y2={right.y}
        stroke={ANGLES_COLOR}
        strokeWidth={strokeWidth}
        markerEnd={`url(#${marker})`}
        pointerEvents={preview ? "none" : "stroke"}
        opacity={preview ? 0.7 : 1}
      />
      {/* Bisect lines */}
      {bisects_pts.map((end, i) => (
        <line
          key={i}
          x1={source.x} y1={source.y} x2={end.x} y2={end.y}
          stroke={ANGLES_COLOR}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          pointerEvents="none"
          opacity={preview ? 0.7 : 1}
        />
      ))}
      {label && !preview && (
        <AnglesLabel x={cx} y={cy} text={label} selected={selected} />
      )}
    </g>
  );
}

function AnglesLabel({ x, y, text, selected }) {
  const width = Math.max(28, text.length * 6.2 + 10);
  const height = 14;
  return (
    <g pointerEvents="none">
      <rect
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        rx="2"
        fill="#ffffff"
        opacity="0.92"
        stroke={selected ? "#0f172a" : "none"}
        strokeWidth="0.75"
      />
      <text
        x={x}
        y={y + 3.5}
        textAnchor="middle"
        fontSize="10"
        fontFamily="sans-serif"
        fill="#1e293b"
      >
        {text}
      </text>
    </g>
  );
}
