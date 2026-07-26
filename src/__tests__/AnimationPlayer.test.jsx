import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AnimBall,
  AnimSidePanel,
  animationSequence,
  simulateFrames,
} from "../AnimationPlayer.jsx";

describe("AnimBall", () => {
  it("returns nothing when pos is null", () => {
    const { container } = render(
      <svg><AnimBall pos={null} /></svg>
    );
    expect(container.querySelector("circle")).toBeNull();
  });

  it("renders a circle when pos is provided", () => {
    const { container } = render(
      <svg><AnimBall pos={{ x: 100, y: 200 }} /></svg>
    );
    const circle = container.querySelector("circle");
    expect(circle).toBeInTheDocument();
    expect(circle.getAttribute("cx")).toBe("100");
    expect(circle.getAttribute("cy")).toBe("200");
    expect(circle.getAttribute("fill")).toBe("#eab308");
  });
});

describe("AnimSidePanel", () => {
  const baseProps = {
    frame: null,
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onReset: vi.fn(),
    onClose: vi.fn(),
    speed: 1,
    onSpeedChange: vi.fn(),
  };

  it("shows Play button when no frame is set", () => {
    render(<AnimSidePanel {...baseProps} />);
    expect(screen.getByText("Play")).toBeInTheDocument();
  });

  it("shows Pause button when playing", () => {
    render(
      <AnimSidePanel
        {...baseProps}
        frame={{ playing: true, stepIdx: 0, totalSteps: 5, done: false, positions: [], ballPos: null }}
      />
    );
    expect(screen.getByText("Pause")).toBeInTheDocument();
  });

  it("shows Replay button when done", () => {
    render(
      <AnimSidePanel
        {...baseProps}
        frame={{ playing: false, stepIdx: 5, totalSteps: 5, done: true, positions: [], ballPos: null }}
      />
    );
    expect(screen.getByText("Replay")).toBeInTheDocument();
  });

  it("shows Resume button (not Play) when paused mid-sequence", () => {
    render(
      <AnimSidePanel
        {...baseProps}
        frame={{ playing: false, stepIdx: 2, totalSteps: 5, done: false, positions: [], ballPos: null }}
      />
    );
    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.queryByText("Play")).not.toBeInTheDocument();
  });

  it("calls onResume, not onPlay, when Resume is clicked", async () => {
    const onResume = vi.fn();
    const user = userEvent.setup();
    render(
      <AnimSidePanel
        {...baseProps}
        onResume={onResume}
        frame={{ playing: false, stepIdx: 2, totalSteps: 5, done: false, positions: [], ballPos: null }}
      />
    );
    await user.click(screen.getByText("Resume"));
    expect(onResume).toHaveBeenCalled();
    expect(baseProps.onPlay).not.toHaveBeenCalled();
  });

  it("shows step counter when frame exists", () => {
    render(
      <AnimSidePanel
        {...baseProps}
        frame={{ playing: true, stepIdx: 2, totalSteps: 8, done: false, positions: [], ballPos: null }}
      />
    );
    expect(screen.getByText("Step 3 of 8")).toBeInTheDocument();
  });

  it("shows Done when animation is complete", () => {
    render(
      <AnimSidePanel
        {...baseProps}
        frame={{ playing: false, stepIdx: 8, totalSteps: 8, done: true, positions: [], ballPos: null }}
      />
    );
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("calls onPlay when Play button is clicked", async () => {
    const onPlay = vi.fn();
    const user = userEvent.setup();
    render(<AnimSidePanel {...baseProps} onPlay={onPlay} />);
    await user.click(screen.getByText("Play"));
    expect(onPlay).toHaveBeenCalled();
  });

  it("calls onReset when Reset button is clicked", async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(<AnimSidePanel {...baseProps} onReset={onReset} />);
    await user.click(screen.getByText("Reset"));
    expect(onReset).toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AnimSidePanel {...baseProps} onClose={onClose} />);
    await user.click(screen.getByTitle("Exit animation mode"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders speed slider with current value", () => {
    render(<AnimSidePanel {...baseProps} speed={2} />);
    expect(screen.getByText("Speed (2×)")).toBeInTheDocument();
  });
});

describe("animationSequence", () => {
  it("keeps only ball and movement arrows, in author order", () => {
    const arrows = [
      { id: "a1", kind: "ball" },
      { id: "a2", kind: "movement-a" },
      { id: "a3", kind: "movement-b" },
      { id: "a4", kind: "other" },
    ];
    expect(animationSequence(arrows).map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });
});

describe("simulateFrames", () => {
  // p1 sits exactly on the movement/ball `from` points used below, so it is
  // always the "closest player".
  const players = [
    { id: "p1", team: "A", label: "S", x: 100, y: 600 },
    { id: "p2", team: "B", label: "R", x: 100, y: 100 },
  ];
  const opts = { fps: 10, stepMs: 1000 }; // framesPerStep = 10

  it("returns only opening + closing rest frames when nothing animates", () => {
    const frames = simulateFrames(players, [], opts);
    expect(frames).toHaveLength(2);
    frames.forEach((f) => expect(f.ballPos).toBeNull());
    expect(frames[0].positions).toEqual(players);
    expect(frames[1].positions).toEqual(players);
  });

  it("ignores non-animating arrow kinds", () => {
    const arrows = [{ id: "x", kind: "other", from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }];
    expect(simulateFrames(players, arrows, opts)).toHaveLength(2);
  });

  it("produces 1 + steps*framesPerStep + 1 frames", () => {
    const arrows = [
      { id: "b", kind: "ball", from: { x: 100, y: 600 }, to: { x: 100, y: 100 }, curvature: 0 },
      { id: "m", kind: "movement-a", from: { x: 100, y: 600 }, to: { x: 150, y: 500 }, curvature: 0 },
    ];
    expect(simulateFrames(players, arrows, opts)).toHaveLength(1 + 2 * 10 + 1);
  });

  it("clamps framesPerStep to a minimum of 2", () => {
    const arrows = [{ id: "b", kind: "ball", from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, curvature: 0 }];
    // fps*stepMs/1000 = 1*0.1 = 0.1 -> round 0 -> clamped to 2
    expect(simulateFrames(players, arrows, { fps: 1, stepMs: 100 })).toHaveLength(1 + 2 + 1);
  });

  it("animates the ball along its path while players stay put", () => {
    const arrows = [{ id: "b", kind: "ball", from: { x: 100, y: 600 }, to: { x: 100, y: 100 }, curvature: 0 }];
    const frames = simulateFrames(players, arrows, { fps: 4, stepMs: 1000 }); // 4 frames/step
    expect(frames[0].ballPos).toBeNull(); // opening rest
    const mid = frames[2];
    expect(mid.ballPos).not.toBeNull();
    expect(mid.positions).toEqual(players); // ball steps never move players
    const stepEnd = frames[4]; // last frame of the step (t = 1) lands on `to`
    expect(stepEnd.ballPos.x).toBeCloseTo(100);
    expect(stepEnd.ballPos.y).toBeCloseTo(100);
    expect(frames[frames.length - 1].ballPos).toBeNull(); // closing rest
  });

  it("moves the closest player and commits its final position", () => {
    const arrows = [{ id: "m", kind: "movement-a", from: { x: 100, y: 600 }, to: { x: 200, y: 400 }, curvature: 0 }];
    const frames = simulateFrames(players, arrows, { fps: 2, stepMs: 1000 });
    const last = frames[frames.length - 1];
    const moved = last.positions.find((p) => p.id === "p1");
    expect(moved.x).toBeCloseTo(200);
    expect(moved.y).toBeCloseTo(400);
    expect(last.positions.find((p) => p.id === "p2")).toEqual(players[1]); // untouched
    frames.forEach((f) => expect(f.ballPos).toBeNull()); // no ball during movement
  });

  it("computes later steps from committed positions", () => {
    // m1 moves p1 to (300,600); m2's `from` is at that NEW spot, so it must
    // still target p1 (proving the sequence uses committed positions).
    const arrows = [
      { id: "m1", kind: "movement-a", from: { x: 100, y: 600 }, to: { x: 300, y: 600 }, curvature: 0 },
      { id: "m2", kind: "movement-a", from: { x: 300, y: 600 }, to: { x: 300, y: 500 }, curvature: 0 },
    ];
    const last = simulateFrames(players, arrows, { fps: 2, stepMs: 1000 }).at(-1);
    const p1 = last.positions.find((p) => p.id === "p1");
    expect(p1.x).toBeCloseTo(300);
    expect(p1.y).toBeCloseTo(500);
  });

  it("does not mutate the input players", () => {
    const snapshot = structuredClone(players);
    const arrows = [{ id: "m", kind: "movement-a", from: { x: 100, y: 600 }, to: { x: 200, y: 400 }, curvature: 0 }];
    simulateFrames(players, arrows, { fps: 2, stepMs: 1000 });
    expect(players).toEqual(snapshot);
  });
});
