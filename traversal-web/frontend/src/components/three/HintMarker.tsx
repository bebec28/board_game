import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Hint, Piece } from '../../api/types'
import { BOARD_SIZE, isOffBoard, squareXZ, topY } from '../../lib/coords'

const GOLD = '#f5c542'

/** Pulsing golden rings on the suggested piece and its destination, joined by an arc of dots. */
export default function HintMarker({ hint, piece, board }: { hint: Hint; piece: Piece; board: number[][] }) {
  const offBoard = isOffBoard(hint.to_row)
  const edgeRow = hint.to_row < 0 ? 0 : BOARD_SIZE - 1
  const [fx, fz] = squareXZ(piece.row, piece.col)
  const fy = topY(board[piece.row][piece.col])
  const [tx, tz0] = squareXZ(offBoard ? edgeRow : hint.to_row, hint.to_col)
  const tz = offBoard ? tz0 + (hint.to_row < 0 ? -0.95 : 0.95) : tz0
  const ty = topY(board[offBoard ? edgeRow : hint.to_row][hint.to_col])

  const from = new THREE.Vector3(fx, fy, fz)
  const to = new THREE.Vector3(tx, ty, tz)
  const dots = Array.from({ length: 9 }, (_, i) => {
    const u = (i + 1) / 10
    const p = new THREE.Vector3().lerpVectors(from, to, u)
    p.y += Math.sin(Math.PI * u) * (0.6 + from.distanceTo(to) * 0.08) + 0.15
    return p
  })

  return (
    <group>
      <Pulse position={[fx, fy + 0.015, fz]} />
      <Pulse position={[tx, ty + 0.015, tz]} big />
      {dots.map((p, i) => (
        <Dot key={i} position={p} index={i} />
      ))}
    </group>
  )
}

function Pulse({ position, big }: { position: [number, number, number]; big?: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const k = (clock.elapsedTime * 1.4) % 1
    const s = 0.8 + k * (big ? 0.6 : 0.4)
    m.scale.set(s, s, s)
    ;(m.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - k)
  })
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.33, 0.42, 40]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.46, 40]} />
        <meshBasicMaterial color={GOLD} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

function Dot({ position, index }: { position: THREE.Vector3; index: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    // A wave travelling from the piece to its destination.
    const phase = (clock.elapsedTime * 1.6 - index * 0.11) % 1
    const s = 0.6 + Math.max(0, Math.sin(phase * Math.PI * 2)) * 0.6
    m.scale.set(s, s, s)
  })
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshBasicMaterial color={GOLD} />
    </mesh>
  )
}
