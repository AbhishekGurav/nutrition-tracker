/** OKLCH colour as [lightness 0–1, chroma, hue degrees]. */
export type Oklch = readonly [number, number, number]

/** OKLCH → linear sRGB (clamped), per Björn Ottosson's reference matrices. */
export function oklchToLinearRgb([L, C, hDeg]: Oklch): [number, number, number] {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

/** WCAG relative luminance. */
export function luminance(c: Oklch) {
  const [r, g, b] = oklchToLinearRgb(c)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.x contrast ratio between two colours. */
export function contrast(a: Oklch, b: Oklch) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function toHex(c: Oklch) {
  return (
    "#" +
    oklchToLinearRgb(c)
      .map((x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055))
      .map((x) => Math.round(x * 255).toString(16).padStart(2, "0"))
      .join("")
  )
}

export function toCss([L, C, h]: Oklch, alpha?: number) {
  return `oklch(${L} ${C} ${h}${alpha === undefined ? "" : ` / ${alpha}%`})`
}
