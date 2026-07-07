import { rgb, type RGB } from 'pdf-lib'

/** Convert a #rrggbb (or #rgb) hex string to a pdf-lib RGB color (0..1). */
export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const n = parseInt(h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return rgb(r / 255, g / 255, b / 255)
}
