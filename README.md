<div align="center">

# 📄 PDF Editor Ultimate

### Free, private, in-browser PDF editor

Edit text, sign, fill forms, annotate, merge & reorder — then download.
**Everything runs in your browser. Your files never leave your device.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Made with React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![Built with Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![100% client-side](https://img.shields.io/badge/privacy-100%25%20client--side-brightgreen)

[**Live demo**](#-live-demo) · [Features](#-features) · [Quick start](#-quick-start) · [Roadmap](#-roadmap) · [Contributing](#-contributing)

</div>

---

## Why PDF Editor Ultimate?

Most "free" online PDF tools make you **upload your documents to a stranger's
server** — contracts, IDs, medical records, bank statements. PDF Editor Ultimate does the same
everyday PDF jobs, but the file is opened, edited, and saved **entirely on your
own machine**. Nothing is uploaded, tracked, or stored. Close the tab and it's gone.

That makes it genuinely useful for anyone who needs to touch a sensitive PDF and
doesn't want to pay for Acrobat or trust a random website.

## ✨ Features

**Pages**
- 📂 **Open any PDF** — drag & drop or browse
- 🔗 **Merge** multiple PDFs into one (just add more files)
- 🔀 **Reorder** pages — drag thumbnails or move up / down
- 🔄 **Rotate** pages individually or all at once
- 🗑️ **Delete / extract** pages

**Edit & annotate**
- ✍️ **Add text** — pick from many fonts (Arial, Calibri, Times New Roman…), **bold/italic**, size, and colour
- ✏️ **Edit existing text** — click a line to replace it; it detects and keeps the original **font, weight, style, size & colour** (incl. LaTeX / Computer Modern documents)
- 🖊️ **Draw** freehand · 🖍️ **highlight** · ⬜ **whiteout / redact** · 🧽 **eraser** to remove any edit
- 🎨 **Full colour picker** — RGB spectrum, hex input, preset swatches, and an **eyedropper that grabs the exact colour straight from your PDF**
- 🖼️ **Insert images** — move & resize (aspect-locked)
- ✒️ **E-signatures** — draw or type a signature, save it on your device, stamp it anywhere
- 🧾 **Fill PDF forms** — text fields, checkboxes, radios, dropdowns (flattened on export)

**Workflow**
- ↩️ **Undo / redo** (Ctrl+Z / Ctrl+Shift+Z) · 🔍 zoom & fit-width · ⌨️ keyboard page nav
- 🎨 A clean, professional light UI with a floating page/zoom bar
- 💾 **Download** the edited PDF in one click · 🧹 **Clear all** edits in one go
- 🔒 **100% client-side** — no uploads, no accounts, no tracking
- ⚡ Works **offline** once loaded

## 🚀 Live demo

**→ [mahbub-alam-prithibi.github.io/pdf-editor-ultimate](https://mahbub-alam-prithibi.github.io/pdf-editor-ultimate/)**

![PDF Editor Ultimate screenshot](docs/screenshot.png)

## 🧑‍💻 Quick start

```bash
# clone
git clone https://github.com/mahbub-alam-prithibi/pdf-editor-ultimate.git
cd pdf-editor-ultimate

# install
npm install

# run the dev server (http://localhost:5173)
npm run dev
```

Optional — generate a sample PDF to play with:

```bash
npm run make-sample   # writes public/sample.pdf
```

Build for production:

```bash
npm run build         # output in dist/
npm run preview       # preview the production build
```

## 🛠️ Tech stack

| Purpose        | Library                                                        |
| -------------- | ------------------------------------------------------------- |
| PDF rendering  | [pdf.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`)     |
| PDF editing    | [pdf-lib](https://github.com/Hopding/pdf-lib)                 |
| UI             | [React 18](https://react.dev)                                 |
| Build / dev    | [Vite 6](https://vitejs.dev) + TypeScript                     |

No backend. No database. No analytics. Just static files.

## ☁️ Deployment

Because it's fully static, you can host the `dist/` folder anywhere for free.

- **GitHub Pages** — a workflow is included at
  [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Push to `main`,
  then enable **Settings → Pages → Source: GitHub Actions**.
- **Vercel / Netlify / Cloudflare Pages** — import the repo; build command
  `npm run build`, output directory `dist`.

## 🗺️ Roadmap

Contributions welcome! See [issues](../../issues).

- [ ] **Exact-font embedding** — embed the PDF's own font so edited text is pixel-identical
- [ ] Extract / split selected pages to a new file
- [ ] Page numbers, watermark & Bates numbering
- [ ] Password-protect / decrypt PDFs
- [ ] Compress / optimize file size
- [ ] OCR — make scanned PDFs searchable & editable
- [ ] Better mobile / touch experience

**Done:** page tools (merge, drag-reorder, rotate, delete) · add & edit text with font detection · draw, highlight, whiteout, eraser · colour picker with in-page eyedropper · images · e-signatures · fill forms · undo/redo · light/red UI.

## 🤝 Contributing

Contributions are very welcome — this is a friendly project to start open source
with. See [CONTRIBUTING.md](CONTRIBUTING.md). In short: fork, branch, `npm run dev`,
make your change, open a PR.

## 📜 License

[MIT](LICENSE) © 2026 Mahbub Alam Prithibi

---

<div align="center">
If PDF Editor Ultimate helps you, please ⭐ the repo — it helps others find it.
</div>
