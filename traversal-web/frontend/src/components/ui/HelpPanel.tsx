import { Link } from 'react-router'
import type { Combat, Explanation, GameState } from '../../api/types'
import { useGameStore } from '../../store/gameStore'
import { PLAYER_COLORS, PLAYER_NAMES } from '../../lib/colors'
import { PIECE_INFO } from '../../lib/pieces'
import { pieceLabel, plural, slopeLabel, squareName, theType } from '../../lib/explain'
import { isOffBoard } from '../../lib/coords'

/** Floating buttons over the board: "Pourquoi ?" mode and a move suggestion. */
export function HelpToolbar({ game }: { game: GameState }) {
  const helpMode = useGameStore((s) => s.helpMode)
  const setHelpMode = useGameStore((s) => s.setHelpMode)
  const requestHint = useGameStore((s) => s.requestHint)
  const hintLoading = useGameStore((s) => s.hintLoading)
  const botThinking = useGameStore((s) => s.botThinking)
  const viewedPly = useGameStore((s) => s.viewedPly)
  const selectedPieceId = useGameStore((s) => s.selectedPieceId)
  const explanation = useGameStore((s) => s.explanation)
  if (game.game_over || viewedPly !== null) return null

  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
      <div className="flex gap-1.5">
        <ToolButton
          active={helpMode}
          onClick={() => setHelpMode(!helpMode)}
          title="Clique ensuite sur une case ou une pièce pour comprendre pourquoi le coup est impossible"
        >
          <QuestionIcon /> Pourquoi ?
        </ToolButton>
        <ToolButton onClick={() => void requestHint()} disabled={hintLoading || botThinking} title="Le bot te suggère un coup">
          <BulbIcon /> {hintLoading ? '…' : 'Indice'}
        </ToolButton>
        <Link
          to="/tutoriel"
          target="_blank"
          className="flex items-center gap-1.5 rounded-lg bg-black/45 px-3 py-1.5 text-xs font-semibold text-ink backdrop-blur-sm transition hover:bg-black/60"
        >
          <BookIcon /> Règles
        </Link>
      </div>
      {helpMode && !explanation && (
        <div className="max-w-[300px] animate-pop rounded-lg border border-accent/40 bg-panel/95 px-3 py-2 text-xs leading-snug text-ink shadow-xl">
          {selectedPieceId
            ? 'Clique sur une case (ou une pièce adverse) que cette pièce ne peut pas atteindre : une animation montre pourquoi.'
            : "Mode explication : sélectionne d'abord une pièce (la tienne ou celle de l'adversaire)."}
        </div>
      )}
    </div>
  )
}

