import { useEffect, useRef, useState } from "react";

/**
 * `chrome` carries the layout classes for the panel shell so the same panels
 * can render as the desktop right sidebar or bare inside the mobile Sheet.
 */
const SIDEBAR_CHROME = "w-72 border-l border-slate-200";

export default function PropertyPanel({
  arrow,
  angles,
  onChange,
  onCurvaturePreview,
  onCurvatureCommit,
  onDelete,
  onClose,
  chrome = SIDEBAR_CHROME,
}) {
  if (angles) {
    return <AnglesPanel angles={angles} onChange={onChange} onDelete={onDelete} onClose={onClose} chrome={chrome} />;
  }
  if (arrow) {
    return (
      <ArrowPanel
        arrow={arrow}
        onChange={onChange}
        onCurvaturePreview={onCurvaturePreview}
        onCurvatureCommit={onCurvatureCommit}
        onDelete={onDelete}
        onClose={onClose}
        chrome={chrome}
      />
    );
  }
  return (
    <aside className={"p-4 bg-white text-sm text-slate-500 " + chrome}>
      <p className="font-semibold text-slate-700 mb-2">Properties</p>
      <p>Select an arrow or angles wedge to edit it.</p>
      <p className="mt-4 text-xs text-slate-400">
        Tip: pick a draw tool, then drag (arrow) or click three times (angles) on the court.
        Drag handles to reshape a selected element.
      </p>
    </aside>
  );
}

function ArrowPanel({ arrow, onChange, onCurvaturePreview, onCurvatureCommit, onDelete, onClose, chrome }) {
  // Curvature is dragged via a range input; `input` fires continuously (live
  // preview, not committed to undo history) while `change` fires once the
  // drag/keypress ends (the single value that gets committed).
  const [liveCurvature, setLiveCurvature] = useState(null);
  const curvatureRef = useRef(null);
  const compact = chrome === "";

  useEffect(() => setLiveCurvature(null), [arrow.id]);

  useEffect(() => {
    const el = curvatureRef.current;
    if (!el) return undefined;
    function onCommit(e) {
      onCurvatureCommit(parseInt(e.target.value, 10));
      setLiveCurvature(null);
    }
    el.addEventListener("change", onCommit);
    return () => el.removeEventListener("change", onCommit);
  }, [onCurvatureCommit]);

  const displayCurvature = liveCurvature ?? arrow.curvature ?? 0;

  const curvatureSlider = (
    <input
      ref={curvatureRef}
      type="range"
      min="-160"
      max="160"
      step="2"
      value={displayCurvature}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        setLiveCurvature(v);
        onCurvaturePreview(v);
      }}
      className={compact ? "flex-1" : "w-full"}
    />
  );

  if (compact) {
    return (
      <aside className="p-2 bg-white text-sm space-y-2">
        <CompactHeader title={labelForArrowKind(arrow.kind)} onDelete={onDelete} deleteLabel="Delete arrow" onClose={onClose} />
        <input
          type="text"
          value={arrow.label || ""}
          placeholder="e.g. wide serve, poach, lob"
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
        />
        {arrow.kind === "ball" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">Curve</span>
            {curvatureSlider}
            <span className="text-xs text-slate-500 w-8 text-right shrink-0">{Math.round(displayCurvature)}</span>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className={"p-4 bg-white text-sm space-y-3 " + chrome}>
      <PanelHeader title="Arrow properties" onClose={onClose} />

      <FieldRow label="Kind">
        <div className="text-slate-800">{labelForArrowKind(arrow.kind)}</div>
      </FieldRow>

      <FieldRow label="Label">
        <input
          type="text"
          value={arrow.label || ""}
          placeholder="e.g. wide serve, poach, lob"
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
        />
      </FieldRow>

      {arrow.kind === "ball" && (
        <FieldRow label={`Curvature (${Math.round(displayCurvature)})`}>
          {curvatureSlider}
        </FieldRow>
      )}

      <DeleteButton onClick={onDelete} label="Delete arrow" />
    </aside>
  );
}

function AnglesPanel({ angles, onChange, onDelete, onClose, chrome }) {
  const bisects = angles.bisects ?? 0;
  const compact = chrome === "";

  const bisectButtons = (labels) => (
    <div className="flex gap-1">
      {[0, 1, 2].map((v) => (
        <button
          key={v}
          onClick={() => onChange({ bisects: v })}
          className={
            "flex-1 px-2 py-1.5 text-sm rounded border " +
            (bisects === v
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50")
          }
        >
          {labels[v]}
        </button>
      ))}
    </div>
  );

  if (compact) {
    return (
      <aside className="p-2 bg-white text-sm space-y-2">
        <CompactHeader title="Shot angles" onDelete={onDelete} deleteLabel="Delete angles" onClose={onClose} />
        <input
          type="text"
          value={angles.label || ""}
          placeholder="e.g. possible returns"
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
        />
        {bisectButtons(["None", "1×", "2×"])}
      </aside>
    );
  }

  return (
    <aside className={"p-4 bg-white text-sm space-y-3 " + chrome}>
      <PanelHeader title="Angles properties" onClose={onClose} />

      <FieldRow label="Kind">
        <div className="text-slate-800">Shot angles</div>
      </FieldRow>

      <FieldRow label="Label">
        <input
          type="text"
          value={angles.label || ""}
          placeholder="e.g. possible returns"
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm"
        />
      </FieldRow>

      <FieldRow label="Bisect lines">
        {bisectButtons(["None", "1 (center)", "2 (quarters)"])}
      </FieldRow>

      <DeleteButton onClick={onDelete} label="Delete angles" />
    </aside>
  );
}

function CompactHeader({ title, onDelete, deleteLabel, onClose }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-medium text-slate-700 flex-1 truncate">{title}</span>
      <button
        onClick={onDelete}
        title={deleteLabel}
        aria-label={deleteLabel}
        className="text-rose-600 hover:bg-rose-50 rounded px-2 py-1 text-base leading-none"
      >
        🗑
      </button>
      <button
        onClick={onClose}
        title="Deselect"
        aria-label="Deselect"
        className="text-slate-400 hover:text-slate-700 px-2 py-1"
      >
        ✕
      </button>
    </div>
  );
}

function PanelHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between">
      <p className="font-semibold text-slate-700">{title}</p>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-700 px-2"
        title="Deselect"
      >
        ✕
      </button>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function DeleteButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm"
    >
      {label}
    </button>
  );
}

function labelForArrowKind(kind) {
  switch (kind) {
    case "ball":       return "Ball trajectory";
    case "movement-a": return "Movement (server team)";
    case "movement-b": return "Movement (receiver team)";
    default:           return kind;
  }
}
