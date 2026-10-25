import type { GameState, Player } from '../../api/types'
import { PLAYER_COLORS, PLAYER_NAMES } from '../../lib/colors'
import { PIECE_INFO } from '../../lib/pieces'

interface Props {
  game: GameState
  player: Player
  botThinking: boolean
}

export default function PlayerCard({ game, player, botThinking }: Props) {
  const isBot = game.mode === 'bot' && game.bot_player === player
  const active = !game.game_over && game.current_turn === player
  const alive = game.pieces.filter((p) => p.player === player && !p.is_captured && !p.is_finished)
  const finished = game.pieces.filter((p) => p.player === player && p.is_finished)
  const captured = game.pieces.filter((p) => p.player === player && p.is_captured)

  return (
    <div
      className={`rounded-xl border px-3.5 py-3 transition-colors ${
        active ? 'border-accent/70 bg-panel-2 shadow-[0_0_0_1px_rgba(129,182,76,0.35)]' : 'border-line bg-panel-2/60'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full ring-2 ring-black/30"
            style={{ background: PLAYER_COLORS[player] }}
          />
          <span className="font-semibold">{PLAYER_NAMES[player]}</span>
          {isBot && (
            <span className="rounded-md bg-line px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              Bot
            </span>
          )}
          {active && (
            <span className="text-xs text-accent">
              {isBot && botThinking ? 'réfléchit…' : '● à jouer'}
            </span>
          )}
        </div>
        <div className="text-2xl font-extrabold tabular-nums">{game.scores[player - 1]}</div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {alive.map((p) => (
          <PieceChip key={p.id} letter={PIECE_INFO[p.type].letter} color={PLAYER_COLORS[player]} title={PIECE_INFO[p.type].name} />
        ))}
        {finished.map((p) => (
          <PieceChip key={p.id} letter={PIECE_INFO[p.type].letter} color="#f5c542" dim title={`${PIECE_INFO[p.type].name} — arrivée (+${p.strength})`} />
        ))}
        {captured.map((p) => (
          <PieceChip key={p.id} letter={PIECE_INFO[p.type].letter} color="#6b6762" dim strike title={`${PIECE_INFO[p.type].name} — capturée`} />
        ))}
      </div>
    </div>
  )
}

function PieceChip({
  letter,
  color,
  dim,
  strike,
  title,
}: {
  letter: string
  color: string
  dim?: boolean
  strike?: boolean
  title: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
        dim ? 'opacity-55' : ''
      } ${strike ? 'line-through' : ''}`}
      style={{ background: `${color}33`, color, border: `1px solid ${color}66` }}
    >
      {letter}
    </span>
  )
}
