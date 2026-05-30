# AI.md — Developer Reference for Agents and LLMs

This file is the ground truth for anyone (human or AI) editing this codebase. It covers running the app, the full repository layout, data model, coordinate system, and how to extend the code.

---

## Running the app

### With Make + Docker (primary workflow)

No local Node/npm required. All commands run inside `node:lts` containers.

```bash
make init   # install node_modules into the project directory (once; re-run after package.json changes)
make start  # start dev server via docker compose → http://localhost:5173 (hot-reload)
make stop   # stop the dev server
make build  # production build → dist/
make test   # run the Vitest suite
```

`make start` uses `compose.yaml` which bind-mounts the project directory into `node:lts` and runs `npm run dev`. `make init` writes `node_modules` to the host filesystem so subsequent `start` and `build` invocations skip install.

### With npm (alternative)

```bash
node --version   # requires Node 18+
npm install
npm run dev      # dev server on http://localhost:5173 (hot-reload)
npm run build    # production build → dist/
npm run preview  # serve dist/ on http://localhost:4173
npm test         # run the Vitest suite once
```

---

## Repository layout

```
tennis-diagram/
├── src/
│   ├── main.jsx            Entry point — mounts <App /> into #root
│   ├── App.jsx             Root component: all state, pointer logic, layout
│   ├── store.js            useDiagramState hook (useReducer + undo/redo history)
│   ├── Court.jsx           Static SVG court background + CourtSvg wrapper
│   ├── Player.jsx          SVG circle + label for one player
│   ├── Arrow.jsx           SVG quadratic-bezier arrow; also exports controlPoint/bezierMid/arrowPath
│   ├── Angles.jsx          SVG shot-angle wedge widget
│   ├── AnimationPlayer.jsx useAnimation hook + simulateFrames/animationSequence + AnimBall + AnimSidePanel
│   ├── Toolbar.jsx         Top toolbar: tool buttons, preset dropdown, undo/redo, File menu
│   ├── PropertyPanel.jsx   Right sidebar: label + curvature inputs for selected element
│   ├── presets.js          Preset parsing (JSONL) and application
│   ├── persist.js          localStorage autosave + JSON import/export
│   ├── export.js           SVG serialisation + PNG/GIF rasterisation via canvas
│   ├── __tests__/          Vitest unit + component tests
│   └── index.css           Tailwind import + body/root height + .court-surface
├── public/
│   └── presets.jsonl       Built-in presets served as static asset
├── index.html              Vite HTML template
├── vite.config.js          Vite config (React + Tailwind plugins, port 5173, host 0.0.0.0)
├── vitest.config.js        Vitest config (jsdom env, globals, setup file)
├── vitest.setup.js         Test setup — @testing-library/jest-dom matchers
├── package.json
├── Makefile                init / start / stop / build / test targets
├── compose.yaml            Docker Compose dev service (node:lts, bind-mount, port 5173)
├── README.md               End-user documentation
└── AI.md                   This file
```

---

## State model

The entire diagram lives in a single plain-object state managed by `useDiagramState` (in `store.js`). The store wraps `useReducer` and maintains a `history` array for undo/redo.

```ts
type Point = { x: number; y: number };

type Player = {
  id: string;          // stable identifier, e.g. "A_server", "B_net"
  team: "A" | "B";    // A = blue (server side), B = red (receiver side)
  label: string;       // display text; trailing lowercase 'p' renders as subscript
  x: number;
  y: number;
};

type Arrow = {
  id: string;
  kind: "ball" | "movement-a" | "movement-b";
  from: Point;
  to: Point;
  label: string;
  curvature: number;   // signed perpendicular offset from chord midpoint; 0 = straight
};

type Angles = {
  id: string;
  source: Point;       // apex of the wedge
  left: Point;         // left boundary point
  right: Point;        // right boundary point
  label: string;
  bisects: 0 | 1 | 2; // number of bisect-line levels; 0 = none
};

type DiagramState = {
  players: Player[];
  arrows: Arrow[];
  angles: Angles[];
};
```

