import type { GameState, Piece } from '../../api/types'
import { PLAYER_COLORS, PLAYER_NAMES } from '../../lib/colors'
import { PIECE_INFO } from '../../lib/pieces'

export default function PieceCard({ piece, game }: { piece: Piece | null; game: GameState }) {
  if (!piece) {
    return (
      <div className="rounded-xl border border-dashed border-line px-3.5 py-4 text-center text-sm text-ink-muted">
        Clique sur une pièce pour voir sa fiche
      </div>
    )
  }
  const info = PIECE_INFO[piece.type]
  const reinforcements = game.pieces.filter(
    (q) =>
      q.id !== piece.id &&
      q.player === piece.player &&
      !q.is_captured &&
      !q.is_finished &&
      Math.abs(q.row - piece.row) + Math.abs(q.col - piece.col) === 1,
  ).length
  const h = game.board[piece.row]?.[piece.col] ?? 0
  return (
    <div className="rounded-xl border border-line bg-panel-2/60 px-3.5 py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold" style={{ color: PLAYER_COLORS[piece.player] }}>
            {info.name}
          </div>
          <div className="text-xs text-ink-muted">
            {info.shape} · {PLAYER_NAMES[piece.player]} · hauteur {h}
          </div>
        </div>
        <span className="text-3xl font-black" style={{ color: PLAYER_COLORS[piece.player] }}>
          {info.letter}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Mouvement" value={piece.movement} />
        <Stat label="Attaque" value={piece.strength} />
        <Stat label="Défense" value={piece.strength + reinforcements} hint={reinforcements ? `+${reinforcements} renfort` : undefined} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">Spécial :</span> {info.special}
      </p>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg bg-panel px-2 py-1.5">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-accent">{hint}</div>}
    </div>
  )
}
