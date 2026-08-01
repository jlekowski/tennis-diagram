import { createPortal } from "react-dom";

/**
 * Bottom sheet used on mobile in place of the desktop right sidebar.
 *
 * Rendered in a portal so it escapes the flex layout and can overlay the
 * court. The scrim is `pointer-events-none`: it dims the whole screen for
 * visual context, but touches must fall through to the court underneath so
 * the selected element's drag handles (rendered on the court, above the
 * sheet) stay interactive while the sheet is open. Tapping empty court
 * already deselects via the court's own pointer handling; the grab-handle
 * bar doubles as an explicit tap-to-close control for when the court itself
 * isn't a convenient target (e.g. the sheet covers most of the screen).
 */
export default function Sheet({ open, onClose, children }) {
  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/20 pointer-events-none"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="sheet-in fixed inset-x-0 bottom-0 z-50 max-h-[75%] overflow-y-auto rounded-t-2xl bg-white shadow-2xl pb-safe"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="flex w-full justify-center pt-2 pb-1"
        >
          <span className="h-1 w-10 rounded-full bg-slate-300" />
        </button>
        {children}
      </div>
    </>,
    document.body,
  );
}
