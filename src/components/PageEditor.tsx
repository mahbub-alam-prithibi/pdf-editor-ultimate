import { useCallback, useEffect, useRef, useState } from 'react'
import type { PageViewport } from 'pdfjs-dist'
import { PdfCanvas } from './PdfCanvas'
import { AnnotationLayer } from './AnnotationLayer'
import { FormLayer } from './FormLayer'
import type {
  Annotation,
  ImageAnn,
  PageItem,
  SourceDoc,
  TextAnn,
  Tool,
} from '../lib/types'

const norm = (d: number) => ((d % 360) + 360) % 360
const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `a-${Math.random().toString(36).slice(2)}`

interface Props {
  page: PageItem
  src: SourceDoc
  zoom: number
  tool: Tool
  color: string
  strokeWidth: number
  textSize: number
  annotations: Annotation[]
  onChange: (anns: Annotation[]) => void
  formValues: Record<string, string | boolean>
  onFormChange: (srcId: string, name: string, value: string | boolean) => void
}

export function PageEditor({
  page,
  src,
  zoom,
  tool,
  color,
  strokeWidth,
  textSize,
  annotations,
  onChange,
  formValues,
  onFormChange,
}: Props) {
  const scale = 1.4 * zoom
  const [viewport, setViewport] = useState<PageViewport | null>(null)
  const [draft, setDraft] = useState<Annotation | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const drawing = useRef(false)
  const pendingImgPt = useRef<{ x: number; y: number } | null>(null)
  const dragState = useRef<
    | { id: string; startX: number; startYTop: number; px: number; py: number }
    | null
  >(null)

  useEffect(() => {
    let cancelled = false
    src.doc.getPage(page.srcPageIndex + 1).then((p) => {
      if (cancelled) return
      const total = norm((p.rotate || 0) + page.rotation)
      setViewport(p.getViewport({ scale, rotation: total }))
    })
    return () => {
      cancelled = true
    }
  }, [src.doc, page.srcPageIndex, page.rotation, scale])

  const toPdf = useCallback(
    (clientX: number, clientY: number) => {
      const surface = surfaceRef.current
      if (!surface || !viewport) return null
      const rect = surface.getBoundingClientRect()
      const [x, y] = viewport.convertToPdfPoint(
        clientX - rect.left,
        clientY - rect.top,
      )
      return { x, y }
    },
    [viewport],
  )

  const add = (a: Annotation) => onChange([...annotations, a])
  const patch = (id: string, p: Partial<Annotation>) =>
    onChange(
      annotations.map((a) => (a.id === id ? ({ ...a, ...p } as Annotation) : a)),
    )
  const remove = (id: string) => onChange(annotations.filter((a) => a.id !== id))

  // ----- pointer handlers on the editing surface -----
  const onPointerDown = (e: React.PointerEvent) => {
    if (!viewport) return
    const pt = toPdf(e.clientX, e.clientY)
    if (!pt) return

    if (tool === 'text') {
      const ann: TextAnn = {
        id: uid(),
        type: 'text',
        x: pt.x,
        yTop: pt.y,
        text: '',
        size: textSize,
        color,
      }
      // Drop any blank box left over from a previous placement, then add this one.
      const cleaned = annotations.filter(
        (a) => !(a.type === 'text' && a.text.trim() === ''),
      )
      onChange([...cleaned, ann])
      setEditingId(ann.id)
      return
    }
    if (tool === 'image') {
      pendingImgPt.current = pt
      imgInputRef.current?.click()
      return
    }
    if (tool === 'draw') {
      drawing.current = true
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      setDraft({
        id: 'draft',
        type: 'draw',
        color,
        width: strokeWidth / scale,
        pts: [pt],
      })
      return
    }
    if (tool === 'highlight' || tool === 'whiteout') {
      drawing.current = true
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      setDraft({
        id: 'draft',
        type: tool,
        x0: pt.x,
        y0: pt.y,
        x1: pt.x,
        y1: pt.y,
        color,
      })
      return
    }
    // select tool: clicking empty space deselects and removes any blank text boxes
    const cleaned = annotations.filter(
      (a) => !(a.type === 'text' && a.text.trim() === ''),
    )
    if (cleaned.length !== annotations.length) onChange(cleaned)
    setEditingId(null)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current || !draft) return
    const pt = toPdf(e.clientX, e.clientY)
    if (!pt) return
    if (draft.type === 'draw') {
      setDraft({ ...draft, pts: [...draft.pts, pt] })
    } else if (draft.type === 'highlight' || draft.type === 'whiteout') {
      setDraft({ ...draft, x1: pt.x, y1: pt.y })
    }
  }

  const onPointerUp = () => {
    if (!drawing.current || !draft) {
      drawing.current = false
      return
    }
    drawing.current = false
    if (draft.type === 'draw' && draft.pts.length > 1) {
      add({ ...draft, id: uid() })
    } else if (draft.type === 'highlight' || draft.type === 'whiteout') {
      if (Math.abs(draft.x1 - draft.x0) > 2 && Math.abs(draft.y1 - draft.y0) > 2) {
        add({ ...draft, id: uid() })
      }
    }
    setDraft(null)
  }

  // ----- image insertion -----
  const onImageChosen = (file: File) => {
    const pt = pendingImgPt.current
    if (!pt || !viewport) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const fmt: 'png' | 'jpg' = /image\/png/i.test(dataUrl) ? 'png' : 'jpg'
      const bytes = dataUrlToBytes(dataUrl)
      const probe = new Image()
      probe.onload = () => {
        const aspect = probe.naturalWidth / probe.naturalHeight || 1
        // Default width: 35% of the page's native width.
        const pageW = viewport.viewBox[2] - viewport.viewBox[0]
        const w = pageW * 0.35
        const h = w / aspect
        const ann: ImageAnn = {
          id: uid(),
          type: 'image',
          x0: pt.x,
          y0: pt.y - h,
          x1: pt.x + w,
          y1: pt.y,
          dataUrl,
          bytes,
          fmt,
        }
        add(ann)
      }
      probe.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  // ----- text drag -----
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const ds = dragState.current
      if (!ds) return
      const dx = (e.clientX - ds.px) / scale
      const dy = (e.clientY - ds.py) / scale
      patch(ds.id, { x: ds.startX + dx, yTop: ds.startYTop - dy })
    }
    const onUp = () => {
      dragState.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, annotations])

  const startTextDrag = (e: React.PointerEvent, ann: TextAnn) => {
    e.stopPropagation()
    dragState.current = {
      id: ann.id,
      startX: ann.x,
      startYTop: ann.yTop,
      px: e.clientX,
      py: e.clientY,
    }
  }

  if (!viewport) {
    return <div className="viewer viewer-empty">Rendering…</div>
  }

  const textEditable = tool === 'select' || tool === 'text'
  const cursor =
    tool === 'text'
      ? 'text'
      : tool === 'select'
        ? 'default'
        : 'crosshair'

  const textAnns = annotations.filter(
    (a): a is TextAnn => a.type === 'text',
  )

  return (
    <div className="viewer">
      <div
        className="page-shell"
        style={{ width: viewport.width, height: viewport.height }}
      >
        <PdfCanvas
          key={page.id}
          doc={src.doc}
          pageIndex={page.srcPageIndex}
          rotation={page.rotation}
          scale={scale}
        />
        <AnnotationLayer viewport={viewport} annotations={annotations} draft={draft} />

        <div
          ref={surfaceRef}
          className="edit-surface"
          style={{ cursor, pointerEvents: 'auto' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {textAnns.map((ann) => {
            const [vx, vy] = viewport.convertToViewportPoint(ann.x, ann.yTop)
            return (
              <TextBox
                key={ann.id}
                ann={ann}
                left={vx}
                top={vy}
                scale={scale}
                editable={textEditable}
                editing={editingId === ann.id}
                onFocus={() => setEditingId(ann.id)}
                onText={(text) => patch(ann.id, { text })}
                onDelete={() => remove(ann.id)}
                onDragStart={(e) => startTextDrag(e, ann)}
              />
            )
          })}
        </div>

        <FormLayer
          page={page}
          src={src}
          viewport={viewport}
          tool={tool}
          formValues={formValues}
          onFormChange={onFormChange}
        />

        <input
          ref={imgInputRef}
          type="file"
          accept="image/png,image/jpeg"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImageChosen(f)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

// -------------------- Text box --------------------

interface TextBoxProps {
  ann: TextAnn
  left: number
  top: number
  scale: number
  editable: boolean
  editing: boolean
  onFocus: () => void
  onText: (text: string) => void
  onDelete: () => void
  onDragStart: (e: React.PointerEvent) => void
}

function TextBox({
  ann,
  left,
  top,
  scale,
  editable,
  editing,
  onFocus,
  onText,
  onDelete,
  onDragStart,
}: TextBoxProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Grow the textarea to fit its content (fallback for browsers without
  // CSS field-sizing).
  const autosize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => {
    autosize()
  }, [ann.text, ann.size, scale])

  // Focus (and place the caret at the end) whenever this box becomes active.
  useEffect(() => {
    if (!editing) return
    const el = ref.current
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [editing])

  return (
    <div
      className={`text-box${editing ? ' editing' : ''}`}
      style={{ left, top, pointerEvents: editable ? 'auto' : 'none' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {editable && (
        <span className="tb-grip" title="Drag to move" onPointerDown={onDragStart}>
          ⠿
        </span>
      )}
      <textarea
        ref={ref}
        className="tb-input"
        value={ann.text}
        rows={1}
        wrap="off"
        spellCheck={false}
        readOnly={!editable}
        placeholder="Type…"
        style={{ fontSize: ann.size * scale, color: ann.color, lineHeight: 1.15 }}
        onChange={(e) => onText(e.target.value)}
        onFocus={onFocus}
      />
      {editable && (
        <span className="tb-del" title="Delete" onPointerDown={onDelete}>
          ✕
        </span>
      )}
    </div>
  )
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? ''
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
