import { Icon } from './icons'

interface Props {
  onOpen: () => void
  onExport: () => void
  canExport: boolean
  busy: boolean
  filename: string
}

// Replace after publishing if the repo slug changes.
const REPO_URL = 'https://github.com/mahbub-alam-prithibi/pdf-editor-ultimate'

export function Toolbar({ onOpen, onExport, canExport, busy, filename }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-logo" aria-hidden>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
            <path d="M14 3v5h5" />
          </svg>
        </span>
        <span className="brand-name">
          <span className="brand-red">PDF</span> Editor Ultimate
        </span>
      </div>

      <div className="topbar-center" title={filename}>
        {filename || 'No document open'}
      </div>

      <div className="topbar-right">
        <span className="priv-badge">🔒 Private</span>
        <button className="btn" onClick={onOpen}>
          <Icon name="open" size={16} /> Open
        </button>
        <button
          className="btn btn-primary"
          onClick={onExport}
          disabled={!canExport || busy}
        >
          <Icon name="download" size={16} /> Download
        </button>
        <a
          className="btn ghost icon"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          title="Star on GitHub"
        >
          <Icon name="github" size={18} />
        </a>
      </div>
    </header>
  )
}
