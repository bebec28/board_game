import { Link } from 'react-router'

export default function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel px-4">
      <Link to="/" className="flex items-center gap-2.5">
        <Logo />
        <span className="text-lg font-extrabold tracking-tight">Traversal</span>
      </Link>
      <div className="flex items-center gap-3 text-sm text-ink-muted">{right}</div>
    </header>
  )
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <rect x="2" y="12" width="8" height="14" rx="1.5" fill="#5a8a3f" />
      <rect x="10" y="7" width="8" height="19" rx="1.5" fill="#a98a5a" />
      <rect x="18" y="2" width="8" height="24" rx="1.5" fill="#ece9e4" />
    </svg>
  )
}
