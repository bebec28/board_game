import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { Piece } from '../../api/types'
import { squareXZ, topY } from '../../lib/coords'
import { PLAYER_COLORS } from '../../lib/colors'
import { ALL_PIECE_MODEL_URLS, PIECE_MODELS } from '../../lib/pieces'

interface Props {
  piece: Piece
  height: number
  selected: boolean
  selectable: boolean
  threatened: boolean
  onClick: (piece: Piece) => void
}

/** Footprint (world units) the model is scaled to; a square is 1 unit wide. */
const MODEL_FOOTPRINT = 0.62
/** Models taller than this (after footprint scaling) are shrunk to fit. */
const MODEL_MAX_HEIGHT = 0.95

const PIECE_HEIGHT = 0.7
const PIECE_RADIUS = 0.3

ALL_PIECE_MODEL_URLS.forEach((url) => useGLTF.preload(url))

export default function PieceMesh({ piece, height, selected, selectable, threatened, onClick }: Props) {
  const group = useRef<THREE.Group>(null)
  const [tx, tz] = squareXZ(piece.row, piece.col)
  const target = useMemo(() => new THREE.Vector3(tx, topY(height), tz), [tx, tz, height])
  const first = useRef(true)

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    if (first.current) {
      g.position.copy(target)
      first.current = false
      return
    }
    // Smooth slide to the destination with a small hop in the middle of the move.
    const dist = g.position.distanceTo(target)
    if (dist > 0.001) {
      const k = 1 - Math.exp(-dt * 10)
      g.position.lerp(target, k)
      g.position.y = Math.max(g.position.y, THREE.MathUtils.lerp(g.position.y, target.y, k) + Math.min(dist, 1) * 0.25)
    } else {
      g.position.copy(target)
    }
    const s = selected ? 1.12 : 1
    g.scale.lerp(new THREE.Vector3(s, s, s), 1 - Math.exp(-dt * 12))
  })

  const color = PLAYER_COLORS[piece.player]
  const glow = selected ? { color, intensity: 0.45 } : threatened ? { color: '#ffb020', intensity: 0.35 } : null

  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onClick(piece)
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      document.body.style.cursor = selectable ? 'pointer' : 'default'
    },
    onPointerOut: () => {
      document.body.style.cursor = 'default'
    },
  }

  const fallback = <PrimitiveShape piece={piece} glow={glow} />

  return (
    <group ref={group}>
      <group {...handlers}>
        <ModelErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <GltfShape url={PIECE_MODELS[piece.type][piece.player]} glow={glow} />
          </Suspense>
        </ModelErrorBoundary>
      </group>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.36, 0.44, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  )
}

type Glow = { color: string; intensity: number } | null

/** The user's GLB model, normalised so it stands centred on the square with its base at y = 0. */
function GltfShape({ url, glow }: { url: string; glow: Glow }) {
  const gltf = useGLTF(url)

  const { scene, scale, offset, materials } = useMemo(() => {
    const scene = gltf.scene.clone(true)
    const materials: THREE.MeshStandardMaterial[] = []
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = false
        // Clone materials so each piece can glow independently of the shared GLTF cache.
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        const cloned = mats.map((m) => {
          const c = (m as THREE.MeshStandardMaterial).clone()
          materials.push(c)
          return c
        })
        mesh.material = cloned.length === 1 ? cloned[0] : cloned
      }
    })
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const footprint = Math.max(size.x, size.z) || 1
    let scale = MODEL_FOOTPRINT / footprint
    if (size.y * scale > MODEL_MAX_HEIGHT) scale = MODEL_MAX_HEIGHT / size.y
    const center = box.getCenter(new THREE.Vector3())
    // Centre on X/Z, rest the lowest point on the square's surface.
    const offset = new THREE.Vector3(-center.x * scale, -box.min.y * scale, -center.z * scale)
    return { scene, scale, offset, materials }
  }, [gltf.scene])

  useEffect(() => {
    const emissive = new THREE.Color(glow ? glow.color : '#000000')
    for (const m of materials) {
      m.emissive.copy(emissive)
      m.emissiveIntensity = glow ? glow.intensity : 0
    }
  }, [glow, materials])

  return (
    <group position={offset} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

/** Simple geometric piece, used while a model loads or if it fails to load. */
function PrimitiveShape({ piece, glow }: { piece: Piece; glow: Glow }) {
  const geometry = useMemo(() => {
    switch (piece.type) {
      case 'explorer':
        return new THREE.ConeGeometry(PIECE_RADIUS, PIECE_HEIGHT, 5)
      case 'vanguard':
        return wedgeGeometry()
      case 'sentinel':
        return new THREE.CylinderGeometry(PIECE_RADIUS * 0.9, PIECE_RADIUS * 0.9, PIECE_HEIGHT, 3)
    }
  }, [piece.type])
  const color = PLAYER_COLORS[piece.player]
  return (
    <mesh
      geometry={geometry}
      position={[0, piece.type === 'vanguard' ? 0.01 : PIECE_HEIGHT / 2 + 0.01, 0]}
      rotation={piece.type === 'sentinel' ? [0, Math.PI / 6, 0] : [0, 0, 0]}
      castShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.35}
        metalness={0.2}
        emissive={glow ? glow.color : '#000000'}
        emissiveIntensity={glow ? glow.intensity : 0}
      />
    </mesh>
  )
}

/** Square base, two-point ridge on top ("diamond wedge"). */
function wedgeGeometry(): THREE.BufferGeometry {
  const r = PIECE_RADIUS * 0.95
  const h = PIECE_HEIGHT
  const ridge = r * 0.45
  const v = [
    [-r, 0, -r], [r, 0, -r], [r, 0, r], [-r, 0, r],
    [-ridge, h, 0], [ridge, h, 0],
  ]
  const faces = [
    [0, 2, 1], [0, 3, 2],
    [0, 1, 5], [0, 5, 4],
    [3, 4, 5], [3, 5, 2],
    [1, 2, 5],
    [0, 4, 3],
  ]
  const pos: number[] = []
  faces.forEach((f) => f.forEach((i) => pos.push(...v[i])))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('Piece model failed to load, using fallback shape', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
