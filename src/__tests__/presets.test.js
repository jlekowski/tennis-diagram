import { describe, it, expect, vi } from "vitest";
import { applyPreset, parsePresetsJsonl, buildPresetGroups } from "../presets.js";

// ---- parsePresetsJsonl ----

describe("parsePresetsJsonl", () => {
  it("parses a single valid preset line", () => {
    const jsonl = JSON.stringify({
      label: "Wide serve",
      players: [{ id: "S", team: "A", label: "S", x: 100, y: 200 }],
    });
    const result = parsePresetsJsonl(jsonl);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Wide serve");
    expect(result[0].players).toHaveLength(1);
    expect(result[0].group).toBe("Saved");
  });

  it("parses multiple lines", () => {
    const jsonl = [
      JSON.stringify({ label: "Preset 1", players: [] }),
      JSON.stringify({ label: "Preset 2", players: [] }),
    ].join("\n");
    const result = parsePresetsJsonl(jsonl);
    expect(result).toHaveLength(2);
  });

  it("skips empty lines and comments", () => {
    const jsonl = [
      "",
      "// this is a comment",
      JSON.stringify({ label: "Valid", players: [] }),
    ].join("\n");
    const result = parsePresetsJsonl(jsonl);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Valid");
  });

  it("uses explicit group and key when provided", () => {
    const jsonl = JSON.stringify({
      key: "my-key",
      group: "My Group",
      label: "Test",
      players: [],
    });
    const result = parsePresetsJsonl(jsonl);
    expect(result[0].key).toBe("my-key");
    expect(result[0].group).toBe("My Group");
  });

  it("rejects lines without label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const jsonl = JSON.stringify({ players: [] });
    const result = parsePresetsJsonl(jsonl);
    expect(result).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("rejects lines without players array", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const jsonl = JSON.stringify({ label: "Test" });
    const result = parsePresetsJsonl(jsonl);
    expect(result).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("handles optional arrows and angles", () => {
    const jsonl = JSON.stringify({
      label: "With arrows",
      players: [],
      arrows: [{ id: "a1", kind: "ball", from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, label: "", curvature: 0 }],
      angles: [{ id: "ang1", source: { x: 0, y: 0 }, left: { x: 5, y: 5 }, right: { x: 5, y: -5 }, label: "", bisects: 0 }],
    });
    const result = parsePresetsJsonl(jsonl);
    expect(result[0].arrows).toHaveLength(1);
    expect(result[0].angles).toHaveLength(1);
  });

  it("defaults arrows and angles to empty arrays when missing", () => {
    const jsonl = JSON.stringify({ label: "Test", players: [] });
    const result = parsePresetsJsonl(jsonl);
    expect(result[0].arrows).toEqual([]);
    expect(result[0].angles).toEqual([]);
  });
});

// ---- applyPreset ----

describe("applyPreset", () => {
  const preset = {
    key: "p1",
    group: "Test",
    label: "Test Preset",
    players: [{ id: "S", team: "A", label: "S", x: 100, y: 200 }],
    arrows: [{ id: "a1", kind: "ball", from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, label: "", curvature: 0 }],
    angles: [{ id: "ang1", source: { x: 0, y: 0 }, left: { x: 5, y: 5 }, right: { x: 5, y: -5 }, label: "", bisects: 0 }],
  };

  it("applies the preset by key", () => {
    const state = {
      players: [],
      arrows: [],
      angles: [],
    };
    const next = applyPreset(state, "p1", [preset]);
    expect(next.players).toHaveLength(1);
    expect(next.arrows).toHaveLength(1);
    expect(next.angles).toHaveLength(1);
  });

  it("returns unchanged state for unknown key", () => {
    const state = { players: [], arrows: [], angles: [] };
    const next = applyPreset(state, "unknown", [preset]);
    expect(next).toBe(state);
  });

  it("returns unchanged state for empty presets array", () => {
    const state = { players: [{ id: "x", team: "A", label: "S", x: 0, y: 0 }], arrows: [], angles: [] };
    const next = applyPreset(state, "p1", []);
    expect(next).toBe(state);
  });

  it("does not mutate the preset data", () => {
    const state = { players: [], arrows: [], angles: [] };
    const next = applyPreset(state, "p1", [preset]);
    // The returned players array should be a copy, not the same reference
    expect(next.players).not.toBe(preset.players);
    expect(next.players[0]).not.toBe(preset.players[0]);
  });
});

// ---- buildPresetGroups ----

describe("buildPresetGroups", () => {
  it("groups presets by group field", () => {
    const presets = [
      { key: "a", group: "Group 1", label: "Preset A", players: [], arrows: [], angles: [] },
      { key: "b", group: "Group 2", label: "Preset B", players: [], arrows: [], angles: [] },
      { key: "c", group: "Group 1", label: "Preset C", players: [], arrows: [], angles: [] },
    ];
    const result = buildPresetGroups(presets);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("Group 1");
    expect(result[0].options).toHaveLength(2);
    expect(result[1].label).toBe("Group 2");
    expect(result[1].options).toHaveLength(1);
  });

  it("preserves order of groups", () => {
    const presets = [
      { key: "a", group: "Z", label: "A", players: [], arrows: [], angles: [] },
      { key: "b", group: "A", label: "B", players: [], arrows: [], angles: [] },
    ];
    const result = buildPresetGroups(presets);
    expect(result[0].label).toBe("Z");
    expect(result[1].label).toBe("A");
  });

  it("returns empty array for empty input", () => {
    expect(buildPresetGroups([])).toEqual([]);
  });
});
