import type { GameState, HistoryEntry, Piece, Player } from '../api/types'
import { BOARD_SIZE } from './coords'

export interface ReplayPosition {
  pieces: Piece[]
  scores: [number, number]
  /** The move that led to this position (null at the start of the game). */
  entry: HistoryEntry | null
  lastMove: { from: [number, number]; to: [number, number] } | null
}

/** Pieces as they were before the first move: every piece back on its start square. */
function initialPieces(game: GameState): Piece[] {
  return game.pieces.map((p) => ({
    ...p,
    row: p.player === 1 ? BOARD_SIZE - 1 : 0,
    col: Number(p.id.split('_')[1]),
    is_captured: false,
    is_finished: false,
  }))
}

/**
 * Rebuild the position after `ply` moves (0 = initial position) by replaying the history
 * client-side. Every entry carries from/to, capture and finish information, so no extra
 * server round-trip is needed.
 */
export function positionAt(game: GameState, ply: number): ReplayPosition {
  const pieces = initialPieces(game)
  const byId = new Map(pieces.map((p) => [p.id, p]))
  const scores: [number, number] = [0, 0]
  let entry: HistoryEntry | null = null
  for (let i = 0; i < Math.min(ply, game.history.length); i++) {
    entry = game.history[i]
    const mover = byId.get(entry.piece_id)
    if (!mover) continue
    if (entry.captured_id) {
      const victim = byId.get(entry.captured_id)
      if (victim) victim.is_captured = true
    }
    if (entry.finished) {
      mover.is_finished = true
      mover.row = mover.player === 1 ? 0 : BOARD_SIZE - 1
      mover.col = entry.to_col
      scores[(mover.player as Player) - 1] += entry.points
    } else {
      mover.row = entry.to_row
      mover.col = entry.to_col
    }
  }
  return {
    pieces,
    scores,
    entry,
    lastMove: entry ? { from: [entry.from_row, entry.from_col], to: [entry.to_row, entry.to_col] } : null,
  }
}
