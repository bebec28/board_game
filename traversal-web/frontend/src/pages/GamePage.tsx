import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useGameStore } from '../store/gameStore'
import TopBar from '../components/ui/TopBar'
import Sidebar from '../components/ui/Sidebar'
import BoardScene from '../components/three/BoardScene'
import GameOverOverlay from '../components/ui/GameOverOverlay'
import ReplayBanner from '../components/ui/ReplayBanner'
import { PLAYER_COLORS, PLAYER_NAMES } from '../lib/colors'

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const game = useGameStore((s) => s.game)
  const loading = useGameStore((s) => s.loading)
  const error = useGameStore((s) => s.error)
  const clearError = useGameStore((s) => s.clearError)
  const loadGame = useGameStore((s) => s.loadGame)
  const newGame = useGameStore((s) => s.newGame)
  const botThinking = useGameStore((s) => s.botThinking)
  const viewedPly = useGameStore((s) => s.viewedPly)
  const stepReplay = useGameStore((s) => s.stepReplay)
  const viewPly = useGameStore((s) => s.viewPly)

  useEffect(() => {
    if (id && (!game || game.id !== id)) void loadGame(id)
  }, [id, game, loadGame])

  // Arrow keys step through the move history; Escape returns to the live position.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        stepReplay(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        stepReplay(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        viewPly(null)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        viewPly(0)
      } else if (e.key === 'Escape') {
        viewPly(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stepReplay, viewPly])

  const replayEntry = game && viewedPly !== null && viewedPly > 0 ? game.history[viewedPly - 1] : null

  const playAgain = async () => {
    if (!game) return
    const g = await newGame({
      terrain: game.terrain,
      mode: game.mode,
      bot_player: game.bot_player ?? undefined,
    })
    navigate(`/game/${g.id}`)
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        right={
          game && (
            <>
              <span className="rounded-md bg-panel-2 px-2 py-1 capitalize">{game.terrain}</span>
              <span className="rounded-md bg-panel-2 px-2 py-1">{game.mode === 'bot' ? 'Contre le bot' : 'Deux joueurs'}</span>
              {!game.game_over && (
                <span className="flex items-center gap-1.5 rounded-md bg-panel-2 px-2 py-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLAYER_COLORS[game.current_turn] }} />
                  {botThinking ? 'Le bot réfléchit…' : `Au tour de ${PLAYER_NAMES[game.current_turn]}`}
                </span>
              )}
            </>
          )
        }
      />
      <div className="relative flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          {loading && !game && (
            <div className="absolute inset-0 flex items-center justify-center text-ink-muted">Chargement de la partie…</div>
          )}
          {!loading && !game && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-muted">
              <div>{error}</div>
              <button onClick={() => navigate('/')} className="rounded-lg bg-accent px-4 py-2 font-semibold text-black">
                Retour à l'accueil
              </button>
            </div>
          )}
          {game && <BoardScene />}
          {game && <Legend />}
          {game && viewedPly !== null && <ReplayBanner game={game} ply={viewedPly} entry={replayEntry} />}
          {game && viewedPly === null && <GameOverOverlay game={game} onPlayAgain={() => void playAgain()} />}
          {error && game && (
            <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-red/50 bg-panel px-4 py-2 text-sm shadow-lg">
              {error}
              <button onClick={clearError} className="ml-3 text-ink-muted hover:text-ink">✕</button>
            </div>
          )}
        </main>
        <Sidebar />
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1 rounded-lg bg-black/35 px-3 py-2 text-[11px] text-ink-muted backdrop-blur-sm">
      <div className="flex items-center gap-2"><Dot c="#81b64c" /> Déplacement</div>
      <div className="flex items-center gap-2"><Dot c="#e24a4a" /> Attaque</div>
      <div className="flex items-center gap-2"><Dot c="#9b7bff" /> Spécial Explorateur</div>
      <div className="flex items-center gap-2"><Dot c="#f5c542" /> Sortie (points)</div>
      <div className="mt-1 text-[10px]">Glisser : orbiter · Molette : zoom · ← → : revoir les coups</div>
    </div>
  )
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
}
