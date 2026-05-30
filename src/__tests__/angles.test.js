import { describe, it, expect } from "vitest";
import {
  angleFrom,
  rayIntersectSegment,
  bisectEndpoints,
} from "../Angles.jsx";

describe("angleFrom", () => {
  it("returns 0 for a point directly to the right", () => {
    const result = angleFrom({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(result).toBeCloseTo(0, 5);
  });

  it("returns Math.PI/2 for a point directly below", () => {
    const result = angleFrom({ x: 0, y: 0 }, { x: 0, y: 100 });
    expect(result).toBeCloseTo(Math.PI / 2, 5);
  });

  it("returns Math.PI for a point directly to the left", () => {
    const result = angleFrom({ x: 0, y: 0 }, { x: -100, y: 0 });
    expect(result).toBeCloseTo(Math.PI, 5);
  });
});

describe("rayIntersectSegment", () => {
  it("returns the intersection point when ray hits the segment", () => {
    const origin = { x: 0, y: 0 };
    const dir = { x: 1, y: 0 };
    const segStart = { x: 10, y: -10 };
    const segEnd = { x: 10, y: 10 };
    const result = rayIntersectSegment(origin, dir, segStart, segEnd);
    expect(result).not.toBeNull();
    expect(result.x).toBeCloseTo(10, 5);
    expect(result.y).toBeCloseTo(0, 5);
  });

  it("returns null for parallel ray", () => {
    const origin = { x: 0, y: 0 };
    const dir = { x: 1, y: 0 };
    const segStart = { x: 5, y: 5 };
    const segEnd = { x: 15, y: 5 };
    const result = rayIntersectSegment(origin, dir, segStart, segEnd);
    expect(result).toBeNull();
  });

  it("returns null when ray points away from segment", () => {
    const origin = { x: 0, y: 0 };
    const dir = { x: 1, y: 0 };
    const segStart = { x: -20, y: -10 };
    const segEnd = { x: -20, y: 10 };
    const result = rayIntersectSegment(origin, dir, segStart, segEnd);
    expect(result).toBeNull();
  });

  it("returns null when segment is behind the origin", () => {
    const origin = { x: 0, y: 0 };
    const dir = { x: 1, y: 0 };
    const segStart = { x: -10, y: -10 };
    const segEnd = { x: -10, y: 10 };
    const result = rayIntersectSegment(origin, dir, segStart, segEnd);
    expect(result).toBeNull();
  });
});

describe("bisectEndpoints", () => {
  const source = { x: 0, y: 0 };
  const left = { x: -100, y: 100 };
  const right = { x: 100, y: 100 };

  it("returns empty array when levels is 0", () => {
    expect(bisectEndpoints(source, left, right, 0)).toEqual([]);
  });

  it("returns 1 bisect point when levels is 1", () => {
    const result = bisectEndpoints(source, left, right, 1);
    expect(result).toHaveLength(1);
    // Center bisection should be at approximately (0, 100)
    expect(result[0].x).toBeCloseTo(0, 0);
    expect(result[0].y).toBeCloseTo(100, 0);
  });

  it("returns 3 bisect points when levels is 2", () => {
    const result = bisectEndpoints(source, left, right, 2);
    expect(result).toHaveLength(3);
  });

  it("returns empty array when levels is falsy", () => {
    expect(bisectEndpoints(source, left, right, undefined)).toEqual([]);
    expect(bisectEndpoints(source, left, right, null)).toEqual([]);
  });
});
