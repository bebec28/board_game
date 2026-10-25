import { useEffect, useRef } from 'react'
import type { HistoryEntry } from '../../api/types'
import { useGameStore } from '../../store/gameStore'

export default function MoveList({ history }: { history: HistoryEntry[] }) {
  const viewedPly = useGameStore((s) => s.viewedPly)
  const viewPly = useGameStore((s) => s.viewPly)
  const endRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (viewedPly === null) endRef.current?.scrollIntoView({ block: 'nearest' })
    else activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [history.length, viewedPly])

  const rows: { n: number; red?: HistoryEntry; blue?: HistoryEntry }[] = []
  history.forEach((h) => {
    if (h.player === 1 || rows.length === 0 || rows[rows.length - 1].blue) {
      rows.push({ n: rows.length + 1, [h.player === 1 ? 'red' : 'blue']: h })
    } else {
      rows[rows.length - 1].blue = h
    }
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-panel-2/60">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <span>Coups</span>
        <span title="← → pour revoir les coups, Échap pour revenir au direct">{history.length} plis / 200 · ← →</span>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5 py-1 text-sm">
        {rows.length === 0 && <div className="px-2 py-3 text-ink-muted">La partie commence. Rouge joue en premier.</div>}
        {rows.map((r, i) => (
          <div
            key={r.n}
            className={`grid grid-cols-[2.2rem_1fr_1fr] items-center rounded-md px-2 py-0.5 ${
              i % 2 === 0 ? 'bg-panel/60' : ''
            }`}
          >
            <span className="text-ink-muted tabular-nums">{r.n}.</span>
            <Cell entry={r.red} viewedPly={viewedPly} onView={viewPly} activeRef={activeRef} />
            <Cell entry={r.blue} viewedPly={viewedPly} onView={viewPly} activeRef={activeRef} />
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function Cell({
  entry,
  viewedPly,
  onView,
  activeRef,
}: {
  entry?: HistoryEntry
  viewedPly: number | null
  onView: (ply: number | null) => void
  activeRef: React.RefObject<HTMLButtonElement | null>
}) {
  if (!entry) return <span />
  const active = viewedPly === entry.ply
  const tone = entry.finished ? 'text-gold' : entry.is_attack ? 'text-red' : entry.is_special ? 'text-[#b9a4ff]' : ''
  return (
    <button
      ref={active ? activeRef : undefined}
      onClick={() => onView(active ? null : entry.ply)}
      className={`rounded px-1.5 py-0.5 text-left font-medium tabular-nums transition hover:bg-line ${tone} ${
        active ? 'bg-accent/25 ring-1 ring-accent/60' : ''
      }`}
      title={entry.finished ? 'Arrivée' : entry.is_attack ? 'Capture — cliquer pour voir le détail' : 'Cliquer pour revoir ce coup'}
    >
      {entry.notation}
    </button>
  )
}
