import type { Combat, GameState, HistoryEntry } from '../../api/types'
import { PLAYER_COLORS, PLAYER_NAMES } from '../../lib/colors'
import { PIECE_INFO } from '../../lib/pieces'
import { useGameStore } from '../../store/gameStore'

/**
 * Shown while reviewing a past move with the arrow keys. Explains what happened on that ply,
 * including the full combat arithmetic when a piece was captured.
 */
export default function ReplayBanner({ game, ply, entry }: { game: GameState; ply: number; entry: HistoryEntry | null }) {
  const stepReplay = useGameStore((s) => s.stepReplay)
  const viewPly = useGameStore((s) => s.viewPly)
  const total = game.history.length

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 w-[min(92%,640px)] -translate-x-1/2 rounded-xl border border-line bg-panel/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2">
        <NavBtn onClick={() => stepReplay(-1)} disabled={ply === 0} title="Coup précédent (←)">
          ◀
        </NavBtn>
        <NavBtn onClick={() => stepReplay(1)} title="Coup suivant (→)">
          ▶
        </NavBtn>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            Relecture · coup {ply} / {total}
          </div>
          {entry ? (
            <div className="truncate text-sm">
              <span className="font-bold" style={{ color: PLAYER_COLORS[entry.player] }}>
                {PLAYER_NAMES[entry.player]}
              </span>{' '}
              <span className="font-semibold tabular-nums">{entry.notation}</span>
              <span className="text-ink-muted"> · {describe(entry)}</span>
            </div>
          ) : (
            <div className="text-sm text-ink-muted">Position de départ</div>
          )}
        </div>
        <button
          onClick={() => viewPly(null)}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-black hover:bg-accent-strong"
          title="Revenir au direct (Échap)"
        >
          Direct
        </button>
      </div>
      {entry?.combat && <CombatExplanation combat={entry.combat} attackerPlayer={entry.player} />}
    </div>
  )
}

function describe(e: HistoryEntry): string {
  const name = PIECE_INFO[e.piece_type].name
  if (e.finished) return `${name} sort du plateau, +${e.points} point${e.points > 1 ? 's' : ''}`
  if (e.is_attack) return `${name} capture ${e.is_special ? 'par un coup spécial' : `(coût ${e.cost})`}`
  if (e.is_special) return `${name}, coup spécial (ignore la hauteur)`
  return `${name} se déplace (coût ${e.cost} / ${PIECE_INFO[e.piece_type].movement})`
}

function CombatExplanation({ combat: c, attackerPlayer }: { combat: Combat; attackerPlayer: 1 | 2 }) {
  const defenderPlayer = attackerPlayer === 1 ? 2 : 1
  const atkName = PIECE_INFO[c.attacker_type].name
  const dfnName = PIECE_INFO[c.defender_type].name
  const terrain =
    c.height_mod > 0
      ? `en contrebas (h${c.defender_height} contre h${c.attacker_height})`
      : c.height_mod < 0
        ? `en hauteur (h${c.defender_height} contre h${c.attacker_height})`
        : `à la même hauteur (h${c.attacker_height})`

  return (
    <div className="mt-2.5 grid gap-2 rounded-lg bg-panel-2 p-2.5 text-xs sm:grid-cols-[1fr_auto_1fr]">
      <Side
        title="Attaquant"
        color={PLAYER_COLORS[attackerPlayer]}
        name={atkName}
        total={c.attacker_total}
        terms={[
          { label: 'Force de base', value: c.attacker_base },
          { label: c.height_mod > 0 ? 'Attaque depuis plus haut' : 'Attaque depuis plus bas', value: c.height_mod, hide: c.height_mod === 0 },
          { label: 'Alliés adjacents à la cible', value: c.allies, hide: c.allies === 0 },
          { label: 'Charge (4 points de mouvement)', value: c.charge, hide: c.charge === 0 },
        ]}
      />
      <div className="flex items-center justify-center text-lg font-black text-ink-muted">≥</div>
      <Side
        title="Défenseur"
        color={PLAYER_COLORS[defenderPlayer]}
        name={dfnName}
        total={c.defender_total}
        terms={[
          { label: 'Force de base', value: c.defender_base },
          { label: 'Renforts adjacents (+1 chacun)', value: c.reinforcements, hide: c.reinforcements === 0 },
        ]}
      />
      <p className="text-ink-muted sm:col-span-3">
        {`${PLAYER_NAMES[defenderPlayer]} perd son ${dfnName} : la cible était ${terrain}. `}
        {c.attacker_total === c.defender_total
          ? "Les forces sont égales et l'égalité profite à l'attaquant."
          : `${c.attacker_total} contre ${c.defender_total}, l'attaque l'emporte.`}
        {c.defender_total - c.reinforcements + 1 > c.attacker_total
          ? ''
          : c.reinforcements === 0
            ? ' Un allié adjacent au défenseur aurait ajouté +1 à sa défense.'
            : ''}
      </p>
    </div>
  )
}

function Side({
  title,
  color,
  name,
  total,
  terms,
}: {
  title: string
  color: string
  name: string
  total: number
  terms: { label: string; value: number; hide?: boolean }[]
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold" style={{ color }}>
          {title} · {name}
        </span>
        <span className="text-base font-black tabular-nums" style={{ color }}>
          {total}
        </span>
      </div>
      <ul className="mt-1 space-y-0.5 text-ink-muted">
        {terms
          .filter((t) => !t.hide)
          .map((t) => (
            <li key={t.label} className="flex justify-between gap-2">
              <span>{t.label}</span>
              <span className="tabular-nums text-ink">{t.value > 0 ? `+${t.value}` : t.value}</span>
            </li>
          ))}
      </ul>
    </div>
  )
}

function NavBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  title: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8 rounded-lg bg-panel-2 text-sm font-bold text-ink hover:bg-line disabled:opacity-30"
    >
      {children}
    </button>
  )
}
