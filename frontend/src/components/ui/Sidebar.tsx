import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useGameStore } from '../../store/gameStore'
import PlayerCard from './PlayerCard'
import PieceCard from './PieceCard'
import MoveList from './MoveList'
import ViewPresets from './ViewPresets'

export default function Sidebar() {
  const navigate = useNavigate()
  const game = useGameStore((s) => s.game)
  const selectedPieceId = useGameStore((s) => s.selectedPieceId)
  const botThinking = useGameStore((s) => s.botThinking)
  const view = useGameStore((s) => s.view)
  const setView = useGameStore((s) => s.setView)
  const flipView = useGameStore((s) => s.flipView)
  const autoFlip = useGameStore((s) => s.autoFlip)
  const setAutoFlip = useGameStore((s) => s.setAutoFlip)
  const resign = useGameStore((s) => s.resign)
  const showMovesFor = useGameStore((s) => s.showMovesFor)
  const setShowMovesFor = useGameStore((s) => s.setShowMovesFor)
  const [confirmResign, setConfirmResign] = useState(false)
  const [showViews, setShowViews] = useState(false)

  if (!game) return null
  const selected = game.pieces.find((p) => p.id === selectedPieceId) ?? null
  const humanToResign = game.mode === 'bot' ? (game.bot_player === 1 ? 2 : 1) : game.current_turn

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col gap-2.5 border-l border-line bg-panel p-3">
      <PlayerCard game={game} player={2} botThinking={botThinking} />
      <PieceCard piece={selected} game={game} />
      <MoveList history={game.history} />
      <PlayerCard game={game} player={1} botThinking={botThinking} />

      <div className="grid grid-cols-3 gap-1.5">
        <Btn onClick={() => navigate('/')}>Nouvelle</Btn>
        <Btn onClick={flipView}>Retourner</Btn>
        <Btn onClick={() => setShowViews((v) => !v)} active={showViews}>
          Options
        </Btn>
      </div>
      {showViews && (
        <div className="space-y-3 rounded-xl border border-line bg-panel-2/60 p-2.5">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Caméra</div>
            <ViewPresets value={view} onChange={setView} />
            {game.mode === 'local' && (
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                <input type="checkbox" checked={autoFlip} onChange={(e) => setAutoFlip(e.target.checked)} />
                Retourner la caméra à chaque tour
              </label>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Déplacements autorisés
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ['current', 'Joueur actif'],
                  ['both', 'Les deux camps'],
                  ['none', 'Masqués'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setShowMovesFor(v)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    showMovesFor === v ? 'bg-accent text-black' : 'bg-panel text-ink-muted hover:bg-line hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">
              {showMovesFor === 'both'
                ? "Clique sur n'importe quelle pièce, y compris adverse, pour voir où elle peut aller."
                : showMovesFor === 'current'
                  ? 'Seules les pièces du joueur dont c\'est le tour montrent leurs cases.'
                  : 'Aucune aide : à toi de calculer les coûts de déplacement.'}
            </p>
          </div>
        </div>
      )}
      {!game.game_over && (
        confirmResign ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-red/40 bg-red/10 p-2 text-sm">
            <span className="flex-1 px-1">Abandonner ?</span>
            <Btn danger onClick={() => { void resign(humanToResign); setConfirmResign(false) }}>Oui</Btn>
            <Btn onClick={() => setConfirmResign(false)}>Non</Btn>
          </div>
        ) : (
          <button
            onClick={() => setConfirmResign(true)}
            className="rounded-lg px-3 py-1.5 text-xs text-ink-muted transition hover:bg-panel-2 hover:text-ink"
          >
            Abandonner
          </button>
        )
      )}
    </aside>
  )
}

function Btn({
  children,
  onClick,
  active,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        danger
          ? 'bg-red text-white hover:brightness-110'
          : active
            ? 'bg-accent text-black'
            : 'bg-panel-2 text-ink hover:bg-line'
      }`}
    >
      {children}
    </button>
  )
}
