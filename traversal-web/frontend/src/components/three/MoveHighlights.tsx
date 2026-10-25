import type { ThreeEvent } from '@react-three/fiber'
import type { Move } from '../../api/types'
import { BOARD_SIZE, isOffBoard, squareXZ, topY } from '../../lib/coords'
import { HIGHLIGHT } from '../../lib/colors'

interface Props {
  moves: Move[]
  board: number[][]
  /** Read-only preview (opponent's piece): dimmer and not clickable. */
  preview?: boolean
  onPick: (move: Move) => void
}

function colorFor(m: Move): string {
  if (m.can_finish) return HIGHLIGHT.finish
  if (m.is_attack) return HIGHLIGHT.attack
  if (m.is_special) return HIGHLIGHT.special
  return HIGHLIGHT.move
}

export default function MoveHighlights({ moves, board, preview = false, onPick }: Props) {
  const dim = preview ? 0.5 : 1
  const pick = (m: Move) => {
    if (!preview) onPick(m)
  }
  return (
    <group>
      {moves.map((m) => {
        const key = `${m.to_row},${m.to_col},${m.can_finish ? 'f' : ''}`
        const color = colorFor(m)
        if (isOffBoard(m.to_row)) {
          // Finish: a golden arrow floating just beyond the edge, pointing away from the board.
          const edgeRow = m.to_row < 0 ? 0 : BOARD_SIZE - 1
          const [x, z] = squareXZ(edgeRow, m.to_col)
          const dir = m.to_row < 0 ? -1 : 1
          const y = topY(board[edgeRow][m.to_col]) + 0.35
          return (
            <group
              key={key}
              position={[x, y, z + dir * 0.95]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation()
                pick(m)
              }}
            >
              <mesh rotation={[dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.28, 0.5, 4]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5 * dim} transparent opacity={dim} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -dir * 0.4]}>
                <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5 * dim} transparent opacity={dim} />
              </mesh>
            </group>
          )
        }
        const [x, z] = squareXZ(m.to_row, m.to_col)
        const y = topY(board[m.to_row][m.to_col]) + 0.012
        return (
          <group key={key} position={[x, y, z]}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation()
                pick(m)
              }}
            >
              <planeGeometry args={[0.92, 0.92]} />
              <meshBasicMaterial color={color} transparent opacity={(m.is_attack ? 0.5 : 0.38) * dim} />
            </mesh>
            {m.is_attack ? (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
                <ringGeometry args={[0.3, 0.42, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.9 * dim} />
              </mesh>
            ) : (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
                <circleGeometry args={[0.13, 24]} />
                <meshBasicMaterial color={color} transparent opacity={0.9 * dim} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}
