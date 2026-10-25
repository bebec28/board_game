import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { squareKey, squareXZ, topY } from '../../lib/coords'
import { heightColor } from '../../lib/colors'
import { useGameStore } from '../../store/gameStore'

interface Props {
  board: number[][]
  lastMove: { from: [number, number]; to: [number, number] } | null
  onSquareClick: (row: number, col: number) => void
}

const SQUARE_SCALE = 0.96

export default function Terrain({ board, lastMove, onSquareClick }: Props) {
  const hovered = useGameStore((s) => s.hoveredSquare)
  const setHovered = useGameStore((s) => s.setHovered)

  const squares = useMemo(() => {
    const out: { row: number; col: number; h: number; x: number; z: number; color: THREE.Color }[] = []
    board.forEach((rowArr, row) =>
      rowArr.forEach((h, col) => {
        const [x, z] = squareXZ(row, col)
        const base = heightColor(h)
        // Subtle checkerboard so flat areas still read as a grid.
        if ((row + col) % 2 === 1) base.offsetHSL(0, 0, -0.035)
        out.push({ row, col, h, x, z, color: base })
      }),
    )
    return out
  }, [board])

  return (
    <group>
      {squares.map((sq) => {
        const key = squareKey(sq.row, sq.col)
        const height = topY(sq.h)
        const isHovered = hovered === key
        const isLast =
          lastMove != null &&
          ((lastMove.from[0] === sq.row && lastMove.from[1] === sq.col) ||
            (lastMove.to[0] === sq.row && lastMove.to[1] === sq.col))
        const color = sq.color.clone()
        if (isLast) color.lerp(new THREE.Color('#f5c542'), 0.35)
        if (isHovered) color.offsetHSL(0, 0, 0.12)
        return (
          <mesh
            key={key}
            position={[sq.x, height / 2, sq.z]}
            castShadow
            receiveShadow
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              setHovered(key)
            }}
            onPointerOut={() => setHovered(null)}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation()
              onSquareClick(sq.row, sq.col)
            }}
          >
            <boxGeometry args={[SQUARE_SCALE, height, SQUARE_SCALE]} />
            <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
          </mesh>
        )
      })}
      {/* Base plinth under the board */}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[10.8, 0.24, 10.8]} />
        <meshStandardMaterial color="#1b1a18" roughness={0.9} />
      </mesh>
    </group>
  )
}
