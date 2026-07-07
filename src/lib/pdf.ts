import * as pdfjsLib from 'pdfjs-dist'
// Vite resolves this to a URL for the bundled worker file.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjsLib }

export interface LoadedSource {
  doc: pdfjsLib.PDFDocumentProxy
  /** Independent copy of the bytes, safe to hand to pdf-lib later. */
  bytes: Uint8Array
  numPages: number
}

/**
 * Read a File into memory and open it with pdf.js for rendering.
 *
 * pdf.js may transfer (and detach) the ArrayBuffer it is given to its worker,
 * so we keep a separate pristine copy of the bytes for pdf-lib to use at export.
 */
export async function loadSource(file: File): Promise<LoadedSource> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer).slice() // independent copy
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  return { doc, bytes, numPages: doc.numPages }
}
