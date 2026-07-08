import { useEffect, useRef, useState } from 'react'
import type { PageViewport } from 'pdfjs-dist'
import type { Annotation } from '../lib/types'

interface Props {
  viewport: PageViewport
  annotations: Annotation[]
  draft?: Annotation | null
}

/**
 * Draws all non-text annotations (freehand, highlight, whiteout, image) onto a
 * canvas positioned exactly over the page. Text annotations are DOM elements,
 * handled separately in PageEditor.
 */
export function AnnotationLayer({ viewport, annotations, draft }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map())
  const [, forceRedraw] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    // Reassigning canvas.width/height reallocates + clears the backing store, which
    // is costly to do on every pointer move while drawing. Only resize when it
    // actually changes (i.e. zoom/rotation), not on each draft update.
    const w = Math.floor(viewport.width * dpr)
    const h = Math.floor(viewport.height * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, viewport.width, viewport.height)

    const toVp = (x: number, y: number) => {
      const [vx, vy] = viewport.convertToViewportPoint(x, y)
      return { x: vx, y: vy }
    }

    const list = draft ? [...annotations, draft] : annotations
    for (const a of list) {
      if (a.type === 'draw') {
        if (a.pts.length < 2) continue
        ctx.strokeStyle = a.color
        ctx.lineWidth = Math.max(1, a.width * viewport.scale)
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.beginPath()
        a.pts.forEach((p, i) => {
          const v = toVp(p.x, p.y)
          if (i === 0) ctx.moveTo(v.x, v.y)
          else ctx.lineTo(v.x, v.y)
        })
        ctx.stroke()
      } else if (a.type === 'highlight' || a.type === 'whiteout') {
        const p0 = toVp(a.x0, a.y0)
        const p1 = toVp(a.x1, a.y1)
        const x = Math.min(p0.x, p1.x)
        const y = Math.min(p0.y, p1.y)
        const w = Math.abs(p1.x - p0.x)
        const h = Math.abs(p1.y - p0.y)
        ctx.globalAlpha = a.type === 'highlight' ? 0.35 : 1
        ctx.fillStyle = a.color
        ctx.fillRect(x, y, w, h)
        ctx.globalAlpha = 1
      } else if (a.type === 'image') {
        const p0 = toVp(a.x0, a.y0)
        const p1 = toVp(a.x1, a.y1)
        const x = Math.min(p0.x, p1.x)
        const y = Math.min(p0.y, p1.y)
        const w = Math.abs(p1.x - p0.x)
        const h = Math.abs(p1.y - p0.y)
        let img = imgCache.current.get(a.dataUrl)
        if (!img) {
          img = new Image()
          img.src = a.dataUrl
          imgCache.current.set(a.dataUrl, img)
        }
        if (img.complete && img.naturalWidth) {
          ctx.drawImage(img, x, y, w, h)
        } else {
          // Repaint once the image finishes decoding.
          img.onload = () => forceRedraw((n) => n + 1)
        }
      }
    }
  }, [viewport, annotations, draft])

  return <canvas ref={canvasRef} className="ann-canvas" />
}
