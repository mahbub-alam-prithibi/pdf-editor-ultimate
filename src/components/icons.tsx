interface IconProps {
  name: string
  size?: number
}

// Minimal line-icon set (24x24, stroke = currentColor).
const PATHS: Record<string, JSX.Element> = {
  select: <path d="M6 3l13 7-5.5 1.8L11 19 6 3z" />,
  text: (
    <>
      <path d="M4 7V5h16v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </>
  ),
  edittext: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </>
  ),
  draw: <path d="M3 17c3-6 5 4 8-2s4 3 7-3" />,
  highlight: (
    <>
      <path d="M13 5l6 6-8 8H8l-3-3 8-11z" />
      <path d="M4 21h7" />
    </>
  ),
  whiteout: (
    <>
      <rect x="4" y="9" width="16" height="9" rx="1.5" />
      <path d="M4 14h16" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5L5 20" />
    </>
  ),
  sign: (
    <>
      <path d="M3 17c2 0 3-8 5-8s1 6 3 6 2-9 4-9" />
      <path d="M3 20h18" />
    </>
  ),
  eraser: (
    <>
      <path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="M5 11l9 9" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 015 5v1" />
    </>
  ),
  redo: (
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9a5 5 0 00-5 5v1" />
    </>
  ),
  rotateLeft: (
    <>
      <path d="M3 3v5h5" />
      <path d="M3.5 8A8 8 0 1112 20" />
    </>
  ),
  rotateRight: (
    <>
      <path d="M21 3v5h-5" />
      <path d="M20.5 8A8 8 0 1012 20" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  chevLeft: <path d="M15 18l-6-6 6-6" />,
  chevRight: <path d="M9 18l6-6-6-6" />,
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6" />
    </>
  ),
  fit: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  open: (
    <>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
      <path d="M14 3v5h5" />
      <path d="M12 12v5M9.5 14.5h5" />
    </>
  ),
  github: (
    <path d="M9 19c-4.5 1.5-4.5-2.2-6.5-2.7m13 4.7v-3.9c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6.1a4.7 4.7 0 00-1.3-3.3 4.4 4.4 0 00-.1-3.3s-1-.3-3.5 1.3a11.9 11.9 0 00-6 0C6.6 2 5.6 2.3 5.6 2.3a4.4 4.4 0 00-.1 3.3A4.7 4.7 0 004.2 9c0 4.6 2.8 5.8 5.5 6.1-.6.6-.6 1.2-.5 2V21" />
  ),
}

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name] ?? null}
    </svg>
  )
}
