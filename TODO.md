# TODO

Deferred work, roughly in priority order. These were consciously left out of the
mobile/PWA pass so the app could be tried on a real phone first — several of
them may turn out not to matter in practice.

## Touch robustness

- [ ] **Bigger hit targets.** On a 390 px phone the court renders at ~0.9 px per
      SVG unit, so the current targets are: arrow endpoint handles `r=6`
      (~11 px), angle wedge edges `stroke-width` 2.5 (~2 px), players `r=14`
      (~25 px). The 44 px guideline would want invisible widened hit shapes —
      `src/Arrow.jsx` already does this with a transparent `strokeWidth="14"`
      path, so the pattern exists to copy for handles (`HANDLE_R` in
      `src/App.jsx`) and for `src/Angles.jsx` edges.
- [ ] **Pointer robustness.** `onPointerCancel` is now wired, but two gaps
      remain: `setPointerCapture` is never paired with `releasePointerCapture`
      (relying on implicit release), and the File menu's outside-close listener
      in `src/Toolbar.jsx` still uses `mousedown` rather than `pointerdown`.
- [ ] **Angles tool preview on touch.** The 3-tap workflow in
      `handlePointerDown` drives its preview from `pointermove`, which on touch
      only fires while a finger is down — so between taps there is no preview at
      all. Render the draft from the committed taps instead.
- [ ] **Animation mode + pinch.** A two-finger gesture in animation mode is fine
      now (a pinch no longer counts as the tap that exits), but zooming *while*
      an animation plays is untested.

## Tests

- [ ] `src/courtView.js` is pure and untested: `clampView` bounds, `anchoredView`
      keeping the anchor fixed, zoom clamping to `MIN_ZOOM`/`MAX_ZOOM`.
- [ ] `src/useMediaQuery.js` — returns `false` without `matchMedia`, updates on
      `change`.
- [ ] `src/Sheet.jsx` — renders nothing when closed, `onClose` fires from scrim.
- [ ] There is still no `App.test.jsx`; the pointer/drag/hit-test layer and the
      mobile/desktop layout switch are entirely untested.

## Nice to have

- [ ] Double-tap to reset zoom (currently only the "Reset view" pill).
- [ ] Replace `alert()` / `confirm()` in `handleReset` and the import error paths
      with in-app UI — they look out of place in a standalone PWA.
- [ ] The maskable icon reuses the same artwork inset to 62.5%; a dedicated
      maskable composition would fill the safe zone better.
