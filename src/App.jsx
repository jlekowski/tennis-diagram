import { useEffect, useRef, useState } from "react";
import {
  useDiagramState,
  movePlayer,
  addArrow,
  updateArrow,
  deleteArrow,
  nextArrowId,
  addAngles,
  updateAngles,
  deleteAngles,
  nextAnglesId,
  initialState,
} from "./store.js";
import { applyPreset, buildPresetGroups, parsePresetsJsonl } from "./presets.js";
import { CourtSvg, COURT_VIEWBOX, clientToSvg } from "./Court.jsx";
import Player, { PLAYER_RADIUS } from "./Player.jsx";
import Arrow from "./Arrow.jsx";
import Angles from "./Angles.jsx";
import Toolbar from "./Toolbar.jsx";
import PropertyPanel from "./PropertyPanel.jsx";
import { downloadSvg, downloadPng, downloadGif } from "./export.js";
import {
  downloadJson,
  fromJson,
  loadFromStorage,
  saveToStorage,
} from "./persist.js";
import { useAnimation, AnimBall, AnimSidePanel } from "./AnimationPlayer.jsx";

const MIN_ARROW_LEN = 8;
const HANDLE_R = 6;

export default function App() {
  const { state, commit, undo, redo, canUndo, canRedo, reset } =
    useDiagramState(() => loadFromStorage() ?? initialState);

  const [animMode, setAnimMode] = useState(false);
  const [animSpeed, setAnimSpeed] = useState(1);
  const [gifProgress, setGifProgress] = useState(null); // 0..1 while exporting
  const { frame: animFrame, play: animPlay, pause: animPause, reset: animReset } =
    useAnimation(state.players, state.arrows, Math.round(700 / animSpeed));

  const [tool, setTool] = useState("select");
  const [selectedArrowId, setSelectedArrowId] = useState(null);
  const [selectedAnglesId, setSelectedAnglesId] = useState(null);
  const [drag, setDrag] = useState(null);              // player drag
  const [drawing, setDrawing] = useState(null);        // arrow drawing
  const [anglesDraft, setAnglesDraft] = useState(null); // { source, left? }
  const [pointerPos, setPointerPos] = useState(null);   // angles draft preview
  // Endpoint-handle drag: { kind: 'arrow'|'angles', id, point, x, y }
  const [handleDrag, setHandleDrag] = useState(null);

  const [userPresets, setUserPresets] = useState([]);
  const [lastPresetKey, setLastPresetKey] = useState(null);

  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const presetsFileRef = useRef(null);

  useEffect(() => { saveToStorage(state); }, [state]);

  useEffect(() => {
    fetch("./presets.jsonl")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const parsed = parsePresetsJsonl(text);
        if (parsed.length) setUserPresets(parsed);
      })
      .catch((err) => console.warn("Could not load presets.jsonl:", err.message));
  }, []);

  const angles = state.angles ?? [];
  const selectedArrow  = state.arrows.find((a) => a.id === selectedArrowId)  || null;
  const selectedAngles = angles.find((a) => a.id === selectedAnglesId)       || null;

  function deselectAll() {
    setSelectedArrowId(null);
    setSelectedAnglesId(null);
  }
  function selectArrow(id)  { setSelectedArrowId(id);  setSelectedAnglesId(null); }
  function selectAngles(id) { setSelectedAnglesId(id); setSelectedArrowId(null); }
  function changeTool(t) {
    setTool(t);
    deselectAll();
    setAnglesDraft(null);
  }

  function enterAnimMode() {
    setTool("select");
    deselectAll();
    setAnglesDraft(null);
    setAnimMode(true);
  }
  function exitAnimMode() {
    if (gifProgress != null) return; // don't bail out mid-export
    animReset();
    setAnimMode(false);
  }

  async function handleExportGif() {
    if (!svgRef.current || gifProgress != null) return;
    // Reset so the live SVG shows resting player positions before we clone it.
    animReset();
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    setGifProgress(0);
    try {
      await downloadGif(svgRef.current, state.players, state.arrows, {
        stepMs: Math.round(700 / animSpeed),
        onProgress: setGifProgress,
      });
    } catch (err) {
      alert(err.message || "GIF export failed");
    } finally {
      setGifProgress(null);
    }
  }

  // ---- Pointer handling on the SVG -----------------------------------------

  function getSvgPoint(e) {
    return clientToSvg(svgRef.current, e.clientX, e.clientY);
  }

  function clampToCourt(p) {
    const minX = COURT_VIEWBOX.minX + PLAYER_RADIUS;
    const maxX = COURT_VIEWBOX.minX + COURT_VIEWBOX.w - PLAYER_RADIUS;
    const minY = COURT_VIEWBOX.minY + PLAYER_RADIUS;
    const maxY = COURT_VIEWBOX.minY + COURT_VIEWBOX.h - PLAYER_RADIUS;
    return {
      x: Math.max(minX, Math.min(maxX, p.x)),
      y: Math.max(minY, Math.min(maxY, p.y)),
    };
  }

  function snapPointToPlayer(pt, target) {
    const playerEl = target.closest?.("[data-player-id]");
    if (!playerEl) return pt;
    const id = playerEl.getAttribute("data-player-id");
    const player = state.players.find((p) => p.id === id);
    return player ? { x: player.x, y: player.y } : pt;
  }

  function handlePointerDown(e) {
    if (e.button !== 0) return;

    const pt = getSvgPoint(e);
    const handleEl = e.target.closest("[data-handle-point]");
    const playerEl = e.target.closest("[data-player-id]");
    const arrowEl  = e.target.closest("[data-arrow-id]");
    const anglesEl = e.target.closest("[data-angles-id]");

    // -------- Angles tool: 3-click workflow ----------
    if (tool === "angles") {
      const snapped = snapPointToPlayer(pt, e.target);
      if (!anglesDraft) {
        setAnglesDraft({ source: snapped });
        setPointerPos(snapped);
        return;
      }
      if (!anglesDraft.left) {
        setAnglesDraft({ ...anglesDraft, left: pt });
        return;
      }
      const newAngles = {
        id: nextAnglesId(angles),
        source: anglesDraft.source,
        left:   anglesDraft.left,
        right:  pt,
        label:  "",
        bisects: 0,
      };
      commit((s) => addAngles(s, newAngles));
      setAnglesDraft(null);
      setPointerPos(null);
      selectAngles(newAngles.id);
      setTool("select");
      return;
    }

    // -------- Select tool ----------
    if (tool === "select") {
      if (handleEl) {
        const kind  = handleEl.getAttribute("data-handle-kind");
        const elId  = handleEl.getAttribute("data-handle-element-id");
        const point = handleEl.getAttribute("data-handle-point");
        const el =
          kind === "arrow"
            ? state.arrows.find((a) => a.id === elId)
            : angles.find((a) => a.id === elId);
        if (!el) return;
        const origin = el[point];
        setHandleDrag({ kind, id: elId, point, x: origin.x, y: origin.y });
        svgRef.current.setPointerCapture(e.pointerId);
        return;
      }
      if (playerEl) {
        const playerId = playerEl.getAttribute("data-player-id");
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;
        setDrag({
          playerId,
          dx: pt.x - player.x,
          dy: pt.y - player.y,
          x: player.x, y: player.y,
        });
        svgRef.current.setPointerCapture(e.pointerId);
        return;
      }
      if (arrowEl) {
        selectArrow(arrowEl.getAttribute("data-arrow-id"));
        return;
      }
      if (anglesEl) {
        selectAngles(anglesEl.getAttribute("data-angles-id"));
        return;
      }
      deselectAll();
      return;
    }

    // -------- Arrow draw tools ----------
    const from = snapPointToPlayer(pt, e.target);
    setDrawing({ kind: tool, from, to: pt });
    svgRef.current.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    const pt = getSvgPoint(e);
    if (anglesDraft) setPointerPos(pt);
    if (handleDrag) {
      setHandleDrag({ ...handleDrag, x: pt.x, y: pt.y });
    } else if (drag) {
      const next = clampToCourt({ x: pt.x - drag.dx, y: pt.y - drag.dy });
      setDrag({ ...drag, x: next.x, y: next.y });
    } else if (drawing) {
      setDrawing({ ...drawing, to: pt });
    }
  }

  function handlePointerUp() {
    if (handleDrag) {
      const { kind, id, point, x, y } = handleDrag;
      const original =
        kind === "arrow"
          ? state.arrows.find((a) => a.id === id)
          : angles.find((a) => a.id === id);
      if (original && (original[point].x !== x || original[point].y !== y)) {
        const updater = kind === "arrow" ? updateArrow : updateAngles;
        commit((s) => updater(s, id, { [point]: { x, y } }));
      }
      setHandleDrag(null);
    }
    if (drag) {
      const { playerId, x, y } = drag;
      const player = state.players.find((p) => p.id === playerId);
      if (player && (player.x !== x || player.y !== y)) {
        commit((s) => movePlayer(s, playerId, x, y));
      }
      setDrag(null);
    }
    if (drawing) {
      const { kind, from, to } = drawing;
      const len = Math.hypot(to.x - from.x, to.y - from.y);
      if (len >= MIN_ARROW_LEN) {
        const newArrow = {
          id: nextArrowId(state.arrows),
          kind, from, to,
          label: "",
          curvature: 0,
        };
        commit((s) => addArrow(s, newArrow));
        selectArrow(newArrow.id);
        setTool("select");
      }
      setDrawing(null);
    }
  }

  // ---- Keyboard ------------------------------------------------------------

  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName;
      const editable = tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;
      if (editable) return;

      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault(); undo(); return;
      }
      if ((meta && e.key.toLowerCase() === "z" && e.shiftKey) ||
          (meta && e.key.toLowerCase() === "y")) {
        e.preventDefault(); redo(); return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedArrowId) {
          e.preventDefault();
          commit((s) => deleteArrow(s, selectedArrowId));
          setSelectedArrowId(null);
        } else if (selectedAnglesId) {
          e.preventDefault();
          commit((s) => deleteAngles(s, selectedAnglesId));
          setSelectedAnglesId(null);
        }
        return;
      }
      if (e.key === "Escape") {
        deselectAll();
        setDrawing(null);
        setAnglesDraft(null);
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, commit, selectedArrowId, selectedAnglesId]);

  // ---- Toolbar handlers ----------------------------------------------------

  function handleApplyPreset(key) {
    commit((s) => applyPreset(s, key, userPresets));
    setLastPresetKey(key);
    deselectAll();
    setAnglesDraft(null);
  }

  async function handlePresetsFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parsePresetsJsonl(text);
      if (!parsed.length) {
        alert("No valid presets found in file.");
        return;
      }
      setUserPresets(parsed);
    } catch (err) {
      alert(`Could not load presets: ${err.message}`);
    }
  }
  function handleReset() {
    const preset = lastPresetKey
      ? userPresets.find((p) => p.key === lastPresetKey)
      : null;
    const msg = preset
      ? `Reset to "${preset.label}" and clear all arrows?`
      : "Clear all arrows and angles?";
    if (confirm(msg)) {
      commit((s) =>
        preset
          ? applyPreset(s, lastPresetKey, userPresets)
          : { ...s, arrows: [], angles: [] },
      );
      deselectAll();
      setAnglesDraft(null);
    }
  }
  function handleExportSvg()  { if (svgRef.current) downloadSvg(svgRef.current); }
  function handleExportPng()  { if (svgRef.current) downloadPng(svgRef.current); }
  function handleExportJson() { downloadJson(state); }
  function handleImportJsonClick() { fileInputRef.current?.click(); }
  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const loaded = fromJson(text);
      reset(loaded);
      deselectAll();
      setAnglesDraft(null);
      setLastPresetKey(null);
    } catch (err) {
      alert(`Could not import file: ${err.message}`);
    }
  }

  // ---- Property panel callbacks --------------------------------------------

  function handlePatchSelected(patch) {
    if (selectedArrowId) {
      commit((s) => updateArrow(s, selectedArrowId, patch));
    } else if (selectedAnglesId) {
      commit((s) => updateAngles(s, selectedAnglesId, patch));
    }
  }
  function handleDeleteSelected() {
    if (selectedArrowId) {
      commit((s) => deleteArrow(s, selectedArrowId));
      setSelectedArrowId(null);
    } else if (selectedAnglesId) {
      commit((s) => deleteAngles(s, selectedAnglesId));
      setSelectedAnglesId(null);
    }
  }

  // ---- Render --------------------------------------------------------------

  // Apply transient handle/player drags onto the rendered objects
  function applyHandleDrag(el, kind) {
    if (!handleDrag || handleDrag.kind !== kind || handleDrag.id !== el.id) return el;
    return { ...el, [handleDrag.point]: { x: handleDrag.x, y: handleDrag.y } };
  }
  const arrowsToRender = state.arrows.map((a) => applyHandleDrag(a, "arrow"));
  const anglesToRender = angles.map((a) => applyHandleDrag(a, "angles"));
  const playersToRender = state.players.map((p) =>
    drag && drag.playerId === p.id ? { ...p, x: drag.x, y: drag.y } : p,
  );

  // In animation mode, override player positions with animated positions
  const displayPlayers = animMode && animFrame
    ? playersToRender.map((p) => {
        const ap = animFrame.positions.find((fp) => fp.id === p.id);
        return ap ? { ...p, x: ap.x, y: ap.y } : p;
      })
    : playersToRender;

  // Angles draft preview
  const draftPreview = (() => {
    if (!anglesDraft || !pointerPos) return null;
    if (!anglesDraft.left) {
      return { kind: "axis", source: anglesDraft.source, end: pointerPos };
    }
    return {
      kind: "angles",
      angles: {
        id: "_draft",
        source: anglesDraft.source,
        left:   anglesDraft.left,
        right:  pointerPos,
        label:  "",
        bisects: 0,
      },
    };
  })();

  // Compute handle points for the selected element (post-transient)
  const handlePoints = (() => {
    if (selectedArrow) {
      const a = arrowsToRender.find((x) => x.id === selectedArrow.id);
      if (!a) return [];
      return [
        { kind: "arrow", elementId: a.id, point: "from", x: a.from.x, y: a.from.y },
        { kind: "arrow", elementId: a.id, point: "to",   x: a.to.x,   y: a.to.y },
      ];
    }
    if (selectedAngles) {
      const a = anglesToRender.find((x) => x.id === selectedAngles.id);
      if (!a) return [];
      return [
        { kind: "angles", elementId: a.id, point: "source", x: a.source.x, y: a.source.y },
        { kind: "angles", elementId: a.id, point: "left",   x: a.left.x,   y: a.left.y },
        { kind: "angles", elementId: a.id, point: "right",  x: a.right.x,  y: a.right.y },
      ];
    }
    return [];
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 bg-white border-b border-slate-200">
        <h1 className="text-lg font-semibold text-slate-800">
          Tennis Tactics Diagram
        </h1>
        <p className="text-xs text-slate-500">
          Drag players, pick a draw tool to add arrows, select an arrow to edit.
        </p>
      </header>

      <Toolbar
        tool={tool}
        onToolChange={changeTool}
        presetGroups={buildPresetGroups(userPresets)}
        onApplyPreset={handleApplyPreset}
        selectedPreset={lastPresetKey}
        onLoadPresets={() => presetsFileRef.current?.click()}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
        onImportJson={handleImportJsonClick}
        onReset={handleReset}
        animMode={animMode}
        onAnimMode={enterAnimMode}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />
      <input
        ref={presetsFileRef}
        type="file"
        accept=".jsonl,text/plain"
        onChange={handlePresetsFileSelected}
        style={{ display: "none" }}
      />

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <main className="flex-1 flex items-center justify-center p-2 md:p-6 bg-slate-50">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden w-full md:w-[420px]">
            <CourtSvg
              ref={svgRef}
              width="100%"
              onPointerDown={animMode ? exitAnimMode : handlePointerDown}
              onPointerMove={animMode ? undefined : handlePointerMove}
              onPointerUp={animMode ? undefined : handlePointerUp}
              style={{
                display: "block",
                cursor: animMode ? "default" : tool === "select" ? "default" : "crosshair",
              }}
            >
              {anglesToRender.map((a) => (
                <Angles
                  key={a.id}
                  angles={a}
                  selected={a.id === selectedAnglesId}
                />
              ))}

              {arrowsToRender.map((arrow) => (
                <Arrow
                  key={arrow.id}
                  arrow={arrow}
                  selected={arrow.id === selectedArrowId}
                />
              ))}

              {drawing && (
                <Arrow
                  arrow={{
                    id: "_preview",
                    kind: drawing.kind,
                    from: drawing.from,
                    to:   drawing.to,
                    curvature: 0,
                  }}
                  preview
                />
              )}

              {draftPreview && draftPreview.kind === "axis" && (
                <g>
                  <circle
                    cx={draftPreview.source.x}
                    cy={draftPreview.source.y}
                    r="4"
                    fill="#eab308"
                    opacity="0.9"
                  />
                  <line
                    x1={draftPreview.source.x}
                    y1={draftPreview.source.y}
                    x2={draftPreview.end.x}
                    y2={draftPreview.end.y}
                    stroke="#eab308"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                </g>
              )}
              {draftPreview && draftPreview.kind === "angles" && (
                <Angles angles={draftPreview.angles} preview />
              )}

              {displayPlayers.map((p) => (
                <Player key={p.id} player={p} />
              ))}

              {animMode && <AnimBall pos={animFrame?.ballPos ?? null} />}

              {/* Endpoint drag handles for the selected arrow / angles */}
              {handlePoints.map((h) => (
                <g
                  key={`${h.kind}-${h.elementId}-${h.point}`}
                  data-handle-point={h.point}
                  data-handle-element-id={h.elementId}
                  data-handle-kind={h.kind}
                  style={{ cursor: "grab" }}
                >
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={HANDLE_R}
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                </g>
              ))}
            </CourtSvg>
          </div>
        </main>

        {animMode ? (
          <AnimSidePanel
            frame={animFrame}
            onPlay={animPlay}
            onPause={animPause}
            onReset={animReset}
            onClose={exitAnimMode}
            speed={animSpeed}
            onSpeedChange={setAnimSpeed}
            onExportGif={handleExportGif}
            gifProgress={gifProgress}
          />
        ) : (
          <PropertyPanel
            arrow={selectedArrow}
            angles={selectedAngles}
            onChange={handlePatchSelected}
            onDelete={handleDeleteSelected}
            onClose={deselectAll}
          />
        )}
      </div>

      <footer className="px-6 py-2 border-t border-slate-200 flex items-center gap-1 text-xs text-slate-400">
        <span>Made by</span>
        <a href="https://lekowski.dev" className="text-slate-500 hover:text-slate-700 underline underline-offset-2">Jerzy Lekowski</a>
        <span>·</span>
        <a href="https://github.com/jlekowski/tennis-diagram" className="text-slate-500 hover:text-slate-700 underline underline-offset-2">GitHub</a>
      </footer>
    </div>
  );
}
