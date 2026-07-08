import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (hex: string) => void
}

// A broad but compact set of colours (grouped by hue) — no native OS dialog.
const COLORS = [
  '#000000', '#404040', '#666666', '#999999', '#cccccc', '#ffffff',
  '#7a0b0b', '#c0180f', '#e01e26', '#ff5a4d', '#ff9a90', '#ffd7d2',
  '#a04a00', '#e67e00', '#f5a623', '#ffd23f', '#fff08a', '#fff7cc',
  '#0b5c2e', '#1aa64b', '#43d17a', '#8fe0a8', '#0a6b6b', '#00a3a3',
  '#0b2e7a', '#1f6feb', '#5a9bff', '#a9c9ff', '#3a1a6b', '#6b3fd4',
  '#9a6ff0', '#c9b0f7', '#8a1155', '#e91e8c', '#ff6bb3', '#8d5a2b',
]

function normalizeHex(h: string): string | null {
  let s = h.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('')
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toLowerCase()}`
  return null
}

export function ColorPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value.replace('#', ''))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setHex(value.replace('#', '')), [value])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const commitHex = () => {
    const v = normalizeHex(hex)
    if (v) onChange(v)
    else setHex(value.replace('#', ''))
  }

  return (
    <div className="cp" ref={ref}>
      <button
        type="button"
        className="cp-trigger"
        title="More colours"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cp-dot" style={{ background: value }} />
      </button>
      {open && (
        <div className="cp-pop">
          <div className="cp-grid">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`cp-c${value.toLowerCase() === c ? ' active' : ''}${
                  c === '#ffffff' ? ' light' : ''
                }`}
                style={{ background: c }}
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                }}
                aria-label={c}
              />
            ))}
          </div>
          <div className="cp-hex">
            <span className="cp-preview" style={{ background: normalizeHex(hex) ?? '#fff' }} />
            <span className="cp-hash">#</span>
            <input
              className="cp-input"
              value={hex}
              maxLength={6}
              spellCheck={false}
              placeholder="000000"
              onChange={(e) => setHex(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
              onBlur={commitHex}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitHex()
                  setOpen(false)
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
