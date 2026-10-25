import { useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import type { Move, Piece } from '../../api/types'
import { useGameStore } from '../../store/gameStore'
import { positionAt } from '../../lib/replay'
import Terrain from './Terrain'
import PieceMesh from './PieceMesh'
import MoveHighlights from './MoveHighlights'
import CameraRig from './CameraRig'

export default function BoardScene() {
  const game = useGameStore((s) => s.game)
  const legalMoves = useGameStore((s) => s.legalMoves)
  const selectedPieceId = useGameStore((s) => s.selectedPieceId)
  const selectPiece = useGameStore((s) => s.selectPiece)
  const playMove = useGameStore((s) => s.playMove)
  const view = useGameStore((s) => s.view)
  const animating = useGameStore((s) => s.animating)
  const botThinking = useGameStore((s) => s.botThinking)
  const viewedPly = useGameStore((s) => s.viewedPly)
  const showMovesFor = useGameStore((s) => s.showMovesFor)
  const liveLastMove = useGameStore((s) => s.lastMove)

  const replaying = viewedPly !== null
  const replay = useMemo(
    () => (game && viewedPly !== null ? positionAt(game, viewedPly) : null),
    [game, viewedPly],
  )

  const selectedPiece = game?.pieces.find((p) => p.id === selectedPieceId) ?? null
  // Moves of the selected piece. A piece of the side NOT to move only gets a read-only preview
  // (when the "both players" option is on); its squares are drawn but cannot be played.
  const previewOnly = !!selectedPiece && !!game && selectedPiece.player !== game.current_turn
  const selectedMoves: Move[] = useMemo(() => {
    if (!selectedPieceId || showMovesFor === 'none' || replaying) return []
    if (previewOnly && showMovesFor !== 'both') return []
    return legalMoves[selectedPieceId] ?? []
  }, [legalMoves, selectedPieceId, showMovesFor, replaying, previewOnly])

  const onPieceClick = useCallback(
    (piece: Piece) => {
      if (!game || game.game_over || animating || botThinking || replaying) return
      const attack =
        !previewOnly &&
        selectedMoves.find((m) => m.is_attack && m.to_row === piece.row && m.to_col === piece.col)
      if (attack && selectedPieceId) {
        void playMove(selectedPieceId, attack)
        return
      }
      selectPiece(piece.id === selectedPieceId ? null : piece.id)
    },
    [game, animating, botThinking, replaying, previewOnly, selectedMoves, selectedPieceId, playMove, selectPiece],
  )

  const onSquareClick = useCallback(
    (row: number, col: number) => {
      if (!selectedPieceId || previewOnly) {
        selectPiece(null)
        return
      }
      const move = selectedMoves.find((m) => m.to_row === row && m.to_col === col && !m.can_finish)
      if (move) void playMove(selectedPieceId, move)
      else selectPiece(null)
    },
    [selectedMoves, selectedPieceId, previewOnly, playMove, selectPiece],
  )

  const onPick = useCallback(
    (move: Move) => {
      if (selectedPieceId && !previewOnly) void playMove(selectedPieceId, move)
    },
    [selectedPieceId, previewOnly, playMove],
  )

  if (!game) return null

  const pieces = replay ? replay.pieces : game.pieces
  const lastMove = replay ? replay.lastMove : liveLastMove

  return (
    <Canvas
      shadows
      camera={{ position: [0, 9.5, 11.5], fov: 42, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      onPointerMissed={() => selectPiece(null)}
      style={{ background: 'radial-gradient(ellipse at center, #3a3733 0%, #262522 70%)' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[6, 14, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.5} />
      <hemisphereLight args={['#cfd8e3', '#2a2622', 0.45]} />

      <Terrain board={game.board} lastMove={lastMove} onSquareClick={onSquareClick} />

      {pieces
        .filter((p) => !p.is_captured && !p.is_finished)
        .map((p) => (
          <PieceMesh
            key={p.id}
            piece={p}
            height={game.board[p.row][p.col]}
            selected={!replaying && p.id === selectedPieceId}
            selectable={!replaying}
            threatened={false}
            onClick={onPieceClick}
          />
        ))}

      {selectedMoves.length > 0 && (
        <MoveHighlights moves={selectedMoves} board={game.board} preview={previewOnly} onPick={onPick} />
      )}

      <ContactShadows position={[0, -0.23, 0]} opacity={0.5} scale={14} blur={2.2} far={3} />
      <CameraRig view={view} />
    </Canvas>
  )
}
