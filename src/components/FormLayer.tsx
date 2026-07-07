import { useEffect, useState } from 'react'
import type { PageViewport } from 'pdfjs-dist'
import type { PageItem, SourceDoc } from '../lib/types'

interface FormField {
  id: string
  name: string
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'button'
  rect: number[] // [x1,y1,x2,y2] in PDF coords
  multiline: boolean
  exportValue?: string
  options: { value: string; label: string }[]
  defaultValue: string | boolean
  readOnly: boolean
}

interface Props {
  page: PageItem
  src: SourceDoc
  viewport: PageViewport
  tool: string
  formValues: Record<string, string | boolean>
  onFormChange: (srcId: string, name: string, value: string | boolean) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toField(a: any): FormField | null {
  if (a.subtype !== 'Widget') return null
  const name: string = a.fieldName ?? ''
  let type: FormField['type'] = 'text'
  let defaultValue: string | boolean = a.fieldValue ?? ''
  const options: { value: string; label: string }[] = []

  if (a.fieldType === 'Tx') {
    type = 'text'
    defaultValue = a.fieldValue ?? ''
  } else if (a.fieldType === 'Btn') {
    if (a.pushButton) return null
    if (a.radioButton) type = 'radio'
    else type = 'checkbox'
    const on = a.exportValue ?? a.buttonValue ?? 'On'
    defaultValue = type === 'checkbox' ? !!a.fieldValue && a.fieldValue !== 'Off' : a.fieldValue ?? ''
    return {
      id: a.id,
      name,
      type,
      rect: a.rect,
      multiline: false,
      exportValue: on,
      options,
      defaultValue,
      readOnly: !!a.readOnly,
    }
  } else if (a.fieldType === 'Ch') {
    type = 'dropdown'
    ;(a.options ?? []).forEach((o: { exportValue?: string; displayValue?: string }) =>
      options.push({ value: o.exportValue ?? o.displayValue ?? '', label: o.displayValue ?? o.exportValue ?? '' }),
    )
    defaultValue = Array.isArray(a.fieldValue) ? a.fieldValue[0] ?? '' : a.fieldValue ?? ''
  } else {
    return null
  }

  return {
    id: a.id,
    name,
    type,
    rect: a.rect,
    multiline: !!a.multiLine,
    options,
    defaultValue,
    readOnly: !!a.readOnly,
  }
}

export function FormLayer({ page, src, viewport, tool, formValues, onFormChange }: Props) {
  const [fields, setFields] = useState<FormField[]>([])

  useEffect(() => {
    let cancelled = false
    src.doc
      .getPage(page.srcPageIndex + 1)
      .then((p) => p.getAnnotations({ intent: 'display' }))
      .then((anns) => {
        if (cancelled) return
        setFields(anns.map(toField).filter((f): f is FormField => f !== null))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [src.doc, page.srcPageIndex])

  if (!fields.length) return null

  const key = (name: string) => `${src.id}::${name}`
  const active = tool === 'select'

  return (
    <div className="form-layer" style={{ pointerEvents: 'none' }}>
      {fields.map((f) => {
        const [x1, y1, x2, y2] = f.rect
        const [sx1, sy1] = viewport.convertToViewportPoint(x1, y1)
        const [sx2, sy2] = viewport.convertToViewportPoint(x2, y2)
        const left = Math.min(sx1, sx2)
        const top = Math.min(sy1, sy2)
        const width = Math.abs(sx2 - sx1)
        const height = Math.abs(sy2 - sy1)
        const stored = formValues[key(f.name)]
        const fontSize = Math.max(9, Math.min(height * 0.62, 20))
        const commonStyle: React.CSSProperties = {
          position: 'absolute',
          left,
          top,
          width,
          height,
          fontSize,
          pointerEvents: active && !f.readOnly ? 'auto' : 'none',
        }

        if (f.type === 'text') {
          const value = (stored as string) ?? (f.defaultValue as string) ?? ''
          return f.multiline ? (
            <textarea
              key={f.id}
              className="form-field form-text"
              style={commonStyle}
              value={value}
              readOnly={f.readOnly}
              onChange={(e) => onFormChange(src.id, f.name, e.target.value)}
            />
          ) : (
            <input
              key={f.id}
              className="form-field form-text"
              style={commonStyle}
              value={value}
              readOnly={f.readOnly}
              onChange={(e) => onFormChange(src.id, f.name, e.target.value)}
            />
          )
        }

        if (f.type === 'checkbox') {
          const checked = stored !== undefined ? !!stored : !!f.defaultValue
          return (
            <input
              key={f.id}
              type="checkbox"
              className="form-field form-check"
              style={commonStyle}
              checked={checked}
              disabled={f.readOnly}
              onChange={(e) => onFormChange(src.id, f.name, e.target.checked)}
            />
          )
        }

        if (f.type === 'radio') {
          const selected = (stored as string) ?? (f.defaultValue as string) ?? ''
          const isOn = selected === f.exportValue
          return (
            <input
              key={f.id}
              type="radio"
              className="form-field form-check"
              style={commonStyle}
              checked={isOn}
              disabled={f.readOnly}
              onChange={() => onFormChange(src.id, f.name, f.exportValue ?? '')}
            />
          )
        }

        if (f.type === 'dropdown') {
          const value = (stored as string) ?? (f.defaultValue as string) ?? ''
          return (
            <select
              key={f.id}
              className="form-field form-select"
              style={commonStyle}
              value={value}
              disabled={f.readOnly}
              onChange={(e) => onFormChange(src.id, f.name, e.target.value)}
            >
              <option value="" />
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )
        }

        return null
      })}
    </div>
  )
}
