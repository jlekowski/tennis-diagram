import { describe, it, expect } from "vitest";
import {
  initialState,
  reducer,
  movePlayer,
  addArrow,
  updateArrow,
  deleteArrow,
  nextArrowId,
  addAngles,
  updateAngles,
  deleteAngles,
  nextAnglesId,
} from "../store.js";

// ---- Helpers ----

function freshState(overrides = {}) {
  return {
    players: [
      { id: "A_server", team: "A", label: "S", x: 240, y: 695 },
      { id: "A_net", team: "A", label: "Sp", x: 124, y: 405 },
      { id: "B_returner", team: "B", label: "R", x: 120, y: 15 },
      { id: "B_net", team: "B", label: "Rp", x: 236, y: 305 },
    ],
    arrows: [],
    angles: [],
    ...overrides,
  };
}

// ---- movePlayer ----

describe("movePlayer", () => {
  it("updates the correct player coordinates", () => {
    const state = freshState();
    const next = movePlayer(state, "A_server", 100, 200);
    expect(next.players.find((p) => p.id === "A_server")).toEqual({
      id: "A_server",
      team: "A",
      label: "S",
      x: 100,
      y: 200,
    });
  });

  it("leaves other players unchanged", () => {
    const state = freshState();
    const next = movePlayer(state, "A_server", 100, 200);
    expect(next.players.find((p) => p.id === "B_returner")).toEqual({
      id: "B_returner",
      team: "B",
      label: "R",
      x: 120,
      y: 15,
    });
  });

  it("returns the same state if player id not found", () => {
    const state = freshState();
    const next = movePlayer(state, "nonexistent", 100, 200);
    expect(next.players).toEqual(state.players);
  });

  it("does not mutate the original state", () => {
    const state = freshState();
    const next = movePlayer(state, "A_server", 100, 200);
    expect(next).not.toBe(state);
    expect(next.players).not.toBe(state.players);
  });
});

// ---- addArrow ----

describe("addArrow", () => {
  it("appends an arrow to the arrows array", () => {
    const state = freshState();
    const arrow = { id: "arrow-1", kind: "ball", from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, label: "", curvature: 0 };
    const next = addArrow(state, arrow);
    expect(next.arrows).toHaveLength(1);
    expect(next.arrows[0]).toEqual(arrow);
  });

  it("preserves other state keys", () => {
    const state = freshState({ arrows: [{ id: "arrow-1", kind: "ball", from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, label: "", curvature: 0 }] });
    const arrow = { id: "arrow-2", kind: "movement-a", from: { x: 0, y: 0 }, to: { x: 20, y: 20 }, label: "", curvature: 0 };
    const next = addArrow(state, arrow);
    expect(next.arrows).toHaveLength(2);
    expect(next.players).toEqual(state.players);
    expect(next.angles).toEqual(state.angles);
  });

  it("does not mutate the original state", () => {
    const state = freshState();
    const arrow = { id: "arrow-1", kind: "ball", from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, label: "", curvature: 0 };
    const next = addArrow(state, arrow);
    expect(next).not.toBe(state);
    expect(next.arrows).not.toBe(state.arrows);
  });
});

// ---- updateArrow ----

describe("updateArrow", () => {
  const arrow1 = { id: "arrow-1", kind: "ball", from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, label: "serve", curvature: 0 };
  const arrow2 = { id: "arrow-2", kind: "movement-a", from: { x: 0, y: 0 }, to: { x: 20, y: 20 }, label: "move", curvature: 0 };

  it("patches the correct arrow by id", () => {
    const state = freshState({ arrows: [arrow1, arrow2] });
    const next = updateArrow(state, "arrow-1", { label: "updated" });
    expect(next.arrows[0].label).toBe("updated");
    expect(next.arrows[0].kind).toBe("ball");
  });

  it("leaves other arrows unchanged", () => {
    const state = freshState({ arrows: [arrow1, arrow2] });
    const next = updateArrow(state, "arrow-1", { label: "updated" });
    expect(next.arrows[1]).toEqual(arrow2);
  });

  it("returns unchanged state if id not found", () => {
    const state = freshState({ arrows: [arrow1] });
    const next = updateArrow(state, "nonexistent", { label: "updated" });
    expect(next.arrows).toEqual(state.arrows);
  });
});

// ---- deleteArrow ----

describe("deleteArrow", () => {
  const arrow1 = { id: "arrow-1", kind: "ball", from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, label: "", curvature: 0 };
  const arrow2 = { id: "arrow-2", kind: "movement-a", from: { x: 0, y: 0 }, to: { x: 20, y: 20 }, label: "", curvature: 0 };

  it("removes the arrow by id", () => {
    const state = freshState({ arrows: [arrow1, arrow2] });
    const next = deleteArrow(state, "arrow-1");
    expect(next.arrows).toHaveLength(1);
    expect(next.arrows[0].id).toBe("arrow-2");
  });

  it("returns unchanged state if id not found", () => {
    const state = freshState({ arrows: [arrow1] });
    const next = deleteArrow(state, "nonexistent");
    expect(next.arrows).toEqual(state.arrows);
  });

  it("handles empty arrows array", () => {
    const state = freshState();
    const next = deleteArrow(state, "arrow-1");
    expect(next.arrows).toEqual([]);
  });
});

// ---- nextArrowId ----

