import { useEffect, useState } from "react";

/** Tailwind's `md` breakpoint — the desktop/mobile split used across the app. */
export const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Subscribe to a media query.
 *
 * Returns `false` where matchMedia is unavailable (jsdom under Vitest), so
 * components fall back to the desktop layout in tests.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => read(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

function read(query) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(query).matches;
}

/**
 * True on phone-sized viewports. Only one of the mobile/desktop layouts is
 * mounted at a time, so the toolbar and property panel are never duplicated in
 * the DOM (which would also break accessible-name lookups).
 */
export function useIsMobile() {
  return !useMediaQuery(DESKTOP_QUERY);
}