### State mutations

All mutations go through `commit(updater)` where `updater` is `DiagramState → DiagramState`. Pure helper functions in `store.js` produce new states:

| Function | Effect |
|----------|--------|
| `movePlayer(state, id, x, y)` | Moves one player |
| `addArrow(state, arrow)` | Appends an arrow |
| `updateArrow(state, id, patch)` | Shallow-merges patch into an arrow |
| `deleteArrow(state, id)` | Removes an arrow |
| `addAngles` / `updateAngles` / `deleteAngles` | Same pattern for angles widgets |

---

## Coordinate system

The SVG viewBox is `"-30 -30 420 770"` (minX minY width height). The playing surface is:

| Feature | x | y |
|---------|---|---|
| Doubles left sideline | 30 | — |
| Doubles right sideline | 330 | — |
| Singles left sideline | 68 | — |
| Singles right sideline | 292 | — |
| Centre line | 180 | — |
| Far baseline (top) | — | 30 |
| Near baseline (bottom) | — | 680 |
| Far service line | — | 180 |
| Near service line | — | 530 |
| Net | — | 355 |

The 30 px margin around the court (`-30` origin) allows placing players outside the baselines. Team A (blue) serves from the **bottom** half (`y > 355`), Team B (red) from the top. `COURT_VIEWBOX` is exported from `Court.jsx` and referenced by `App.jsx` for player clamping.

`clientToSvg(svgEl, clientX, clientY)` (exported from `Court.jsx`) converts screen coordinates to SVG-space using `getScreenCTM().inverse()`.

---

## Component architecture

```
App
├── Toolbar                  (stateless, callbacks + selectedPreset passed down)
├── CourtSvg                 (forwardRef wrapper, hosts all pointer events)
│   ├── CourtLines           (static background, no interactivity)
│   ├── Angles[]             (data-angles-id for hit testing)
│   ├── Arrow[]              (data-arrow-id; invisible thick path for hit testing)
│   ├── Arrow (preview)      (while drawing, no id)
│   ├── Player[]             (data-player-id; uses displayPlayers in anim mode)
│   ├── AnimBall             (yellow dot; only in animation mode)
│   └── handle circles       (drag handles for selected element endpoints)
└── right sidebar (always visible, w-72)
    ├── PropertyPanel        (default: label + curvature inputs for selected element)
    └── AnimSidePanel        (animation mode: play/pause/reset/speed controls)
```

In animation mode, clicking anywhere on the court (`onPointerDown={exitAnimMode}`) exits back to editing. `App.jsx` owns all pointer logic; hit-testing is done via `e.target.closest("[data-*]")`.

---

## Arrow rendering

`Arrow.jsx` exports three utility functions used across the codebase:

- **`controlPoint(from, to, curvature)`** — quadratic bezier control point; `curvature` is a signed perpendicular offset (positive = 90° CCW). Formula: midpoint + `(-dy/len, dx/len) * curvature`.
- **`bezierMid(from, to, curvature)`** — point at `t=0.5` on the curve (used for label placement).
- **`arrowPath(from, to, curvature)`** — returns the `d` attribute string `"M x y Q cx cy tx ty"`.

Arrow styles (`ARROW_STYLES`) are keyed by `kind`:

| kind | stroke | dash | marker |
|------|--------|------|--------|
| `ball` | `#eab308` (yellow) | `6 4` | arrowhead |
| `movement-a` | `#2563eb` (blue) | solid | arrowhead |
| `movement-b` | `#dc2626` (red) | solid | arrowhead |

Marker definitions (`<defs>`) live inside `CourtSvg` in `Court.jsx`.

---

## Animation system (`AnimationPlayer.jsx`)

### `useAnimation(players, arrows, stepMs?)`

Returns `{ frame, play, pause, reset }`.

`stepMs` (default 700) controls the duration of each animation step in milliseconds. It is read via a ref (`stepMsRef`) so changes take effect immediately mid-animation without restarting the loop.

