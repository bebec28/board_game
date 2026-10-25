import { Link } from 'react-router'
import type { GameState } from '../../api/types'
import { PLAYER_COLORS, PLAYER_NAMES } from '../../lib/colors'

const REASONS: Record<string, string> = {
  sentinel_first: 'Sentinelle arrivée en premier',
  score: 'aux points',
  elimination: 'par élimination',
  resignation: 'par abandon',
  move_limit_score: 'aux points à la limite de coups',
  move_limit_advancement: "à l'avancement à la limite de coups",
  equal_score: 'égalité aux points',
  threefold_repetition: 'par triple répétition',
  move_limit: 'limite de coups atteinte',
}

const VICTORY_TYPES: Record<string, { title: string; subtitle: string }> = {
  total_domination: { title: 'Domination totale', subtitle: "Tu n'as pas seulement gagné, tu as supprimé toute possibilité de perdre." },
  perfect_game: { title: 'Partie parfaite', subtitle: 'Tu aurais pu finir plus tôt, mais où serait le plaisir ?' },
}

export default function GameOverOverlay({ game, onPlayAgain }: { game: GameState; onPlayAgain: () => void }) {
  if (!game.game_over) return null
  const draw = game.winner === 0 || game.winner === null
  const winner = draw ? null : (game.winner as 1 | 2)
  const reason = REASONS[game.win_reason ?? game.draw_reason ?? ''] ?? ''
  const special = game.victory_type ? VICTORY_TYPES[game.victory_type] : null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
      <div className="w-[min(92vw,380px)] rounded-2xl border border-line bg-panel p-6 text-center shadow-2xl">
        <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Partie terminée</div>
        <h2 className="mt-2 text-3xl font-black" style={{ color: winner ? PLAYER_COLORS[winner] : undefined }}>
          {draw ? 'Match nul' : `${PLAYER_NAMES[winner!]} gagne`}
        </h2>
        {special && (
          <div className="mt-1 text-sm font-semibold text-gold">{special.title}</div>
        )}
        <div className="mt-1 text-sm text-ink-muted">{special ? special.subtitle : reason}</div>
        <div className="mt-5 flex items-center justify-center gap-6 text-4xl font-black tabular-nums">
          <span style={{ color: PLAYER_COLORS[1] }}>{game.scores[0]}</span>
          <span className="text-ink-muted">–</span>
          <span style={{ color: PLAYER_COLORS[2] }}>{game.scores[1]}</span>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={onPlayAgain}
            className="flex-1 rounded-lg bg-accent px-4 py-2.5 font-semibold text-black transition hover:bg-accent-strong"
          >
            Rejouer
          </button>
          <Link
            to="/"
            className="flex-1 rounded-lg border border-line px-4 py-2.5 font-semibold transition hover:bg-panel-2"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
