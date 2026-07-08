// Generates public/sample.pdf — a small multi-page file to test PDFly with.
// Run with: npm run make-sample
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const pages = [
  { title: 'Page One', color: rgb(0.31, 0.55, 1) },
  { title: 'Page Two', color: rgb(0.18, 0.7, 0.5) },
  { title: 'Page Three', color: rgb(1, 0.45, 0.35) },
]

const doc = await PDFDocument.create()
const font = await doc.embedFont(StandardFonts.HelveticaBold)
const body = await doc.embedFont(StandardFonts.Helvetica)

pages.forEach(({ title, color }, i) => {
  const page = doc.addPage([595, 842]) // A4
  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color })
  page.drawText(title, { x: 48, y: 775, size: 34, font, color: rgb(1, 1, 1) })
  page.drawText('PDF Editor Ultimate — sample document', {
    x: 48,
    y: 690,
    size: 16,
    font: body,
    color: rgb(0.2, 0.2, 0.2),
  })
  page.drawText(
    'Use this file to try merging, reordering, rotating, and deleting pages.',
    { x: 48, y: 660, size: 12, font: body, color: rgb(0.4, 0.4, 0.4) },
  )
  page.drawText(`${i + 1}`, { x: 285, y: 40, size: 12, font: body, color: rgb(0.6, 0.6, 0.6) })
})

const bytes = await doc.save()
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'sample.pdf'), bytes)
console.log('Wrote %s (%d bytes)', join(outDir, 'sample.pdf'), bytes.length)
