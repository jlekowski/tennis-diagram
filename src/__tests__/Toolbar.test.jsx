import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Toolbar from "../Toolbar.jsx";

describe("Toolbar", () => {
  const baseProps = {
    tool: "select",
    onToolChange: vi.fn(),
    presetGroups: [],
    onApplyPreset: vi.fn(),
    selectedPreset: null,
    onLoadPresets: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: false,
    canRedo: false,
    onExportSvg: vi.fn(),
    onExportPng: vi.fn(),
    onExportJson: vi.fn(),
    onImportJson: vi.fn(),
    onReset: vi.fn(),
    animMode: false,
    onAnimMode: vi.fn(),
  };

  it("renders all tool buttons", () => {
    render(<Toolbar {...baseProps} />);
    expect(screen.getByText("Select")).toBeInTheDocument();
    expect(screen.getByText("Ball")).toBeInTheDocument();
    expect(screen.getByText("Move S")).toBeInTheDocument();
    expect(screen.getByText("Move R")).toBeInTheDocument();
    expect(screen.getByText("Angles")).toBeInTheDocument();
  });

  it("calls onToolChange when a tool button is clicked", async () => {
    const onToolChange = vi.fn();
    const user = userEvent.setup();
    render(<Toolbar {...baseProps} onToolChange={onToolChange} />);
    await user.click(screen.getByText("Ball"));
    expect(onToolChange).toHaveBeenCalledWith("ball");
  });

  it("renders Undo button disabled when canUndo is false", () => {
    render(<Toolbar {...baseProps} canUndo={false} />);
    expect(screen.getByText("↩ Undo").closest("button")).toBeDisabled();
  });

  it("renders Undo button enabled when canUndo is true", () => {
    render(<Toolbar {...baseProps} canUndo={true} />);
    expect(screen.getByText("↩ Undo").closest("button")).not.toBeDisabled();
  });

  it("renders Redo button disabled when canRedo is false", () => {
    render(<Toolbar {...baseProps} canRedo={false} />);
    expect(screen.getByText("↪ Redo").closest("button")).toBeDisabled();
  });

  it("renders Redo button enabled when canRedo is true", () => {
    render(<Toolbar {...baseProps} canRedo={true} />);
    expect(screen.getByText("↪ Redo").closest("button")).not.toBeDisabled();
  });

  it("renders File button", () => {
    render(<Toolbar {...baseProps} />);
    expect(screen.getByText("File ▾")).toBeInTheDocument();
  });

  it("opens file menu when File button is clicked", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...baseProps} />);
    await user.click(screen.getByText("File ▾"));
    expect(screen.getByText("Export SVG")).toBeInTheDocument();
    expect(screen.getByText("Export PNG")).toBeInTheDocument();
    expect(screen.getByText("Save JSON")).toBeInTheDocument();
    expect(screen.getByText("Load JSON")).toBeInTheDocument();
    expect(screen.getByText("Load presets (.jsonl)")).toBeInTheDocument();
  });

  it("renders Reset button", () => {
    render(<Toolbar {...baseProps} />);
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("calls onReset when Reset is clicked", async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(<Toolbar {...baseProps} onReset={onReset} />);
    await user.click(screen.getByText("Reset"));
    expect(onReset).toHaveBeenCalled();
  });

  it("renders Animate button", () => {
    render(<Toolbar {...baseProps} />);
    expect(screen.getByText("Animate")).toBeInTheDocument();
  });

  it("calls onAnimMode when Animate is clicked", async () => {
    const onAnimMode = vi.fn();
    const user = userEvent.setup();
    render(<Toolbar {...baseProps} onAnimMode={onAnimMode} />);
    await user.click(screen.getByText("Animate"));
    expect(onAnimMode).toHaveBeenCalled();
  });

  it("renders preset dropdown with optgroups", () => {
    const presetGroups = [
      {
        label: "Serves",
        options: [
          { key: "s1", label: "Wide serve" },
          { key: "s2", label: "T serve" },
        ],
      },
    ];
    render(<Toolbar {...baseProps} presetGroups={presetGroups} />);
    expect(screen.getByText("Wide serve")).toBeInTheDocument();
    expect(screen.getByText("T serve")).toBeInTheDocument();
  });

  it("calls onUndo and onRedo when buttons clicked", async () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const user = userEvent.setup();
    render(
      <Toolbar
        {...baseProps}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={true}
        canRedo={true}
      />
    );
    await user.click(screen.getByText("↩ Undo"));
    expect(onUndo).toHaveBeenCalled();
    await user.click(screen.getByText("↪ Redo"));
    expect(onRedo).toHaveBeenCalled();
  });
});
