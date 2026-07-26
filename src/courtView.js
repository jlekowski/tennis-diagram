import { COURT_VIEWBOX } from "./Court.jsx";

/**
 * The court view transform.
 *
 * Zooming is expressed purely as a narrowed `viewBox` on the court <svg>
 * rather than a CSS/SVG transform. That keeps every existing coordinate path
 * correct for free: `clientToSvg` goes through `getScreenCTM()`, which already
 * accounts for the viewBox, so hit-testing, dragging and player clamping need
 * no changes.
 *
 * A view is `{ x, y, w, h }` — the same four numbers as the viewBox attribute.
 * The aspect ratio is always the court's, so the SVG letterboxes identically at
 * every zoom level.
 */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export const FIT_VIEW = {
  x: COURT_VIEWBOX.minX,
  y: COURT_VIEWBOX.minY,
  w: COURT_VIEWBOX.w,
  h: COURT_VIEWBOX.h,
};

export function viewBoxString(view) {
  return `${view.x} ${view.y} ${view.w} ${view.h}`;
}

/** Current magnification, 1 = whole court visible. */
export function zoomOf(view) {
  return COURT_VIEWBOX.w / view.w;
}

export function isZoomed(view) {
  return zoomOf(view) > 1.001;
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * Keep the view inside the court box, so the user can never pan the court off
 * screen or zoom out past "fit".
 */
export function clampView(view) {
  const z = clamp(zoomOf(view), MIN_ZOOM, MAX_ZOOM);
  const w = COURT_VIEWBOX.w / z;
  const h = COURT_VIEWBOX.h / z;
  return {
    w,
    h,
    x: clamp(view.x, COURT_VIEWBOX.minX, COURT_VIEWBOX.minX + COURT_VIEWBOX.w - w),
    y: clamp(view.y, COURT_VIEWBOX.minY, COURT_VIEWBOX.minY + COURT_VIEWBOX.h - h),
  };
}

/**
 * Pixels per SVG unit for a view rendered into `rect` with the default
 * preserveAspectRatio="xMidYMid meet" (i.e. letterboxed and centred).
 */
function unitScale(view, rect) {
  return Math.min(rect.width / view.w, rect.height / view.h);
}

/**
 * Build the view that puts `anchor` (a point in SVG user space) under
 * `client` (a point in viewport space) at the requested zoom factor.
 *
 * This is what makes a pinch feel anchored: the court stays pinned to the
 * midpoint between the two fingers while they spread or move.
 *
 * @param startView view when the gesture began
 * @param anchor    SVG-space point that should stay under the fingers
 * @param factor    multiplier applied to the starting zoom
 * @param client    current viewport-space point to pin `anchor` to
 * @param rect      the court <svg> bounding client rect
 */
export function anchoredView(startView, anchor, factor, client, rect) {
  const z = clamp(zoomOf(startView) * factor, MIN_ZOOM, MAX_ZOOM);
  const w = COURT_VIEWBOX.w / z;
  const h = COURT_VIEWBOX.h / z;
  const k = unitScale({ w, h }, rect);

  return clampView({
    w,
    h,
    x: anchor.x - w / 2 - (client.x - rect.left - rect.width / 2) / k,
    y: anchor.y - h / 2 - (client.y - rect.top - rect.height / 2) / k,
  });
}

/** Euclidean distance between two client points. */
export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Midpoint of two client points. */
export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