/** Bottom card describing the current explanation or hint. */
export function HelpCard({ game }: { game: GameState }) {
  const explanation = useGameStore((s) => s.explanation)
  const hint = useGameStore((s) => s.hint)
  const clearExplanation = useGameStore((s) => s.clearExplanation)
  const replayExplanation = useGameStore((s) => s.replayExplanation)
  const clearHint = useGameStore((s) => s.clearHint)
  const viewedPly = useGameStore((s) => s.viewedPly)
  if (viewedPly !== null || game.game_over) return null

  if (explanation) {
    const text = describe(explanation, game)
    return (
      <Card tone={explanation.legal ? 'ok' : 'bad'} onClose={clearExplanation}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black ${explanation.legal ? 'bg-accent/20 text-accent' : 'bg-red/20 text-red'}`}>
            {explanation.legal ? '✓' : '✕'}
          </div>
          <div className="min-w-0 flex-1">
            {explanation.hypothetical && (
              <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Si c'était au tour de {PLAYER_NAMES[game.pieces.find((p) => p.id === explanation.piece_id)!.player]}
              </div>
            )}
            <div className="text-base font-bold">{text.title}</div>
            <p className="mt-0.5 text-sm leading-snug text-ink-muted">{text.body}</p>
            {text.steps && <StepChips explanation={explanation} game={game} />}
            {explanation.combat && <CombatBreakdown combat={explanation.combat} game={game} />}
            {text.tips.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-ink-muted">
                {text.tips.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <span className="text-gold">›</span> {t}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <SmallButton onClick={replayExplanation}>↻ Revoir l'animation</SmallButton>
              <Link
                to={`/tutoriel/${text.lesson}`}
                target="_blank"
                className="rounded-md bg-panel-2 px-2.5 py-1 text-xs font-semibold text-ink-muted transition hover:bg-line hover:text-ink"
              >
                Voir la règle →
              </Link>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (hint) {
    const piece = game.pieces.find((p) => p.id === hint.piece_id)
    if (!piece) return null
    const dest = isOffBoard(hint.to_row) ? 'sortir du plateau (points !)' : `aller en ${squareName(hint.to_row, hint.to_col)}`
    const target = game.pieces.find((p) => !p.is_captured && !p.is_finished && p.row === hint.to_row && p.col === hint.to_col)
    return (
      <Card tone="hint" onClose={clearHint}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
            <BulbIcon />
          </div>
          <div>
            <div className="text-base font-bold">Indice</div>
            <p className="mt-0.5 text-sm leading-snug text-ink-muted">
              Le bot jouerait : <span className="font-semibold" style={{ color: PLAYER_COLORS[piece.player] }}>{pieceLabel(piece)}</span>{' '}
              en {squareName(piece.row, piece.col)}, pour{' '}
              {target ? <>capturer {pieceLabel(target)} en {squareName(target.row, target.col)}</> : dest}.
            </p>
            <p className="mt-1 text-xs text-ink-muted">La pièce est sélectionnée : clique sur la case dorée pour jouer ce coup.</p>
          </div>
        </div>
      </Card>
    )
  }
  return null
}

function Card({ children, tone, onClose }: { children: React.ReactNode; tone: 'ok' | 'bad' | 'hint'; onClose: () => void }) {
  const border = tone === 'ok' ? 'border-accent/50' : tone === 'bad' ? 'border-red/50' : 'border-gold/50'
  return (
    // Top-left, where the legend sits: the animated path is usually near the player's own side.
    <div className="absolute left-4 top-4 z-10 w-[min(calc(100%-2rem),460px)] animate-slide-up">
      <div className={`relative rounded-2xl border ${border} bg-panel/95 p-4 shadow-2xl backdrop-blur`}>
        <button onClick={onClose} className="absolute right-3 top-2.5 text-ink-muted hover:text-ink" aria-label="Fermer">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

interface Described {
  title: string
  body: React.ReactNode
  steps: boolean
  tips: string[]
  lesson: string
}

function describe(ex: Explanation, game: GameState): Described {
  const piece = game.pieces.find((p) => p.id === ex.piece_id)
  const name = pieceLabel(piece)
  const dest = squareName(ex.to_row, ex.to_col)
  const occupant = game.pieces.find((p) => p.id === ex.occupant_id)
  const names = (ids: string[]) =>
    ids.map((id) => {
      const p = game.pieces.find((q) => q.id === id)
      return p ? `${pieceLabel(p)} (${squareName(p.row, p.col)})` : id
    }).join(', ')
  const tips: string[] = []

  switch (ex.reason) {
    case 'legal': {
      if (ex.is_special) {
        return {
          title: 'Coup possible : mouvement spécial',
          body: `L'Explorateur peut aller en ${dest} en un seul bond (diagonale ou saut de 2), sans tenir compte du relief.`,
          steps: false, tips, lesson: 'explorateur',
        }
      }
      const cost = ex.free_cost ?? 0
      return {
        title: occupant ? `Attaque possible sur ${dest}` : `Coup possible : ${dest}`,
        body: occupant
          ? `${name} atteint ${pieceLabel(occupant)} pour ${plural(cost, 'point')} de mouvement (sur ${ex.movement}) et gagne le combat.`
          : `${name} y arrive pour ${plural(cost, 'point')} de mouvement sur ${ex.movement}.`,
        steps: true, tips, lesson: occupant ? 'combat' : 'deplacement',
      }
    }
    case 'too_far': {
      tips.push('Un pas sur du plat coûte 1 ; monter ou descendre coûte la différence de hauteur + 1.')
      if (piece?.type === 'explorer') tips.push("L'Explorateur peut aussi faire 1 pas en diagonale ou sauter 2 cases, en ignorant le relief.")
      if (occupant && ex.combat) tips.push(combatOutcome(ex.combat))
      return {
        title: 'Trop loin',
        body: `Le chemin le plus économique jusqu'en ${dest} coûte ${plural(ex.path_cost ?? 0, 'point')} de mouvement, mais ${theType(piece?.type)} n'en a que ${ex.movement}.`,
        steps: true, tips, lesson: 'deplacement',
      }
    }
    case 'blocked': {
      tips.push('On ne traverse jamais une pièce, ni alliée ni ennemie : il faut la contourner.')
      if (occupant && ex.combat) tips.push(combatOutcome(ex.combat))
      return {
        title: 'Chemin bloqué',
        body:
          `Le chemin le plus court (${plural(ex.path_cost ?? 0, 'point')}) passe par ${names(ex.blockers)}. ` +
          (ex.free_cost === null
            ? 'Aucun détour ne permet d’y arriver.'
            : `Le détour coûte ${plural(ex.free_cost, 'point')}, plus que les ${ex.movement} disponibles.`),
        steps: true, tips, lesson: 'obstacles',
      }
    }
    case 'leap_blocked':
      return {
        title: 'Saut impossible',
        body: `Le saut de l'Explorateur ne passe pas par-dessus une pièce : ${names(ex.blockers)} occupe la case intermédiaire. ` +
          (ex.free_cost === null ? 'Et à pied, aucun chemin libre.' : `Et à pied, il faudrait ${plural(ex.free_cost, 'point')} de mouvement (il en a ${ex.movement}).`),
        steps: false, tips, lesson: 'explorateur',
      }
    case 'combat_too_weak': {
      const c = ex.combat!
      const missing = c.defender_total - c.attacker_total
      if (c.height_mod <= 0) tips.push(`Attaquer depuis une case plus haute que la cible donne +1 (ici ${c.height_mod === 0 ? 'même hauteur : +0' : 'tu attaques en montant : −1'}).`)
      if (c.reinforcements > 0) tips.push(`${plural(c.reinforcements, 'pièce')} alliée${c.reinforcements > 1 ? 's' : ''} collée${c.reinforcements > 1 ? 's' : ''} au défenseur lui donne${c.reinforcements > 1 ? 'nt' : ''} +${c.reinforcements}. Isole-le d'abord.`)
      tips.push("Place une de tes pièces à côté de la cible : elle ajoute toute sa Force à l'attaque.")
      if (c.attacker_type === 'vanguard' && c.charge === 0) tips.push("Une Avant-garde gagne +1 si elle doit dépenser exactement ses 4 points pour atteindre la cible.")
      return {
        title: 'Combat perdu d’avance',
        body: `Une attaque n'est permise que si la force de l'attaquant est au moins égale à celle du défenseur. Ici ${c.attacker_total} contre ${c.defender_total} : il manque ${plural(missing, 'point')}.`,
        steps: false, tips, lesson: 'hauteur',
      }
    }
    case 'cannot_attack':
      return {
        title: 'Le Messager ne combat pas',
        body: `Avec une Force de 0, le Messager ne peut jamais attaquer : ${pieceLabel(occupant)} lui barre la route, il faut la contourner.`,
        steps: false, tips, lesson: 'obstacles',
      }
    case 'own_piece':
      return {
        title: 'Case occupée par ta pièce',
        body: "On ne peut ni s'arrêter sur une pièce alliée ni la traverser.",
        steps: false, tips, lesson: 'obstacles',
      }
    case 'same_square':
      return {
        title: 'Case de départ',
        body: 'Une pièce doit quitter sa case : elle ne peut pas terminer son tour là où elle a commencé.',
        steps: false, tips, lesson: 'obstacles',
      }
    case 'piece_gone':
      return { title: 'Pièce hors jeu', body: 'Cette pièce a été capturée ou est déjà sortie.', steps: false, tips, lesson: 'score' }
    case 'game_over':
      return { title: 'Partie terminée', body: 'Plus aucun coup ne peut être joué.', steps: false, tips, lesson: 'score' }
  }
}

