import type {
  Explanation,
  GameMode,
  GameState,
  GeneratedBoard,
  Hint,
  LegalMoves,
  MoveResult,
  PieceType,
  Player,
  Terrain,
} from './types'

export interface NewGameOptions {
  terrain: string
  mode: GameMode
  bot_player?: Player
  seed?: number
  variants?: boolean
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      // keep statusText
    }
    throw new ApiError(res.status, detail)
  }
  return (await res.json()) as T
}

export const api = {
  listTerrains: () => request<Terrain[]>('/terrains'),
  generateBoard: (mode: string, seed?: number) =>
    request<GeneratedBoard>('/boards/generate', {
      method: 'POST',
      body: JSON.stringify({ mode, seed }),
    }),
  createGame: (opts: NewGameOptions) =>
    request<GameState>('/games', { method: 'POST', body: JSON.stringify(opts) }),
  submitArmy: (id: string, player: Player, choices: Record<string, PieceType>) =>
    request<GameState>(`/games/${id}/army`, {
      method: 'POST',
      body: JSON.stringify({ player, choices }),
    }),
  getGame: (id: string) => request<GameState>(`/games/${id}`),
  getMoves: (id: string, both = false) =>
    request<LegalMoves>(`/games/${id}/moves${both ? '?both=true' : ''}`),
  playMove: (id: string, piece_id: string, to_row: number, to_col: number) =>
    request<MoveResult>(`/games/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ piece_id, to_row, to_col }),
    }),
  botMove: (id: string) => request<MoveResult>(`/games/${id}/bot-move`, { method: 'POST' }),
  explain: (id: string, piece: string, row: number, col: number) =>
    request<Explanation>(`/games/${id}/explain?piece=${encodeURIComponent(piece)}&row=${row}&col=${col}`),
  hint: (id: string) => request<Hint>(`/games/${id}/hint`),
  resign: (id: string, player: Player) =>
    request<GameState>(`/games/${id}/resign`, {
      method: 'POST',
      body: JSON.stringify({ player }),
    }),
}
