import type { Tool } from '../lib/types'
import { Icon } from './icons'
import { PALETTE } from '../lib/fonts'
import { ColorPicker } from './ColorPicker'

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
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onToggleThumbs: () => void
  thumbsShown: boolean
  onSign: () => void
  signing: boolean
  onClearEdits: () => void
  canClear: boolean
}

const TOOLS: { id: Tool; label: string; icon: string; hint: string }[] = [
  { id: 'select', label: 'Select', icon: 'select', hint: 'Select & move' },
  { id: 'text', label: 'Add Text', icon: 'text', hint: 'Click to add text' },
  { id: 'edittext', label: 'Edit Text', icon: 'edittext', hint: 'Click existing text to replace it' },
  { id: 'draw', label: 'Draw', icon: 'draw', hint: 'Freehand draw' },
  { id: 'highlight', label: 'Highlight', icon: 'highlight', hint: 'Drag to highlight' },
  { id: 'whiteout', label: 'Whiteout', icon: 'whiteout', hint: 'Cover / redact' },
  { id: 'image', label: 'Image', icon: 'image', hint: 'Place an image' },
  { id: 'eraser', label: 'Eraser', icon: 'eraser', hint: 'Erase drawings & edits (click or drag)' },
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
  onRedo,
  canUndo,
  canRedo,
  onToggleThumbs,
  thumbsShown,
  onSign,
  signing,
  onClearEdits,
  canClear,
}: Props) {
  const showColor =
    tool === 'text' || tool === 'draw' || tool === 'highlight' || tool === 'whiteout'

  return (
    <div className="edit-toolbar">
      <div className="tool-group">
        <button
          className={`tbtn compact${thumbsShown ? ' active' : ''}`}
          onClick={onToggleThumbs}
          title="Toggle page thumbnails"
        >
          <Icon name="grid" />
          <span className="tbtn-label">Pages</span>
        </button>
        <button className="tbtn compact" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Icon name="undo" />
        </button>
        <button className="tbtn compact" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Icon name="redo" />
        </button>
      </div>

      <div className="divider" />

      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tbtn${tool === t.id ? ' active' : ''}`}
            title={t.hint}
            onClick={() => setTool(t.id)}
          >
            <Icon name={t.icon} />
            <span className="tbtn-label">{t.label}</span>
          </button>
        ))}
        <button
          className={`tbtn${signing ? ' active' : ''}`}
          title="Draw or type a reusable signature"
          onClick={onSign}
        >
          <Icon name="sign" />
          <span className="tbtn-label">Sign</span>
        </button>
      </div>

      <div className="tool-props">
        {showColor && (
          <div className="swatches" title="Colour">
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`swatch${color.toLowerCase() === c ? ' active' : ''}${
                  c === '#ffffff' ? ' light' : ''
                }`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
              />
            ))}
            <ColorPicker value={color} onChange={setColor} />
          </div>
        )}
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
      </div>

      <button
        className="btn clear-btn"
        onClick={onClearEdits}
        disabled={!canClear}
        title="Remove all edits from the document"
      >
        <Icon name="trash" size={16} /> <span className="btn-label">Clear all</span>
      </button>
    </div>
  )
}
