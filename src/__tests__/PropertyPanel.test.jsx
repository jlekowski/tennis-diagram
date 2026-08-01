import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyPanel from "../PropertyPanel.jsx";

describe("PropertyPanel", () => {
  it("renders instructions when nothing is selected", () => {
    render(<PropertyPanel arrow={null} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Properties")).toBeInTheDocument();
    expect(screen.getByText(/Select an arrow or angles wedge/)).toBeInTheDocument();
  });

  describe("Arrow panel", () => {
    const arrow = {
      id: "arrow-1",
      kind: "ball",
      from: { x: 0, y: 0 },
      to: { x: 100, y: 0 },
      label: "wide serve",
      curvature: 30,
    };

    it("displays arrow kind", () => {
      render(<PropertyPanel arrow={arrow} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
      expect(screen.getByText("Ball trajectory")).toBeInTheDocument();
    });

    it("displays label input with current value", () => {
      render(<PropertyPanel arrow={arrow} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
      const input = screen.getByPlaceholderText("e.g. wide serve, poach, lob");
      expect(input.value).toBe("wide serve");
    });

    it("calls onChange when label changes", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<PropertyPanel arrow={arrow} angles={null} onChange={onChange} onDelete={vi.fn()} onClose={vi.fn()} />);
      const input = screen.getByPlaceholderText("e.g. wide serve, poach, lob");
      await user.clear(input);
      await user.type(input, "new label");
      expect(onChange).toHaveBeenCalled();
    });

    it("displays curvature slider with current value", () => {
      render(<PropertyPanel arrow={arrow} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
      expect(screen.getByText(/Curvature \(30\)/)).toBeInTheDocument();
    });

    it("hides curvature slider for movement arrows", () => {
      const moveArrow = { ...arrow, kind: "movement-a" };
      render(<PropertyPanel arrow={moveArrow} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
      expect(screen.queryByText(/Curvature/)).not.toBeInTheDocument();
    });

    it("renders delete button", () => {
      render(<PropertyPanel arrow={arrow} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
      expect(screen.getByText("Delete arrow")).toBeInTheDocument();
    });

    it("calls onDelete when delete button clicked", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<PropertyPanel arrow={arrow} angles={null} onChange={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />);
      await user.click(screen.getByText("Delete arrow"));
      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe("Angles panel", () => {
    const angles = {
      id: "angles-1",
      source: { x: 0, y: 0 },
      left: { x: -100, y: 100 },
      right: { x: 100, y: 100 },
      label: "returns",
      bisects: 1,
    };

    it("displays angles kind", () => {
      render(<PropertyPanel arrow={null} angles={angles} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
      expect(screen.getByText("Shot angles")).toBeInTheDocument();
    });

    it("displays label input", () => {
      render(<PropertyPanel arrow={null} angles={angles} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
      const input = screen.getByPlaceholderText("e.g. possible returns");
      expect(input.value).toBe("returns");
    });

    it("shows bisect buttons with correct selection", () => {
      render(<PropertyPanel arrow={null} angles={angles} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
      expect(screen.getByText("1 (center)")).toBeInTheDocument();
    });

    it("renders delete button for angles", () => {
      render(<PropertyPanel arrow={null} angles={angles} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
      expect(screen.getByText("Delete angles")).toBeInTheDocument();
    });
  });

  it("calls onClose when close button is clicked", async () => {
    const arrow = {
      id: "arrow-1", kind: "ball", from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, label: "", curvature: 0,
    };
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PropertyPanel arrow={arrow} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={onClose} />);
    const closeBtn = screen.getByTitle("Deselect");
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  describe("compact (mobile) layout", () => {
    const arrow = {
      id: "arrow-1",
      kind: "ball",
      from: { x: 0, y: 0 },
      to: { x: 100, y: 0 },
      label: "wide serve",
      curvature: 30,
    };
    const angles = {
      id: "angles-1",
      source: { x: 0, y: 0 },
      left: { x: -100, y: 100 },
      right: { x: 100, y: 100 },
      label: "returns",
      bisects: 1,
    };

    it("renders arrow kind, label, and curvature in a dense layout", () => {
      render(
        <PropertyPanel arrow={arrow} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} chrome="" />
      );
      expect(screen.getByText("Ball trajectory")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g. wide serve, poach, lob").value).toBe("wide serve");
      expect(screen.getByText("30")).toBeInTheDocument();
    });

    it("hides curvature for movement arrows in compact mode too", () => {
      const moveArrow = { ...arrow, kind: "movement-a" };
      render(
        <PropertyPanel arrow={moveArrow} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} chrome="" />
      );
      expect(screen.queryByText("Curve")).not.toBeInTheDocument();
    });

    it("calls onDelete from the icon-only delete button", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(
        <PropertyPanel arrow={arrow} angles={null} onChange={vi.fn()} onDelete={onDelete} onClose={vi.fn()} chrome="" />
      );
      await user.click(screen.getByTitle("Delete arrow"));
      expect(onDelete).toHaveBeenCalled();
    });

    it("renders angles kind, label, and shortened bisect labels", () => {
      render(
        <PropertyPanel arrow={null} angles={angles} onChange={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} chrome="" />
      );
      expect(screen.getByText("Shot angles")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g. possible returns").value).toBe("returns");
      expect(screen.getByText("1×")).toBeInTheDocument();
      expect(screen.getByText("2×")).toBeInTheDocument();
    });

    it("calls onClose from the compact header's close button", async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <PropertyPanel arrow={arrow} angles={null} onChange={vi.fn()} onDelete={vi.fn()} onClose={onClose} chrome="" />
      );
      await user.click(screen.getByTitle("Deselect"));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
