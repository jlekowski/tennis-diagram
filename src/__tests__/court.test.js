import { describe, it, expect, vi } from "vitest";
import { clientToSvg, COURT_VIEWBOX } from "../Court.jsx";

describe("COURT_VIEWBOX", () => {
  it("has the expected dimensions", () => {
    expect(COURT_VIEWBOX.minX).toBe(-30);
    expect(COURT_VIEWBOX.minY).toBe(-30);
    expect(COURT_VIEWBOX.w).toBe(420);
    expect(COURT_VIEWBOX.h).toBe(770);
  });
});

describe("clientToSvg", () => {
  it("transforms client coordinates to SVG coordinates", () => {
    // Create a mock SVG element with getScreenCTM and createSVGPoint
    const mockTransform = {
      inverse: () => ({
        a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      }),
    };

    const mockPoint = {
      x: 0,
      y: 0,
      matrixTransform: vi.fn((m) => ({
        x: 150,
        y: 350,
      })),
    };

    const svgEl = {
      createSVGPoint: vi.fn(() => mockPoint),
      getScreenCTM: vi.fn(() => mockTransform),
    };

    const result = clientToSvg(svgEl, 300, 700);
    expect(result.x).toBe(150);
    expect(result.y).toBe(350);
    expect(svgEl.createSVGPoint).toHaveBeenCalled();
  });

  it("returns {0,0} when getScreenCTM returns null", () => {
    const mockPoint = {
      x: 0,
      y: 0,
      matrixTransform: vi.fn(),
    };

    const svgEl = {
      createSVGPoint: vi.fn(() => mockPoint),
      getScreenCTM: vi.fn(() => null),
    };

    const result = clientToSvg(svgEl, 100, 200);
    expect(result).toEqual({ x: 0, y: 0 });
    expect(mockPoint.matrixTransform).not.toHaveBeenCalled();
  });
});
