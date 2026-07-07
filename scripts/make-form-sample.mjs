// Generates public/sample-form.pdf — a fillable AcroForm to test form filling.
// Run with: node scripts/make-form-sample.mjs
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const doc = await PDFDocument.create()
const font = await doc.embedFont(StandardFonts.HelveticaBold)
const body = await doc.embedFont(StandardFonts.Helvetica)
const page = doc.addPage([595, 842])
const form = doc.getForm()

page.drawRectangle({ x: 0, y: 762, width: 595, height: 80, color: rgb(0.31, 0.55, 1) })
page.drawText('PDFly Sample Form', { x: 48, y: 790, size: 26, font, color: rgb(1, 1, 1) })

const label = (t, y) => page.drawText(t, { x: 48, y, size: 12, font: body, color: rgb(0.15, 0.15, 0.15) })

label('Full name:', 705)
const name = form.createTextField('fullName')
name.addToPage(page, { x: 150, y: 698, width: 320, height: 22 })

label('Email:', 665)
const email = form.createTextField('email')
email.addToPage(page, { x: 150, y: 658, width: 320, height: 22 })

label('Country:', 625)
const country = form.createDropdown('country')
country.setOptions(['Bangladesh', 'India', 'United States', 'United Kingdom'])
country.addToPage(page, { x: 150, y: 618, width: 220, height: 22 })

label('I agree to the terms:', 585)
const agree = form.createCheckBox('agree')
agree.addToPage(page, { x: 210, y: 583, width: 16, height: 16 })

label('Comments:', 545)
const comments = form.createTextField('comments')
comments.enableMultiline()
comments.addToPage(page, { x: 150, y: 470, width: 320, height: 90 })

const bytes = await doc.save()
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'sample-form.pdf'), bytes)
console.log('Wrote %s (%d bytes)', join(outDir, 'sample-form.pdf'), bytes.length)
