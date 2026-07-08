import { memo, useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface Props {
  doc: PDFDocumentProxy
  /** 0-based page index inside the document. */
  pageIndex: number
  /** Extra clockwise rotation in degrees. */
  rotation: number
  /** Fixed render scale. Ignored when `fitWidth` is provided. */
  scale?: number
  /** Render the page to fit this CSS width (px). Used for thumbnails. */
  fitWidth?: number
}

const norm = (deg: number) => ((deg % 360) + 360) % 360

/** Renders a single PDF page to a crisp <canvas>, cancelling stale renders.
 *  Memoised so unrelated state (e.g. the active tool colour) never re-renders it. */
export const PdfCanvas = memo(function PdfCanvas({
  doc,
  pageIndex,
  rotation,
  scale,
  fitWidth,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let task: any = null

    ;(async () => {
      const page = await doc.getPage(pageIndex + 1)
      if (cancelled) return

      const total = norm((page.rotate || 0) + rotation)
      const unit = page.getViewport({ scale: 1, rotation: total })
      const finalScale = scale ?? (fitWidth ? fitWidth / unit.width : 1)
      const viewport = page.getViewport({ scale: finalScale, rotation: total })

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`

      const transform: number[] | undefined =
        dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined

      task = page.render({ canvasContext: ctx, viewport, transform })
      try {
        await task.promise
      } catch {
        /* render was cancelled — expected during rapid updates */
      }
    })()

    return () => {
      cancelled = true
      if (task) task.cancel()
    }
  }, [doc, pageIndex, rotation, scale, fitWidth])

  return <canvas ref={canvasRef} className="pdf-canvas" />
})
