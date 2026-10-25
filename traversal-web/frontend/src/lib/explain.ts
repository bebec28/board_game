import type { Explanation, GameState, Piece, PieceType } from '../api/types'
import { PLAYER_NAMES } from './colors'
import { PIECE_INFO } from './pieces'

export type Square = [number, number]

/** Same naming as the move list: columns a..j, ranks 1..10 (rank 1 at the top). */
export function squareName(row: number, col: number): string {
  return `${String.fromCharCode(97 + col)}${row + 1}`
}

export function pieceLabel(piece: Piece | undefined): string {
  if (!piece) return 'une pièce'
  return `${PIECE_INFO[piece.type].name} ${PLAYER_NAMES[piece.player].toLowerCase()}`
}

const WITH_ARTICLE: Record<PieceType, string> = {
  explorer: "l'Explorateur",
  vanguard: "l'Avant-garde",
  sentinel: 'la Sentinelle',
  messenger: 'le Messager',
}

/** "l'Explorateur", "la Sentinelle"… */
export function theType(type: PieceType | undefined): string {
  return type ? WITH_ARTICLE[type] : 'la pièce'
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${Math.abs(n) > 1 ? 's' : ''}`
}

/** "plat", "monte de 2", "descend de 1" for a step between two heights. */
export function slopeLabel(from: number, to: number): string {
  const dh = to - from
  if (dh === 0) return 'plat'
  return dh > 0 ? `monte de ${dh}` : `descend de ${-dh}`
}

export type StepKind = 'walk' | 'bump' | 'jump' | 'jumpBump'

export interface GhostStep {
  from: Square
  to: Square
  kind: StepKind
  /** Text shown above the destination square once the ghost gets there. */
  label: string
  /** Visual state of the destination square. */
  tone: 'ok' | 'over' | 'blocked' | 'fight' | 'win'
}

/**
 * Turn an explanation into the steps a ghost piece acts out on the board: it walks the route,
 * and bumps into whatever stops it (a piece in the way, missing Movement, a lost fight).
 */
export function ghostSteps(ex: Explanation, game: GameState): GhostStep[] {
  const piece = game.pieces.find((p) => p.id === ex.piece_id)
  if (!piece) return []
  const start: Square = [piece.row, piece.col]
  const target: Square = [ex.to_row, ex.to_col]
  const occupied = (sq: Square) =>
    game.pieces.some((p) => !p.is_captured && !p.is_finished && p.row === sq[0] && p.col === sq[1])

  if (ex.reason === 'leap_blocked') {
    return [{ from: start, to: target, kind: 'jumpBump', label: 'saut bloqué', tone: 'blocked' }]
  }
  if (ex.is_special) {
    const fight = ex.reason === 'combat_too_weak'
    return [
      {
        from: start,
        to: target,
        kind: fight ? 'jumpBump' : 'jump',
        label: fight ? combatLabel(ex) : ex.combat ? combatLabel(ex) : 'spécial',
        tone: fight ? 'fight' : ex.combat ? 'win' : 'ok',
      },
    ]
  }

  const walkable = ex.reason === 'legal' || ex.reason === 'combat_too_weak'
  const route = walkable && ex.free_path.length > 1 ? ex.free_path : ex.path
  const steps: GhostStep[] = []
  let spent = 0
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1]
    const to = route[i]
    const cost = stepCost(game.board, from, to)
    spent += cost
    const isTarget = i === route.length - 1
    if (isTarget && ex.combat) {
      const lost = ex.combat.attacker_total < ex.combat.defender_total
      steps.push({
        from,
        to,
        kind: lost || spent > ex.movement ? 'bump' : 'walk',
        label: spent > ex.movement ? `${spent}/${ex.movement}` : combatLabel(ex),
        tone: spent > ex.movement ? 'over' : lost ? 'fight' : 'win',
      })
      break
    }
    if (!isTarget && occupied(to)) {
      steps.push({ from, to, kind: 'bump', label: 'bloqué', tone: 'blocked' })
      break
    }
    if (spent > ex.movement) {
      steps.push({ from, to, kind: 'bump', label: `+${cost} → ${spent}/${ex.movement}`, tone: 'over' })
      break
    }
    steps.push({ from, to, kind: 'walk', label: `+${cost} → ${spent}/${ex.movement}`, tone: 'ok' })
  }
  return steps
}

function combatLabel(ex: Explanation): string {
  const c = ex.combat
  return c ? `${c.attacker_total} vs ${c.defender_total}` : ''
}

export function stepCost(board: number[][], a: Square, b: Square): number {
  const dh = board[b[0]][b[1]] - board[a[0]][a[1]]
  return dh === 0 ? 1 : Math.abs(dh) + 1
}