describe("nextArrowId", () => {
  it('returns "arrow-1" for empty array', () => {
    expect(nextArrowId([])).toBe("arrow-1");
  });

  it("increments from the highest existing numeric id", () => {
    const arrows = [
      { id: "arrow-3" },
      { id: "arrow-1" },
      { id: "arrow-7" },
    ];
    expect(nextArrowId(arrows)).toBe("arrow-8");
  });

  it("handles gaps in numbering", () => {
    const arrows = [
      { id: "arrow-1" },
      { id: "arrow-5" },
    ];
    expect(nextArrowId(arrows)).toBe("arrow-6");
  });

  it("ignores non-numeric ids", () => {
    const arrows = [{ id: "arrow-abc" }];
    expect(nextArrowId(arrows)).toBe("arrow-1");
  });
});

// ---- Angles helpers ----

describe("addAngles", () => {
  it("appends an angles object to the angles array", () => {
    const state = freshState();
    const ang = { id: "angles-1", source: { x: 0, y: 0 }, left: { x: 10, y: 10 }, right: { x: 20, y: 5 }, label: "", bisects: 0 };
    const next = addAngles(state, ang);
    expect(next.angles).toHaveLength(1);
    expect(next.angles[0]).toEqual(ang);
  });
});

describe("updateAngles", () => {
  it("patches the correct angles by id", () => {
    const a1 = { id: "angles-1", source: { x: 0, y: 0 }, left: { x: 10, y: 10 }, right: { x: 20, y: 5 }, label: "", bisects: 0 };
    const a2 = { id: "angles-2", source: { x: 50, y: 50 }, left: { x: 60, y: 60 }, right: { x: 70, y: 55 }, label: "", bisects: 0 };
    const state = freshState({ angles: [a1, a2] });
    const next = updateAngles(state, "angles-1", { bisects: 2 });
    expect(next.angles[0].bisects).toBe(2);
    expect(next.angles[1]).toEqual(a2);
  });
});

describe("deleteAngles", () => {
  it("removes angles by id", () => {
    const a1 = { id: "angles-1", source: { x: 0, y: 0 }, left: { x: 10, y: 10 }, right: { x: 20, y: 5 }, label: "", bisects: 0 };
    const a2 = { id: "angles-2", source: { x: 50, y: 50 }, left: { x: 60, y: 60 }, right: { x: 70, y: 55 }, label: "", bisects: 0 };
    const state = freshState({ angles: [a1, a2] });
    const next = deleteAngles(state, "angles-1");
    expect(next.angles).toHaveLength(1);
    expect(next.angles[0].id).toBe("angles-2");
  });
});

describe("nextAnglesId", () => {
  it('returns "angles-1" for empty array', () => {
    expect(nextAnglesId([])).toBe("angles-1");
  });

  it("increments from highest existing id", () => {
    const angles = [{ id: "angles-3" }, { id: "angles-1" }];
    expect(nextAnglesId(angles)).toBe("angles-4");
  });
});

// ---- reducer ----

describe("reducer", () => {
  const initialReducerState = { history: [initialState], index: 0 };

  it("commit applies an updater function", () => {
    const next = reducer(initialReducerState, {
      type: "commit",
      value: (s) => movePlayer(s, "A_server", 999, 888),
    });
    expect(next.history).toHaveLength(2);
    expect(next.index).toBe(1);
    expect(next.history[1].players.find((p) => p.id === "A_server").x).toBe(999);
    expect(next.history[1].players.find((p) => p.id === "A_server").y).toBe(888);
  });

  it("commit with a direct state object works", () => {
    const modified = { ...initialState, players: [] };
    const next = reducer(initialReducerState, {
      type: "commit",
      value: modified,
    });
    expect(next.history).toHaveLength(2);
    expect(next.history[1].players).toEqual([]);
  });

  it("commit does not create a new entry when value equals current state", () => {
    const next = reducer(initialReducerState, {
      type: "commit",
      value: initialState,
    });
    expect(next).toBe(initialReducerState);
  });

  it("undo decrements index", () => {
    // First commit something
    const s1 = reducer(initialReducerState, {
      type: "commit",
      value: (s) => movePlayer(s, "A_server", 100, 200),
    });
    expect(s1.index).toBe(1);
    const s2 = reducer(s1, { type: "undo" });
    expect(s2.index).toBe(0);
  });

  it("undo does nothing at the beginning of history", () => {
    const next = reducer(initialReducerState, { type: "undo" });
    expect(next).toBe(initialReducerState);
  });

  it("redo increments index", () => {
    const s1 = reducer(initialReducerState, {
      type: "commit",
      value: (s) => movePlayer(s, "A_server", 100, 200),
    });
    const s2 = reducer(s1, { type: "undo" });
    const s3 = reducer(s2, { type: "redo" });
    expect(s3.index).toBe(1);
  });

  it("redo does nothing at the end of history", () => {
    const next = reducer(initialReducerState, { type: "redo" });
    expect(next).toBe(initialReducerState);
  });

  it("commit after undo truncates future history", () => {
    const s1 = reducer(initialReducerState, {
      type: "commit",
      value: (s) => movePlayer(s, "A_server", 100, 200),
    });
    const s2 = reducer(s1, {
      type: "commit",
      value: (s) => movePlayer(s, "A_server", 300, 400),
    });
    expect(s2.history).toHaveLength(3);
    const s3 = reducer(s2, { type: "undo" }); // back to index 1
    expect(s3.index).toBe(1);
    const s4 = reducer(s3, {
      type: "commit",
      value: (s) => movePlayer(s, "B_returner", 500, 600),
    });
    expect(s4.history).toHaveLength(3); // truncated, not 4
    expect(s4.index).toBe(2);
  });

  it("reset replaces history", () => {
    const newState = { players: [], arrows: [], angles: [] };
    const next = reducer(initialReducerState, { type: "reset", value: newState });
    expect(next.history).toHaveLength(1);
    expect(next.index).toBe(0);
    expect(next.history[0]).toEqual(newState);
  });
});
