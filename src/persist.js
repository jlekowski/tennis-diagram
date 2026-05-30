const STORAGE_KEY = "tennis-diagram-autosave-v1";
const SCHEMA_VERSION = 1;

export function toJson(state) {
  return JSON.stringify(
    {
      version: SCHEMA_VERSION,
      players: state.players,
      arrows: state.arrows,
      angles: state.angles ?? [],
    },
    null,
    2,
  );
}

export function fromJson(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== "object") throw new Error("Not a JSON object");
  if (!Array.isArray(data.players)) throw new Error("Missing players array");
  if (!Array.isArray(data.arrows)) throw new Error("Missing arrows array");
  // Backwards-compat: accept legacy "funnels" key
  const angles = Array.isArray(data.angles)
    ? data.angles
    : Array.isArray(data.funnels)
      ? data.funnels
      : [];
  return { players: data.players, arrows: data.arrows, angles };
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return fromJson(raw);
  } catch (e) {
    console.warn("Failed to load autosave:", e);
    return null;
  }
}

export function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, toJson(state));
  } catch (e) {
    console.warn("Failed to autosave:", e);
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export function downloadJson(state) {
  const blob = new Blob([toJson(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tennis-diagram-${timestamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
