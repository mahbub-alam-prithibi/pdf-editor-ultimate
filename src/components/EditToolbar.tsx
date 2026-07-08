import type { Tool } from '../lib/types'

interface Props {
  tool: Tool
  setTool: (t: Tool) => void
  color: string
  setColor: (c: string) => void
  strokeWidth: number
  setStrokeWidth: (n: number) => void
  textSize: number
  setTextSize: (n: number) => void
  onUndo: () => void
  onClearPage: () => void
  canUndo: boolean
  onSign: () => void
  signing: boolean
}

const TOOLS: { id: Tool; label: string; icon: string; hint: string }[] = [
  { id: 'select', label: 'Select', icon: '🖱️', hint: 'Select & move text' },
  { id: 'text', label: 'Text', icon: '✍️', hint: 'Click to add text' },
  { id: 'edittext', label: 'Edit text', icon: '✏️', hint: 'Click existing text to replace it' },
  { id: 'draw', label: 'Draw', icon: '🖊️', hint: 'Freehand draw / sign' },
  { id: 'highlight', label: 'Highlight', icon: '🖍️', hint: 'Drag to highlight' },
  { id: 'whiteout', label: 'Whiteout', icon: '⬜', hint: 'Cover / redact' },
  { id: 'image', label: 'Image', icon: '🖼️', hint: 'Place an image' },
]

const SWATCHES = [
  '#000000',
  '#ffffff',
  '#e5484d',
  '#f5a623',
  '#ffe14d',
  '#30a46c',
  '#4f8cff',
  '#8e4ec6',
]

export function EditToolbar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  textSize,
  setTextSize,
  onUndo,
  onClearPage,
  canUndo,
  onSign,
  signing,
}: Props) {
  return (
    <div className="edit-toolbar">
      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool-btn${tool === t.id ? ' active' : ''}`}
            title={t.hint}
            onClick={() => setTool(t.id)}
          >
            <span className="tool-icon" aria-hidden>
              {t.icon}
            </span>
            <span className="tool-label">{t.label}</span>
          </button>
        ))}
        <button
          className={`tool-btn${signing ? ' active' : ''}`}
          title="Draw or type a reusable signature, then place it"
          onClick={onSign}
        >
          <span className="tool-icon" aria-hidden>
            ✒️
          </span>
          <span className="tool-label">Sign</span>
        </button>
      </div>

      <div className="divider" />

      <div className="tool-group swatches" title="Colour">
        {SWATCHES.map((c) => (
          <button
            key={c}
            className={`swatch${color.toLowerCase() === c ? ' active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={`Colour ${c}`}
          />
        ))}
        <input
          type="color"
          className="swatch-custom"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Custom colour"
        />
      </div>

      <div className="divider" />

      {(tool === 'draw' || tool === 'highlight' || tool === 'whiteout') && (
        <label className="range-field">
          <span>Thickness</span>
          <input
            type="range"
            min={1}
            max={24}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
        </label>
      )}
      {tool === 'text' && (
        <label className="range-field">
          <span>Size</span>
          <input
            type="range"
            min={8}
            max={72}
            value={textSize}
            onChange={(e) => setTextSize(Number(e.target.value))}
          />
          <span className="range-val">{textSize}</span>
        </label>
      )}

      <div className="spacer" />

      <button className="btn" onClick={onUndo} disabled={!canUndo} title="Undo last on this page">
        ↶ Undo
      </button>
      <button className="btn" onClick={onClearPage} disabled={!canUndo} title="Clear this page's edits">
        Clear page
      </button>
    </div>
  )
}
