import type { PieceType, Player } from '../api/types'
import { MOTION_SECONDS, type MotionKind } from '../lib/motion'

export type Sq = [number, number]

export interface TutPiece {
  id: string
  type: PieceType
  player: Player
  at: Sq
}

const MOVEMENT: Record<PieceType, number> = { explorer: 5, vanguard: 4, sentinel: 3, messenger: 6 }

/** One scripted beat of a lesson animation. Paths list the squares after the piece's current one. */
export type Action =
  | { do: 'say'; text: string }
  | { do: 'move'; id: string; path: Sq[]; costs?: boolean }
  | { do: 'jump'; id: string; to: Sq; label?: string }
  | { do: 'bump'; id: string; to: Sq; jump?: boolean; label?: string }
  | { do: 'capture'; id: string; target: string; label?: string }
  | { do: 'finish'; id: string; label?: string }
  | { do: 'place'; id: string; at: Sq }
  | { do: 'label'; at: Sq; text: string; tone?: Tone }
  | { do: 'mark'; squares: Sq[]; tone?: Tone }
  | { do: 'clear' }
  | { do: 'wait'; s: number }

export type Tone = 'ok' | 'bad' | 'gold' | 'red' | 'blue' | 'info'

export interface Keyframe {
  t0: number
  dur: number
  kind: MotionKind | 'place'
  a: Sq
  b: Sq
}

export interface PieceTrack {
  piece: TutPiece
  frames: Keyframe[]
  /** Time the piece leaves the board (captured or finished). */
  goneAt: number | null
  finished: boolean
}

export interface TimedLabel {
  t0: number
  t1: number
  at: Sq
  text: string
  tone: Tone
}

export interface TimedMark {
  t0: number
  t1: number
  squares: Sq[]
  tone: Tone
}

export interface Timeline {
  tracks: PieceTrack[]
  labels: TimedLabel[]
  marks: TimedMark[]
  captions: { t0: number; text: string }[]
  total: number
}

const LEAD_IN = 0.8
const GAP = 0.12
const SAY_PAUSE = 1.5
const HOLD = 2.6

/**
 * Run a lesson script once, ahead of time, and turn it into per-piece keyframes plus timed
 * labels, marks and captions. The scene then only has to sample it at the current time.
 */
export function buildTimeline(board: number[][], pieces: TutPiece[], script: Action[]): Timeline {
  const rows = board.length
  const tracks = new Map(pieces.map((p) => [p.id, { piece: p, frames: [] as Keyframe[], goneAt: null as number | null, finished: false }]))
  const pos = new Map(pieces.map((p) => [p.id, p.at]))
  const labels: TimedLabel[] = []
  const marks: TimedMark[] = []
  const captions: { t0: number; text: string }[] = []
  let t = LEAD_IN

  const track = (id: string) => {
    const tr = tracks.get(id)
    if (!tr) throw new Error(`Unknown tutorial piece ${id}`)
    return tr
  }
  const push = (id: string, kind: Keyframe['kind'], b: Sq, label?: { text: string; tone: Tone; at?: Sq }) => {
    const a = pos.get(id)!
    const dur = kind === 'place' ? 0 : MOTION_SECONDS[kind]
    track(id).frames.push({ t0: t, dur, kind, a, b })
    if (label) labels.push({ t0: t + dur * 0.55, t1: Infinity, at: label.at ?? b, text: label.text, tone: label.tone })
    if (kind !== 'bump' && kind !== 'jumpBump') pos.set(id, b)
    t += dur + (dur ? GAP : 0)
  }
  const closeOpen = () => {
    for (const l of labels) if (l.t1 === Infinity) l.t1 = t
    for (const m of marks) if (m.t1 === Infinity) m.t1 = t
  }

  for (const action of script) {
    switch (action.do) {
      case 'say':
        if (captions.length) t += SAY_PAUSE
        captions.push({ t0: t, text: action.text })
        t += 0.6
        break
      case 'move': {
        const movement = MOVEMENT[track(action.id).piece.type]
        let spent = 0
        for (const sq of action.path) {
          const [r0, c0] = pos.get(action.id)!
          const dh = board[sq[0]][sq[1]] - board[r0][c0]
          const cost = dh === 0 ? 1 : Math.abs(dh) + 1
          spent += cost
          push(
            action.id,
            'walk',
            sq,
            action.costs ? { text: `+${cost} · ${spent}/${movement}`, tone: spent > movement ? 'bad' : 'ok' } : undefined,
          )
        }
        break
      }
      case 'jump':
        push(action.id, 'jump', action.to, action.label ? { text: action.label, tone: 'info' } : undefined)
        break
      case 'bump':
        push(action.id, action.jump ? 'jumpBump' : 'bump', action.to, action.label ? { text: action.label, tone: 'bad' } : undefined)
        break
      case 'capture': {
        const victim = track(action.target)
        const to = pos.get(action.target)!
        const start = t
        push(action.id, 'walk', to, action.label ? { text: action.label, tone: 'ok' } : undefined)
        victim.goneAt = start + MOTION_SECONDS.walk * 0.6
        break
      }
      case 'finish': {
        const tr = track(action.id)
        const [r, c] = pos.get(action.id)!
        const off: Sq = [tr.piece.player === 1 ? -1 : rows, c]
        push(action.id, 'walk', off, action.label ? { text: action.label, tone: 'gold', at: [r, c] } : undefined)
        tr.goneAt = t
        tr.finished = true
        t += 0.4
        break
      }
      case 'place':
        push(action.id, 'place', action.at)
        break
      case 'label':
        labels.push({ t0: t, t1: Infinity, at: action.at, text: action.text, tone: action.tone ?? 'info' })
        t += 0.5
        break
      case 'mark':
        marks.push({ t0: t, t1: Infinity, squares: action.squares, tone: action.tone ?? 'gold' })
        t += 0.3
        break
      case 'clear':
        t += 0.6
        closeOpen()
        break
      case 'wait':
        t += action.s
        break
    }
  }
  t += HOLD
  closeOpen()
  return { tracks: [...tracks.values()], labels, marks, captions, total: t }
}

/** Where a piece is at time `t`: the motion in progress, or the end of the last one. */
export function sampleTrack(track: PieceTrack, t: number): { frame: Keyframe | null; u: number; at: Sq } {
  let last: Keyframe | null = null
  for (const f of track.frames) {
    if (f.t0 > t) break
    last = f
  }
  if (!last) return { frame: null, u: 1, at: track.piece.at }
  if (last.dur > 0 && t < last.t0 + last.dur) return { frame: last, u: (t - last.t0) / last.dur, at: last.a }
  const rests = last.kind === 'bump' || last.kind === 'jumpBump'
  return { frame: null, u: 1, at: rests ? last.a : last.b }
}
