import { PDFDocument, degrees, StandardFonts, BlendMode } from 'pdf-lib'
import { hexToRgb } from './color'
import { fontCat } from './fonts'
import type { AnnotationMap, PageItem, SourceDoc, TextFont } from './types'

const norm = (deg: number) => ((deg % 360) + 360) % 360

/** Map a named/detected font to the closest standard PDF font (by category + style). */
function pickStdFont(f?: TextFont): StandardFonts {
  const b = f?.bold
  const i = f?.italic
  const cat = fontCat(f?.family)
  if (cat === 'serif') {
    return b && i
      ? StandardFonts.TimesRomanBoldItalic
      : b
        ? StandardFonts.TimesRomanBold
        : i
          ? StandardFonts.TimesRomanItalic
          : StandardFonts.TimesRoman
  }
  if (cat === 'mono') {
    return b && i
      ? StandardFonts.CourierBoldOblique
      : b
        ? StandardFonts.CourierBold
        : i
          ? StandardFonts.CourierOblique
          : StandardFonts.Courier
  }
  return b && i
    ? StandardFonts.HelveticaBoldOblique
    : b
      ? StandardFonts.HelveticaBold
      : i
        ? StandardFonts.HelveticaOblique
        : StandardFonts.Helvetica
}

/** Fill a source document's AcroForm fields with the user's values, then flatten
 *  so the values become part of the page content (and survive copyPages). */
function applyForm(
  doc: PDFDocument,
  srcId: string,
  formValues: Record<string, string | boolean>,
): void {
  let form: ReturnType<PDFDocument['getForm']>
  try {
    form = doc.getForm()
    if (!form.getFields().length) return
  } catch {
    return
  }
  const prefix = `${srcId}::`
  for (const [k, v] of Object.entries(formValues)) {
    if (!k.startsWith(prefix)) continue
    const name = k.slice(prefix.length)
    try {
      form.getTextField(name).setText(String(v ?? ''))
      continue
    } catch {}
    try {
      const cb = form.getCheckBox(name)
      v ? cb.check() : cb.uncheck()
      continue
    } catch {}
    try {
      form.getDropdown(name).select(String(v))
      continue
    } catch {}
    try {
      form.getRadioGroup(name).select(String(v))
      continue
    } catch {}
    try {
      form.getOptionList(name).select(String(v))
      continue
    } catch {}
  }
  try {
    form.flatten()
  } catch (e) {
    console.warn('Could not flatten form:', e)
  }
}

/**
 * Assemble the working pages into a single PDF, preserving order and rotation
 * and baking in all annotations and filled form fields. Runs in the browser.
 */
export async function buildPdf(
  pages: PageItem[],
  sources: Map<string, SourceDoc>,
  annotations: AnnotationMap = {},
  formValues: Record<string, string | boolean> = {},
): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  const loaded = new Map<string, PDFDocument>()
  const imageCache = new Map<string, Awaited<ReturnType<PDFDocument['embedPng']>>>()
  const fontCache = new Map<StandardFonts, Awaited<ReturnType<PDFDocument['embedFont']>>>()
  const getFont = async (sf: StandardFonts) => {
    let f = fontCache.get(sf)
    if (!f) {
      f = await out.embedFont(sf)
      fontCache.set(sf, f)
    }
    return f
  }

  for (const page of pages) {
    let src = loaded.get(page.srcId)
    if (!src) {
      const source = sources.get(page.srcId)
      if (!source) continue
      src = await PDFDocument.load(source.bytes)
      applyForm(src, page.srcId, formValues)
      loaded.set(page.srcId, src)
    }
    const [copied] = await out.copyPages(src, [page.srcPageIndex])
    const base = copied.getRotation().angle
    copied.setRotation(degrees(norm(base + page.rotation)))
    const drawn = out.addPage(copied)

    const anns = annotations[page.id] ?? []
    for (const a of anns) {
      try {
        if (a.type === 'text') {
          const font = await getFont(pickStdFont(a.font))
          const lines = a.text.split('\n')
          lines.forEach((line, i) => {
            drawn.drawText(line, {
              x: a.x,
              y: a.yTop - a.size * 0.8 - i * a.size * 1.15,
              size: a.size,
              font,
              color: hexToRgb(a.color),
            })
          })
        } else if (a.type === 'draw') {
          for (let i = 1; i < a.pts.length; i++) {
            drawn.drawLine({
              start: { x: a.pts[i - 1].x, y: a.pts[i - 1].y },
              end: { x: a.pts[i].x, y: a.pts[i].y },
              thickness: a.width,
              color: hexToRgb(a.color),
            })
          }
        } else if (a.type === 'highlight' || a.type === 'whiteout') {
          const x = Math.min(a.x0, a.x1)
          const y = Math.min(a.y0, a.y1)
          const w = Math.abs(a.x1 - a.x0)
          const h = Math.abs(a.y1 - a.y0)
          drawn.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            color: hexToRgb(a.color),
            opacity: a.type === 'highlight' ? 0.35 : 1,
            blendMode: a.type === 'highlight' ? BlendMode.Multiply : undefined,
          })
        } else if (a.type === 'image') {
          let img = imageCache.get(a.dataUrl)
          if (!img) {
            img =
              a.fmt === 'png'
                ? await out.embedPng(a.bytes)
                : await out.embedJpg(a.bytes)
            imageCache.set(a.dataUrl, img)
          }
          const x = Math.min(a.x0, a.x1)
          const y = Math.min(a.y0, a.y1)
          const w = Math.abs(a.x1 - a.x0)
          const h = Math.abs(a.y1 - a.y0)
          drawn.drawImage(img, { x, y, width: w, height: h })
        }
      } catch (err) {
        // Skip a single problematic annotation (e.g. an unencodable glyph)
        // rather than failing the whole export.
        console.warn('Skipped an annotation during export:', err)
      }
    }
  }

  return out.save()
}

/** Trigger a browser download for the given PDF bytes. */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  const blob = new Blob([buf], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
