import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'

interface Props {
  value: string
  onChange: (hex: string) => void
}

const QUICK = [
  '#000000', '#5f6368', '#ffffff', '#e01e26', '#ff8a00', '#f7c600',
  '#1aa64b', '#00a3a3', '#1f6feb', '#6b3fd4', '#e91e8c', '#8d5a2b',
]

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function hexToRgb(hex: string): [number, number, number] | null {
  let s = hex.replace('#', '')
  if (s.length === 3) s = s.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null
  const n = parseInt(s, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('')}`
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, max ? d / max : 0, max]
}
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

export function ColorPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  // Keep the latest onChange without re-running the picking effect (avoids
  // dropping the pick if the parent re-renders mid-pick).
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [hsv, setHsv] = useState<[number, number, number]>(() => {
    const rgb = hexToRgb(value) ?? [0, 0, 0]
    return rgbToHsv(...rgb)
  })
  const [hexText, setHexText] = useState(value.replace('#', ''))
  const hsvRef = useRef(hsv)
  hsvRef.current = hsv
  const dragRef = useRef<'sv' | 'hue' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  // Sync from an external value change (but not mid-drag, to avoid jitter).
  useEffect(() => {
    if (dragRef.current) return
    const rgb = hexToRgb(value)
    if (rgb) {
      setHsv(rgbToHsv(...rgb))
      setHexText(value.replace('#', ''))
    }
  }, [value])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Throttle live updates during a drag so a large document isn't re-rendered
  // ~100x/second (which saturated the main thread and froze the tab).
  const emitState = useRef<{ last: number; pending: string | null; timer: number }>({
    last: 0,
    pending: null,
    timer: 0,
  })
  const scheduleEmit = (hex: string) => {
    const st = emitState.current
    st.pending = hex
    const elapsed = Date.now() - st.last
    if (elapsed >= 55) {
      st.last = Date.now()
      st.pending = null
      onChange(hex)
    } else if (!st.timer) {
      st.timer = window.setTimeout(() => {
        st.timer = 0
        st.last = Date.now()
        const p = st.pending
        st.pending = null
        if (p) onChange(p)
      }, 55 - elapsed)
    }
  }
  const flushEmit = () => {
    const st = emitState.current
    if (st.timer) {
      clearTimeout(st.timer)
      st.timer = 0
    }
    if (st.pending) {
      onChange(st.pending)
      st.pending = null
    }
    st.last = Date.now()
  }
  useEffect(
    () => () => {
      if (emitState.current.timer) clearTimeout(emitState.current.timer)
    },
    [],
  )

  const apply = (h: number, s: number, v: number) => {
    const next: [number, number, number] = [h, s, v]
    setHsv(next)
    hsvRef.current = next
    const hex = rgbToHex(...hsvToRgb(h, s, v))
    setHexText(hex.replace('#', ''))
    scheduleEmit(hex)
  }

  const pickSV = (clientX: number, clientY: number) => {
    const el = svRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const s = clamp((clientX - r.left) / r.width, 0, 1)
    const v = clamp(1 - (clientY - r.top) / r.height, 0, 1)
    apply(hsvRef.current[0], s, v)
  }
  const pickHue = (clientX: number) => {
    const el = hueRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    apply(clamp((clientX - r.left) / r.width, 0, 1) * 360, hsvRef.current[1], hsvRef.current[2])
  }

  const onMove = (e: React.PointerEvent) => {
    if (dragRef.current === 'sv') pickSV(e.clientX, e.clientY)
    else if (dragRef.current === 'hue') pickHue(e.clientX)
  }
  const endDrag = () => {
    // Commit the final colour immediately (a throttle timer may still be pending).
    if (dragRef.current) flushEmit()
    dragRef.current = null
  }

  const commitHex = () => {
    const rgb = hexToRgb(hexText)
    if (rgb) onChange(rgbToHex(...rgb))
    else setHexText(value.replace('#', ''))
  }

  // In-page eyedropper: read the exact pixel colour straight from the PDF's own
  // <canvas> (and any annotations drawn over it). This replaces the native
  // `EyeDropper` API, whose screen-capture magnifier locks the browser on some
  // Windows/GPU setups. Reading the canvas is pure JS — it cannot hang Chrome,
  // and it's more accurate (true PDF pixel, not a screen-scaled sample).
  const readPixelAt = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const shell = el?.closest('.page-shell') ?? el?.closest('.thumb') ?? null
    if (!shell) return null
    const sample = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return null
      const r = canvas.getBoundingClientRect()
      if (clientX < r.left || clientX >= r.right || clientY < r.top || clientY >= r.bottom) return null
      const px = Math.floor((clientX - r.left) * (canvas.width / r.width))
      const py = Math.floor((clientY - r.top) * (canvas.height / r.height))
      try {
        return canvas.getContext('2d')!.getImageData(px, py, 1, 1).data
      } catch {
        return null
      }
    }
    // Prefer a painted annotation pixel (whiteout/highlight/drawing) if one sits
    // here; otherwise read the underlying PDF pixel.
    const ann = sample(shell.querySelector('.ann-canvas'))
    if (ann && ann[3] > 10) return rgbToHex(ann[0], ann[1], ann[2])
    const pdf = sample(shell.querySelector('.pdf-canvas'))
    if (pdf) return rgbToHex(pdf[0], pdf[1], pdf[2])
    return null
  }

  const startPagePick = () => {
    setOpen(false) // hide the popover so the page is fully clickable
    setPicking(true)
  }

  useEffect(() => {
    if (!picking) return
    const prevCursor = document.body.style.cursor
    document.body.style.cursor = 'crosshair'
    const onDown = (e: PointerEvent) => {
      // Capture phase + stop propagation so the page's own tools (draw / whiteout)
      // don't also fire on this click.
      e.preventDefault()
      e.stopPropagation()
      const hex = readPixelAt(e.clientX, e.clientY)
      if (hex) onChangeRef.current(hex)
      setPicking(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setPicking(false)
      }
    }
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
      document.body.style.cursor = prevCursor
    }
  }, [picking])

  const [hue, sat, val] = hsv
  const current = rgbToHex(...hsvToRgb(hue, sat, val))

  return (
    <div className="cp" ref={rootRef}>
      <button
        type="button"
        className="cp-trigger"
        title="Colour picker"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cp-dot" style={{ background: value }} />
      </button>
      {open && (
        <div className="cp-pop">
          <div
            className="cp-sv"
            ref={svRef}
            style={{ background: `hsl(${hue}, 100%, 50%)` }}
            onPointerDown={(e) => {
              dragRef.current = 'sv'
              ;(e.target as Element).setPointerCapture?.(e.pointerId)
              pickSV(e.clientX, e.clientY)
            }}
            onPointerMove={onMove}
            onPointerUp={endDrag}
          >
            <div className="cp-sv-white" />
            <div className="cp-sv-black" />
            <div
              className="cp-thumb"
              style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%`, background: current }}
            />
          </div>

          <div
            className="cp-hue"
            ref={hueRef}
            onPointerDown={(e) => {
              dragRef.current = 'hue'
              ;(e.target as Element).setPointerCapture?.(e.pointerId)
              pickHue(e.clientX)
            }}
            onPointerMove={onMove}
            onPointerUp={endDrag}
          >
            <div className="cp-hue-thumb" style={{ left: `${(hue / 360) * 100}%` }} />
          </div>

          <button type="button" className="cp-eyedrop" onClick={startPagePick}>
            <Icon name="eyedropper" size={15} /> Pick colour from page
          </button>

          <div className="cp-swatches">
            {QUICK.map((c) => (
              <button
                type="button"
                key={c}
                className={`cp-sw${c === '#ffffff' ? ' light' : ''}`}
                style={{ background: c }}
                onClick={() => onChange(c)}
                aria-label={c}
              />
            ))}
          </div>

          <div className="cp-hex">
            <span className="cp-preview" style={{ background: value }} />
            <span className="cp-hash">#</span>
            <input
              className="cp-input"
              value={hexText}
              maxLength={6}
              spellCheck={false}
              placeholder="000000"
              onChange={(e) => setHexText(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
              onBlur={commitHex}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitHex()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
          </div>
        </div>
      )}
      {picking && (
        <div className="cp-pick-hint">
          <Icon name="eyedropper" size={14} /> Click any colour on the page · Esc to cancel
        </div>
      )}
    </div>
  )
}
