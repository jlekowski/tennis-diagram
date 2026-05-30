import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Player from "../Player.jsx";

describe("Player", () => {
  const basePlayer = { id: "A_server", team: "A", label: "S", x: 240, y: 695 };

  it("renders a circle with team A color (blue)", () => {
    const { container } = render(
      <svg><Player player={basePlayer} /></svg>
    );
    const circle = container.querySelector("circle");
    expect(circle).toBeInTheDocument();
    expect(circle.getAttribute("fill")).toBe("#2563eb");
  });

  it("renders team B with red color", () => {
    const { container } = render(
      <svg><Player player={{ ...basePlayer, team: "B", label: "R" }} /></svg>
    );
    const circle = container.querySelector("circle");
    expect(circle.getAttribute("fill")).toBe("#dc2626");
  });

  it("renders the label text", () => {
    render(
      <svg><Player player={basePlayer} /></svg>
    );
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders subscript 'p' for labels like Sp", () => {
    const { container } = render(
      <svg><Player player={{ ...basePlayer, label: "Sp" }} /></svg>
    );
    const tspans = container.querySelectorAll("tspan");
    expect(tspans).toHaveLength(1);
    expect(tspans[0].textContent).toBe("p");
  });

  it("has data-player-id attribute", () => {
    const { container } = render(
      <svg><Player player={basePlayer} /></svg>
    );
    const g = container.querySelector("[data-player-id]");
    expect(g.getAttribute("data-player-id")).toBe("A_server");
  });

  it("applies dimmed opacity when dimmed prop is true", () => {
    const { container } = render(
      <svg><Player player={basePlayer} dimmed /></svg>
    );
    const g = container.querySelector("[data-player-id]");
    expect(g.style.opacity).toBe("0.5");
  });

  it("has full opacity when dimmed is false", () => {
    const { container } = render(
      <svg><Player player={basePlayer} /></svg>
    );
    const g = container.querySelector("[data-player-id]");
    expect(g.style.opacity).toBe("1");
  });
});
