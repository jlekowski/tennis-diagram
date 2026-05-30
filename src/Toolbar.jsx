import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOOL_BUTTONS = [
  { id: "select",      label: "Select",  icon: "↖", hint: "Click arrows; drag players" },
  { id: "ball",        label: "Ball",    icon: "●", hint: "Drag to draw ball path" },
  { id: "movement-a",  label: "Move S",  icon: "↝", hint: "Drag to draw blue movement arrow (server team)" },
  { id: "movement-b",  label: "Move R",  icon: "↝", hint: "Drag to draw red movement arrow (receiver team)" },
  { id: "angles",      label: "Angles",  icon: "∠", hint: "Click source, then left edge, then right edge" },
];

const TOOL_BTN_STYLE = {
  selected:   "bg-slate-900 text-white border-slate-900",
  unselected: "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
};

const TOOL_BTN_ACCENT = {
  "ball": {
    selected:   "bg-yellow-400 text-slate-900 border-yellow-400",
    unselected: "bg-white text-yellow-700 border-yellow-400 hover:bg-yellow-50",
  },
  "angles": {
    selected:   "bg-yellow-400 text-slate-900 border-yellow-400",
    unselected: "bg-white text-yellow-700 border-yellow-400 hover:bg-yellow-50",
  },
  "movement-a": {
    selected:   "bg-blue-600 text-white border-blue-600",
    unselected: "bg-white text-blue-600 border-blue-300 hover:bg-blue-50",
  },
  "movement-b": {
    selected:   "bg-red-600 text-white border-red-600",
    unselected: "bg-white text-red-600 border-red-300 hover:bg-red-50",
  },
};

export default function Toolbar({
  tool,
  onToolChange,
  presetGroups,
  onApplyPreset,
  selectedPreset,
  onLoadPresets,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportSvg,
  onExportPng,
  onExportJson,
  onImportJson,
  onReset,
  animMode,
  onAnimMode,
}) {
  return (
    <div className="flex flex-nowrap overflow-x-auto items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200 sticky top-0 z-20">

      {/* Tools */}
      <div className="flex items-center gap-1.5">
        {TOOL_BUTTONS.map((b) => (
          <button
            key={b.id}
            title={b.hint}
            onClick={() => onToolChange(b.id)}
            className={
              "px-2 py-1.5 text-sm rounded border transition flex items-center gap-1 whitespace-nowrap " +
              ((TOOL_BTN_ACCENT[b.id] ?? TOOL_BTN_STYLE)[tool === b.id ? "selected" : "unselected"])
            }
          >
            <span className="text-base leading-none select-none">{b.icon}</span>
            <span>{b.label}</span>
          </button>
        ))}
      </div>

      <Divider />

      {/* Preset */}
      <select
        value={selectedPreset ?? ""}
        onChange={(e) => { if (e.target.value) onApplyPreset(e.target.value); }}
        className="px-2 py-1.5 text-sm rounded border border-slate-300 bg-white"
      >
        <option value="" disabled>Choose…</option>
        {presetGroups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      <Divider />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="px-2 py-1.5 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Undo (Ctrl/⌘+Z)"
        >
          ↩ Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="px-2 py-1.5 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Redo (Ctrl/⌘+Shift+Z)"
        >
          ↪ Redo
        </button>
      </div>

      <Divider />

      {/* File menu */}
      <FileMenu
        onExportSvg={onExportSvg}
        onExportPng={onExportPng}
        onExportJson={onExportJson}
        onImportJson={onImportJson}
        onLoadPresets={onLoadPresets}
      />

      <Divider />

      {/* Reset */}
      <button
        onClick={onReset}
        className="px-2 py-1.5 text-sm rounded border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
        title="Reset to initial scene"
      >
        Reset
      </button>

      <Divider />

      {/* Animate */}
      <button
        onClick={onAnimMode}
        className={
          "px-2 py-1.5 text-sm rounded border transition flex items-center gap-1 " +
          (animMode
            ? "bg-emerald-600 text-white border-emerald-600"
            : "bg-white text-emerald-700 border-emerald-400 hover:bg-emerald-50")
        }
        title="Play animation through all arrows in sequence"
      >
        <span className="text-base leading-none select-none">▶</span>
        Animate
      </button>
    </div>
  );
}

function FileMenu({ onExportSvg, onExportPng, onExportJson, onImportJson, onLoadPresets }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // { top, left } fixed-position anchor
  const ref = useRef(null);
  const btnRef = useRef(null);

  // Position the menu relative to the button. The dropdown is rendered in a
  // portal (not nested in the toolbar) so the toolbar's overflow-x-auto can't
  // clip it; that means it needs explicit fixed coordinates.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const MENU_W = 176; // w-44
    function place() {
      const r = btnRef.current.getBoundingClientRect();
      const left = Math.min(r.left, window.innerWidth - MENU_W - 8);
      setPos({ top: r.bottom + 4, left: Math.max(8, left) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        !btnRef.current?.contains(e.target) &&
        !ref.current?.contains(e.target)
      )
        setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function item(label, action) {
    return (
      <button
        key={label}
        onClick={() => { action(); setOpen(false); }}
        className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        {label}
      </button>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1.5 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50"
      >
        File ▾
      </button>
      {open && pos &&
        createPortal(
          <div
            ref={ref}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="w-44 bg-white border border-slate-200 rounded shadow-lg z-50"
          >
            {item("Export SVG", onExportSvg)}
            {item("Export PNG", onExportPng)}
            {item("Save JSON", onExportJson)}
            {item("Load JSON", onImportJson)}
            <div className="border-t border-slate-100 my-0.5" />
            {item("Load presets (.jsonl)", onLoadPresets)}
          </div>,
          document.body,
        )}
    </>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-slate-200 mx-1" />;
}