function combatOutcome(c: Combat): string {
  return c.attacker_total >= c.defender_total
    ? `Même si elle y arrivait, l'attaque serait gagnée (${c.attacker_total} contre ${c.defender_total}).`
    : `Et même en y arrivant, l'attaque serait perdue (${c.attacker_total} contre ${c.defender_total}).`
}

/** One chip per step of the shown route: slope and cost, red once Movement runs out. */
function StepChips({ explanation, game }: { explanation: Explanation; game: GameState }) {
  const walkable = explanation.legal || explanation.reason === 'combat_too_weak'
  const route = walkable && explanation.free_path.length > 1 ? explanation.free_path : explanation.path
  if (route.length < 2) return null
  let spent = 0
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {route.slice(1).map(([r, c], i) => {
        const [pr, pc] = route[i]
        const h0 = game.board[pr][pc]
        const h1 = game.board[r][c]
        const cost = h1 === h0 ? 1 : Math.abs(h1 - h0) + 1
        spent += cost
        const over = spent > explanation.movement
        const blocked = explanation.blockers.length > 0 && game.pieces.some((p) => explanation.blockers.includes(p.id) && p.row === r && p.col === c)
        return (
          <span
            key={`${r},${c}`}
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${blocked ? 'bg-red/25 text-red' : over ? 'bg-red/15 text-red' : 'bg-accent/15 text-accent'}`}
            title={`${squareName(r, c)} · hauteur ${h1}`}
          >
            {squareName(r, c)} · {slopeLabel(h0, h1)} · {blocked ? 'pièce !' : `+${cost}`}
          </span>
        )
      })}
      <span className="ml-1 text-xs font-semibold text-ink">
        = {route.slice(1).reduce((t, [r, c], i) => {
          const h0 = game.board[route[i][0]][route[i][1]]
          const h1 = game.board[r][c]
          return t + (h1 === h0 ? 1 : Math.abs(h1 - h0) + 1)
        }, 0)} / {explanation.movement}
      </span>
    </div>
  )
}

export function CombatBreakdown({ combat, game }: { combat: Combat; game?: GameState }) {
  const attacker = game?.pieces.find((p) => p.id === combat.attacker_id)
  const defender = game?.pieces.find((p) => p.id === combat.defender_id)
  const win = combat.attacker_total >= combat.defender_total
  const atkTerms: [string, number][] = [
    [`Force ${PIECE_INFO[combat.attacker_type].name}`, combat.attacker_base],
    [combat.height_mod > 0 ? 'Attaque en descendant' : combat.height_mod < 0 ? 'Attaque en montant' : 'Même hauteur', combat.height_mod],
  ]
  if (combat.allies) atkTerms.push(['Alliés à côté de la cible', combat.allies])
  if (combat.charge) atkTerms.push(['Charge (4 points exacts)', combat.charge])
  const defTerms: [string, number][] = [[`Force ${PIECE_INFO[combat.defender_type].name}`, combat.defender_base]]
  defTerms.push(['Renforts adjacents', combat.reinforcements])
  const max = Math.max(combat.attacker_total, combat.defender_total, 1)
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2">
      <Side title="Attaque" color={attacker ? PLAYER_COLORS[attacker.player] : PLAYER_COLORS[1]} terms={atkTerms} total={combat.attacker_total} max={max} good={win} />
      <Side title="Défense" color={defender ? PLAYER_COLORS[defender.player] : PLAYER_COLORS[2]} terms={defTerms} total={combat.defender_total} max={max} good={!win} />
    </div>
  )
}

function Side({ title, color, terms, total, max, good }: { title: string; color: string; terms: [string, number][]; total: number; max: number; good: boolean }) {
  return (
    <div className="rounded-lg bg-panel-2 p-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>{title}</span>
        <span className={`text-xl font-black tabular-nums ${good ? 'text-ink' : 'text-ink-muted'}`}>{total}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
        <div className="h-full origin-left animate-grow rounded-full" style={{ width: `${(Math.max(0, total) / max) * 100}%`, background: color }} />
      </div>
      <ul className="mt-1.5 space-y-0.5 text-[11px] text-ink-muted">
        {terms.map(([label, v]) => (
          <li key={label} className="flex justify-between gap-2">
            <span>{label}</span>
            <span className={`tabular-nums ${v > 0 ? 'text-accent' : v < 0 ? 'text-red' : ''}`}>{v > 0 && label.startsWith('Force') ? v : v > 0 ? `+${v}` : v}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ToolButton({ children, onClick, active, disabled, title }: { children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition disabled:opacity-50 ${
        active ? 'bg-accent text-black shadow-[0_0_0_3px_rgba(129,182,76,0.35)]' : 'bg-black/45 text-ink hover:bg-black/60'
      }`}
    >
      {children}
    </button>
  )
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-md bg-panel-2 px-2.5 py-1 text-xs font-semibold text-ink-muted transition hover:bg-line hover:text-ink">
      {children}
    </button>
  )
}

function QuestionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
      <circle cx="12" cy="17.6" r="0.6" fill="currentColor" />
    </svg>
  )
}

function BulbIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5v-15ZM4 19.5A1.5 1.5 0 0 0 5.5 21H20" />
    </svg>
  )
}
