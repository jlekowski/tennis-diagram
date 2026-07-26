import { createPortal } from "react-dom";

/**
 * Bottom sheet used on mobile in place of the desktop right sidebar.
 *
 * Rendered in a portal so it escapes the flex layout and can overlay the
 * court. Tapping the scrim calls `onClose`.
 */
export default function Sheet({ open, onClose, children }) {
  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/20"
        onPointerDown={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="sheet-in fixed inset-x-0 bottom-0 z-50 max-h-[75%] overflow-y-auto rounded-t-2xl bg-white shadow-2xl pb-safe"
      >
        <div className="flex justify-center pt-2 pb-1">
          <span className="h-1 w-10 rounded-full bg-slate-300" />
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}
