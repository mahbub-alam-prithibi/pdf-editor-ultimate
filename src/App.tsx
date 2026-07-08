import { useCallback, useEffect, useRef, useState } from 'react'
import { loadSource } from './lib/pdf'
import { buildPdf, downloadPdf } from './lib/exporter'
import type { Annotation, AnnotationMap, PageItem, SourceDoc, Tool } from './lib/types'
import { Toolbar } from './components/Toolbar'
import { EditToolbar } from './components/EditToolbar'
import { ThumbnailSidebar } from './components/ThumbnailSidebar'
import { PageEditor } from './components/PageEditor'
import { Dropzone } from './components/Dropzone'
import { SignaturePad } from './components/SignaturePad'
import { BottomBar } from './components/BottomBar'

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

interface Snapshot {
  pages: PageItem[]
  sources: Map<string, SourceDoc>
  annotations: AnnotationMap
  formValues: Record<string, string | boolean>
  selectedId: string | null
}

export default function App() {
  const [sources, setSources] = useState<Map<string, SourceDoc>>(new Map())
  const [pages, setPages] = useState<PageItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showThumbs, setShowThumbs] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768,
  )
  const [fitNonce, setFitNonce] = useState(0)

  // Editing state
  const [annotations, setAnnotations] = useState<AnnotationMap>({})
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [textSize, setTextSize] = useState(16)
  // Form field values, keyed by `${srcId}::${fieldName}`.
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({})
  // Signatures (data URLs), persisted on this device only.
  const [signatures, setSignatures] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pdfly.signatures') || '[]')
    } catch {
      return []
    }
  })
  const [pendingSignature, setPendingSignature] = useState<string | null>(null)
  const [showSigPad, setShowSigPad] = useState(false)

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

  const demoLoaded = useRef(false)
  useEffect(() => {
    if (demoLoaded.current) return
    if (typeof location !== 'undefined' && /[?&]demo/.test(location.search)) {
      demoLoaded.current = true
      void loadSample()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // ---- undo / redo history (structural changes) ----
  const undoStack = useRef<Snapshot[]>([])
  const redoStack = useRef<Snapshot[]>([])
  const [, bumpHistory] = useState(0)

  const current = (): Snapshot => ({ pages, sources, annotations, formValues, selectedId })
  const snapshot = () => {
    undoStack.current.push(current())
    if (undoStack.current.length > 80) undoStack.current.shift()
    redoStack.current = []
    bumpHistory((n) => n + 1)
  }
  const restore = (s: Snapshot) => {
    setPages(s.pages)
    setSources(s.sources)
    setAnnotations(s.annotations)
    setFormValues(s.formValues)
    setSelectedId(s.selectedId)
  }
  const undo = () => {
    if (!undoStack.current.length) return
    redoStack.current.push(current())
    restore(undoStack.current.pop()!)
    bumpHistory((n) => n + 1)
  }
  const redo = () => {
    if (!redoStack.current.length) return
    undoStack.current.push(current())
    restore(redoStack.current.pop()!)
    bumpHistory((n) => n + 1)
  }

  // ---- page operations ----
  const rotatePage = (id: string, delta: number) => {
    snapshot()
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: norm(p.rotation + delta) } : p)),
    )
  }

  const rotateAll = (delta: number) => {
    snapshot()
    setPages((prev) => prev.map((p) => ({ ...p, rotation: norm(p.rotation + delta) })))
  }

  const deletePage = (id: string) => {
    snapshot()
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

  const movePage = (id: string, dir: -1 | 1) => {
    snapshot()
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  }

  // Drag-and-drop reorder: move `fromId` to just before `toId`.
  const reorderPage = (fromId: string, toId: string) => {
    if (fromId === toId) return
    snapshot()
    setPages((prev) => {
      const from = prev.findIndex((p) => p.id === fromId)
      if (from < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      const to = next.findIndex((p) => p.id === toId)
      next.splice(to < 0 ? next.length : to, 0, moved)
      return next
    })
  }

  // ---- annotation operations ----
  const setPageAnns = (pageId: string, anns: Annotation[]) => {
    // Snapshot only on structural changes (add/remove), not on every keystroke/drag.
    if (anns.length !== (annotations[pageId] ?? []).length) snapshot()
    setAnnotations((prev) => ({ ...prev, [pageId]: anns }))
  }

  const undoOnPage = () => {
    if (!selectedId) return
    const anns = annotations[selectedId] ?? []
    if (!anns.length) return
    snapshot()
    setAnnotations((prev) => ({ ...prev, [selectedId]: anns.slice(0, -1) }))
  }

  const clearPageAnns = () => {
    if (!selectedId || !(annotations[selectedId]?.length)) return
    snapshot()
    setAnnotations((prev) => ({ ...prev, [selectedId]: [] }))
  }

  const onFormChange = (srcId: string, name: string, value: string | boolean) =>
    setFormValues((prev) => ({ ...prev, [`${srcId}::${name}`]: value }))

  // ---- signatures ----
  useEffect(() => {
    try {
      localStorage.setItem('pdfly.signatures', JSON.stringify(signatures))
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [signatures])

  const saveAndPlaceSig = (dataUrl: string) => {
    setSignatures((prev) => (prev.includes(dataUrl) ? prev : [dataUrl, ...prev].slice(0, 12)))
    setPendingSignature(dataUrl)
    setTool('signature')
    setShowSigPad(false)
  }
  const useSig = (dataUrl: string) => {
    setPendingSignature(dataUrl)
    setTool('signature')
    setShowSigPad(false)
  }
  const deleteSig = (dataUrl: string) =>
    setSignatures((prev) => prev.filter((s) => s !== dataUrl))

  const exportPdf = async () => {
    if (!pages.length) return
    setBusy(true)
    try {
      const bytes = await buildPdf(pages, sources, annotations, formValues)
      const first = sources.size ? [...sources.values()][0].name : 'document'
      const base = first.replace(/\.pdf$/i, '') || 'document'
      downloadPdf(bytes, `${base}-edited.pdf`)
    } catch (err) {
      console.error(err)
      alert('Export failed. See the browser console for details.')
    } finally {
      setBusy(false)
    }
  }

  const clearAll = () => {
    if (pages.length) snapshot()
    setPages([])
    setSources(new Map())
    setAnnotations({})
    setFormValues({})
    setSelectedId(null)
  }

  // Close the current document and return to the start (main) page.
  const exitToMain = () => {
    if (!pages.length) return
    if (!window.confirm('Exit to the main page? The open document and any edits will be closed.')) return
    clearAll()
  }

  // Remove every edit (annotations + form entries) but keep the PDF pages.
  const clearAllEdits = () => {
    const hasEdits =
      Object.values(annotations).some((a) => a.length > 0) ||
      Object.keys(formValues).length > 0
    if (!hasEdits) return
    if (
      !window.confirm(
        'Remove ALL edits (text, drawings, highlights, signatures, images and form entries) from this document? The original PDF pages stay.',
      )
    )
      return
    snapshot()
    setAnnotations({})
    setFormValues({})
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

  // ---- undo / redo shortcuts (native undo wins inside a text field) ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditingText()) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      } else if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, sources, annotations, formValues, selectedId])

  const selected = pages.find((p) => p.id === selectedId) ?? null
  const selectedSrc = selected ? sources.get(selected.srcId) : undefined
  const empty = pages.length === 0
  const selectedIndex = pages.findIndex((p) => p.id === selectedId)
  const filename = selectedSrc?.name ?? (pages[0] && sources.get(pages[0].srcId)?.name) ?? ''

  const goToPage = (delta: number) => {
    if (selectedIndex < 0) return
    const ni = Math.min(pages.length - 1, Math.max(0, selectedIndex + delta))
    setSelectedId(pages[ni].id)
  }
  const rotateSelected = (delta: number) => {
    if (selectedId) rotatePage(selectedId, delta)
  }

  return (
    <div className={`app${dragOver ? ' dragging' : ''}`}>
      <Toolbar
        onOpen={() => fileInputRef.current?.click()}
        onExport={exportPdf}
        canExport={!empty}
        busy={busy}
        filename={filename}
        onExit={exitToMain}
        showExit={!empty}
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
          onUndo={undo}
          onRedo={redo}
          canUndo={undoStack.current.length > 0}
          canRedo={redoStack.current.length > 0}
          onToggleThumbs={() => setShowThumbs((v) => !v)}
          thumbsShown={showThumbs}
          onSign={() => setShowSigPad(true)}
          signing={tool === 'signature'}
          onClearEdits={clearAllEdits}
          canClear={
            Object.values(annotations).some((a) => a.length > 0) ||
            Object.keys(formValues).length > 0
          }
        />
      )}

      {showSigPad && (
        <SignaturePad
          saved={signatures}
          onSaveAndPlace={saveAndPlaceSig}
          onUse={useSig}
          onDelete={deleteSig}
          onClose={() => setShowSigPad(false)}
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
          {showThumbs && (
            <ThumbnailSidebar
              pages={pages}
              sources={sources}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRotate={rotatePage}
              onDelete={deletePage}
              onMove={movePage}
              onReorder={reorderPage}
            />
          )}
          {selected && selectedSrc ? (
            <PageEditor
              key={selected.id}
              page={selected}
              src={selectedSrc}
              zoom={zoom}
              setZoom={setZoom}
              fitNonce={fitNonce}
              tool={tool}
              color={color}
              strokeWidth={strokeWidth}
              textSize={textSize}
              annotations={annotations[selected.id] ?? []}
              onChange={(anns) => setPageAnns(selected.id, anns)}
              formValues={formValues}
              onFormChange={onFormChange}
              onToolChange={setTool}
              pendingSignature={pendingSignature}
            />
          ) : (
            <div className="viewer viewer-empty">Select a page to view it</div>
          )}
        </div>
      )}

      {!empty && (
        <BottomBar
          pageIndex={selectedIndex + 1}
          total={pages.length}
          onPrev={() => goToPage(-1)}
          onNext={() => goToPage(1)}
          zoom={zoom}
          setZoom={setZoom}
          onFit={() => setFitNonce((n) => n + 1)}
          onRotateLeft={() => rotateSelected(-90)}
          onRotateRight={() => rotateSelected(90)}
        />
      )}

      {dragOver && <div className="drop-overlay">Drop PDF files to add them</div>}
      {busy && <div className="busy-bar" />}
    </div>
  )
}
