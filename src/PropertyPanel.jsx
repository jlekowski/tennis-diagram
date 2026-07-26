/**
 * `chrome` carries the layout classes for the panel shell so the same panels
 * can render as the desktop right sidebar or bare inside the mobile Sheet.
 */
const SIDEBAR_CHROME = "w-72 border-l border-slate-200";

export default function PropertyPanel({
  arrow,
  angles,
  onChange,
  onDelete,
  onClose,
  chrome = SIDEBAR_CHROME,
}) {
  if (angles) {
    return <AnglesPanel angles={angles} onChange={onChange} onDelete={onDelete} onClose={onClose} chrome={chrome} />;
  }
  if (arrow) {
    return <ArrowPanel arrow={arrow} onChange={onChange} onDelete={onDelete} onClose={onClose} chrome={chrome} />;
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

function ArrowPanel({ arrow, onChange, onDelete, onClose, chrome }) {
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

      <FieldRow label={`Curvature (${Math.round(arrow.curvature || 0)})`}>
        <input
          type="range"
          min="-160"
          max="160"
          step="2"
          value={arrow.curvature || 0}
          onChange={(e) => onChange({ curvature: parseInt(e.target.value, 10) })}
          className="w-full"
        />
      </FieldRow>

      <DeleteButton onClick={onDelete} label="Delete arrow" />
    </aside>
  );
}

function AnglesPanel({ angles, onChange, onDelete, onClose, chrome }) {
  const bisects = angles.bisects ?? 0;
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
              {v === 0 ? "None" : v === 1 ? "1 (center)" : "2 (quarters)"}
            </button>
          ))}
        </div>
      </FieldRow>

      <DeleteButton onClick={onDelete} label="Delete angles" />
    </aside>
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
