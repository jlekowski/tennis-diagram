import { useReducer, useCallback } from "react";

/**
 * Diagram state shape:
 *   {
 *     players: [{ id, team: 'A'|'B', label, x, y }],
 *     arrows:  [{ id, kind: 'ball'|'movement-a'|'movement-b', from:{x,y}, to:{x,y}, label, curvature }],
 *   }
 *
 * Coords are SVG-space (viewBox 0 0 360 710).
 */

const initialState = {
  players: [
    { id: "A_server",   team: "A", label: "S",  x: 240, y: 695 },
    { id: "A_net",      team: "A", label: "Sp", x: 124, y: 405 },
    { id: "B_returner", team: "B", label: "R",  x: 120, y: 15  },
    { id: "B_net",      team: "B", label: "Rp", x: 236, y: 305 },
  ],
  arrows: [],
  angles: [],
};

export function reducer(state, action) {
  switch (action.type) {
    case "commit": {
      const current = state.history[state.index];
      const next =
        typeof action.value === "function" ? action.value(current) : action.value;
      if (next === current) return state;
      const truncated = state.history.slice(0, state.index + 1);
      return { history: [...truncated, next], index: truncated.length };
    }
    case "undo":
      return state.index > 0 ? { ...state, index: state.index - 1 } : state;
    case "redo":
      return state.index < state.history.length - 1
        ? { ...state, index: state.index + 1 }
        : state;
    case "reset":
      return { history: [action.value], index: 0 };
    default:
      return state;
  }
}

export function useDiagramState(getInitial = () => initialState) {
  const [{ history, index }, dispatch] = useReducer(reducer, null, () => ({
    history: [getInitial()],
    index: 0,
  }));

  const commit = useCallback(
    (updater) => dispatch({ type: "commit", value: updater }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback(
    (value) => dispatch({ type: "reset", value }),
    [],
  );

  return {
    state: history[index],
    commit,
    undo,
    redo,
    reset,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
}

export { initialState };

// Helpers
export function nextArrowId(arrows) {
  const nums = arrows
    .map((a) => parseInt(a.id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `arrow-${max + 1}`;
}

export function movePlayer(state, playerId, x, y) {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, x, y } : p,
    ),
  };
}

export function addArrow(state, arrow) {
  return { ...state, arrows: [...state.arrows, arrow] };
}

export function updateArrow(state, arrowId, patch) {
  return {
    ...state,
    arrows: state.arrows.map((a) =>
      a.id === arrowId ? { ...a, ...patch } : a,
    ),
  };
}

export function deleteArrow(state, arrowId) {
  return { ...state, arrows: state.arrows.filter((a) => a.id !== arrowId) };
}

export function nextAnglesId(angles) {
  const nums = angles
    .map((a) => parseInt(a.id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `angles-${max + 1}`;
}

export function addAngles(state, angles) {
  return { ...state, angles: [...state.angles, angles] };
}

export function updateAngles(state, anglesId, patch) {
  return {
    ...state,
    angles: state.angles.map((a) =>
      a.id === anglesId ? { ...a, ...patch } : a,
    ),
  };
}

export function deleteAngles(state, anglesId) {
  return { ...state, angles: state.angles.filter((a) => a.id !== anglesId) };
}
