import { useCallback, useEffect, useRef, useState } from 'react'
import type { PageViewport } from 'pdfjs-dist'
import { PdfCanvas } from './PdfCanvas'
import { AnnotationLayer } from './AnnotationLayer'
import { FormLayer } from './FormLayer'
import type {
  Annotation,
  ImageAnn,
  PageItem,
  RectAnn,
  SourceDoc,
  TextAnn,
  TextFont,
  Tool,
} from '../lib/types'
import { FONTS, PALETTE, cssForFont, parsePdfFontName } from '../lib/fonts'
import { ColorPicker } from './ColorPicker'

interface TextItemInfo {
  str: string
  x: number
  y: number
  width: number
  fontSize: number
  font: TextFont
}

const hexToTriplet = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const tripletToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`

const norm = (d: number) => ((d % 360) + 360) % 360
const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `a-${Math.random().toString(36).slice(2)}`

interface Props {
  page: PageItem
  src: SourceDoc
  zoom: number
  setZoom: (z: number) => void
  fitNonce: number
  tool: Tool
  color: string
  strokeWidth: number
  textSize: number
  annotations: Annotation[]
  onChange: (anns: Annotation[]) => void
  formValues: Record<string, string | boolean>
  onFormChange: (srcId: string, name: string, value: string | boolean) => void
  onToolChange: (t: Tool) => void
  pendingSignature: string | null
}

export function PageEditor({
  page,
  src,
  zoom,
  setZoom,
  fitNonce,
  tool,
  color,
  strokeWidth,
  textSize,
  annotations,
  onChange,
  formValues,
  onFormChange,
  onToolChange,
  pendingSignature,
}: Props) {
  const scale = 1.4 * zoom
  const [viewport, setViewport] = useState<PageViewport | null>(null)
  const [draft, setDraft] = useState<Annotation | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null)
  const imgDragRef = useRef<{
    id: string
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se'
    startPdf: { x: number; y: number }
    rect: { x0: number; y0: number; x1: number; y1: number }
  } | null>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const drawing = useRef(false)
  const erasing = useRef(false)
  const pendingImgPt = useRef<{ x: number; y: number } | null>(null)
  const textItemsRef = useRef<{ pageId: string; items: TextItemInfo[] } | null>(null)
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

  // Fit page width to the viewer when the user hits the fit button.
  useEffect(() => {
    if (fitNonce === 0 || !viewport || !viewerRef.current) return
    const avail = viewerRef.current.clientWidth - 64
    if (avail <= 0) return
    const next = Math.min(
      4,
      Math.max(0.25, Math.round(((zoom * avail) / viewport.width) * 100) / 100),
    )
    setZoom(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitNonce])

  // Auto-fit to width ONLY on real phones (coarse primary pointer + narrow).
  // Touch-screen laptops keep the full desktop layout.
  const autoFitDone = useRef(false)
  useEffect(() => {
    if (autoFitDone.current || !viewport || !viewerRef.current) return
    const phone =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse) and (max-width: 760px)').matches
    if (!phone) return
    const avail = viewerRef.current.clientWidth - 20
    if (avail <= 0) return
    autoFitDone.current = true
    const next = Math.min(
      4,
      Math.max(0.25, Math.round(((zoom * avail) / viewport.width) * 100) / 100),
    )
    if (Math.abs(next - zoom) > 0.02) setZoom(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport])

  // Escape deselects / stops editing the current text box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ;(document.activeElement as HTMLElement | null)?.blur?.()
        setEditingId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
  const resizeText = (id: string, dir: 1 | -1) => {
    const a = annotations.find((x) => x.id === id)
    if (!a || a.type !== 'text') return
    const step = Math.max(1, Math.round(a.size * 0.1))
    patch(id, { size: Math.min(300, Math.max(6, a.size + dir * step)) })
  }
  const setTextColor = (id: string, color: string) => patch(id, { color })
  const setTextFont = (id: string, partial: Partial<TextFont>) => {
    const a = annotations.find((x) => x.id === id)
    if (!a || a.type !== 'text') return
    const cur = a.font ?? { family: 'Helvetica', bold: false, italic: false }
    patch(id, { font: { ...cur, ...partial } })
  }

  // ----- eraser: remove any annotation under the cursor -----
  const distToSeg = (
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
  }
  const annHitByPoint = (a: Annotation, pt: { x: number; y: number }, tol: number): boolean => {
    if (a.type === 'highlight' || a.type === 'whiteout' || a.type === 'image') {
      return (
        pt.x >= Math.min(a.x0, a.x1) - tol &&
        pt.x <= Math.max(a.x0, a.x1) + tol &&
        pt.y >= Math.min(a.y0, a.y1) - tol &&
        pt.y <= Math.max(a.y0, a.y1) + tol
      )
    }
    if (a.type === 'text') {
      const lines = a.text.split('\n')
      const maxLen = Math.max(1, ...lines.map((l) => l.length))
      const w = maxLen * a.size * 0.55
      const h = Math.max(1, lines.length) * a.size * 1.2
      return (
        pt.x >= a.x - tol &&
        pt.x <= a.x + w + tol &&
        pt.y <= a.yTop + tol &&
        pt.y >= a.yTop - h - tol
      )
    }
    if (a.type === 'draw') {
      const th = a.width / 2 + tol + 2
      if (a.pts.length === 1) return Math.hypot(pt.x - a.pts[0].x, pt.y - a.pts[0].y) < th
      for (let i = 1; i < a.pts.length; i++) {
        if (distToSeg(pt, a.pts[i - 1], a.pts[i]) < th) return true
      }
    }
    return false
  }
  const eraseAt = (pt: { x: number; y: number }) => {
    const tol = 8 / scale
    const next = annotations.filter((a) => !annHitByPoint(a, pt, tol))
    if (next.length !== annotations.length) onChange(next)
  }

  // Text runs on the page (PDF coords), for the "Edit text" tool. Cached per page.
  const ensureTextItems = async (): Promise<TextItemInfo[]> => {
    if (textItemsRef.current?.pageId === page.id) return textItemsRef.current.items
    const p = await src.doc.getPage(page.srcPageIndex + 1)
    // Force the page's fonts to load into commonObjs so we can read weight/style.
    try {
      await p.getOperatorList()
    } catch {
      /* ignore */
    }
    const tc = await p.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const styles = (tc as any).styles || {}

    const detectFont = (fontName: string): TextFont => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fo: any = null
      try {
        fo = p.commonObjs.get(fontName)
      } catch {
        /* not resolved — fall back to the style's family string */
      }
      const psName = String(fo?.name || styles[fontName]?.fontFamily || '')
      const parsed = parsePdfFontName(psName)
      // Prefer the font object's own flags (most reliable); OR the parsed name.
      const bold = !!(fo?.bold || fo?.black) || parsed.bold
      const italic = !!fo?.italic || parsed.italic
      return { family: parsed.family, bold, italic }
    }

    const items: TextItemInfo[] = tc.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((it: any) => it)
      .filter((it) => it.str && it.str.trim() && it.transform)
      .map((it) => {
        const t = it.transform as number[]
        const fontSize = Math.hypot(t[2], t[3]) || it.height || 12
        return {
          str: it.str as string,
          x: t[4],
          y: t[5],
          width: it.width as number,
          fontSize,
          font: detectFont(it.fontName),
        }
      })
    textItemsRef.current = { pageId: page.id, items }
    return items
  }

  // Sample the page's background colour near a text run so the cover blends in.
  const sampleBg = (item: TextItemInfo): string => {
    try {
      if (!viewport) return '#ffffff'
      const canvas = surfaceRef.current?.parentElement?.querySelector(
        '.pdf-canvas',
      ) as HTMLCanvasElement | null
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return '#ffffff'
      const dpr = window.devicePixelRatio || 1
      const cx = item.x + item.width / 2
      const probes: [number, number][] = [
        [cx, item.y + item.fontSize * 1.3], // above
        [cx, item.y - item.fontSize * 0.5], // below
        [item.x + item.width + item.fontSize * 0.4, item.y + item.fontSize * 0.3], // right
      ]
      let best = '#ffffff'
      let bestLum = -1
      for (const [px, py] of probes) {
        const [vx, vy] = viewport.convertToViewportPoint(px, py)
        const sx = Math.round(vx * dpr)
        const sy = Math.round(vy * dpr)
        if (sx < 0 || sy < 0 || sx >= canvas.width || sy >= canvas.height) continue
        const d = ctx.getImageData(sx, sy, 1, 1).data
        const lum = 0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2]
        if (lum > bestLum) {
          bestLum = lum
          best = `#${[d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join('')}`
        }
      }
      return best
    } catch {
      return '#ffffff'
    }
  }

  // Sample the original text colour by reading the whole run region and averaging
  // the "solid ink" pixels (those most unlike the background). Averaging the solid
  // core avoids anti-aliased edge pixels, so black text reads as black, not grey.
  const sampleTextColor = (item: TextItemInfo, bgHex: string): string => {
    try {
      if (!viewport) return '#000000'
      const canvas = surfaceRef.current?.parentElement?.querySelector(
        '.pdf-canvas',
      ) as HTMLCanvasElement | null
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return '#000000'
      const dpr = window.devicePixelRatio || 1
      const [br, bgc, bb] = hexToTriplet(bgHex)

      // Glyph region in device pixels.
      const [ax, ay] = viewport.convertToViewportPoint(item.x, item.y - item.fontSize * 0.2)
      const [bx, by] = viewport.convertToViewportPoint(
        item.x + item.width,
        item.y + item.fontSize * 0.75,
      )
      let sx = Math.round(Math.min(ax, bx) * dpr)
      let sy = Math.round(Math.min(ay, by) * dpr)
      let sw = Math.round(Math.abs(bx - ax) * dpr)
      let sh = Math.round(Math.abs(by - ay) * dpr)
      sx = Math.max(0, sx)
      sy = Math.max(0, sy)
      sw = Math.min(sw, canvas.width - sx)
      sh = Math.min(sh, canvas.height - sy)
      if (sw <= 0 || sh <= 0) return '#000000'

      const data = ctx.getImageData(sx, sy, sw, sh).data
      const dist = (i: number) =>
        Math.abs(data[i] - br) + Math.abs(data[i + 1] - bgc) + Math.abs(data[i + 2] - bb)

      // Pass 1: how far does the darkest/most-saturated ink get from the background?
      let maxDist = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue
        const d = dist(i)
        if (d > maxDist) maxDist = d
      }
      if (maxDist < 60) return '#000000' // no real ink found

      // Pass 2: average the solid-ink cluster (near the max), ignoring faint edges.
      const thresh = maxDist * 0.8
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue
        if (dist(i) >= thresh) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          n++
        }
      }
      if (!n) return '#000000'
      return tripletToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n))
    } catch {
      return '#000000'
    }
  }

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
    if (tool === 'edittext') {
      void (async () => {
        const items = await ensureTextItems()
        // Runs whose vertical band contains the click.
        const band = items.filter(
          (it) => pt.y >= it.y - it.fontSize * 0.4 && pt.y <= it.y + it.fontSize * 1.0,
        )
        // Prefer a run that horizontally contains the click; else the nearest one on the line.
        let hit = band.find((it) => pt.x >= it.x - 2 && pt.x <= it.x + it.width + 2)
        if (!hit && band.length) {
          hit = band
            .map((it) => ({
              it,
              d: Math.max(0, it.x - pt.x, pt.x - (it.x + it.width)),
            }))
            .sort((a, b) => a.d - b.d)[0].it
        }
        if (!hit) return
        // If this run was already replaced (a text box sits here), just re-select
        // it — never stack a second cover + copy on top (that looked like a repeat).
        const existing = annotations.find(
          (a): a is TextAnn =>
            a.type === 'text' &&
            Math.abs(a.x - hit.x) < hit.fontSize * 0.6 &&
            Math.abs(a.yTop - (hit.y + hit.fontSize * 0.9)) < hit.fontSize * 0.8,
        )
        if (existing) {
          setEditingId(existing.id)
          return
        }
        const bg = sampleBg(hit)
        const textColor = sampleTextColor(hit, bg)
        const pad = hit.fontSize * 0.15
        const cover: RectAnn = {
          id: uid(),
          type: 'whiteout',
          x0: hit.x - pad,
          y0: hit.y - hit.fontSize * 0.3,
          x1: hit.x + hit.width + pad,
          y1: hit.y + hit.fontSize * 0.9,
          color: bg,
        }
        const replacement: TextAnn = {
          id: uid(),
          type: 'text',
          x: hit.x,
          yTop: hit.y + hit.fontSize * 0.9,
          text: hit.str,
          // Font now matches the original (serif/sans/mono + weight/style), so
          // keep the detected size; fine-tune with A- / A+ if needed.
          size: hit.fontSize,
          color: textColor,
          font: hit.font,
        }
        onChange([...annotations, cover, replacement])
        setEditingId(replacement.id)
      })()
      return
    }
    if (tool === 'eraser') {
      erasing.current = true
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      eraseAt(pt)
      return
    }
    if (tool === 'image') {
      pendingImgPt.current = pt
      imgInputRef.current?.click()
      return
    }
    if (tool === 'signature') {
      if (!pendingSignature) return
      const dataUrl = pendingSignature
      const probe = new Image()
      probe.onload = () => {
        const aspect = probe.naturalWidth / probe.naturalHeight || 3
        const pageW = viewport.viewBox[2] - viewport.viewBox[0]
        const w = pageW * 0.28
        const h = w / aspect
        const ann: ImageAnn = {
          id: uid(),
          type: 'image',
          x0: pt.x,
          y0: pt.y - h,
          x1: pt.x + w,
          y1: pt.y,
          dataUrl,
          bytes: dataUrlToBytes(dataUrl),
          fmt: 'png',
        }
        add(ann)
        setSelectedAnnId(ann.id)
        onToolChange('select')
      }
      probe.src = dataUrl
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
    // select tool: pick up an image under the cursor (topmost first), else deselect
    const img = [...annotations]
      .reverse()
      .find(
        (a): a is ImageAnn =>
          a.type === 'image' &&
          pt.x >= Math.min(a.x0, a.x1) &&
          pt.x <= Math.max(a.x0, a.x1) &&
          pt.y >= Math.min(a.y0, a.y1) &&
          pt.y <= Math.max(a.y0, a.y1),
      )
    if (img) {
      setSelectedAnnId(img.id)
      imgDragRef.current = {
        id: img.id,
        mode: 'move',
        startPdf: pt,
        rect: { x0: img.x0, y0: img.y0, x1: img.x1, y1: img.y1 },
      }
      return
    }
    setSelectedAnnId(null)
    const cleaned = annotations.filter(
      (a) => !(a.type === 'text' && a.text.trim() === ''),
    )
    if (cleaned.length !== annotations.length) onChange(cleaned)
    setEditingId(null)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (erasing.current) {
      const pt = toPdf(e.clientX, e.clientY)
      if (pt) eraseAt(pt)
      return
    }
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
    if (erasing.current) {
      erasing.current = false
      return
    }
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
        setSelectedAnnId(ann.id)
        onToolChange('select') // let the user immediately move / resize it
      }
      probe.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const startImgResize = (
    e: React.PointerEvent,
    a: ImageAnn,
    mode: 'nw' | 'ne' | 'sw' | 'se',
  ) => {
    e.stopPropagation()
    const startPdf = toPdf(e.clientX, e.clientY)
    if (!startPdf) return
    imgDragRef.current = {
      id: a.id,
      mode,
      startPdf,
      rect: { x0: a.x0, y0: a.y0, x1: a.x1, y1: a.y1 },
    }
  }

  // ----- image move / resize (aspect-locked) -----
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = imgDragRef.current
      if (!d) return
      const cur = toPdf(e.clientX, e.clientY)
      if (!cur) return
      const r = d.rect
      if (d.mode === 'move') {
        const dx = cur.x - d.startPdf.x
        const dy = cur.y - d.startPdf.y
        patch(d.id, { x0: r.x0 + dx, x1: r.x1 + dx, y0: r.y0 + dy, y1: r.y1 + dy })
        return
      }
      const left = Math.min(r.x0, r.x1)
      const right = Math.max(r.x0, r.x1)
      const bottom = Math.min(r.y0, r.y1)
      const top = Math.max(r.y0, r.y1)
      const aspect = (right - left) / Math.max(1, top - bottom)
      let anchorX: number, anchorY: number, dirX: number, dirY: number
      switch (d.mode) {
        case 'se': anchorX = left; anchorY = top; dirX = 1; dirY = -1; break
        case 'ne': anchorX = left; anchorY = bottom; dirX = 1; dirY = 1; break
        case 'sw': anchorX = right; anchorY = top; dirX = -1; dirY = -1; break
        default: anchorX = right; anchorY = bottom; dirX = -1; dirY = 1; break // nw
      }
      const w = Math.max(Math.abs(cur.x - anchorX), Math.abs(cur.y - anchorY) * aspect, 10)
      const h = w / aspect
      const cx = anchorX + dirX * w
      const cy = anchorY + dirY * h
      patch(d.id, {
        x0: Math.min(anchorX, cx),
        x1: Math.max(anchorX, cx),
        y0: Math.min(anchorY, cy),
        y1: Math.max(anchorY, cy),
      })
    }
    const onUp = () => {
      imgDragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, annotations, viewport])

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

  const textEditable = tool === 'select' || tool === 'text' || tool === 'edittext'
  const cursor =
    tool === 'text' || tool === 'edittext'
      ? 'text'
      : tool === 'select'
        ? 'default'
        : 'crosshair'

  const textAnns = annotations.filter(
    (a): a is TextAnn => a.type === 'text',
  )
  const selImg =
    tool === 'select' && selectedAnnId
      ? (annotations.find(
          (a) => a.id === selectedAnnId && a.type === 'image',
        ) as ImageAnn | undefined)
      : undefined
  let selBox: { left: number; top: number; w: number; h: number } | null = null
  if (selImg) {
    const [ax, ay] = viewport.convertToViewportPoint(selImg.x0, selImg.y0)
    const [bx, by] = viewport.convertToViewportPoint(selImg.x1, selImg.y1)
    selBox = {
      left: Math.min(ax, bx),
      top: Math.min(ay, by),
      w: Math.abs(bx - ax),
      h: Math.abs(by - ay),
    }
  }

  return (
    <div className="viewer" ref={viewerRef}>
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
          style={{
            cursor,
            pointerEvents: 'auto',
            touchAction:
              tool === 'draw' ||
              tool === 'highlight' ||
              tool === 'whiteout' ||
              tool === 'eraser'
                ? 'none'
                : 'auto',
          }}
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
                onResize={(dir) => resizeText(ann.id, dir)}
                onColor={(c) => setTextColor(ann.id, c)}
                onFont={(pf) => setTextFont(ann.id, pf)}
              />
            )
          })}

          {selImg && selBox && (
            <div
              className="img-sel"
              style={{ left: selBox.left, top: selBox.top, width: selBox.w, height: selBox.h }}
            >
              <span className="img-handle nw" onPointerDown={(e) => startImgResize(e, selImg, 'nw')} />
              <span className="img-handle ne" onPointerDown={(e) => startImgResize(e, selImg, 'ne')} />
              <span className="img-handle sw" onPointerDown={(e) => startImgResize(e, selImg, 'sw')} />
              <span className="img-handle se" onPointerDown={(e) => startImgResize(e, selImg, 'se')} />
              <button
                className="img-del"
                title="Delete image"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  remove(selImg.id)
                  setSelectedAnnId(null)
                }}
              >
                ✕
              </button>
            </div>
          )}
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
  onResize: (dir: 1 | -1) => void
  onColor: (hex: string) => void
  onFont: (partial: Partial<TextFont>) => void
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
  onResize,
  onColor,
  onFont,
}: TextBoxProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [showColors, setShowColors] = useState(false)

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
        <div className="tb-tools" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="tb-tool grip"
            title="Drag to move"
            onPointerDown={onDragStart}
          >
            ⠿
          </button>
          <select
            className="tb-tool tb-select"
            title="Font"
            value={ann.font?.family ?? 'Helvetica'}
            onChange={(e) => onFont({ family: e.target.value })}
          >
            {ann.font?.family &&
              !FONTS.some((f) => f.name.toLowerCase() === ann.font!.family.toLowerCase()) && (
                <option value={ann.font.family}>{ann.font.family} (detected)</option>
              )}
            {FONTS.map((f) => (
              <option key={f.name} value={f.name} style={{ fontFamily: f.css }}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            className={`tb-tool${ann.font?.bold ? ' on' : ''}`}
            title="Bold"
            onClick={() => onFont({ bold: !ann.font?.bold })}
          >
            <b>B</b>
          </button>
          <button
            className={`tb-tool${ann.font?.italic ? ' on' : ''}`}
            title="Italic"
            onClick={() => onFont({ italic: !ann.font?.italic })}
          >
            <i>I</i>
          </button>
          <button className="tb-tool" title="Smaller" onClick={() => onResize(-1)}>
            A−
          </button>
          <span className="tb-size">{Math.round(ann.size)}</span>
          <button className="tb-tool" title="Bigger" onClick={() => onResize(1)}>
            A+
          </button>
          <div className="tb-color-wrap">
            <button
              className="tb-tool tb-color-btn"
              title="Text colour"
              onClick={() => setShowColors((v) => !v)}
            >
              <span className="tb-color-dot" style={{ background: ann.color }} />
            </button>
            {showColors && (
              <div className="color-pop">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    className={`color-sw${c === '#ffffff' ? ' light' : ''}${
                      ann.color.toLowerCase() === c ? ' active' : ''
                    }`}
                    style={{ background: c }}
                    onClick={() => {
                      onColor(c)
                      setShowColors(false)
                    }}
                    aria-label={`Colour ${c}`}
                  />
                ))}
                <ColorPicker value={ann.color} onChange={onColor} />
              </div>
            )}
          </div>
          <button className="tb-tool del" title="Delete" onClick={onDelete}>
            ✕
          </button>
        </div>
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
        style={{
          fontSize: ann.size * scale,
          color: ann.color,
          lineHeight: 1.15,
          fontFamily: cssForFont(ann.font?.family),
          fontWeight: ann.font?.bold ? 700 : 400,
          fontStyle: ann.font?.italic ? 'italic' : 'normal',
        }}
        onChange={(e) => onText(e.target.value)}
        onFocus={onFocus}
      />
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
