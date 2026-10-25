import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Explanation, GameState } from '../../api/types'
import { squareXZ, topY } from '../../lib/coords'
import { ghostSteps, type GhostStep } from '../../lib/explain'
import { MOTION_SECONDS, motionAt } from '../../lib/motion'
import { PieceModel } from './PieceMesh'

const TONE_COLORS: Record<GhostStep['tone'], string> = {
  ok: '#81b64c',
  win: '#81b64c',
  over: '#e24a4a',
  blocked: '#e24a4a',
  fight: '#ff8a3d',
}

const LEAD_IN = 0.35
const HOLD = 1.6

/**
 * Acts out an explanation on the board: a translucent copy of the piece walks the cheapest
 * route, each square shows what it cost, and the ghost bumps into whatever stops it. Loops.
 */
export default function ExplainPath({ explanation, game, run }: { explanation: Explanation; game: GameState; run: number }) {
  const piece = game.pieces.find((p) => p.id === explanation.piece_id)
  const steps = useMemo(() => ghostSteps(explanation, game), [explanation, game])
  const segments = useMemo(() => {
    const world = (sq: [number, number]) => {
      const [x, z] = squareXZ(sq[0], sq[1])
      return new THREE.Vector3(x, topY(game.board[sq[0]][sq[1]]), z)
    }
    return steps.map((s) => ({ ...s, a: world(s.from), b: world(s.to), motion: s.kind }))
  }, [steps, game.board])
  const total = LEAD_IN + segments.reduce((t, s) => t + MOTION_SECONDS[s.motion], 0) + HOLD

  const ghost = useRef<THREE.Group>(null)
  const clock = useRef({ run: -1, t0: 0 })
  const [revealed, setRevealed] = useState(0)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock: c }) => {
    const g = ghost.current
    if (!g || segments.length === 0) return
    if (clock.current.run !== run) clock.current = { run, t0: c.elapsedTime }
    let t = (c.elapsedTime - clock.current.t0) % total
    let shown = 0
    t -= LEAD_IN
    if (t < 0) {
      g.position.copy(segments[0].a)
    } else {
      let placed = false
      for (const s of segments) {
        const d = MOTION_SECONDS[s.motion]
        if (t < d) {
          motionAt(s.motion, s.a, s.b, t / d, tmp)
          g.position.copy(tmp)
          if (t / d > 0.45) shown++
          placed = true
          break
        }
        t -= d
        shown++
      }
      if (!placed) {
        const last = segments[segments.length - 1]
        g.position.copy(last.motion === 'walk' || last.motion === 'jump' ? last.b : last.a)
      }
    }
    if (shown !== revealed) setRevealed(shown)
  })

  if (!piece || segments.length === 0) return null

  return (
    <group>
      {segments.map((s, i) => {
        const color = TONE_COLORS[s.tone]
        const visible = i < revealed
        return (
          <group key={`${s.to[0]},${s.to[1]},${i}`} position={[s.b.x, s.b.y + 0.014, s.b.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.9, 0.9]} />
              <meshBasicMaterial color={color} transparent opacity={visible ? 0.55 : 0.16} depthWrite={false} />
            </mesh>
            {(s.tone === 'blocked' || s.tone === 'over') && visible && <Cross color={color} />}
            {visible && (
              <Html center position={[0, 0.95, 0]} zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
                <div
                  className="animate-pop whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white shadow-lg"
                  style={{ background: color }}
                >
                  {s.label}
                </div>
              </Html>
            )}
          </group>
        )
      })}
      <group ref={ghost} position={segments[0].a}>
        <PieceModel type={piece.type} player={piece.player} opacity={0.55} glow={{ color: '#ffffff', intensity: 0.25 }} />
      </group>
    </group>
  )
}

function Cross({ color }: { color: string }) {
  return (
    <group position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.7, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <planeGeometry args={[0.7, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}
