export const ARROW_STYLES = {
  ball:         { stroke: "#eab308", dash: "6 4", marker: "arrow-ball",   selMarker: "arrow-ball-sel" },
  "movement-a": { stroke: "#2563eb", dash: "0",   marker: "arrow-a",      selMarker: "arrow-a-sel" },
  "movement-b": { stroke: "#dc2626", dash: "0",   marker: "arrow-b",      selMarker: "arrow-b-sel" },
};

/**
 * Compute the quadratic-bezier control point. `curvature` is signed perpendicular
 * offset from the chord midpoint (positive = 90° CCW from from→to direction).
 */
export function controlPoint(from, to, curvature) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  if (!curvature) return { x: mx, y: my };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: mx + (-dy / len) * curvature,
    y: my + ( dx / len) * curvature,
  };
}

/**
 * Midpoint of the curve at t=0.5. Useful for label placement.
 */
export function bezierMid(from, to, curvature) {
  const c = controlPoint(from, to, curvature);
  return {
    x: 0.25 * from.x + 0.5 * c.x + 0.25 * to.x,
    y: 0.25 * from.y + 0.5 * c.y + 0.25 * to.y,
  };
}

export function arrowPath(from, to, curvature) {
  const c = controlPoint(from, to, curvature);
  return `M ${from.x} ${from.y} Q ${c.x} ${c.y} ${to.x} ${to.y}`;
}

export default function Arrow({ arrow, selected, preview }) {
  const style = ARROW_STYLES[arrow.kind];
  if (!style) return null;
  const d = arrowPath(arrow.from, arrow.to, arrow.curvature || 0);
  const mid = bezierMid(arrow.from, arrow.to, arrow.curvature || 0);

  const strokeWidth = selected ? 3.5 : 2.5;
  const marker = selected ? style.selMarker : style.marker;

  return (
    <g
      data-arrow-id={preview ? undefined : arrow.id}
      style={{ cursor: preview ? "default" : "pointer" }}
    >
      {/* Invisible thick path for easier hit-testing */}
      {!preview && (
        <path
          d={d}
          stroke="transparent"
          strokeWidth="14"
          fill="none"
          pointerEvents="stroke"
        />
      )}
      <path
        d={d}
        stroke={style.stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={style.dash}
        fill="none"
        markerEnd={`url(#${marker})`}
        pointerEvents="none"
        opacity={preview ? 0.7 : 1}
      />
      {arrow.label && !preview && (
        <ArrowLabel x={mid.x} y={mid.y} text={arrow.label} color={style.stroke} selected={selected} />
      )}
    </g>
  );
}

function ArrowLabel({ x, y, text, color, selected }) {
  // Rough text width estimate: 6.5px per character at font-size 11
  const width = Math.max(30, text.length * 6.5 + 12);
  const height = 16;
  return (
    <g pointerEvents="none">
      <rect
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        rx="3"
        fill="#ffffff"
        stroke={selected ? "#0f172a" : color}
        strokeWidth={selected ? 1.5 : 1}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize="11"
        fontFamily="sans-serif"
        fill="#1e293b"
      >
        {text}
      </text>
    </g>
  );
}
