import { useState } from 'react'
import type { ClassicPieceType, GameState, Piece, PieceType, Player } from '../../api/types'
import { PLAYER_COLORS, PLAYER_NAMES } from '../../lib/colors'
import { squareName } from '../../lib/explain'
import { isVariant, PIECE_INFO, VARIANT_OF } from '../../lib/pieces'
import { useGameStore } from '../../store/gameStore'

/** Players who pick their army on this screen (the bot has already picked its own). */
function humanPlayers(game: GameState): Player[] {
  if (game.mode === 'bot') return [game.bot_player === 1 ? 2 : 1]
  return [1, 2]
}

function armyOf(game: GameState, player: Player): Piece[] {
  return game.pieces.filter((p) => p.player === player).sort((a, b) => a.col - b.col)
}

/**
 * Secret army phase: each human player, in turn, chooses classic or variant for each piece
 * while looking at the terrain. In pass-and-play a cover screen hides one player's choices
 * from the other.
 */
export function ArmyPicker({ game }: { game: GameState }) {
  const player = humanPlayers(game).find((p) => !game.army_ready[p - 1])
  if (!player) return null
  // Keyed by player so the second player starts from a clean slate.
  return <PlayerArmy key={player} game={game} player={player} />
}

function PlayerArmy({ game, player }: { game: GameState; player: Player }) {
  const submitArmy = useGameStore((s) => s.submitArmy)
  const [unlocked, setUnlocked] = useState(game.mode === 'bot')
  const [choices, setChoices] = useState<Record<string, PieceType>>({})
  const [busy, setBusy] = useState(false)
  const color = PLAYER_COLORS[player]
  const other = PLAYER_NAMES[player === 1 ? 2 : 1]

  if (!unlocked) {
    const second = game.army_ready[player === 1 ? 1 : 0]
    return (
      <div className="absolute inset-0 z-20 flex animate-fade-in items-center justify-center bg-black/70 backdrop-blur-md">
        <div className="w-[min(92vw,400px)] animate-pop rounded-3xl border border-line bg-panel px-6 py-6 text-center shadow-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Composition secrète</div>
          <h2 className="mt-2 text-2xl font-black" style={{ color }}>
            {second ? `Passe l'appareil à ${PLAYER_NAMES[player]}` : `${PLAYER_NAMES[player]} compose son armée`}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {other}, ne regarde pas l'écran : les choix restent secrets jusqu'à la révélation.
          </p>
          <button
            onClick={() => setUnlocked(true)}
            className="mt-5 rounded-xl px-5 py-2.5 font-bold text-white transition hover:brightness-110"
            style={{ background: color }}
          >
            Je suis {PLAYER_NAMES[player]}, afficher
          </button>
        </div>
      </div>
    )
  }

  const pieces = armyOf(game, player)
  const swapped = Object.values(choices).filter(isVariant).length

  const submit = async () => {
    setBusy(true)
    await submitArmy(player, choices)
    setBusy(false)
  }

  return (
    <div className="absolute bottom-4 left-4 z-20 w-[min(92vw,380px)] animate-slide-up rounded-2xl border border-line bg-panel/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-black" style={{ color }}>
          Armée {player === 1 ? 'rouge' : 'bleue'}
        </h2>
        <span className="text-xs text-ink-muted">Observe le terrain, puis choisis</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {pieces.map((p) => {
          const classic = p.type as ClassicPieceType
          const variant = VARIANT_OF[classic]
          const chosen = choices[p.id] ?? classic
          return (
            <li key={p.id} className="flex items-center gap-2 rounded-lg bg-panel-2/60 px-2.5 py-1.5">
              <span className="w-7 text-xs font-semibold text-ink-muted">{squareName(p.row, p.col)}</span>
              {variant ? (
                <div className="grid flex-1 grid-cols-2 gap-1">
                  {[classic, variant].map((t) => (
                    <button
                      key={t}
                      onClick={() => setChoices((c) => ({ ...c, [p.id]: t }))}
                      className={`rounded-md border px-2 py-1 text-left text-xs transition ${
                        chosen === t ? 'border-accent bg-accent/15 text-ink' : 'border-line text-ink-muted hover:text-ink'
                      }`}
                      title={PIECE_INFO[t].special}
                    >
                      <span className="font-semibold">{PIECE_INFO[t].name}</span>{' '}
                      <span className="tabular-nums">{PIECE_INFO[t].movement}/{PIECE_INFO[t].strength}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="flex-1 px-2 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">{PIECE_INFO[classic].name}</span>{' '}
                  <span className="tabular-nums">{PIECE_INFO[classic].movement}/{PIECE_INFO[classic].strength}</span>
                  <span className="ml-1.5 text-[10px]">· variante à venir</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">Messager (6/0) :</span> {PIECE_INFO.messenger.special}
      </p>
      <button
        onClick={() => void submit()}
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-accent py-2.5 font-bold text-black transition hover:bg-accent-strong disabled:opacity-50"
      >
        {busy ? 'Envoi…' : `Valider (${swapped === 0 ? 'armée classique' : `${swapped} variante${swapped > 1 ? 's' : ''}`})`}
      </button>
    </div>
  )
}

/** Shown once both armies are in: what each side swapped, before the first move. */
export function ArmyReveal({ game, onClose }: { game: GameState; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex animate-fade-in items-center justify-center bg-black/55 backdrop-blur-[3px]">
      <div className="w-[min(92vw,420px)] animate-pop rounded-3xl border border-line bg-panel px-6 py-6 text-center shadow-2xl">
        <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Révélation</div>
        <h2 className="mt-1 text-3xl font-black tracking-tight">Les armées sont prêtes</h2>
        <div className="mt-5 space-y-2 text-left">
          {([1, 2] as Player[]).map((player) => {
            const variants = armyOf(game, player).filter((p) => isVariant(p.type))
            return (
              <div key={player} className="rounded-2xl bg-panel-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: PLAYER_COLORS[player] }}>
                    {PLAYER_NAMES[player]}
                    {game.bot_player === player && <span className="ml-1.5 text-xs font-medium text-ink-muted">(bot)</span>}
                  </span>
                  <span className="flex gap-1">
                    {armyOf(game, player).map((p) => (
                      <span
                        key={p.id}
                        title={PIECE_INFO[p.type].name}
                        className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${
                          isVariant(p.type) ? 'text-black' : 'bg-panel text-ink-muted'
                        }`}
                        style={isVariant(p.type) ? { background: PLAYER_COLORS[player] } : undefined}
                      >
                        {PIECE_INFO[p.type].letter}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {variants.length === 0
                    ? 'Armée classique'
                    : variants.map((p) => `${PIECE_INFO[p.type].name} en ${squareName(p.row, p.col)}`).join(' · ')}
                </div>
              </div>
            )
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-5 rounded-xl bg-accent px-6 py-2.5 font-bold text-black transition hover:bg-accent-strong"
        >
          Commencer la partie
        </button>
      </div>
    </div>
  )
}
