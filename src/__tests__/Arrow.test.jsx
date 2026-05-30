import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Arrow from "../Arrow.jsx";

describe("Arrow", () => {
  const baseArrow = {
    id: "arrow-1",
    kind: "ball",
    from: { x: 0, y: 0 },
    to: { x: 100, y: 0 },
    curvature: 0,
  };

  function renderArrow(overrides = {}, props = {}) {
    const arrow = { ...baseArrow, ...overrides };
    return render(
      <svg><Arrow arrow={arrow} {...props} /></svg>
    );
  }

  it("renders a ball arrow with yellow stroke", () => {
    const { container } = renderArrow();
    const paths = container.querySelectorAll("path");
    const visible = Array.from(paths).find(
      (p) => p.getAttribute("stroke") === "#eab308"
    );
    expect(visible).toBeInTheDocument();
  });

  it("renders movement-a with blue stroke", () => {
    const { container } = renderArrow({ kind: "movement-a" });
    const paths = container.querySelectorAll("path");
    const visible = Array.from(paths).find(
      (p) => p.getAttribute("stroke") === "#2563eb"
    );
    expect(visible).toBeInTheDocument();
  });

  it("renders movement-b with red stroke", () => {
    const { container } = renderArrow({ kind: "movement-b" });
    const paths = container.querySelectorAll("path");
    const visible = Array.from(paths).find(
      (p) => p.getAttribute("stroke") === "#dc2626"
    );
    expect(visible).toBeInTheDocument();
  });

  it("renders a thicker stroke when selected", () => {
    const { container } = renderArrow({}, { selected: true });
    const paths = container.querySelectorAll("path");
    const visible = Array.from(paths).find(
      (p) => p.getAttribute("stroke") === "#eab308"
    );
    expect(visible.getAttribute("stroke-width")).toBe("3.5");
  });

  it("renders default stroke width when not selected", () => {
    const { container } = renderArrow({}, { selected: false });
    const paths = container.querySelectorAll("path");
    const visible = Array.from(paths).find(
      (p) => p.getAttribute("stroke") === "#eab308"
    );
    expect(visible.getAttribute("stroke-width")).toBe("2.5");
  });

  it("renders a label when arrow has one", () => {
    const { container } = renderArrow({ label: "wide serve" });
    const text = container.querySelector("text");
    expect(text?.textContent).toBe("wide serve");
  });

  it("does not render a label when arrow has none", () => {
    const { container } = renderArrow({ label: "" });
    const text = container.querySelector("text");
    expect(text).toBeNull();
  });

  it("has data-arrow-id when not preview", () => {
    const { container } = renderArrow();
    const g = container.querySelector("[data-arrow-id]");
    expect(g.getAttribute("data-arrow-id")).toBe("arrow-1");
  });

  it("has no data-arrow-id when preview", () => {
    const { container } = renderArrow({}, { preview: true });
    const g = container.querySelector("[data-arrow-id]");
    expect(g).toBeNull();
  });

  it("renders an invisible hit-test path when not preview", () => {
    const { container } = renderArrow();
    const paths = container.querySelectorAll("path");
    const hitPath = Array.from(paths).find(
      (p) => p.getAttribute("stroke") === "transparent"
    );
    expect(hitPath).toBeInTheDocument();
  });

  it("does not render hit-test path when preview", () => {
    const { container } = renderArrow({}, { preview: true });
    const paths = container.querySelectorAll("path");
    const hitPath = Array.from(paths).find(
      (p) => p.getAttribute("stroke") === "transparent"
    );
    expect(hitPath).toBeUndefined();
  });

  it("renders dashed stroke for ball kind", () => {
    const { container } = renderArrow();
    const paths = container.querySelectorAll("path");
    const visible = Array.from(paths).find(
      (p) => p.getAttribute("stroke") === "#eab308"
    );
    expect(visible.getAttribute("stroke-dasharray")).toBe("6 4");
  });
});
