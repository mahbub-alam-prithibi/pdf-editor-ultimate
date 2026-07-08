import { useRef, useState } from 'react'

interface Props {
  saved: string[]
  onSaveAndPlace: (dataUrl: string) => void
  onUse: (dataUrl: string) => void
  onDelete: (dataUrl: string) => void
  onClose: () => void
}

const FONTS = [
  { label: 'Script', css: '"Segoe Script", "Bradley Hand", cursive' },
  { label: 'Handwriting', css: '"Lucida Handwriting", "Comic Sans MS", cursive' },
  { label: 'Brush', css: '"Brush Script MT", "Segoe Script", cursive' },
]

/** Crop a canvas to its non-transparent bounds and return a PNG data URL. */
function trimmedDataUrl(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let found = false
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        found = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (!found) return null
  const pad = 10
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')?.drawImage(canvas, minX, minY, w, h, 0, 0, w, h)
  return out.toDataURL('image/png')
}

export function SignaturePad({ saved, onSaveAndPlace, onUse, onDelete, onClose }: Props) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typed, setTyped] = useState('')
  const [font, setFont] = useState(FONTS[0].css)
  const [color, setColor] = useState('#0b3d91')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const startDraw = (e: React.PointerEvent) => {
    drawing.current = true
    last.current = pos(e)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const moveDraw = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !last.current) return
    const p = pos(e)
    ctx.strokeStyle = color
    ctx.lineWidth = 2.6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }
  const endDraw = () => {
    drawing.current = false
    last.current = null
  }
  const clearCanvas = () => {
    const c = canvasRef.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
  }

  const buildDataUrl = (): string | null => {
    if (mode === 'draw') {
      return canvasRef.current ? trimmedDataUrl(canvasRef.current) : null
    }
    if (!typed.trim()) return null
    const c = document.createElement('canvas')
    c.width = 900
    c.height = 240
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `84px ${font}`
    ctx.fillText(typed, c.width / 2, c.height / 2)
    return trimmedDataUrl(c)
  }

  const handleSave = () => {
    const url = buildDataUrl()
    if (!url) {
      alert(mode === 'draw' ? 'Draw your signature first.' : 'Type your signature first.')
      return
    }
    onSaveAndPlace(url)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add your signature</h3>
          <button className="modal-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="seg">
          <button
            className={`seg-btn${mode === 'draw' ? ' active' : ''}`}
            onClick={() => setMode('draw')}
          >
            ✍️ Draw
          </button>
          <button
            className={`seg-btn${mode === 'type' ? ' active' : ''}`}
            onClick={() => setMode('type')}
          >
            ⌨️ Type
          </button>
          <div className="seg-spacer" />
          <label className="sig-color" title="Ink colour">
            <span style={{ background: color }} />
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>

        {mode === 'draw' ? (
          <div className="sig-stage">
            <canvas
              ref={canvasRef}
              width={620}
              height={220}
              className="sig-canvas"
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
            <button className="btn sig-clear" onClick={clearCanvas}>
              Clear
            </button>
          </div>
        ) : (
          <div className="sig-stage">
            <input
              className="sig-type-input"
              placeholder="Type your name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              style={{ fontFamily: font, color }}
              autoFocus
            />
            <div className="sig-fonts">
              {FONTS.map((f) => (
                <button
                  key={f.label}
                  className={`sig-font${font === f.css ? ' active' : ''}`}
                  style={{ fontFamily: f.css }}
                  onClick={() => setFont(f.css)}
                >
                  {typed || 'Signature'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save &amp; place
          </button>
        </div>

        {saved.length > 0 && (
          <div className="sig-saved">
            <div className="sig-saved-head">Saved signatures</div>
            <div className="sig-saved-row">
              {saved.map((s, i) => (
                <div className="sig-thumb" key={i}>
                  <img src={s} alt={`Signature ${i + 1}`} onClick={() => onUse(s)} />
                  <button
                    className="sig-thumb-del"
                    title="Delete"
                    onClick={() => onDelete(s)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
