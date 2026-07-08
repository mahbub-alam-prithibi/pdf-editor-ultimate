import type { PDFDocumentProxy } from 'pdfjs-dist'

/** A PDF file the user has opened. Kept in memory only — never uploaded. */
export interface SourceDoc {
  id: string
  name: string
  /** Pristine copy of the file bytes, used by pdf-lib when exporting. */
  bytes: Uint8Array
  /** pdf.js document handle, used for on-screen rendering. */
  doc: PDFDocumentProxy
}

/** One page in the working document. Pages can come from different sources. */
export interface PageItem {
  id: string
  srcId: string
  /** 0-based page index inside the source document. */
  srcPageIndex: number
  /** Extra clockwise rotation in degrees (0 | 90 | 180 | 270), added to the page's own. */
  rotation: number
}

/** The active editing tool. */
export type Tool =
  | 'select'
  | 'text'
  | 'edittext'
  | 'draw'
  | 'highlight'
  | 'whiteout'
  | 'image'
  | 'signature'
  | 'eraser'

/**
 * Annotations are stored in the page's native PDF coordinate space
 * (points, origin bottom-left, y increasing upward). This keeps them
 * independent of zoom and rotation, and maps directly onto pdf-lib at export.
 */
export interface TextFont {
  /** Font family name, e.g. "Arial", "Times New Roman". */
  family: string
  bold: boolean
  italic: boolean
}

export interface TextAnn {
  id: string
  type: 'text'
  /** Left edge, PDF points. */
  x: number
  /** Top edge, PDF points (larger y = higher on the page). */
  yTop: number
  text: string
  /** Font size in PDF points. */
  size: number
  color: string
  /** Font style; when omitted, defaults to sans/regular (Helvetica). */
  font?: TextFont
}

export interface DrawAnn {
  id: string
  type: 'draw'
  color: string
  /** Stroke width in PDF points (zoom-independent). */
  width: number
  pts: { x: number; y: number }[]
}

export interface RectAnn {
  id: string
  type: 'highlight' | 'whiteout'
  x0: number
  y0: number
  x1: number
  y1: number
  color: string
}

export interface ImageAnn {
  id: string
  type: 'image'
  x0: number
  y0: number
  x1: number
  y1: number
  dataUrl: string
  bytes: Uint8Array
  fmt: 'png' | 'jpg'
}

export type Annotation = TextAnn | DrawAnn | RectAnn | ImageAnn

/** Annotations keyed by PageItem id (stable across reorder/rotate). */
export type AnnotationMap = Record<string, Annotation[]>
