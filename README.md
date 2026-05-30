# Tennis Diagram

A browser-based tactical diagram editor for tennis. Draw shot trajectories and player movements on an interactive court, then play them back as animation.

## Getting started

```bash
make init   # install dependencies via Docker (once; re-run after package.json changes)
make start  # dev server → http://localhost:5173 (hot-reload)
make build  # production build → dist/
```

Requires Docker. No local Node/npm needed.

## Tools

| Button | What it does |
|--------|-------------|
| **Select** | Click an arrow or angles widget to select it; drag players to reposition them |
| **Ball** | Drag to draw a yellow ball-trajectory arrow |
| **Move S** | Drag to draw a blue movement arrow (server team) |
| **Move R** | Drag to draw a red movement arrow (receiver team) |
| **Angles** | Three-click: click the source point, then the left boundary, then the right boundary |

Selected arrows and angles show circular drag handles at their endpoints — drag these to reshape the element. The curvature of an arrow can be adjusted in the property panel on the right.

**Keyboard shortcuts**

- `Ctrl/⌘+Z` — undo
- `Ctrl/⌘+Shift+Z` or `Ctrl/⌘+Y` — redo
- `Delete` / `Backspace` — delete selected arrow or angles widget
- `Escape` — deselect / cancel current drawing

## Animation

Click **▶ Animate** in the toolbar to enter animation mode. The right sidebar switches to animation controls.

- **Play** — steps through every ball and movement arrow in sequence
  - Ball arrows: a yellow dot travels along the curved path
  - Movement arrows: the nearest player slides to the arrow endpoint
- **Pause** — freeze the animation at the current frame
- **Reset** — return all players to their original positions and stop playback
- **Replay** — shown when the sequence finishes; restarts from the beginning
- **Speed** — slider from 0.25× (slow) to 3× (fast); default 1×
- **Export GIF** — renders the whole sequence as a looping animated GIF at the current speed; a progress bar shows while it encodes
- **✕** or **click the court** — exit animation mode and return to editing

## Presets

The **Preset** dropdown is populated from `public/presets.jsonl`. Each line is a JSON object:

```jsonc
{
  "key":     "my_preset",          // unique identifier (auto-generated if omitted)
  "label":   "Wide serve (deuce)", // shown in the dropdown
  "group":   "My tactics",         // optgroup label
  "players": [                     // required; same shape as the saved-JSON format
    { "id": "A_server",   "team": "A", "label": "S",  "x": 240, "y": 695 },
    { "id": "A_net",      "team": "A", "label": "Sp", "x": 124, "y": 405 },
    { "id": "B_returner", "team": "B", "label": "R",  "x": 120, "y": 15  },
    { "id": "B_net",      "team": "B", "label": "Rp", "x": 236, "y": 305 }
  ]
}
```

Applying a preset repositions all players and clears all arrows and angles. The dropdown stays on the selected preset. **Reset** re-applies it (restoring original player positions while clearing arrows/angles).

Built-in presets cover standard singles and doubles formations (standard 1-up-1-back, Australian, I-Formation, both-back) for both deuce and ad sides.

## Save / load

All file actions are in the **File ▾** menu in the toolbar.

| Action | Where |
|--------|-------|
| Auto-save | Browser `localStorage` — survives page refresh |
| **Save JSON** | Downloads a `.json` snapshot of the current scene |
| **Load JSON** | Loads a previously saved `.json` file |
| **Export SVG** | Downloads a static SVG of the current diagram |
| **Export PNG** | Downloads a rasterised PNG |
| **Load presets (.jsonl)** | Loads a custom presets file for the session |
| **Reset** | Clears arrows/angles and restores the last preset (or initial scene) |

### JSON format

```jsonc
{
  "version": 1,
  "players": [
    { "id": "A_server", "team": "A", "label": "S", "x": 240, "y": 695 }
  ],
  "arrows": [
    {
      "id": "ball-1",
      "kind": "ball",           // "ball" | "movement-a" | "movement-b"
      "from": { "x": 240, "y": 695 },
      "to":   { "x": 60,  "y": 80  },
      "label": "wide serve",
      "curvature": 30           // signed perpendicular offset from chord midpoint
    }
  ],
  "angles": [
    {
      "id": "angles-1",
      "source": { "x": 60, "y": 80 },
      "left":   { "x": 30, "y": 30 },
      "right":  { "x": 90, "y": 30 },
      "label":  "",
      "bisects": 0
    }
  ]
}
```

## Coordinate system

The SVG viewBox is `420 × 770` with origin at `(-30, -30)`. The court playing surface occupies `x ∈ [30, 330]`, `y ∈ [30, 680]` (300 × 650 px), reflecting true doubles court proportions (36 × 78 ft). Team A serves from the **bottom** half (`y > 355`), Team B from the top.

Key landmarks:

| Feature | x or y |
|---------|--------|
| Doubles sideline | x = 30, x = 330 |
| Singles sideline | x = 68, x = 292 |
| Centre line | x = 180 |
| Baseline (far / near) | y = 30, y = 680 |
| Service line (far / near) | y = 180, y = 530 |
| Net | y = 355 |

## Tech stack

- **React 19** with hooks — no external state library
- **Vite 6** — build tool and dev server
- **Tailwind CSS 4** — utility-class styling
- All court geometry, arrow drawing, and animation are plain SVG + JavaScript (no animation library); PNG/GIF export rasterise the SVG through a `<canvas>`
