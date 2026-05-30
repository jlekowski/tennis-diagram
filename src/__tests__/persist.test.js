import { describe, it, expect, beforeEach, vi } from "vitest";
import { toJson, fromJson, loadFromStorage, saveToStorage, clearStorage } from "../persist.js";

const sampleState = {
  players: [
    { id: "A_server", team: "A", label: "S", x: 240, y: 695 },
  ],
  arrows: [
    { id: "arrow-1", kind: "ball", from: { x: 100, y: 200 }, to: { x: 150, y: 250 }, label: "serve", curvature: 30 },
  ],
  angles: [
    { id: "angles-1", source: { x: 0, y: 0 }, left: { x: 10, y: 10 }, right: { x: 20, y: 5 }, label: "returns", bisects: 1 },
  ],
};

// ---- toJson / fromJson ----

describe("toJson / fromJson round-trip", () => {
  it("round-trips state faithfully", () => {
    const json = toJson(sampleState);
    const parsed = fromJson(json);
    expect(parsed.players).toEqual(sampleState.players);
    expect(parsed.arrows).toEqual(sampleState.arrows);
    expect(parsed.angles).toEqual(sampleState.angles);
  });

  it("produces valid JSON with version field", () => {
    const json = toJson(sampleState);
    const obj = JSON.parse(json);
    expect(obj.version).toBe(1);
    expect(obj.players).toBeDefined();
    expect(obj.arrows).toBeDefined();
    expect(obj.angles).toBeDefined();
  });
});

describe("fromJson", () => {
  it("rejects non-objects", () => {
    expect(() => fromJson('"string"')).toThrow();
    expect(() => fromJson("42")).toThrow();
    expect(() => fromJson("null")).toThrow();
  });

  it("rejects missing players array", () => {
    expect(() => fromJson(JSON.stringify({ arrows: [] }))).toThrow("Missing players array");
  });

  it("rejects missing arrows array", () => {
    expect(() => fromJson(JSON.stringify({ players: [] }))).toThrow("Missing arrows array");
  });

  it("backwards-compat: accepts legacy 'funnels' key as angles", () => {
    const json = JSON.stringify({
      version: 1,
      players: [],
      arrows: [],
      funnels: [{ id: "f1", source: { x: 0, y: 0 }, left: { x: 10, y: 0 }, right: { x: 10, y: 10 }, label: "", bisects: 0 }],
    });
    const parsed = fromJson(json);
    expect(parsed.angles).toHaveLength(1);
  });

  it("defaults angles to empty array when missing", () => {
    const json = JSON.stringify({
      version: 1,
      players: [],
      arrows: [],
    });
    const parsed = fromJson(json);
    expect(parsed.angles).toEqual([]);
  });
});

// ---- localStorage ----

describe("localStorage persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loadFromStorage returns null when nothing stored", () => {
    expect(loadFromStorage()).toBeNull();
  });

  it("saveToStorage and loadFromStorage round-trip", () => {
    saveToStorage(sampleState);
    const loaded = loadFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded.players).toEqual(sampleState.players);
    expect(loaded.arrows).toEqual(sampleState.arrows);
    expect(loaded.angles).toEqual(sampleState.angles);
  });

  it("loadFromStorage returns null for corrupt data", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem("tennis-diagram-autosave-v1", "not json");
    expect(loadFromStorage()).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("clearStorage removes the item", () => {
    saveToStorage(sampleState);
    clearStorage();
    expect(localStorage.getItem("tennis-diagram-autosave-v1")).toBeNull();
  });
});
