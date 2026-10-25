// Mirrors backend/app/api/schemas.py

export type ClassicPieceType = 'explorer' | 'vanguard' | 'sentinel'
/** Variant pieces a player may swap a classic piece for during the army phase. */
export type VariantPieceType = 'messenger'
export type PieceType = ClassicPieceType | VariantPieceType
export type Player = 1 | 2
export type GameMode = 'local' | 'bot'

export interface Piece {
  id: string
  type: PieceType
  player: Player
  row: number
  col: number
  movement: number
  strength: number
  is_captured: boolean
  is_finished: boolean
}

export interface Combat {
  attacker_id: string
  attacker_type: PieceType
  attacker_base: number
  height_mod: number
  allies: number
  charge: number
  attacker_total: number
  defender_id: string
  defender_type: PieceType
  defender_base: number
  reinforcements: number
  defender_total: number
  attacker_height: number
  defender_height: number
}

export interface Move {
  to_row: number
  to_col: number
  cost: number
  is_attack: boolean
  captured_id: string | null
  can_finish: boolean
  is_special: boolean
  attacker_strength: number | null
  defender_strength: number | null
  combat: Combat | null
}

export interface HistoryEntry {
  ply: number
  player: Player
  piece_id: string
  piece_type: PieceType
  from_row: number
  from_col: number
  to_row: number
  to_col: number
  is_attack: boolean
  captured_id: string | null
  finished: boolean
  is_special: boolean
  notation: string
  cost: number
  points: number
  combat: Combat | null
}

export interface GameState {
  id: string
  version: number
  mode: GameMode
  bot_player: Player | null
  terrain: string
  seed: number | null
  variants: boolean
  /** 'army': players are secretly choosing classic or variant pieces; 'play' afterwards. */
  phase: 'army' | 'play'
  /** Whether Red / Blue have submitted their army. */
  army_ready: [boolean, boolean]
  board: number[][]
  pieces: Piece[]
  current_turn: Player
  move_count: number
  finished_pieces: string[]
  first_to_finish: string | null
  game_over: boolean
  winner: 0 | Player | null
  scores: [number, number]
  draw_reason: string | null
  win_reason: string | null
  victory_type: string | null
  history: HistoryEntry[]
}

export type LegalMoves = Record<string, Move[]>

export interface MoveResult {
  state: GameState
  applied: HistoryEntry
}

export interface Terrain {
  id: string
  label: string
  description: string
}

export interface GeneratedBoard {
  board: number[][]
  seed: number
  mode: string
}

export type ExplainReason =
  | 'game_over'
  | 'piece_gone'
  | 'same_square'
  | 'own_piece'
  | 'cannot_attack'
  | 'legal'
  | 'leap_blocked'
  | 'combat_too_weak'
  | 'too_far'
  | 'blocked'

/** Why a piece can or cannot reach a square (the "Pourquoi ?" help). */
export interface Explanation {
  piece_id: string
  to_row: number
  to_col: number
  reason: ExplainReason
  legal: boolean
  movement: number
  hypothetical: boolean
  path: [number, number][]
  step_costs: number[]
  path_cost: number | null
  free_path: [number, number][]
  free_cost: number | null
  blockers: string[]
  occupant_id: string | null
  is_special: boolean
  combat: Combat | null
}

export interface Hint {
  piece_id: string
  to_row: number
  to_col: number
}
