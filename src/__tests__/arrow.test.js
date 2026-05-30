import { describe, it, expect } from "vitest";
import { controlPoint, bezierMid, arrowPath } from "../Arrow.jsx";

describe("controlPoint", () => {
  it("returns the midpoint when curvature is 0", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const result = controlPoint(from, to, 0);
    expect(result).toEqual({ x: 50, y: 0 });
  });

  it("returns the midpoint when curvature is falsy (undefined)", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const result = controlPoint(from, to, undefined);
    expect(result).toEqual({ x: 50, y: 0 });
  });

  it("offsets perpendicular for positive curvature (90° CCW, SVG y-down)", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    // chord is horizontal left→right; in SVG y-down, CCW goes downward → positive y
    const result = controlPoint(from, to, 50);
    expect(result.x).toBe(50);
    expect(result.y).toBeCloseTo(50, 5);
  });

  it("offsets perpendicular for negative curvature (opposite direction)", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const result = controlPoint(from, to, -50);
    expect(result.x).toBe(50);
    expect(result.y).toBeCloseTo(-50, 5);
  });

  it("handles vertical chord", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 0, y: 100 };
    // chord is vertical top→bottom; in SVG y-down, CCW goes left → negative x
    const result = controlPoint(from, to, 50);
    expect(result.x).toBeCloseTo(-50, 5);
    expect(result.y).toBe(50);
  });
});

describe("bezierMid", () => {
  it("returns the midpoint for a straight arrow", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const result = bezierMid(from, to, 0);
    expect(result).toEqual({ x: 50, y: 0 });
  });

  it("accounts for curvature", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const result = bezierMid(from, to, 40);
    // control point at (50, 40) for positive curvature in SVG y-down
    // mid = 0.25*(0,0) + 0.5*(50,40) + 0.25*(100,0) = (50, 20)
    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBeCloseTo(20, 5);
  });
});

describe("arrowPath", () => {
  it("produces a valid SVG path string", () => {
    const from = { x: 10, y: 20 };
    const to = { x: 100, y: 200 };
    const result = arrowPath(from, to, 0);
    expect(result).toBe("M 10 20 Q 55 110 100 200");
  });

  it("includes the control point in the path", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const result = arrowPath(from, to, 50);
    // SVG y-down: positive curvature moves control point to (50, 50)
    expect(result).toBe("M 0 0 Q 50 50 100 0");
  });
});
