// Renders the Macro Forge mark (open ring + barbell) to PNG/ICO without any
// dependencies: signed-distance shapes, 4×4 supersampling, zlib for PNG.
// Run: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib"
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public")
const BG = [50, 35, 24] // espresso
const FG = [224, 179, 100] // brushed gold, matches the default palette

// Geometry in a 32-unit box (same as app-logo.tsx).
const RING = { cx: 16, cy: 16, r: 9.5, w: 2.6, start: -Math.PI / 2, end: Math.atan2(-4.8, -8.2) + 2 * Math.PI }
const BARS = [
  { x: 9, y: 15, w: 14, h: 2, r: 1 },
  { x: 10, y: 12, w: 2.4, h: 8, r: 1 },
  { x: 19.6, y: 12, w: 2.4, h: 8, r: 1 },
]

function inRoundRect(px, py, { x, y, w, h, r }) {
  const qx = Math.abs(px - (x + w / 2)) - (w / 2 - r)
  const qy = Math.abs(py - (y + h / 2)) - (h / 2 - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r <= 0
}

function inRing(px, py) {
  const { cx, cy, r, w, start, end } = RING
  const dx = px - cx
  const dy = py - cy
  let a = Math.atan2(dy, dx)
  if (a < start) a += 2 * Math.PI
  if (Math.abs(Math.hypot(dx, dy) - r) <= w / 2 && a >= start && a <= end) return true
  // Round caps
  for (const t of [start, end]) {
    if (Math.hypot(px - (cx + r * Math.cos(t)), py - (cy + r * Math.sin(t))) <= w / 2) return true
  }
  return false
}

/** @param {number} size @param {{ maskable?: boolean }} opts */
function render(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const SS = 4
  // Maskable icons need content inside the central 80% "safe zone".
  const scale = maskable ? 0.72 : 1
  const offset = (32 - 32 * scale) / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0
      let fg = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ux = ((x + (sx + 0.5) / SS) / size) * 32
          const uy = ((y + (sy + 0.5) / SS) / size) * 32
          const inBg = maskable || inRoundRect(ux, uy, { x: 0, y: 0, w: 32, h: 32, r: 7 })
          if (!inBg) continue
          bg++
          const lx = (ux - offset) / scale
          const ly = (uy - offset) / scale
          if (inRing(lx, ly) || BARS.some((b) => inRoundRect(lx, ly, b))) fg++
        }
      }
      const n = SS * SS
      const i = (y * size + x) * 4
      const f = bg ? fg / bg : 0
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(BG[c] * (1 - f) + FG[c] * f)
      px[i + 3] = Math.round((bg / n) * 255)
    }
  }
  return encodePng(size, px)
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

/** ICO with embedded PNGs (supported by all current browsers). */
function encodeIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + 16 * pngs.length
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

mkdirSync(OUT, { recursive: true })
const files = {
  "pwa-192x192.png": render(192),
  "pwa-512x512.png": render(512),
  "maskable-512x512.png": render(512, { maskable: true }),
  "apple-touch-icon.png": render(180, { maskable: true }),
}
for (const [name, data] of Object.entries(files)) writeFileSync(join(OUT, name), data)
writeFileSync(join(OUT, "favicon.ico"), encodeIco([16, 32, 48].map((size) => ({ size, data: render(size) }))))
console.log("Wrote", [...Object.keys(files), "favicon.ico"].join(", "))
