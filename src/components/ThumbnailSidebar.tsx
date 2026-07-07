import { PdfCanvas } from './PdfCanvas'
import type { PageItem, SourceDoc } from '../lib/types'

interface Props {
  pages: PageItem[]
  sources: Map<string, SourceDoc>
  selectedId: string | null
  onSelect: (id: string) => void
  onRotate: (id: string, delta: number) => void
  onDelete: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
}

export function ThumbnailSidebar({
  pages,
  sources,
  selectedId,
  onSelect,
  onRotate,
  onDelete,
  onMove,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        {pages.length} page{pages.length !== 1 ? 's' : ''}
      </div>
      <div className="thumbs">
        {pages.map((p, i) => {
          const src = sources.get(p.srcId)
          if (!src) return null
          const active = p.id === selectedId
          return (
            <div
              key={p.id}
              className={`thumb${active ? ' active' : ''}`}
              onClick={() => onSelect(p.id)}
            >
              <div className="thumb-canvas">
                <PdfCanvas
                  doc={src.doc}
                  pageIndex={p.srcPageIndex}
                  rotation={p.rotation}
                  fitWidth={150}
                />
              </div>
              <div className="thumb-num">{i + 1}</div>
              <div className="thumb-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  title="Move up"
                  onClick={() => onMove(p.id, -1)}
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  title="Move down"
                  onClick={() => onMove(p.id, 1)}
                  disabled={i === pages.length - 1}
                >
                  ↓
                </button>
                <button title="Rotate left" onClick={() => onRotate(p.id, -90)}>
                  ⟲
                </button>
                <button title="Rotate right" onClick={() => onRotate(p.id, 90)}>
                  ⟳
                </button>
                <button
                  className="danger"
                  title="Delete page"
                  onClick={() => onDelete(p.id)}
                >
                  🗑
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
