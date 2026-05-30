import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { simulateFrames } from "./AnimationPlayer.jsx";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Serialize a live <svg> DOM node to a standalone SVG string (with xmlns).
 */
function serializeSvg(svgEl) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!clone.getAttribute("xmlns:xlink")) {
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }
  // Ensure explicit dimensions so the file renders standalone
  if (!clone.getAttribute("width") || !clone.getAttribute("height")) {
    const vb = clone.getAttribute("viewBox");
    if (vb) {
      const [, , w, h] = vb.split(/\s+/);
      clone.setAttribute("width", w);
      clone.setAttribute("height", h);
    }
  }
  return new XMLSerializer().serializeToString(clone);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/** Rasterize a standalone SVG string into a 2D canvas context at `scale`. */
function rasterizeSvg(xml, width, height, scale) {
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Export the arrow sequence as an animated GIF.
 *
 * The static court/arrows/angles come from a clone of the live <svg>; players
 * are repositioned each frame via a group transform and the ball is drawn as a
 * single moving circle, so the output matches on-screen playback exactly.
 *
 * @param svgEl   live court <svg> element (players at their resting positions)
 * @param players resting player positions (state.players)
 * @param arrows  state.arrows
 * @param opts    { stepMs, fps, scale, onProgress }
 */
export async function downloadGif(
  svgEl,
  players,
  arrows,
  { stepMs = 700, fps = 20, scale = 1, onProgress } = {},
) {
  const frames = simulateFrames(players, arrows, { fps, stepMs });
  if (frames.length <= 2) {
    throw new Error("Nothing to animate — add a ball or movement arrow first.");
  }

  const vb = svgEl.getAttribute("viewBox").split(/\s+/);
  const width = parseFloat(vb[2]);
  const height = parseFloat(vb[3]);

  // Build a reusable base clone: static scene + player groups we can transform.
  const base = svgEl.cloneNode(true);
  base.setAttribute("xmlns", SVG_NS);
  base.setAttribute("width", width);
  base.setAttribute("height", height);
  base.querySelectorAll("[data-handle-point]").forEach((el) => el.remove());

  // Map each player group by id, and remember its resting position so we can
  // translate it to the per-frame target.
  const restById = new Map(players.map((p) => [p.id, p]));
  const playerGroups = new Map();
  base.querySelectorAll("[data-player-id]").forEach((g) => {
    const id = g.getAttribute("data-player-id");
    if (restById.has(id)) playerGroups.set(id, g);
  });

  // A single ball circle composited on top, matching AnimBall.
  const ball = document.createElementNS(SVG_NS, "circle");
  ball.setAttribute("r", "7");
  ball.setAttribute("fill", "#eab308");
  ball.setAttribute("stroke", "#fff");
  ball.setAttribute("stroke-width", "2");
  base.appendChild(ball);

  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps);

  for (let i = 0; i < frames.length; i++) {
    const { positions, ballPos } = frames[i];

    for (const [id, g] of playerGroups) {
      const rest = restById.get(id);
      const now = positions.find((p) => p.id === id) ?? rest;
      const dx = now.x - rest.x;
      const dy = now.y - rest.y;
      if (dx || dy) g.setAttribute("transform", `translate(${dx} ${dy})`);
      else g.removeAttribute("transform");
    }

    if (ballPos) {
      ball.setAttribute("cx", ballPos.x);
      ball.setAttribute("cy", ballPos.y);
      ball.setAttribute("visibility", "visible");
    } else {
      ball.setAttribute("visibility", "hidden");
    }

    const xml = new XMLSerializer().serializeToString(base);
    const { data, width: w, height: h } = await rasterizeSvg(xml, width, height, scale);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay });

    onProgress?.((i + 1) / frames.length);
  }

  gif.finish();
  const blob = new Blob([gif.bytes()], { type: "image/gif" });
  triggerDownload(blob, `tennis-diagram-${timestamp()}.gif`);
}

export function downloadSvg(svgEl) {
  const xml = serializeSvg(svgEl);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, `tennis-diagram-${timestamp()}.svg`);
}

export async function downloadPng(svgEl, scale = 2) {
  const xml = serializeSvg(svgEl);
  const vb = svgEl.getAttribute("viewBox").split(/\s+/);
  const width = parseFloat(vb[2]);
  const height = parseFloat(vb[3]);

  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          triggerDownload(blob, `tennis-diagram-${timestamp()}.png`);
          resolve();
        }, "image/png");
      };
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
