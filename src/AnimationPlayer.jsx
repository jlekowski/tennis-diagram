import { useState, useRef, useEffect, useCallback } from 'react';
import { controlPoint } from './Arrow.jsx';

const DEFAULT_STEP_MS = 700;

function bezierPt(from, to, curvature, t) {
  const c = controlPoint(from, to, curvature || 0);
  const s = 1 - t;
  return {
    x: s * s * from.x + 2 * s * t * c.x + t * t * to.x,
    y: s * s * from.y + 2 * s * t * c.y + t * t * to.y,
  };
}

function closestPlayer(positions, pt) {
  return positions.reduce((best, p) => {
    const d = Math.hypot(p.x - pt.x, p.y - pt.y);
    return !best || d < best.dist ? { p, dist: d } : best;
  }, null)?.p ?? null;
}

/** The animatable arrows (ball paths + player movements), in author order. */
export function animationSequence(arrows) {
  return arrows.filter((a) => a.kind === 'ball' || a.kind.startsWith('movement'));
}

/**
 * Deterministically sample every animation frame, mirroring the live
 * playback logic in `useAnimation`. Used by the GIF exporter so the saved
 * animation matches what plays on screen.
 *
 * Returns an array of `{ positions, ballPos }` frames (ballPos may be null).
 */
export function simulateFrames(players, arrows, { fps = 25, stepMs = DEFAULT_STEP_MS } = {}) {
  const sequence = animationSequence(arrows);
  const framesPerStep = Math.max(2, Math.round((stepMs / 1000) * fps));
  let committed = players.map((p) => ({ ...p }));
  const frames = [{ positions: committed, ballPos: null }]; // opening rest frame

  for (const cur of sequence) {
    for (let f = 1; f <= framesPerStep; f++) {
      const t = f / framesPerStep;
      let ballPos = null;
      let positions = committed;
      if (cur.kind === 'ball') {
        ballPos = bezierPt(cur.from, cur.to, cur.curvature, t);
      } else {
        const p = closestPlayer(committed, cur.from);
        if (p) {
          positions = committed.map((pl) =>
            pl.id === p.id
              ? { ...pl, x: pl.x + (cur.to.x - pl.x) * t, y: pl.y + (cur.to.y - pl.y) * t }
              : pl,
          );
        }
      }
      frames.push({ positions, ballPos });
    }
    // Commit the completed movement so later steps start from the new spot.
    if (cur.kind.startsWith('movement')) {
      const p = closestPlayer(committed, cur.from);
      if (p)
        committed = committed.map((pl) =>
          pl.id === p.id ? { ...pl, x: cur.to.x, y: cur.to.y } : pl,
        );
    }
  }

  frames.push({ positions: committed, ballPos: null }); // closing rest frame
  return frames;
}

/**
 * Hook that animates players and ball through the arrow sequence.
 * Returns a `frame` object with live positions + ball pos, plus controls.
 */
