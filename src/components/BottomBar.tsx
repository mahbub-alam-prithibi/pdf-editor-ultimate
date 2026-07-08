import { Icon } from './icons'

interface Props {
  pageIndex: number // 1-based
  total: number
  onPrev: () => void
  onNext: () => void
  zoom: number
  setZoom: (z: number) => void
  onFit: () => void
  onRotateLeft: () => void
  onRotateRight: () => void
}

const clamp = (z: number) => Math.min(4, Math.max(0.25, Math.round(z * 100) / 100))

export function BottomBar({
  pageIndex,
  total,
  onPrev,
  onNext,
  zoom,
  setZoom,
  onFit,
  onRotateLeft,
  onRotateRight,
}: Props) {
  return (
    <div className="bottom-bar">
      <button className="bb-btn" onClick={onPrev} disabled={pageIndex <= 1} title="Previous page">
        <Icon name="chevLeft" size={18} />
      </button>
      <span className="bb-page">
        {pageIndex} / {total}
      </span>
      <button
        className="bb-btn"
        onClick={onNext}
        disabled={pageIndex >= total}
        title="Next page"
      >
        <Icon name="chevRight" size={18} />
      </button>

      <div className="bb-sep" />

      <button className="bb-btn" onClick={onRotateLeft} title="Rotate page left">
        <Icon name="rotateLeft" size={18} />
      </button>
      <button className="bb-btn" onClick={onRotateRight} title="Rotate page right">
        <Icon name="rotateRight" size={18} />
      </button>

      <div className="bb-sep" />

      <button className="bb-btn" onClick={() => setZoom(clamp(zoom - 0.1))} title="Zoom out">
        <Icon name="zoomOut" size={18} />
      </button>
      <span
        className="bb-zoom"
        onClick={() => setZoom(1)}
        title="Reset to 100%"
        style={{ cursor: 'pointer' }}
      >
        {Math.round(zoom * 100)}%
      </span>
      <button className="bb-btn" onClick={() => setZoom(clamp(zoom + 0.1))} title="Zoom in">
        <Icon name="zoomIn" size={18} />
      </button>

      <div className="bb-sep" />

      <button className="bb-btn" onClick={onFit} title="Fit width">
        <Icon name="fit" size={18} />
      </button>
    </div>
  )
}
