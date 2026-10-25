import { create } from 'zustand'
import { api, ApiError, type NewGameOptions } from '../api/client'
import type { Explanation, GameState, Hint, LegalMoves, Move, PieceType, Player } from '../api/types'

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
  /** "Pourquoi ?" mode: clicking a square the selected piece cannot reach explains why. */
  helpMode: boolean
  explanation: Explanation | null
  /** Bumped to replay the explanation animation. */
  explanationRun: number
  hint: Hint | null
  hintLoading: boolean
  /** Both armies were just revealed; play (and the bot) waits until the players dismiss it. */
  armyReveal: boolean

  setHelpMode: (on: boolean) => void
  explainSquare: (row: number, col: number) => Promise<void>
  replayExplanation: () => void
  clearExplanation: () => void
  requestHint: () => Promise<void>
  clearHint: () => void
  newGame: (opts: NewGameOptions) => Promise<GameState>
  submitArmy: (player: Player, choices: Record<string, PieceType>) => Promise<void>
  dismissArmyReveal: () => void
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
  helpMode: false,
  explanation: null,
  explanationRun: 0,
  hint: null,
  hintLoading: false,
  armyReveal: false,

  setHelpMode(on) {
    set({ helpMode: on, explanation: null })
  },

  async explainSquare(row, col) {
    const { game, selectedPieceId } = get()
    if (!game || !selectedPieceId) return
    try {
      const explanation = await api.explain(game.id, selectedPieceId, row, col)
      set((s) => ({ explanation, explanationRun: s.explanationRun + 1, hint: null }))
    } catch (e) {
      set({ error: errorMessage(e) })
    }
  },

  replayExplanation() {
    set((s) => ({ explanationRun: s.explanationRun + 1 }))
  },

  clearExplanation() {
    set({ explanation: null })
  },

  async requestHint() {
    const { game, botThinking, animating, viewedPly } = get()
    if (!game || game.game_over || game.phase !== 'play' || botThinking || animating || viewedPly !== null) return
    set({ hintLoading: true, explanation: null })
    try {
      const hint = await api.hint(game.id)
      set({ hint, selectedPieceId: hint.piece_id, hintLoading: false })
    } catch (e) {
      set({ hintLoading: false, error: errorMessage(e) })
    }
  },

  clearHint() {
    set({ hint: null })
  },

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
    set({ loading: true, error: null, game: null, legalMoves: {}, selectedPieceId: null, lastMove: null, viewedPly: null, explanation: null, hint: null, armyReveal: false })
    try {
      const game = await api.createGame(opts)
      set({ game, loading: false, view: game.bot_player === 1 ? 'blue' : 'red' })
      await get().refreshMoves()
      void get().requestBotMove()
      return game
    } catch (e) {
      set({ loading: false, error: errorMessage(e) })
      throw e
    }
  },

  async submitArmy(player, choices) {
    const game = get().game
    if (!game || game.phase !== 'army') return
    try {
      const state = await api.submitArmy(game.id, player, choices)
      set({ game: state, selectedPieceId: null, armyReveal: state.phase === 'play' })
    } catch (e) {
      set({ error: errorMessage(e) })
    }
  },

  dismissArmyReveal() {
    set({ armyReveal: false })
    void get().refreshMoves()
    void get().requestBotMove()
  },

  async loadGame(id) {
    set({ loading: true, error: null, selectedPieceId: null, lastMove: null, viewedPly: null, explanation: null, hint: null, armyReveal: false })
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
      set({ selectedPieceId: null, explanation: null, hint: null })
      return
    }
    const piece = game.pieces.find((p) => p.id === id)
    if (!piece) return
    // Selecting any piece shows its stat card; only the side to move gets highlighted moves.
    const hint = get().hint
    set({ selectedPieceId: id, explanation: null, hint: hint && hint.piece_id === id ? hint : null })
  },

  setHovered(key) {
    if (get().hoveredSquare !== key) set({ hoveredSquare: key })
  },

  async playMove(pieceId, move) {
    const { game, animating, botThinking, viewedPly } = get()
    if (!game || animating || botThinking || viewedPly !== null) return
    set({ animating: true, error: null, explanation: null, hint: null })
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
    if (game.phase !== 'play' || get().armyReveal || get().botThinking) return
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
        explanation: null,
        hint: null,
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
