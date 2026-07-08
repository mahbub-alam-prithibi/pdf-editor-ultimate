interface Props {
  onOpen: () => void
  onExport: () => void
  onClear: () => void
  canExport: boolean
  zoom: number
  setZoom: (z: number) => void
  pageCount: number
  onRotateAll: (delta: number) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  busy: boolean
}

const clampZoom = (z: number) => Math.min(3, Math.max(0.5, Math.round(z * 100) / 100))

// Replace with your repository URL after you push to GitHub.
const REPO_URL = 'https://github.com/mahbub-alam-prithibi/pdfly'

export function Toolbar({
  onOpen,
  onExport,
  onClear,
  canExport,
  zoom,
  setZoom,
  pageCount,
  onRotateAll,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  busy,
}: Props) {
  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-logo" aria-hidden>
          📄
        </span>
        <div className="brand-text">
          <span className="brand-name">PDFly</span>
          <span className="brand-tag">Free &amp; private PDF editor</span>
        </div>
      </div>

      <div className="toolbar-actions">
        <button className="btn" onClick={onOpen}>
          ＋ Add PDF
        </button>

        {pageCount > 0 && (
          <>
            <div className="divider" />
            <button
              className="btn icon"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              ↶
            </button>
            <button
              className="btn icon"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              ↷
            </button>
            <div className="divider" />
            <div className="zoom" role="group" aria-label="Zoom">
              <button
                className="btn icon"
                onClick={() => setZoom(clampZoom(zoom - 0.25))}
                title="Zoom out"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="zoom-val">{Math.round(zoom * 100)}%</span>
              <button
                className="btn icon"
                onClick={() => setZoom(clampZoom(zoom + 0.25))}
                title="Zoom in"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
            <button
              className="btn icon"
              title="Rotate all pages left"
              aria-label="Rotate all pages left"
              onClick={() => onRotateAll(-90)}
            >
              ⟲
            </button>
            <button
              className="btn icon"
              title="Rotate all pages right"
              aria-label="Rotate all pages right"
              onClick={() => onRotateAll(90)}
            >
              ⟳
            </button>
            <button className="btn" onClick={onClear} title="Remove all pages">
              Clear
            </button>
          </>
        )}

        <div className="divider" />
        <button
          className="btn btn-primary"
          onClick={onExport}
          disabled={!canExport || busy}
        >
          ⬇ Download PDF
        </button>
        <a
          className="btn ghost"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          title="Star this project on GitHub"
        >
          ★ GitHub
        </a>
      </div>
    </header>
  )
}