export function useAnimation(players, arrows, stepMs = DEFAULT_STEP_MS) {
  const [frame, setFrame] = useState(null);
  const animRef = useRef(null);
  const rafRef = useRef(null);
  const stepMsRef = useRef(stepMs);
  stepMsRef.current = stepMs;

  const sequence = animationSequence(arrows);

  // Store tick in a ref so it always reads the latest sequence/players/speed.
  const tickRef = useRef(null);
  tickRef.current = () => {
    const a = animRef.current;
    if (!a?.playing) return;

    const t = Math.min(1, (performance.now() - a.startTime) / stepMsRef.current);
    const cur = a.sequence[a.stepIdx];

    let ballPos = null;
    let positions = a.committed;

    if (cur) {
      if (cur.kind === 'ball') {
        ballPos = bezierPt(cur.from, cur.to, cur.curvature, t);
      } else {
        const p = closestPlayer(a.committed, cur.from);
        if (p) {
          positions = a.committed.map((pl) =>
            pl.id === p.id
              ? { ...pl, x: pl.x + (cur.to.x - pl.x) * t, y: pl.y + (cur.to.y - pl.y) * t }
              : pl,
          );
        }
      }
    }

    setFrame({
      ballPos,
      positions,
      playing: true,
      stepIdx: a.stepIdx,
      totalSteps: a.sequence.length,
      done: false,
    });

    if (t < 1) {
      rafRef.current = requestAnimationFrame(() => tickRef.current());
      return;
    }

    // Commit completed step
    let committed = a.committed;
    if (cur?.kind.startsWith('movement')) {
      const p = closestPlayer(committed, cur.from);
      if (p)
        committed = committed.map((pl) =>
          pl.id === p.id ? { ...pl, x: cur.to.x, y: cur.to.y } : pl,
        );
    }

    const nextIdx = a.stepIdx + 1;
    if (nextIdx >= a.sequence.length) {
      a.playing = false;
      setFrame({
        ballPos: null,
        positions: committed,
        playing: false,
        stepIdx: nextIdx,
        totalSteps: a.sequence.length,
        done: true,
      });
      return;
    }

    a.committed = committed;
    a.stepIdx = nextIdx;
    a.startTime = performance.now();
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  };

  const play = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const committed = players.map((p) => ({ ...p }));
    animRef.current = {
      playing: true,
      stepIdx: 0,
      committed,
      startTime: performance.now(),
      sequence,
    };
    setFrame(null);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, arrows]);

  const pause = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (animRef.current) animRef.current.playing = false;
    setFrame((f) => (f ? { ...f, playing: false } : f));
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (animRef.current) animRef.current.playing = false;
    animRef.current = null;
    setFrame(null);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { frame, play, pause, reset };
}

/** Animated ball shown during playback. */
export function AnimBall({ pos }) {
  if (!pos) return null;
  return (
    <circle
      cx={pos.x}
      cy={pos.y}
      r={7}
      fill="#eab308"
      stroke="#fff"
      strokeWidth="2"
      pointerEvents="none"
    />
  );
}

/** Sidebar panel shown on the right in animation mode. */
export function AnimSidePanel({ frame, onPlay, onPause, onReset, onClose, speed, onSpeedChange, onExportGif, gifProgress }) {
  const playing = frame?.playing ?? false;
  const done = frame?.done ?? false;
  const step = frame ? Math.min(frame.stepIdx + 1, frame.totalSteps) : 0;
  const total = frame?.totalSteps ?? 0;
  const exporting = gifProgress != null;

  return (
    <aside className="w-full md:w-72 p-4 bg-white border-t md:border-t-0 md:border-l border-slate-200 text-sm space-y-3 select-none">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-700">Animation</p>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 px-2"
          title="Exit animation mode"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={playing ? onPause : onPlay}
          className="flex-1 px-3 py-2 rounded bg-blue-500 hover:bg-blue-400 text-white font-medium"
        >
          {playing ? 'Pause' : done ? 'Replay' : 'Play'}
        </button>
        <button
          onClick={onReset}
          className="px-3 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
        >
          Reset
        </button>
      </div>

      {frame && (
        <p className="text-xs text-slate-500">
          {done ? 'Done' : `Step ${step} of ${total}`}
        </p>
      )}

      <div>
        <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
          Speed ({speed}×)
        </label>
        <input
          type="range"
          min="0.25"
          max="3"
          step="0.25"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="pt-1 border-t border-slate-100">
        <button
          onClick={onExportGif}
          disabled={exporting}
          className="w-full px-3 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title="Render the animation as an animated GIF at the current speed"
        >
          {exporting ? `Rendering… ${Math.round(gifProgress * 100)}%` : "⬇ Export GIF"}
        </button>
        {exporting && (
          <div className="mt-2 h-1.5 w-full rounded bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-[width] duration-150"
              style={{ width: `${Math.round(gifProgress * 100)}%` }}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Click the court to exit and edit. Plays through all arrows in sequence.
      </p>
    </aside>
  );
}
