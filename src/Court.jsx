import { forwardRef } from "react";

/**
 * Court SVG viewBox. The playing surface lives at x∈[30,330], y∈[30,680]
 * (300×650, true 36×78 ft doubles proportions). The margin around it is
 * 60px on every side, giving room to place players "behind the baseline".
 */
export const COURT_VIEWBOX = { minX: -30, minY: -30, w: 420, h: 770 };

/**
 * Static court background SVG primitives (no interactive elements here).
 * The parent <svg> is owned by App so it can attach pointer handlers and
 * provide a ref for coordinate transforms.
 */
export function CourtLines() {
  return (
    <g>
      {/* Outside surround — must cover full viewBox */}
      <rect x="-30" y="-30" width="420" height="770" fill="#f1f5f9" />
      {/* Playing surface */}
      <rect x="30" y="30" width="300" height="650" fill="#6b8e5a" />

      {/* Doubles boundary */}
      <rect
        x="30"
        y="30"
        width="300"
        height="650"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
      />

      {/* Singles sidelines */}
      <line x1="68"  y1="30" x2="68"  y2="680" stroke="#ffffff" strokeWidth="2" />
      <line x1="292" y1="30" x2="292" y2="680" stroke="#ffffff" strokeWidth="2" />

      {/* Service lines (singles width only) */}
      <line x1="68" y1="180" x2="292" y2="180" stroke="#ffffff" strokeWidth="2" />
      <line x1="68" y1="530" x2="292" y2="530" stroke="#ffffff" strokeWidth="2" />

      {/* Center service line (between service lines) */}
      <line x1="180" y1="180" x2="180" y2="530" stroke="#ffffff" strokeWidth="2" />

      {/* Center marks on baselines */}
      <line x1="180" y1="30"  x2="180" y2="40"  stroke="#ffffff" strokeWidth="2" />
      <line x1="180" y1="670" x2="180" y2="680" stroke="#ffffff" strokeWidth="2" />

      {/* Net */}
      <line x1="20" y1="355" x2="340" y2="355" stroke="#1e293b" strokeWidth="3" />
      <circle cx="20"  cy="355" r="3" fill="#1e293b" />
      <circle cx="340" cy="355" r="3" fill="#1e293b" />
    </g>
  );
}

/**
 * Arrow markers used by Arrow.jsx (must be inside an <svg><defs>).
 */
export function ArrowMarkers() {
  return (
    <defs>
      <marker id="arrow-ball" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#eab308" />
      </marker>
      <marker id="arrow-a" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
      </marker>
      <marker id="arrow-b" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
      </marker>
      <marker id="arrow-ball-sel" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#a16207" />
      </marker>
      <marker id="arrow-a-sel" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#1d4ed8" />
      </marker>
      <marker id="arrow-b-sel" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#b91c1c" />
      </marker>
    </defs>
  );
}

/**
 * Convert a pointer event's client coords to the SVG's viewBox coords.
 */
export function clientToSvg(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

/**
 * Wraps children in an <svg> with the standard court viewBox and forwards a ref.
 */
export const CourtSvg = forwardRef(function CourtSvg(
  { className = "", onPointerDown, onPointerMove, onPointerUp, children, ...rest },
  ref,
) {
  return (
    <svg
      ref={ref}
      viewBox={`${COURT_VIEWBOX.minX} ${COURT_VIEWBOX.minY} ${COURT_VIEWBOX.w} ${COURT_VIEWBOX.h}`}
      xmlns="http://www.w3.org/2000/svg"
      className={`court-surface ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      {...rest}
    >
      <ArrowMarkers />
      <CourtLines />
      {children}
    </svg>
  );
});
