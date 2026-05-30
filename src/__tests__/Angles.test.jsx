import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Angles from "../Angles.jsx";

describe("Angles", () => {
  const baseAngles = {
    id: "angles-1",
    source: { x: 0, y: 0 },
    left: { x: -100, y: 100 },
    right: { x: 100, y: 100 },
    label: "",
    bisects: 0,
  };

  function renderAngles(overrides = {}, props = {}) {
    const angles = { ...baseAngles, ...overrides };
    return render(
      <svg><Angles angles={angles} {...props} /></svg>
    );
  }

  it("renders a polygon with yellow fill", () => {
    const { container } = renderAngles();
    const polygon = container.querySelector("polygon");
    expect(polygon).toBeInTheDocument();
    expect(polygon.getAttribute("fill")).toBe("#eab308");
  });

  it("renders left and right edge lines", () => {
    const { container } = renderAngles();
    const lines = container.querySelectorAll("line");
    // At minimum, left and right edges
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it("renders bisect lines based on bisects prop", () => {
    const { container } = renderAngles({ bisects: 2 });
    const lines = container.querySelectorAll("line");
    // 2 edges + 3 bisect lines
    expect(lines.length).toBeGreaterThanOrEqual(5);
  });

  it("renders no bisect lines when bisects is 0", () => {
    const { container } = renderAngles({ bisects: 0 });
    // Only 2 edge lines, no bisect dasharray lines
    const dashed = container.querySelectorAll('line[stroke-dasharray="4 3"]');
    expect(dashed).toHaveLength(0);
  });

  it("renders a label when provided", () => {
    const { container } = renderAngles({ label: "possible returns" });
    const text = container.querySelector("text");
    expect(text?.textContent).toBe("possible returns");
  });

  it("does not render label when empty", () => {
    const { container } = renderAngles({ label: "" });
    const text = container.querySelector("text");
    expect(text).toBeNull();
  });

  it("has data-angles-id when not preview", () => {
    const { container } = renderAngles();
    const g = container.querySelector("[data-angles-id]");
    expect(g.getAttribute("data-angles-id")).toBe("angles-1");
  });

  it("has no data-angles-id when preview", () => {
    const { container } = renderAngles({}, { preview: true });
    const g = container.querySelector("[data-angles-id]");
    expect(g).toBeNull();
  });

  it("reduced fill opacity when preview", () => {
    const { container } = renderAngles({}, { preview: true });
    const polygon = container.querySelector("polygon");
    expect(polygon.getAttribute("fill-opacity")).toBe("0.08");
  });

  it("full fill opacity when not preview", () => {
    const { container } = renderAngles();
    const polygon = container.querySelector("polygon");
    expect(polygon.getAttribute("fill-opacity")).toBe("0.16");
  });
});
