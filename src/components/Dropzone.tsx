interface Props {
  onPick: () => void
  onSample: () => void
}

export function Dropzone({ onPick, onSample }: Props) {
  return (
    <div className="dropzone" onClick={onPick}>
      <div className="dropzone-inner">
        <div className="dz-icon" aria-hidden>
          📄
        </div>
        <h2>Drop a PDF here, or click to browse</h2>
        <p className="dz-sub">
          Add text, draw &amp; sign, highlight, merge, reorder, rotate — then download.
          No sign-up.
        </p>
        <p className="dz-privacy">
          🔒 100% private. Your files never leave your device.
        </p>
        <div className="dz-actions">
          <button className="btn btn-primary btn-lg">Open PDF</button>
          <button
            className="btn btn-lg"
            onClick={(e) => {
              e.stopPropagation()
              onSample()
            }}
          >
            Try a sample
          </button>
        </div>
      </div>
    </div>
  )
}