**Sequence**: `animationSequence(arrows)` (exported) returns all arrows where `kind === "ball"` or `kind.startsWith("movement")`, in array order. Used by both the live hook and the GIF exporter.

**`frame`** (null before play) shape:
```ts
{
  ballPos: Point | null,   // live ball position; null during movement steps
  positions: Player[],     // live player positions
  playing: boolean,
  stepIdx: number,         // index of the current step in the sequence
  totalSteps: number,
  done: boolean,
}
```

**Animation loop**: `requestAnimationFrame` → `tickRef.current()`. The tick function reads everything from `animRef.current` (a plain object, not React state) so it is immune to stale closure problems across re-renders. `tickRef.current` is reassigned on every render so it always has fresh access to `setFrame`, `stepMsRef`, and module-level helpers.

**Ball step**: `bezierPt(from, to, curvature, t)` — quadratic bezier evaluation at `t ∈ [0,1]`.

**Movement step**: finds the player whose current committed position is closest to `arrow.from` (`closestPlayer`), then linearly interpolates that player toward `arrow.to`. On step completion the player's position is committed to `animRef.current.committed`.

**`play()`** always starts from step 0 with player positions reset to the `players` prop. `pause()` stops the rAF loop. `reset()` clears `animRef` and sets `frame` to null.

### `simulateFrames(players, arrows, { fps?, stepMs? })`

