import { useCallback, useEffect, useRef, useState } from 'react'
import { loadSource } from './lib/pdf'
import { buildPdf, downloadPdf } from './lib/exporter'
import type { Annotation, AnnotationMap, PageItem, SourceDoc, Tool } from './lib/types'
import { Toolbar } from './components/Toolbar'
import { EditToolbar } from './components/EditToolbar'
import { ThumbnailSidebar } from './components/ThumbnailSidebar'
import { PageEditor } from './components/PageEditor'
import { Dropzone } from './components/Dropzone'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`

const norm = (deg: number) => ((deg % 360) + 360) % 360

const isPdf = (f: File) =>
  f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')

const isEditingText = () => {
  const el = document.activeElement as HTMLElement | null
  return !!el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
}

export default function App() {
  const [sources, setSources] = useState<Map<string, SourceDoc>>(new Map())
  const [pages, setPages] = useState<PageItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Editing state
  const [annotations, setAnnotations] = useState<AnnotationMap>({})
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState('#e5484d')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [textSize, setTextSize] = useState(16)
  // Form field values, keyed by `${srcId}::${fieldName}`.
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter(isPdf)
    if (!list.length) return
    setBusy(true)
    try {
      for (const file of list) {
        const { doc, bytes, numPages } = await loadSource(file)
        const srcId = uid()
        setSources((prev) => {
          const next = new Map(prev)
          next.set(srcId, { id: srcId, name: file.name, bytes, doc })
          return next
        })
        const newPages: PageItem[] = Array.from({ length: numPages }, (_, i) => ({
          id: uid(),
          srcId,
          srcPageIndex: i,
          rotation: 0,
        }))
        setPages((prev) => [...prev, ...newPages])
        setSelectedId((prev) => prev ?? newPages[0]?.id ?? null)
      }
    } catch (err) {
      console.error(err)
      alert('Sorry, that file could not be opened. Is it a valid PDF?')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (pages.length === 0) {
      if (selectedId !== null) setSelectedId(null)
    } else if (!pages.some((p) => p.id === selectedId)) {
      setSelectedId(pages[0].id)
    }
  }, [pages, selectedId])

  // Load the bundled sample document (used by the "Try a sample" button
  // and by the ?demo link so people can see the editor instantly).
  const loadSample = useCallback(async () => {
    try {
      const res = await fetch('sample.pdf', { cache: 'no-store' })
      if (!res.ok) throw new Error(`sample request failed: ${res.status}`)
      const blob = await res.blob()
      if (blob.size < 100) throw new Error('sample response was empty')
      await addFiles([new File([blob], 'sample.pdf', { type: 'application/pdf' })])
    } catch (err) {
      console.error('Could not load the sample PDF:', err)
    }
  }, [addFiles])

  useEffect(() => {
    if (typeof location !== 'undefined' && /[?&]demo/.test(location.search)) {
      void loadSample()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- page operations ----
  const rotatePage = (id: string, delta: number) =>
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: norm(p.rotation + delta) } : p)),
    )

  const rotateAll = (delta: number) =>
    setPages((prev) => prev.map((p) => ({ ...p, rotation: norm(p.rotation + delta) })))

  const deletePage = (id: string) => {
    const idx = pages.findIndex((p) => p.id === id)
    const next = pages.filter((p) => p.id !== id)
    setPages(next)
    setAnnotations((prev) => {
      const { [id]: _drop, ...rest } = prev
      return rest
    })
    if (id === selectedId) {
      setSelectedId(next.length ? next[Math.min(idx, next.length - 1)].id : null)
    }
  }

  const movePage = (id: string, dir: -1 | 1) =>
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })

  // ---- annotation operations ----
  const setPageAnns = (pageId: string, anns: Annotation[]) =>
    setAnnotations((prev) => ({ ...prev, [pageId]: anns }))

  const undoOnPage = () => {
    if (!selectedId) return
    setAnnotations((prev) => {
      const anns = prev[selectedId] ?? []
      if (!anns.length) return prev
      return { ...prev, [selectedId]: anns.slice(0, -1) }
    })
  }

  const clearPageAnns = () => {
    if (!selectedId) return
    setAnnotations((prev) => ({ ...prev, [selectedId]: [] }))
  }

  const onFormChange = (srcId: string, name: string, value: string | boolean) =>
    setFormValues((prev) => ({ ...prev, [`${srcId}::${name}`]: value }))

  const exportPdf = async () => {
    if (!pages.length) return
    setBusy(true)
    try {
      const bytes = await buildPdf(pages, sources, annotations, formValues)
      downloadPdf(bytes, 'pdfly-export.pdf')
    } catch (err) {
      console.error(err)
      alert('Export failed. See the browser console for details.')
    } finally {
      setBusy(false)
    }
  }

  const clearAll = () => {
    setPages([])
    setSources(new Map())
    setAnnotations({})
    setFormValues({})
    setSelectedId(null)
  }

  // ---- drag & drop ----
  useEffect(() => {
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files)
    }
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      setDragOver(true)
    }
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragOver(false)
    }
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    return () => {
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
    }
  }, [addFiles])

  // ---- keyboard page navigation (ignored while editing text) ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!pages.length || isEditingText()) return
      const i = pages.findIndex((p) => p.id === selectedId)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedId(pages[Math.min(pages.length - 1, i + 1)].id)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedId(pages[Math.max(0, i - 1)].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pages, selectedId])

  const selected = pages.find((p) => p.id === selectedId) ?? null
  const selectedSrc = selected ? sources.get(selected.srcId) : undefined
  const empty = pages.length === 0
  const pageAnnCount = selectedId ? (annotations[selectedId]?.length ?? 0) : 0

  return (
    <div className={`app${dragOver ? ' dragging' : ''}`}>
      <Toolbar
        onOpen={() => fileInputRef.current?.click()}
        onExport={exportPdf}
        onClear={clearAll}
        canExport={!empty}
        zoom={zoom}
        setZoom={setZoom}
        pageCount={pages.length}
        onRotateAll={rotateAll}
        busy={busy}
      />

      {!empty && (
        <EditToolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          textSize={textSize}
          setTextSize={setTextSize}
          onUndo={undoOnPage}
          onClearPage={clearPageAnns}
          canUndo={pageAnnCount > 0}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {empty ? (
        <Dropzone
          onPick={() => fileInputRef.current?.click()}
          onSample={loadSample}
        />
      ) : (
        <div className="workspace">
          <ThumbnailSidebar
            pages={pages}
            sources={sources}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRotate={rotatePage}
            onDelete={deletePage}
            onMove={movePage}
          />
          {selected && selectedSrc ? (
            <PageEditor
              key={selected.id}
              page={selected}
              src={selectedSrc}
              zoom={zoom}
              tool={tool}
              color={color}
              strokeWidth={strokeWidth}
              textSize={textSize}
              annotations={annotations[selected.id] ?? []}
              onChange={(anns) => setPageAnns(selected.id, anns)}
              formValues={formValues}
              onFormChange={onFormChange}
            />
          ) : (
            <div className="viewer viewer-empty">Select a page to view it</div>
          )}
        </div>
      )}

      {dragOver && <div className="drop-overlay">Drop PDF files to add them</div>}
      {busy && <div className="busy-bar" />}
    </div>
  )
}
