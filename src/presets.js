/**
 * Preset utilities. All preset data is loaded at runtime from public/presets.jsonl.
 *
 * Court reference points (SVG-space, viewBox 360x710):
 *   - x: doubles sidelines at 30/330, singles at 68/292, center 180
 *   - y: baselines at 30/680, service lines at 180/530, net at 355
 *
 * Convention: Team A serves from the bottom half (y > net).
 */

export function applyPreset(state, key, userPresets = []) {
  const preset = userPresets.find((p) => p.key === key);
  if (!preset) return state;
  return {
    ...state,
    players: preset.players.map((p) => ({ ...p })),
    arrows: (preset.arrows ?? []).map((a) => ({ ...a })),
    angles: (preset.angles ?? []).map((a) => ({ ...a })),
  };
}

/**
 * Parse a JSONL presets file. Each non-empty line must be a JSON object with
 * at least `label` and `players`. Optional fields: `key`, `group`.
 *
 * Example line:
 *   {"label":"Wide serve deuce","group":"My presets","players":[...]}
 */
export function parsePresetsJsonl(text) {
  const results = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("//")) return;
    try {
      const p = JSON.parse(line);
      if (!p.label || !Array.isArray(p.players))
        throw new Error("missing label or players");
      results.push({
        key:     p.key    ?? `user_${i}_${Date.now()}`,
        group:   p.group  ?? "Saved",
        label:   p.label,
        players: p.players,
        arrows:  Array.isArray(p.arrows)  ? p.arrows  : [],
        angles:  Array.isArray(p.angles)  ? p.angles  : [],
      });
    } catch (err) {
      console.warn(`presets.jsonl line ${i + 1}: ${err.message}`);
    }
  });
  return results;
}

/**
 * Build an order-preserving grouped structure for the preset dropdown.
 */
export function buildPresetGroups(userPresets) {
  const groups = [];
  const seen = {};
  for (const p of userPresets) {
    if (!seen[p.group]) {
      seen[p.group] = { label: p.group, options: [] };
      groups.push(seen[p.group]);
    }
    seen[p.group].options.push({ key: p.key, label: p.label });
  }
  return groups;
}
