import { create } from 'zustand'
import { api, ApiError } from '../api/client'
import type { GameMode, GameState, LegalMoves, Move, Player } from '../api/types'

export type ViewPreset =
  | 'red'
  | 'blue'
  | 'top'
  | 'left'
  | 'right'
  | 'iso-red-left'
  | 'iso-red-right'
  | 'iso-blue-left'
  | 'iso-blue-right'

const MOVE_ANIMATION_MS = 450
const BOT_MIN_DELAY_MS = 650

/** Which pieces may be clicked to reveal their legal moves (same options as the official game). */
export type ShowMovesFor = 'current' | 'both' | 'none'

interface GameStore {
  /** Ply being reviewed with the arrow keys; null = live position. */
  viewedPly: number | null
  showMovesFor: ShowMovesFor
  setShowMovesFor: (v: ShowMovesFor) => void
  viewPly: (ply: number | null) => void
  stepReplay: (delta: number) => void
  game: GameState | null
  legalMoves: LegalMoves
  selectedPieceId: string | null
  hoveredSquare: string | null
  animating: boolean
  botThinking: boolean
  loading: boolean
  error: string | null
  view: ViewPreset
  autoFlip: boolean
  lastMove: { from: [number, number]; to: [number, number] } | null

  newGame: (opts: { terrain: string; mode: GameMode; bot_player?: Player; seed?: number }) => Promise<GameState>
  loadGame: (id: string) => Promise<void>
  refreshMoves: () => Promise<void>
  selectPiece: (id: string | null) => void
  setHovered: (key: string | null) => void
  playMove: (pieceId: string, move: Move) => Promise<void>
  requestBotMove: () => Promise<void>
  resign: (player: Player) => Promise<void>
  setView: (view: ViewPreset) => void
  flipView: () => void
  setAutoFlip: (on: boolean) => void
  clearError: () => void
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function viewForPlayer(player: Player): ViewPreset {
  return player === 1 ? 'red' : 'blue'
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  legalMoves: {},
  selectedPieceId: null,
  hoveredSquare: null,
  animating: false,
  botThinking: false,
  loading: false,
  error: null,
  view: 'red',
  autoFlip: false,
  lastMove: null,
  viewedPly: null,
  showMovesFor: 'current',

  setShowMovesFor(v) {
    set({ showMovesFor: v, selectedPieceId: null })
    void get().refreshMoves()
  },

  viewPly(ply) {
    const game = get().game
    if (!game) return
    if (ply === null || ply >= game.history.length) {
      set({ viewedPly: null })
      return
    }
    set({ viewedPly: Math.max(0, ply), selectedPieceId: null })
  },

  stepReplay(delta) {
    const { game, viewedPly } = get()
    if (!game || game.history.length === 0) return
    const current = viewedPly ?? game.history.length
    get().viewPly(current + delta)
  },

  async newGame(opts) {
    set({ loading: true, error: null, game: null, legalMoves: {}, selectedPieceId: null, lastMove: null, viewedPly: null })
    try {
      const game = await api.createGame(opts)
      set({ game, loading: false, view: 'red' })
      await get().refreshMoves()
      return game
    } catch (e) {
      set({ loading: false, error: errorMessage(e) })
      throw e
    }
  },

  async loadGame(id) {
    set({ loading: true, error: null, selectedPieceId: null, lastMove: null, viewedPly: null })
    try {
      const game = await api.getGame(id)
      set({ game, loading: false })
      await get().refreshMoves()
      void get().requestBotMove()
    } catch (e) {
      set({ loading: false, error: errorMessage(e) })
    }
  },

  async refreshMoves() {
    const game = get().game
    if (!game || game.game_over) {
      set({ legalMoves: {} })
      return
    }
    try {
      const legalMoves = await api.getMoves(game.id, get().showMovesFor === 'both')
      set({ legalMoves })
    } catch (e) {
      set({ error: errorMessage(e) })
    }
  },

  selectPiece(id) {
    const { game, animating, botThinking, viewedPly } = get()
    if (!game || animating || botThinking || viewedPly !== null) return
    if (id === null) {
      set({ selectedPieceId: null })
      return
    }
    const piece = game.pieces.find((p) => p.id === id)
    if (!piece) return
    // Selecting any piece shows its stat card; only the side to move gets highlighted moves.
    set({ selectedPieceId: id })
  },

  setHovered(key) {
    if (get().hoveredSquare !== key) set({ hoveredSquare: key })
  },

  async playMove(pieceId, move) {
    const { game, animating, botThinking, viewedPly } = get()
    if (!game || animating || botThinking || viewedPly !== null) return
    set({ animating: true, error: null })
    try {
      const result = await api.playMove(game.id, pieceId, move.to_row, move.to_col)
      const applied = result.applied
      set({
        game: result.state,
        selectedPieceId: null,
        legalMoves: {},
        lastMove: { from: [applied.from_row, applied.from_col], to: [applied.to_row, applied.to_col] },
      })
      await sleep(MOVE_ANIMATION_MS)
      set({ animating: false })
      if (get().autoFlip && !result.state.game_over && result.state.mode === 'local') {
        set({ view: viewForPlayer(result.state.current_turn) })
      }
      await get().refreshMoves()
      void get().requestBotMove()
    } catch (e) {
      set({ animating: false, error: errorMessage(e) })
      await get().refreshMoves()
    }
  },

  async requestBotMove() {
    const game = get().game
    if (!game || game.game_over || game.mode !== 'bot' || game.current_turn !== game.bot_player) return
    if (get().botThinking) return
    set({ botThinking: true, legalMoves: {} })
    const started = Date.now()
    try {
      const result = await api.botMove(game.id)
      const elapsed = Date.now() - started
      if (elapsed < BOT_MIN_DELAY_MS) await sleep(BOT_MIN_DELAY_MS - elapsed)
      const applied = result.applied
      set({
        game: result.state,
        animating: true,
        lastMove: { from: [applied.from_row, applied.from_col], to: [applied.to_row, applied.to_col] },
      })
      await sleep(MOVE_ANIMATION_MS)
      set({ animating: false, botThinking: false })
      await get().refreshMoves()
    } catch (e) {
      set({ botThinking: false, error: errorMessage(e) })
    }
  },

  async resign(player) {
    const game = get().game
    if (!game || game.game_over) return
    try {
      const state = await api.resign(game.id, player)
      set({ game: state, legalMoves: {}, selectedPieceId: null })
    } catch (e) {
      set({ error: errorMessage(e) })
    }
  },

  setView(view) {
    set({ view })
  },

  flipView() {
    const v = get().view
    const flipped: Record<ViewPreset, ViewPreset> = {
      red: 'blue',
      blue: 'red',
      top: 'top',
      left: 'right',
      right: 'left',
      'iso-red-left': 'iso-blue-right',
      'iso-red-right': 'iso-blue-left',
      'iso-blue-left': 'iso-red-right',
      'iso-blue-right': 'iso-red-left',
    }
    set({ view: flipped[v] })
  },

  setAutoFlip(on) {
    set({ autoFlip: on })
  },

  clearError() {
    set({ error: null })
  },
}))

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Erreur inconnue'
}
