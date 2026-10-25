import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { ViewPreset } from '../../store/gameStore'

const TARGET = new THREE.Vector3(0, 0.6, 0)

// Row 0 (Blue's start) is at negative Z; Red sits at positive Z and looks "north".
const PRESETS: Record<ViewPreset, [number, number, number]> = {
  red: [0, 9.5, 11.5],
  blue: [0, 9.5, -11.5],
  top: [0, 16, 0.01],
  left: [-12, 8, 0],
  right: [12, 8, 0],
  'iso-red-left': [-8.5, 8.5, 8.5],
  'iso-red-right': [8.5, 8.5, 8.5],
  'iso-blue-left': [8.5, 8.5, -8.5],
  'iso-blue-right': [-8.5, 8.5, -8.5],
}

export default function CameraRig({ view }: { view: ViewPreset }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const goal = useRef<THREE.Vector3 | null>(null)

  useEffect(() => {
    goal.current = new THREE.Vector3(...PRESETS[view])
  }, [view])

  useFrame((_, dt) => {
    const g = goal.current
    if (!g) return
    const k = 1 - Math.exp(-dt * 6)
    camera.position.lerp(g, k)
    controls.current?.target.lerp(TARGET, k)
    controls.current?.update()
    if (camera.position.distanceTo(g) < 0.02) goal.current = null
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={TARGET}
      enablePan={false}
      minDistance={6}
      maxDistance={26}
      maxPolarAngle={Math.PI * 0.46}
      enableDamping
      dampingFactor={0.08}
      onStart={() => {
        goal.current = null
      }}
    />
  )
}
