import { useState } from 'react'
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
  onReorder: (fromId: string, toId: string) => void
}

export function ThumbnailSidebar({
  pages,
  sources,
  selectedId,
  onSelect,
  onRotate,
  onDelete,
  onMove,
  onReorder,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        {pages.length} page{pages.length !== 1 ? 's' : ''} · drag to reorder
      </div>
      <div className="thumbs">
        {pages.map((p, i) => {
          const src = sources.get(p.srcId)
          if (!src) return null
          const active = p.id === selectedId
          const isOver = overId === p.id && draggingId !== p.id
          return (
            <div
              key={p.id}
              className={
                'thumb' +
                (active ? ' active' : '') +
                (draggingId === p.id ? ' dragging' : '') +
                (isOver ? ' drag-over' : '')
              }
              draggable
              onClick={() => onSelect(p.id)}
              onDragStart={(e) => {
                setDraggingId(p.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', p.id)
              }}
              onDragEnter={() => setOverId(p.id)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={() => {
                setDraggingId(null)
                setOverId(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (draggingId && draggingId !== p.id) onReorder(draggingId, p.id)
                setDraggingId(null)
                setOverId(null)
              }}
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
                <button title="Move up" onClick={() => onMove(p.id, -1)} disabled={i === 0}>
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
