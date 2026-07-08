import type { Tool } from '../lib/types'
import { Icon } from './icons'

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
  onRotateLeft: () => void
  onRotateRight: () => void
  onToggleThumbs: () => void
  thumbsShown: boolean
  onSign: () => void
  signing: boolean
}

const TOOLS: { id: Tool; label: string; icon: string; hint: string }[] = [
  { id: 'select', label: 'Select', icon: 'select', hint: 'Select & move' },
  { id: 'text', label: 'Add Text', icon: 'text', hint: 'Click to add text' },
  { id: 'edittext', label: 'Edit Text', icon: 'edittext', hint: 'Click existing text to replace it' },
  { id: 'draw', label: 'Draw', icon: 'draw', hint: 'Freehand draw' },
  { id: 'highlight', label: 'Highlight', icon: 'highlight', hint: 'Drag to highlight' },
  { id: 'whiteout', label: 'Whiteout', icon: 'whiteout', hint: 'Cover / redact' },
  { id: 'image', label: 'Image', icon: 'image', hint: 'Place an image' },
]

const SWATCHES = ['#000000', '#e01e26', '#f5a623', '#f7d117', '#2ca24c', '#1f6feb', '#8e4ec6', '#ffffff']

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
  onRotateLeft,
  onRotateRight,
  onToggleThumbs,
  thumbsShown,
  onSign,
  signing,
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
        <button className="tbtn compact" onClick={onRotateLeft} title="Rotate page left">
          <Icon name="rotateLeft" />
        </button>
        <button className="tbtn compact" onClick={onRotateRight} title="Rotate page right">
          <Icon name="rotateRight" />
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
            {SWATCHES.map((c) => (
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
            <input
              type="color"
              className="swatch-custom"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Custom colour"
            />
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
    </div>
  )
}
