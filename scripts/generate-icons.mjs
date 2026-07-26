/**
 * Generate the PWA PNG icons from the same geometry as public/icons/icon.svg.
 *
 * Deliberately dependency-free: it rasterises a handful of axis-aligned rects
 * and circles with 4x4 supersampling, then writes PNGs using node's built-in
 * zlib. Keeping it dep-free means `npm ci` in CI stays lean — the generated
 * PNGs are committed, so this only ever runs when the icon design changes.
 *
 *   docker run --rm -v .:/app -w /app node:lts npm run icons
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// ---- Colours ---------------------------------------------------------------

const BG = [0x3f, 0x5c, 0x33, 255]; // surround, matches icon.svg
const SURFACE = [0x6b, 0x8e, 0x5a, 255];
const LINE = [0xff, 0xff, 0xff, 255];
const NET = [0x1e, 0x29, 0x3b, 255];
const BALL = [0xea, 0xb3, 0x08, 255];
const NONE = [0, 0, 0, 0];

// ---- Shapes (design space is 512x512, painter's order) ----------------------

const rect = (x, y, w, h, color) => ({
  color,
  hit: (px, py) => px >= x && px < x + w && py >= y && py < y + h,
});

const roundedRect = (x, y, w, h, r, color) => ({
  color,
  hit: (px, py) => {
    if (px < x || px >= x + w || py < y || py >= y + h) return false;
    const cx = Math.min(Math.max(px, x + r), x + w - r);
    const cy = Math.min(Math.max(py, y + r), y + h - r);
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  },
});

const circle = (cx, cy, r, color) => ({
  color,
  hit: (px, py) => {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  },
});

const SHAPES = [
  roundedRect(0, 0, 512, 512, 112, BG),
  rect(146, 66, 220, 380, SURFACE),

  // doubles boundary
  rect(146, 66, 220, 10, LINE),
  rect(146, 436, 220, 10, LINE),
  rect(146, 66, 10, 380, LINE),
  rect(356, 66, 10, 380, LINE),

  // singles sidelines
  rect(169, 66, 10, 380, LINE),
  rect(333, 66, 10, 380, LINE),

  // service lines
  rect(169, 141, 174, 10, LINE),
  rect(169, 361, 174, 10, LINE),

  // centre service line
  rect(251, 141, 10, 230, LINE),

  // net
  rect(126, 251, 260, 10, NET),

  // ball
  circle(322, 180, 32, LINE),
  circle(322, 180, 26, BALL),
];

// ---- Rasteriser ------------------------------------------------------------

const SUBSAMPLES = 4;

/**
 * Render the icon into a raw RGBA buffer.
 *
 * @param size      output edge length in px
 * @param maskable  when true the artwork is inset to 62.5% and the surround is
 *                  full-bleed, so it survives Android's maskable safe zone.
 */
function render(size, maskable) {
  const out = Buffer.alloc(size * size * 4);
  const k = maskable ? 0.625 : 1;
  const unit = (k * size) / 512; // canvas px per design unit
  const base = maskable ? BG : NONE;
  const step = 1 / SUBSAMPLES;
  const total = SUBSAMPLES * SUBSAMPLES;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SUBSAMPLES; sy++) {
        for (let sx = 0; sx < SUBSAMPLES; sx++) {
          const cx = px + (sx + 0.5) * step;
          const cy = py + (sy + 0.5) * step;
          const dx = (cx - size / 2) / unit + 256;
          const dy = (cy - size / 2) / unit + 256;

          let color = base;
          for (const shape of SHAPES) {
            if (shape.hit(dx, dy)) color = shape.color;
          }
          r += color[0];
          g += color[1];
          b += color[2];
          a += color[3];
        }
      }

      const i = (py * size + px) * 4;
      out[i] = Math.round(r / total);
      out[i + 1] = Math.round(g / total);
      out[i + 2] = Math.round(b / total);
      out[i + 3] = Math.round(a / total);
    }
  }
  return out;
}

// ---- Minimal PNG encoder ---------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, size) {
  // Prefix every scanline with filter byte 0 (None).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Main ------------------------------------------------------------------

const TARGETS = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable.png", size: 512, maskable: true },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const { file, size, maskable } of TARGETS) {
  const png = encodePng(render(size, maskable), size);
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`${file}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