Pure, non-React function (exported) that deterministically samples the whole sequence into an array of `{ positions, ballPos }` frames, mirroring the live `useAnimation` logic. `framesPerStep = max(2, round(stepMs/1000 * fps))`; the result is bookended by opening and closing rest frames. Used by `downloadGif` (in `export.js`) so the exported GIF matches on-screen playback. Defaults `fps = 25`, `stepMs = 700` (the GIF exporter overrides to `fps = 20`, `scale = 1`, and the user's current `stepMs`).

### `AnimSidePanel`

Rendered in the right sidebar during animation mode. Props: `frame`, `onPlay`, `onPause`, `onReset`, `onClose`, `speed` (multiplier, e.g. 1.0), `onSpeedChange`, `onExportGif`, `gifProgress` (0–1 while encoding, else null). The speed multiplier maps to `stepMs` as `Math.round(700 / speed)` in `App.jsx`. Range 0.25×–3× in 0.25 steps. The **Export GIF** button calls `onExportGif`; while `gifProgress` is non-null the button shows a percentage and a progress bar.

---

## Presets system

Presets are loaded at runtime from `/presets.jsonl` (the `public/` directory, served as a static asset). Each line is a JSON object. The full schema is:

```jsonc
{
  "key":     "my_key",          // unique; auto-generated if omitted
  "label":   "Display name",    // shown in the <select> dropdown
  "group":   "Group name",      // <optgroup> label; defaults to "Saved"
  "players": [ /* Player[] */ ] // required
}
```

`applyPreset(state, key, userPresets)` in `presets.js` replaces players and clears all arrows and angles. It does **not** persist arrows from the preset — presets are starting positions only.

`buildPresetGroups(userPresets)` returns `[{ label, options: [{ key, label }] }]` for the Toolbar `<select>`.

`lastPresetKey` in `App.jsx` tracks the most recently applied preset key. It is passed to `Toolbar` as `selectedPreset` to keep the dropdown showing the active preset (controlled `<select>`). Applying a preset sets it; loading JSON clears it; Reset re-applies it.

The user can also load a custom `.jsonl` file at runtime via **File ▾ → Load presets (.jsonl)**. This replaces `userPresets` state in `App` for the session; it does not modify `public/presets.jsonl`.

---

## Toolbar

Buttons are grouped:
1. **Tool** — Select / Ball / Move S / Move R / Angles
2. **Preset** — controlled `<select>` showing the active preset; "Choose…" when none applied
3. **Undo / Redo**
4. **File ▾** — dropdown containing: Export SVG, Export PNG, Save JSON, Load JSON, Load presets (.jsonl)
5. **Reset**
6. **▶ Animate**

---

## Persistence

- **Autosave**: on every state change, `saveToStorage(state)` writes `toJson(state)` to `localStorage` under key `tennis-diagram-autosave-v1`.
- **Load on mount**: `loadFromStorage()` is used as the initial state if present.
- **JSON schema version**: `version: 1`. `fromJson` is backward-compatible with a legacy `funnels` key (now `angles`).
- **Export**: `downloadSvg` clones the live `<svg>` DOM node, adds `xmlns`, and triggers a download. `downloadPng` rasterises via a hidden `<canvas>` at 2× scale. `downloadGif` clones the live `<svg>` as a static base, then for each frame from `simulateFrames` translates the player groups and moves a ball circle, rasterises to canvas, and encodes the frames into a looping GIF with `gifenc`.

---

## Testing

Tests run on **Vitest** with **Testing Library** (jsdom environment). Run the suite with `make test` (Docker) or `npm test`; `npm run test:watch` for watch mode and `npm run test:coverage` for coverage.

- Tests live in `src/__tests__/`, named `*.test.js` (pure logic) or `*.test.jsx` (component tests via `@testing-library/react`).
- `vitest.config.js` enables `globals` (no need to import `describe`/`it`/`expect`) and loads `vitest.setup.js`, which registers `@testing-library/jest-dom` matchers.
- Pure modules (`store.js`, geometry in `Arrow.jsx`/`Angles.jsx`, `presets.js`, `persist.js`, `simulateFrames`/`animationSequence`) export their internals so tests can call them directly.
- Canvas-dependent export (`downloadSvg`/`downloadPng`/`downloadGif`) and the rAF-driven `useAnimation` loop are not unit-tested; `simulateFrames` covers the pure animation math behind the exporter.
- Tests that exercise error paths spy on `console.warn` with `mockImplementation(() => {})` to keep output clean while asserting the warning fires.

## How to make common changes

### Add a new arrow kind

1. Add a new entry to `ARROW_STYLES` in `Arrow.jsx`.
2. Add the corresponding `<marker>` definition in `Court.jsx` inside the `<defs>` block.
3. Add a toolbar button in `Toolbar.jsx` (`TOOL_BUTTONS` array — the `id` must match the `kind`).
4. In `store.js`, the generic `addArrow`/`updateArrow`/`deleteArrow` helpers already handle any kind.
5. In `AnimationPlayer.jsx`, update the `animationSequence` filter if the new kind should animate (it feeds both live playback and GIF export).

### Change the default animation step duration

Change `DEFAULT_STEP_MS` at the top of `AnimationPlayer.jsx`. The user can also adjust speed at runtime via the Speed slider in the Animation sidebar (0.25×–3×).

### Add player labels to the default scene

Edit `initialState.players` in `store.js`. The player `id` must be unique; `team` controls colour ("A" = blue, "B" = red).

### Add a new built-in preset

Append a JSONL line to `public/presets.jsonl`. The `key` must be unique across all lines.

### Modify court geometry

Edit the SVG primitives inside `CourtLines()` in `Court.jsx`. Also update the `COURT_VIEWBOX` constant if the overall canvas size changes — it is used by `App.jsx` to clamp player drag positions.

### Add a property to the property panel

Add a new `<FieldRow>` in `ArrowPanel` or `AnglesPanel` inside `PropertyPanel.jsx`, calling `onChange({ fieldName: value })`. The `onChange` callback calls `updateArrow` / `updateAngles` in `App.jsx`, which shallow-merges the patch into the element.

---

## Tech stack

| Dependency | Version | Role |
|------------|---------|------|
| React | 19 | UI / state |
| Vite | 6 | Build tool and dev server |
| Tailwind CSS | 4 (via `@tailwindcss/vite`) | Utility-class styling |
| `@vitejs/plugin-react` | 4 | JSX transform (Babel) |
| `gifenc` | 1 | Animated-GIF encoding for export |
| Vitest + Testing Library + jsdom | — | Test runner and component testing (dev) |

No routing, no external state library, no animation library. All SVG geometry is hand-computed.
