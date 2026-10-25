import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls } from '@react-three/drei'
import { heightColor } from '../../lib/colors'
import { topY } from '../../lib/coords'
import { motionAt } from '../../lib/motion'
import { PieceModel } from '../three/PieceMesh'
import { sampleTrack, type PieceTrack, type Sq, type Timeline, type Tone } from '../../tutorial/timeline'

export interface PlayClock {
  t: number
  playing: boolean
  speed: number
}

const TONES: Record<Tone, string> = {
  ok: '#81b64c',
  bad: '#e24a4a',
  gold: '#f5c542',
  red: '#e24a4a',
  blue: '#3b82f6',
  info: '#9b7bff',
}

interface Props {
  board: number[][]
  timeline: Timeline
  clock: React.MutableRefObject<PlayClock>
  onCaption: (index: number) => void
}

/** A small terrain with scripted pieces that act out a rule, looping. */
export default function TutorialScene({ board, timeline, clock, onCaption }: Props) {
  const rows = board.length
  const cols = board[0].length
  const dist = Math.max(rows, cols)
  return (
    <Canvas
      shadows
      camera={{ position: [0, dist * 0.95 + 1.5, dist * 1.05 + 2], fov: 40, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      style={{ background: 'radial-gradient(ellipse at center, #3a3733 0%, #262522 75%)' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 12, 6]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 5, -5]} intensity={0.45} />
      <hemisphereLight args={['#cfd8e3', '#2a2622', 0.4]} />
      <MiniTerrain board={board} />
      <Player board={board} timeline={timeline} clock={clock} onCaption={onCaption} />
      <ContactShadows position={[0, -0.2, 0]} opacity={0.45} scale={dist + 4} blur={2.2} far={3} />
      <OrbitControls
        makeDefault
        target={[0, 0.5, 0]}
        enablePan={false}
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI * 0.46}
        enableDamping
      />
    </Canvas>
  )
}

/** World position of the top of a square; rows -1 and `rows` are just off the board (finish). */
function worldOf(board: number[][], [r, c]: Sq, out = new THREE.Vector3()) {
  const rows = board.length
  const cols = board[0].length
  const rr = Math.min(rows - 1, Math.max(0, r))
  const x = c - (cols - 1) / 2
  const z = r - (rows - 1) / 2
  return out.set(x, topY(board[rr][c]), z)
}

function MiniTerrain({ board }: { board: number[][] }) {
  const rows = board.length
  const cols = board[0].length
  return (
    <group>
      {board.flatMap((row, r) =>
        row.map((h, c) => {
          const color = heightColor(h)
          if ((r + c) % 2 === 1) color.offsetHSL(0, 0, -0.035)
          const y = topY(h)
          return (
            <mesh key={`${r},${c}`} position={[c - (cols - 1) / 2, y / 2, r - (rows - 1) / 2]} castShadow receiveShadow>
              <boxGeometry args={[0.96, y, 0.96]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
          )
        }),
      )}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[cols + 0.8, 0.24, rows + 0.8]} />
        <meshStandardMaterial color="#1b1a18" roughness={0.9} />
      </mesh>
      {/* Goal edges: red exits at the top (row 0), blue at the bottom. */}
      <mesh position={[0, 0.02, -(rows / 2) - 0.25]}>
        <boxGeometry args={[cols + 0.8, 0.06, 0.12]} />
        <meshBasicMaterial color="#e24a4a" />
      </mesh>
      <mesh position={[0, 0.02, rows / 2 + 0.25]}>
        <boxGeometry args={[cols + 0.8, 0.06, 0.12]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
    </group>
  )
}

/** Advances the clock, samples the timeline and draws labels, marks and pieces. */
function Player({ board, timeline, clock, onCaption }: Omit<Props, 'board'> & { board: number[][] }) {
  const [visible, setVisible] = useState<{ labels: number[]; marks: number[] }>({ labels: [], marks: [] })
  const sig = useRef('')
  const caption = useRef(-2)

  useFrame((_, dt) => {
    const c = clock.current
    if (c.playing) c.t += Math.min(dt, 0.1) * c.speed
    if (c.t >= timeline.total) c.t = 0
    const t = c.t
    const labels = timeline.labels.flatMap((l, i) => (l.t0 <= t && t < l.t1 ? [i] : []))
    const marks = timeline.marks.flatMap((m, i) => (m.t0 <= t && t < m.t1 ? [i] : []))
    const s = `${labels.join(',')}|${marks.join(',')}`
    if (s !== sig.current) {
      sig.current = s
      setVisible({ labels, marks })
    }
    let cap = -1
    timeline.captions.forEach((k, i) => {
      if (k.t0 <= t) cap = i
    })
    if (cap !== caption.current) {
      caption.current = cap
      onCaption(cap)
    }
  })

  return (
    <group>
      {visible.marks.map((i) =>
        timeline.marks[i].squares.map(([r, c]) => {
          const p = worldOf(board, [r, c])
          return (
            <mesh key={`m${i}-${r},${c}`} position={[p.x, p.y + 0.015, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.3, 0.44, 36]} />
              <meshBasicMaterial color={TONES[timeline.marks[i].tone]} transparent opacity={0.9} depthWrite={false} />
            </mesh>
          )
        }),
      )}
      {visible.labels.map((i) => {
        const l = timeline.labels[i]
        const p = worldOf(board, l.at)
        return (
          <group key={`l${i}`} position={[p.x, p.y, p.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
              <planeGeometry args={[0.9, 0.9]} />
              <meshBasicMaterial color={TONES[l.tone]} transparent opacity={0.35} depthWrite={false} />
            </mesh>
            <Html center position={[0, 1.05, 0]} zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
              <div
                className="animate-pop whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white shadow-lg"
                style={{ background: TONES[l.tone] }}
              >
                {l.text}
              </div>
            </Html>
          </group>
        )
      })}
      {timeline.tracks.map((tr) => (
        <TrackedPiece key={tr.piece.id} track={tr} board={board} clock={clock} />
      ))}
    </group>
  )
}

const GONE_SECONDS = 0.45

function TrackedPiece({ track, board, clock }: { track: PieceTrack; board: number[][]; clock: React.MutableRefObject<PlayClock> }) {
  const ref = useRef<THREE.Group>(null)
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), out: new THREE.Vector3() }), [])

  useFrame(() => {
    const g = ref.current
    if (!g) return
    const t = clock.current.t
    const { frame, u, at } = sampleTrack(track, t)
    if (frame && frame.kind !== 'place') {
      worldOf(board, frame.a, tmp.a)
      worldOf(board, frame.b, tmp.b)
      motionAt(frame.kind, tmp.a, tmp.b, u, tmp.out)
      g.position.copy(tmp.out)
    } else {
      worldOf(board, at, g.position)
    }
    let s = 1
    if (track.goneAt !== null && t >= track.goneAt) {
      const k = Math.min(1, (t - track.goneAt) / GONE_SECONDS)
      s = 1 - k
      // Captured pieces sink into the ground; finished pieces float up and away.
      g.position.y += track.finished ? k * 0.8 : -k * 0.3
    }
    g.visible = s > 0.01
    g.scale.setScalar(Math.max(0.001, s))
  })

  return (
    <group ref={ref}>
      <PieceModel type={track.piece.type} player={track.piece.player} />
    </group>
  )
}
